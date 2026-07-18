import { describe, expect, it, vi } from "vitest";
import {
  GenerationJobTrackingError,
  assertGenerationJobsSucceeded,
  parseQueuedGenerationJobs,
  pollGenerationJob,
  startGenerationJobTracking,
  stopAllGenerationJobTracking,
  type GenerationJobDetail,
} from "../generationJobTracker";

function job(status: GenerationJobDetail["status"], overrides: Partial<GenerationJobDetail> = {}): GenerationJobDetail {
  return {
    id: 21,
    projectId: 7,
    sourceTaskId: 9,
    handlerKey: "core.text",
    taskType: "text",
    status,
    queuePosition: status === "queued" ? 3 : null,
    queuedAt: 100,
    startedAt: status === "queued" ? null : 200,
    finishedAt: ["succeeded", "failed", "cancelled"].includes(status) ? 300 : null,
    errorCode: null,
    errorMessage: null,
    result: null,
    ...overrides,
  };
}

describe("generation job tracker", () => {
  it("parses single and batch queued responses without depending on route-specific wrappers", () => {
    expect(parseQueuedGenerationJobs({ jobId: 21, targetId: 9, status: "queued" })).toEqual([
      { jobId: 21, targetId: 9, status: "queued" },
    ]);
    expect(parseQueuedGenerationJobs({
      items: [
        { jobId: 22, targetId: 10, status: "queued", videoId: 31 },
        { jobId: 23, targetId: 11, status: "running" },
      ],
    })).toEqual([
      { jobId: 22, targetId: 10, status: "queued", videoId: 31 },
      { jobId: 23, targetId: 11, status: "running" },
    ]);
  });

  it("rejects malformed queued responses before a page starts polling", () => {
    expect(() => parseQueuedGenerationJobs({ items: [{ targetId: 9, status: "queued" }] })).toThrow(
      "生成任务响应缺少有效的任务 ID",
    );
    expect(() => parseQueuedGenerationJobs({ message: "queued" })).toThrow("生成接口未返回可跟踪的任务");
  });

  it("polls through active states, reports every state, and stops at success", async () => {
    const states = [job("queued"), job("running"), job("recovering"), job("succeeded", { result: { prompt: "完成" } })];
    const fetchJob = vi.fn(async () => states.shift()!);
    const delays: number[] = [];
    const updates: string[] = [];

    const result = await pollGenerationJob(21, {
      fetchJob,
      sleep: async (delay) => { delays.push(delay); },
      initialDelayMs: 100,
      maxDelayMs: 220,
      backoffFactor: 2,
      onUpdate: (detail) => updates.push(detail.status),
    });

    expect(result.status).toBe("succeeded");
    expect(result.result).toEqual({ prompt: "完成" });
    expect(updates).toEqual(["queued", "running", "recovering", "succeeded"]);
    expect(delays).toEqual([100, 200, 220]);
    expect(fetchJob).toHaveBeenCalledTimes(4);
  });

  it.each(["needs_attention", "failed", "cancelled"] as const)("treats %s as a terminal state", async (status) => {
    const fetchJob = vi.fn(async () => job(status));
    const sleep = vi.fn(async () => undefined);

    await expect(pollGenerationJob(21, { fetchJob, sleep })).resolves.toMatchObject({ status });
    expect(fetchJob).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries transient polling failures with bounded backoff", async () => {
    const fetchJob = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(job("succeeded"));
    const delays: number[] = [];

    await expect(pollGenerationJob(21, {
      fetchJob,
      sleep: async (delay) => { delays.push(delay); },
      initialDelayMs: 50,
      maxDelayMs: 75,
      backoffFactor: 2,
      maxConsecutiveErrors: 2,
    })).resolves.toMatchObject({ status: "succeeded" });
    expect(delays).toEqual([50, 75]);
  });

  it("surfaces a stable tracking error after the retry budget is exhausted", async () => {
    const fetchJob = vi.fn(async () => { throw new Error("offline"); });

    await expect(pollGenerationJob(21, {
      fetchJob,
      sleep: async () => undefined,
      maxConsecutiveErrors: 1,
    })).rejects.toEqual(expect.objectContaining<Partial<GenerationJobTrackingError>>({
      name: "GenerationJobTrackingError",
      jobId: 21,
      message: "暂时无法获取生成任务状态，请稍后重试",
    }));
    expect(fetchJob).toHaveBeenCalledTimes(2);
  });

  it("stops before another request when the caller aborts during a delay", async () => {
    const controller = new AbortController();
    const fetchJob = vi.fn(async () => job("queued"));

    await expect(pollGenerationJob(21, {
      fetchJob,
      signal: controller.signal,
      sleep: async () => { controller.abort(); },
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchJob).toHaveBeenCalledTimes(1);
  });

  it("tracks every item in a batch and keeps target metadata in update callbacks", async () => {
    const updates: Array<[number, number, string]> = [];
    const tracking = startGenerationJobTracking({
      items: [
        { jobId: 21, targetId: 9, status: "queued" },
        { jobId: 22, targetId: 10, status: "queued", videoId: 31 },
      ],
    }, {
      fetchJob: async (jobId) => job("succeeded", { id: jobId }),
      sleep: async () => undefined,
      onUpdate: (queued, detail) => updates.push([queued.targetId, detail.id, detail.status]),
    });

    await expect(tracking.done).resolves.toHaveLength(2);
    expect(updates).toEqual([
      [9, 21, "succeeded"],
      [10, 22, "succeeded"],
    ]);
  });

  it("can stop all active tracking sessions on logout", async () => {
    const fetchJob = vi.fn(async () => job("queued"));
    const tracking = startGenerationJobTracking({ jobId: 21, targetId: 9, status: "queued" }, {
      fetchJob,
      sleep: async (_delay, signal) => new Promise<void>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("stopped", "AbortError")), { once: true });
      }),
    });
    await vi.waitFor(() => expect(fetchJob).toHaveBeenCalledTimes(1));

    stopAllGenerationJobTracking();

    await expect(tracking.done).rejects.toMatchObject({ name: "AbortError" });
  });

  it("allows refresh only after every job succeeds", () => {
    expect(() => assertGenerationJobsSucceeded([job("succeeded"), job("succeeded", { id: 22 })])).not.toThrow();
    expect(() => assertGenerationJobsSucceeded([
      job("succeeded"),
      job("needs_attention", { id: 22, errorMessage: "外部状态未知" }),
    ])).toThrow("外部状态未知");
    expect(() => assertGenerationJobsSucceeded([job("cancelled")])).toThrow("生成任务已取消");
  });

  it.each([
    ["PRICING_NOT_CONFIGURED", "当前模型尚未配置价格"],
    ["INSUFFICIENT_QUOTA", "分组可用额度不足"],
    ["ACCOUNT_IN_DEBT", "当前分组存在欠费，请联系管理员充值"],
  ])("maps failed job code %s to stable Chinese copy", (errorCode, message) => {
    expect(() => assertGenerationJobsSucceeded([
      job("failed", { errorCode, errorMessage: "provider detail" }),
    ])).toThrow(message);
  });

  it("maps pricing errors when a job needs administrator attention", () => {
    expect(() => assertGenerationJobsSucceeded([
      job("needs_attention", { errorCode: "ACCOUNT_IN_DEBT", errorMessage: "provider detail" }),
    ])).toThrow("当前分组存在欠费，请联系管理员充值");
  });
});
