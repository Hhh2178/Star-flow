// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GenerationJobDetail } from "../generationJobTracker";

type Handler = (...args: any[]) => void;

class FakeSocket {
  connected = false;
  emitQueuedBeforeAck = false;
  handlers = new Map<string, Handler[]>();
  emitted: Array<{ event: string; data: unknown }> = [];
  replayBothWays = false;
  holdChatAck = false;
  pendingChatAck: Handler | undefined;

  on(event: string, handler: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }
  once(event: string, handler: Handler) { return this.on(event, handler); }
  off() { return this; }
  listeners(event: string) { return this.handlers.get(event) ?? []; }
  removeAllListeners() { this.handlers.clear(); }
  connect() {
    this.connected = true;
    this.fire("connect");
  }
  disconnect() {
    this.connected = false;
    this.fire("disconnect", "client disconnect");
  }
  emit(event: string, data: unknown, callback?: Handler) {
    this.emitted.push({ event, data });
    if (event === "chat") {
      const queued = { jobId: 41, targetId: 7, status: "queued" };
      if (this.emitQueuedBeforeAck) this.fire("agent:queued", queued);
      if (this.holdChatAck) this.pendingChatAck = callback;
      else callback?.(queued);
    }
    if (event === "agent:events") {
      const replay = [{
        sequence: 1,
        event: "message",
        data: { id: "m1", role: "assistant", status: "pending", datetime: "2026-01-01", content: [] },
        createdAt: 1,
      }];
      if (this.replayBothWays) this.fire("message", replay[0].data);
      callback?.(this.replayBothWays ? replay : []);
    }
    if (event === "stop") callback?.({ success: true });
    return true;
  }
  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }
}

const fakeSocket = new FakeSocket();
vi.mock("socket.io-client", () => ({
  io: () => {
    fakeSocket.connected = true;
    return fakeSocket;
  },
}));

import { useChat } from "../useChat";

function succeededJob(): GenerationJobDetail {
  return {
    id: 41,
    projectId: 7,
    sourceTaskId: null,
    handlerKey: "core.text",
    taskType: "text",
    status: "succeeded",
    queuePosition: null,
    queuedAt: 100,
    startedAt: 200,
    finishedAt: 300,
    errorCode: null,
    errorMessage: null,
    result: null,
  };
}

describe("useChat Agent queue protocol", () => {
  beforeEach(() => {
    fakeSocket.connected = false;
    fakeSocket.emitQueuedBeforeAck = false;
    fakeSocket.replayBothWays = false;
    fakeSocket.holdChatAck = false;
    fakeSocket.pendingChatAck = undefined;
    fakeSocket.handlers.clear();
    fakeSocket.emitted = [];
    localStorage.clear();
  });

  it("shows the user message before accepting the queued chat ack", async () => {
    const chat = useChat({
      url: "http://agent.test",
      autoConnect: false,
      manageLifecycle: false,
      jobStorageKey: "agent:7",
      agentJobTracking: { fetchJob: async () => succeededJob(), sleep: async () => undefined },
    });
    chat.connect();

    expect(chat.chat("生成故事")).toBe(true);
    expect(chat.messages.value.at(-1)).toMatchObject({ role: "user" });
    expect(chat.activeAgentJob.value).toMatchObject({ jobId: 41, targetId: 7 });
    expect(fakeSocket.emitted.find((item) => item.event === "chat")?.data).toMatchObject({ content: "生成故事", requestId: expect.any(String) });
    await vi.waitFor(() => expect(chat.agentJobStatusText.value).toBe("已完成"));
    expect(chat.stopGenerate()).toBe(false);
  });

  it("prevents duplicate submissions while waiting for the queued ack and sends a requestId", () => {
    const chat = useChat({ url: "http://agent.test", autoConnect: false, manageLifecycle: false, jobStorageKey: "agent:7" });
    chat.connect();
    fakeSocket.holdChatAck = true;

    expect(chat.chat("生成故事")).toBe(true);
    expect(chat.chat("重复提交")).toBe(false);
    const submissions = fakeSocket.emitted.filter((item) => item.event === "chat");
    expect(submissions).toHaveLength(1);
    expect(submissions[0].data).toMatchObject({ content: "生成故事", requestId: expect.any(String) });
  });

  it("cancels the active backend queue job by jobId", async () => {
    const chat = useChat({
      url: "http://agent.test",
      autoConnect: false,
      manageLifecycle: false,
      jobStorageKey: "agent:7",
      agentJobTracking: {
        fetchJob: async () => ({ ...succeededJob(), status: "queued", queuePosition: 4, finishedAt: null }),
        sleep: async () => new Promise<void>(() => undefined),
      },
    });
    chat.connect();
    chat.chat("生成故事");

    expect(chat.stopGenerate()).toBe(true);
    expect(fakeSocket.emitted.find((item) => item.event === "stop")?.data).toEqual({ jobId: 41 });
  });

  it("tracks once when agent:queued and the chat ack announce the same job", async () => {
    const fetchJob = vi.fn(async () => ({ ...succeededJob(), status: "queued" as const, finishedAt: null }));
    const chat = useChat({
      url: "http://agent.test",
      autoConnect: false,
      manageLifecycle: false,
      jobStorageKey: "agent:7",
      agentJobTracking: {
        fetchJob,
        sleep: async () => new Promise<void>(() => undefined),
      },
    });
    chat.connect();
    fakeSocket.emitQueuedBeforeAck = true;

    chat.chat("生成故事");

    await vi.waitFor(() => expect(fetchJob).toHaveBeenCalledOnce());
    chat.disconnect();
  });

  it("restores the active job when the socket is already connected after refresh", async () => {
    localStorage.setItem("agent:7", JSON.stringify({ jobId: 41, targetId: 7, status: "queued" }));
    const chat = useChat({
      url: "http://agent.test",
      autoConnect: false,
      manageLifecycle: false,
      jobStorageKey: "agent:7",
      agentJobTracking: { fetchJob: async () => ({ ...succeededJob(), status: "cancelled" }), sleep: async () => undefined },
    });

    chat.connect();

    expect(chat.activeAgentJob.value).toMatchObject({ jobId: 41 });
    await vi.waitFor(() => expect(chat.agentJobStatusText.value).toBe("已取消"));
  });

  it("does not duplicate a raw event also returned in the replay ack", async () => {
    fakeSocket.replayBothWays = true;
    const chat = useChat({
      url: "http://agent.test",
      autoConnect: false,
      manageLifecycle: false,
      jobStorageKey: "agent:7",
      agentJobTracking: { fetchJob: async () => succeededJob(), sleep: async () => undefined },
    });
    chat.connect();
    chat.chat("生成故事");

    await vi.waitFor(() => expect(chat.messages.value.filter((message) => message.id === "m1")).toHaveLength(1));
  });
});
