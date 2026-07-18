import { describe, expect, it, vi } from "vitest";
import {
  createAgentJobTracker,
  stopAllAgentJobTracking,
  type AgentJobEvent,
} from "../agentJobTracker";
import type { GenerationJobDetail } from "../generationJobTracker";

function job(status: GenerationJobDetail["status"], queuePosition: number | null = null): GenerationJobDetail {
  return {
    id: 41,
    projectId: 7,
    sourceTaskId: null,
    handlerKey: "core.text",
    taskType: "text",
    status,
    queuePosition,
    queuedAt: 100,
    startedAt: status === "queued" ? null : 200,
    finishedAt: ["succeeded", "failed", "cancelled", "needs_attention"].includes(status) ? 300 : null,
    errorCode: null,
    errorMessage: null,
    result: null,
  };
}

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("agent job tracker", () => {
  it("persists the queued ack, replays events by sequence, and stops at a terminal state", async () => {
    const storage = memoryStorage();
    const states = [job("queued", 3), job("running"), job("succeeded")];
    const batches: AgentJobEvent[][] = [
      [
        { sequence: 1, event: "message", data: { id: "m1" }, createdAt: 100 },
        { sequence: 2, event: "content:add", data: { messageId: "m1" }, createdAt: 101 },
      ],
      [
        { sequence: 2, event: "content:add", data: { messageId: "m1" }, createdAt: 101 },
        { sequence: 3, event: "message:update", data: { id: "m1", status: "complete" }, createdAt: 102 },
      ],
      [],
    ];
    const seen: number[] = [];
    const updates: string[] = [];
    const terminal = vi.fn();
    const tracker = createAgentJobTracker({
      storage,
      storageKey: () => "agent:7",
      fetchJob: async () => states.shift()!,
      sleep: async () => undefined,
      requestEvents: async (_jobId, afterSequence) => {
        expect(afterSequence).toBe(seen.at(-1) ?? 0);
        return batches.shift()!;
      },
      onEvent: (event) => seen.push(event.sequence),
      onUpdate: (detail) => updates.push(detail.queuePosition ? `${detail.status}:${detail.queuePosition}` : detail.status),
      onTerminal: terminal,
    });

    tracker.track({ jobId: 41, targetId: 7, status: "queued" });
    expect(storage.getItem("agent:7")).toContain('"jobId":41');
    await vi.waitFor(() => expect(terminal).toHaveBeenCalledOnce());

    expect(seen).toEqual([1, 2, 3]);
    expect(updates).toEqual(["queued:3", "running", "succeeded"]);
    expect(storage.getItem("agent:7")).toBeNull();
  });

  it("pauses without forgetting the job and resumes it after reconnect", async () => {
    const storage = memoryStorage();
    let releaseSleep: (() => void) | undefined;
    const fetchJob = vi.fn(async () => job("queued", 2));
    const tracker = createAgentJobTracker({
      storage,
      storageKey: () => "agent:7",
      fetchJob,
      sleep: async (_delay, signal) => new Promise<void>((resolve, reject) => {
        releaseSleep = resolve;
        signal?.addEventListener("abort", () => reject(new DOMException("stopped", "AbortError")), { once: true });
      }),
      requestEvents: async () => [],
    });

    tracker.track({ jobId: 41, targetId: 7, status: "queued" });
    await vi.waitFor(() => expect(fetchJob).toHaveBeenCalledOnce());
    tracker.pause();
    expect(storage.getItem("agent:7")).not.toBeNull();

    expect(tracker.resume()).toMatchObject({ jobId: 41 });
    releaseSleep?.();
    await vi.waitFor(() => expect(fetchJob).toHaveBeenCalledTimes(2));
    tracker.pause();
  });

  it("restores a persisted job after refresh and replays from sequence zero", async () => {
    const storage = memoryStorage();
    storage.setItem("agent:7", JSON.stringify({ jobId: 41, targetId: 7, status: "queued" }));
    const afterSequences: number[] = [];
    const tracker = createAgentJobTracker({
      storage,
      storageKey: () => "agent:7",
      fetchJob: async () => job("cancelled"),
      sleep: async () => undefined,
      requestEvents: async (_jobId, afterSequence) => {
        afterSequences.push(afterSequence);
        return [];
      },
    });

    expect(tracker.resume()).toMatchObject({ jobId: 41 });
    await vi.waitFor(() => expect(afterSequences).toEqual([0]));
  });

  it("switches context without deleting the previous context job", async () => {
    const storage = memoryStorage();
    let context = "episode:1";
    const tracker = createAgentJobTracker({
      storage,
      storageKey: () => context,
      fetchJob: async () => job("queued"),
      sleep: async () => new Promise<void>(() => undefined),
      requestEvents: async () => [],
    });
    tracker.track({ jobId: 41, targetId: 1, status: "queued" });
    context = "episode:2";
    storage.setItem("episode:2", JSON.stringify({ jobId: 42, targetId: 2, status: "queued" }));

    expect(tracker.switchContext()).toMatchObject({ jobId: 42 });
    expect(storage.getItem("episode:1")).toContain('"jobId":41');
    tracker.pause();
  });

  it("forgets every active Agent job on logout", () => {
    const storage = memoryStorage();
    const tracker = createAgentJobTracker({
      storage,
      storageKey: () => "agent:logout",
      fetchJob: async () => job("queued"),
      sleep: async () => new Promise<void>(() => undefined),
      requestEvents: async () => [],
    });
    tracker.track({ jobId: 41, targetId: 7, status: "queued" });

    stopAllAgentJobTracking();

    expect(storage.getItem("agent:logout")).toBeNull();
    expect(tracker.current).toBeNull();
  });

  it("recovers event replay after a transient request failure", async () => {
    const errors: unknown[] = [];
    const events = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([{ sequence: 1, event: "message", data: { id: "m1" }, createdAt: 1 }]);
    const onEvent = vi.fn();
    const tracker = createAgentJobTracker({
      storage: memoryStorage(),
      storageKey: () => "agent:retry",
      fetchJob: async () => job("queued"),
      sleep: async (_delay, signal) => new Promise<void>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("stopped", "AbortError")), { once: true });
      }),
      maxConsecutiveErrors: 0,
      requestEvents: events,
      onEvent,
      onError: (error) => errors.push(error),
    });
    tracker.track({ jobId: 41, targetId: 7, status: "queued" });
    await vi.waitFor(() => expect(errors).toHaveLength(1));

    tracker.resume();

    await vi.waitFor(() => expect(onEvent).toHaveBeenCalledOnce());
    tracker.pause();
  });
});
