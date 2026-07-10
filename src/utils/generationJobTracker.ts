import axios from "@/utils/axios";

export const generationJobStatuses = [
  "queued",
  "running",
  "recovering",
  "needs_attention",
  "succeeded",
  "failed",
  "cancelled",
] as const;

export type GenerationJobStatus = (typeof generationJobStatuses)[number];
export type GenerationTaskType = "text" | "image" | "video";

export interface QueuedGenerationJob {
  jobId: number;
  targetId: number;
  status: GenerationJobStatus;
  videoId?: number;
  imageId?: number;
}

export interface GenerationJobDetail {
  id: number;
  projectId: number | null;
  sourceTaskId: number | null;
  handlerKey: string;
  taskType: GenerationTaskType;
  status: GenerationJobStatus;
  queuePosition: number | null;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  result: unknown;
}

export interface PollGenerationJobOptions {
  signal?: AbortSignal;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  maxConsecutiveErrors?: number;
  fetchJob?: (jobId: number, signal?: AbortSignal) => Promise<GenerationJobDetail>;
  sleep?: (delayMs: number, signal?: AbortSignal) => Promise<void>;
  onUpdate?: (job: GenerationJobDetail) => void;
}

export interface StartGenerationJobTrackingOptions extends Omit<PollGenerationJobOptions, "signal" | "onUpdate"> {
  signal?: AbortSignal;
  onUpdate?: (queued: QueuedGenerationJob, job: GenerationJobDetail) => void;
}

export interface GenerationJobTrackingHandle {
  items: QueuedGenerationJob[];
  done: Promise<GenerationJobDetail[]>;
  stop: () => void;
}

const statusSet = new Set<string>(generationJobStatuses);
const terminalStatuses = new Set<GenerationJobStatus>(["needs_attention", "succeeded", "failed", "cancelled"]);
const activeTrackingControllers = new Set<AbortController>();

export const generationJobStatusLabels: Record<GenerationJobStatus, string> = {
  queued: "排队中",
  running: "执行中",
  recovering: "恢复中",
  needs_attention: "需要处理",
  succeeded: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export class GenerationJobTrackingError extends Error {
  readonly name = "GenerationJobTrackingError";

  constructor(
    public readonly jobId: number,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function optionalPositiveInteger(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function parseQueuedItem(value: unknown): QueuedGenerationJob {
  if (!isRecord(value)) throw new Error("生成任务响应格式无效");
  const jobId = optionalPositiveInteger(value.jobId);
  if (jobId === undefined) throw new Error("生成任务响应缺少有效的任务 ID");
  const targetId = optionalPositiveInteger(value.targetId);
  if (targetId === undefined) throw new Error("生成任务响应缺少有效的目标 ID");
  if (typeof value.status !== "string" || !statusSet.has(value.status)) {
    throw new Error("生成任务响应包含未知状态");
  }

  const parsed: QueuedGenerationJob = {
    jobId,
    targetId,
    status: value.status as GenerationJobStatus,
  };
  const videoId = optionalPositiveInteger(value.videoId);
  const imageId = optionalPositiveInteger(value.imageId);
  if (videoId !== undefined) parsed.videoId = videoId;
  if (imageId !== undefined) parsed.imageId = imageId;
  return parsed;
}

export function parseQueuedGenerationJobs(value: unknown): QueuedGenerationJob[] {
  const wrappedItems = isRecord(value) && Array.isArray(value.items);
  const candidates = wrappedItems ? value.items as unknown[] : [value];
  if (candidates.length === 0 || (!wrappedItems && isRecord(value) && !("jobId" in value))) {
    throw new Error("生成接口未返回可跟踪的任务");
  }
  return candidates.map(parseQueuedItem);
}

function abortError(): DOMException {
  return new DOMException("生成任务跟踪已停止", "AbortError");
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function isAbortError(cause: unknown): boolean {
  return isRecord(cause) && cause.name === "AbortError";
}

async function defaultSleep(delayMs: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, delayMs);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timer);
      reject(abortError());
    }, { once: true });
  });
}

export async function fetchGenerationJob(jobId: number, signal?: AbortSignal): Promise<GenerationJobDetail> {
  const response = await axios.get("/generation/getJob", { params: { id: jobId }, signal });
  return response.data as GenerationJobDetail;
}

export async function pollGenerationJob(
  jobId: number,
  options: PollGenerationJobOptions = {},
): Promise<GenerationJobDetail> {
  const fetchJob = options.fetchJob ?? fetchGenerationJob;
  const sleep = options.sleep ?? defaultSleep;
  const initialDelayMs = Math.max(0, options.initialDelayMs ?? 1_000);
  const maxDelayMs = Math.max(initialDelayMs, options.maxDelayMs ?? 5_000);
  const backoffFactor = Math.max(1, options.backoffFactor ?? 1.5);
  const maxConsecutiveErrors = Math.max(0, options.maxConsecutiveErrors ?? 3);
  let delayMs = initialDelayMs;
  let consecutiveErrors = 0;

  while (true) {
    throwIfAborted(options.signal);
    let detail: GenerationJobDetail;
    try {
      detail = await fetchJob(jobId, options.signal);
      consecutiveErrors = 0;
    } catch (cause) {
      if (options.signal?.aborted || isAbortError(cause)) throw abortError();
      consecutiveErrors += 1;
      if (consecutiveErrors > maxConsecutiveErrors) {
        throw new GenerationJobTrackingError(jobId, "暂时无法获取生成任务状态，请稍后重试", cause);
      }
      await sleep(delayMs, options.signal);
      delayMs = Math.min(maxDelayMs, Math.ceil(delayMs * backoffFactor));
      continue;
    }

    if (!statusSet.has(detail.status)) {
      throw new GenerationJobTrackingError(jobId, "生成任务返回了未知状态");
    }
    options.onUpdate?.(detail);
    if (terminalStatuses.has(detail.status)) return detail;

    await sleep(delayMs, options.signal);
    throwIfAborted(options.signal);
    delayMs = Math.min(maxDelayMs, Math.ceil(delayMs * backoffFactor));
  }
}

export function startGenerationJobTracking(
  response: unknown,
  options: StartGenerationJobTrackingOptions = {},
): GenerationJobTrackingHandle {
  const items = parseQueuedGenerationJobs(response);
  const controller = new AbortController();
  const stop = () => controller.abort();
  if (options.signal?.aborted) stop();
  else options.signal?.addEventListener("abort", stop, { once: true });
  activeTrackingControllers.add(controller);

  const done = Promise.all(items.map((queued) => pollGenerationJob(queued.jobId, {
    fetchJob: options.fetchJob,
    sleep: options.sleep,
    initialDelayMs: options.initialDelayMs,
    maxDelayMs: options.maxDelayMs,
    backoffFactor: options.backoffFactor,
    maxConsecutiveErrors: options.maxConsecutiveErrors,
    signal: controller.signal,
    onUpdate: (detail) => options.onUpdate?.(queued, detail),
  }))).finally(() => {
    activeTrackingControllers.delete(controller);
    options.signal?.removeEventListener("abort", stop);
  });

  return { items, done, stop };
}

export function stopAllGenerationJobTracking(): void {
  for (const controller of activeTrackingControllers) controller.abort();
  activeTrackingControllers.clear();
}

export function generationJobFailureMessage(job: GenerationJobDetail): string | null {
  if (job.status === "failed") return job.errorMessage || "生成任务执行失败";
  if (job.status === "cancelled") return "生成任务已取消";
  if (job.status === "needs_attention") return job.errorMessage || "生成任务需要管理员处理";
  return null;
}

export function assertGenerationJobsSucceeded(jobs: GenerationJobDetail[]): void {
  const unsuccessful = jobs.find((job) => job.status !== "succeeded");
  if (!unsuccessful) return;
  throw new GenerationJobTrackingError(
    unsuccessful.id,
    generationJobFailureMessage(unsuccessful) || `生成任务状态异常：${generationJobStatusLabels[unsuccessful.status]}`,
  );
}
