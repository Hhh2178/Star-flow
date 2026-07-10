import {
  parseQueuedGenerationJobs,
  fetchGenerationJob,
  startGenerationJobTracking,
  type GenerationJobDetail,
  type GenerationJobTrackingHandle,
  type PollGenerationJobOptions,
  type QueuedGenerationJob,
} from "./generationJobTracker";

export interface AgentJobEvent {
  sequence: number;
  event: string;
  data: unknown;
  createdAt: number;
}

export interface AgentJobStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): unknown;
  removeItem(key: string): unknown;
}

export interface CreateAgentJobTrackerOptions
  extends Pick<PollGenerationJobOptions, "fetchJob" | "sleep" | "initialDelayMs" | "maxDelayMs" | "backoffFactor" | "maxConsecutiveErrors"> {
  storage?: AgentJobStorage;
  storageKey: () => string;
  requestEvents: (jobId: number, afterSequence: number) => Promise<unknown>;
  onEvent?: (event: AgentJobEvent) => void;
  onUpdate?: (job: GenerationJobDetail) => void;
  onTerminal?: (job: GenerationJobDetail) => void;
  onError?: (error: unknown) => void;
}

export interface AgentJobTracker {
  readonly current: QueuedGenerationJob | null;
  readonly lastSequence: number;
  track(response: unknown): QueuedGenerationJob;
  resume(): QueuedGenerationJob | null;
  switchContext(): QueuedGenerationJob | null;
  pause(): void;
  forget(): void;
}

const agentJobTrackers = new Set<AgentJobTracker>();

export function stopAllAgentJobTracking(): void {
  for (const tracker of agentJobTrackers) tracker.forget();
}

function browserStorage(): AgentJobStorage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function eventList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray((value as { events?: unknown }).events)) {
    return (value as { events: unknown[] }).events;
  }
  return [];
}

function parseEvent(value: unknown): AgentJobEvent | null {
  if (!value || typeof value !== "object") return null;
  const event = value as Partial<AgentJobEvent>;
  if (!Number.isInteger(event.sequence) || Number(event.sequence) <= 0 || typeof event.event !== "string") return null;
  return {
    sequence: Number(event.sequence),
    event: event.event,
    data: event.data,
    createdAt: Number.isFinite(event.createdAt) ? Number(event.createdAt) : 0,
  };
}

export function createAgentJobTracker(options: CreateAgentJobTrackerOptions): AgentJobTracker {
  const storage = options.storage ?? browserStorage();
  let active: QueuedGenerationJob | null = null;
  let tracking: GenerationJobTrackingHandle | null = null;
  let sequence = 0;
  let replayQueue = Promise.resolve();
  let activeStorageKey: string | null = null;

  const persist = () => {
    if (!active) return;
    activeStorageKey ??= options.storageKey();
    storage?.setItem(activeStorageKey, JSON.stringify({
      jobId: active.jobId,
      targetId: active.targetId,
      status: active.status,
    }));
  };

  const replay = (jobId: number) => {
    replayQueue = replayQueue.catch(() => undefined).then(async () => {
      const response = await options.requestEvents(jobId, sequence);
      const events = eventList(response)
        .map(parseEvent)
        .filter((event): event is AgentJobEvent => Boolean(event))
        .sort((left, right) => left.sequence - right.sequence);
      for (const event of events) {
        if (event.sequence <= sequence) continue;
        sequence = event.sequence;
        options.onEvent?.(event);
      }
    });
    return replayQueue;
  };

  const start = () => {
    if (!active || tracking) return;
    const queued = active;
    tracking = startGenerationJobTracking(queued, {
      fetchJob: async (jobId, signal) => {
        const detail = await (options.fetchJob
          ? options.fetchJob(jobId, signal)
          : fetchGenerationJob(jobId, signal));
        await replay(jobId);
        return detail;
      },
      sleep: options.sleep,
      initialDelayMs: options.initialDelayMs,
      maxDelayMs: options.maxDelayMs,
      backoffFactor: options.backoffFactor,
      maxConsecutiveErrors: options.maxConsecutiveErrors,
      onUpdate: (_item, detail) => {
        if (!active || active.jobId !== detail.id) return;
        active = { ...active, status: detail.status };
        persist();
        options.onUpdate?.(detail);
      },
    });
    const currentTracking = tracking;
    void currentTracking.done.then((jobs) => {
      const terminal = jobs[0];
      if (!terminal || tracking !== currentTracking) return;
      if (activeStorageKey) storage?.removeItem(activeStorageKey);
      options.onTerminal?.(terminal);
    }).catch((error) => {
      if ((error as Error)?.name !== "AbortError") options.onError?.(error);
    }).finally(() => {
      if (tracking === currentTracking) tracking = null;
    });
  };

  const trackerApi: AgentJobTracker = {
    get current() { return active; },
    get lastSequence() { return sequence; },
    track(response) {
      const jobs = parseQueuedGenerationJobs(response);
      if (jobs.length !== 1) throw new Error("Agent 队列响应必须包含一个任务");
      tracking?.stop();
      tracking = null;
      sequence = 0;
      replayQueue = Promise.resolve();
      active = jobs[0];
      activeStorageKey = options.storageKey();
      persist();
      start();
      return active;
    },
    resume() {
      if (!active) {
        activeStorageKey = options.storageKey();
        const saved = storage?.getItem(activeStorageKey);
        if (!saved) return null;
        try {
          const jobs = parseQueuedGenerationJobs(JSON.parse(saved));
          active = jobs[0] ?? null;
        } catch {
          storage?.removeItem(activeStorageKey);
          activeStorageKey = null;
          return null;
        }
      }
      start();
      return active;
    },
    switchContext() {
      tracking?.stop();
      tracking = null;
      active = null;
      activeStorageKey = null;
      sequence = 0;
      replayQueue = Promise.resolve();
      return trackerApi.resume();
    },
    pause() {
      tracking?.stop();
      tracking = null;
    },
    forget() {
      tracking?.stop();
      tracking = null;
      active = null;
      sequence = 0;
      replayQueue = Promise.resolve();
      if (activeStorageKey) storage?.removeItem(activeStorageKey);
      activeStorageKey = null;
    },
  };
  agentJobTrackers.add(trackerApi);
  return trackerApi;
}
