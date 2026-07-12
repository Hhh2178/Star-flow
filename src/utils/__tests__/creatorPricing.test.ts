import { beforeEach, describe, expect, it, vi } from "vitest";

const axios = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/utils/axios", () => ({ default: axios }));
import {
  createLatestPricingEstimate,
  mapPricingError,
  parsePricingEstimate,
  requestPricingEstimate,
  type PricingEstimate,
  type PricingEstimateInput,
} from "../creatorPricing";

const validEstimate: PricingEstimate = {
  taskType: "video",
  canonicalModel: "aicopy:grok-imagine-video-1.5-preview",
  billingMode: "per_second",
  estimatedCost: 0.18,
  currency: "CNY",
  account: {
    groupId: 7,
    balance: 10,
    reservedBalance: 1,
    availableBalance: 9,
    billingStatus: "active",
  },
};

describe("Creator pricing estimates", () => {
  beforeEach(() => axios.post.mockReset());

  it("strictly parses a complete estimate response", () => {
    expect(parsePricingEstimate(validEstimate)).toEqual(validEstimate);
    expect(() => parsePricingEstimate({ ...validEstimate, credential: "must-not-pass" })).toThrow("计价响应格式无效");
    expect(() => parsePricingEstimate({ ...validEstimate, estimatedCost: "0.18" })).toThrow("计价响应格式无效");
    expect(() => parsePricingEstimate({
      ...validEstimate,
      account: { ...validEstimate.account, availableBalance: Number.NaN },
    })).toThrow("计价响应格式无效");
  });

  it("rejects an estimate whose available balance does not equal balance minus reserved balance", () => {
    expect(() => parsePricingEstimate({
      ...validEstimate,
      account: { ...validEstimate.account, availableBalance: 8.999999 },
    })).toThrow("计价响应格式无效");
  });

  it("rejects a negative reserved balance even when the arithmetic is internally consistent", () => {
    expect(() => parsePricingEstimate({
      ...validEstimate,
      account: {
        ...validEstimate.account,
        balance: 10,
        reservedBalance: -1,
        availableBalance: 11,
      },
    })).toThrow("计价响应格式无效");
  });

  it("rejects an estimate response for a different task type", async () => {
    axios.post.mockResolvedValueOnce({ data: { ...validEstimate, taskType: "image" } });

    await expect(requestPricingEstimate({
      taskType: "video",
      model: "video-model",
      units: { requests: 1, seconds: 5 },
    })).rejects.toThrow("计价响应格式无效");
  });

  it("passes the supplied AbortSignal to axios", async () => {
    const controller = new AbortController();
    axios.post.mockResolvedValueOnce({ data: validEstimate });
    const input: PricingEstimateInput = {
      taskType: "video",
      model: "video-model",
      units: { requests: 1, seconds: 5 },
    };

    await requestPricingEstimate(input, controller.signal);

    expect(axios.post).toHaveBeenCalledWith(
      "/generation/getPricingEstimate",
      input,
      { signal: controller.signal },
    );
  });

  it.each([
    ["PRICING_NOT_CONFIGURED", "当前模型尚未配置价格"],
    ["INSUFFICIENT_QUOTA", "分组可用额度不足"],
    ["ACCOUNT_IN_DEBT", "当前分组存在欠费，请联系管理员充值"],
  ])("maps %s to stable Chinese copy", (code, message) => {
    expect(mapPricingError({ data: { code }, message: "server detail" })).toBe(message);
  });

  it.each([
    ["PRICING_NOT_CONFIGURED", "当前模型尚未配置价格"],
    ["INSUFFICIENT_QUOTA", "分组可用额度不足"],
    ["ACCOUNT_IN_DEBT", "当前分组存在欠费，请联系管理员充值"],
  ])("maps top-level error.code %s to stable Chinese copy", (code, message) => {
    expect(mapPricingError({ code, message: "server detail" })).toBe(message);
  });

  it("falls through unknown transport codes to data.code and errorCode", () => {
    expect(mapPricingError({ code: "ERR_BAD_REQUEST", data: { code: "INSUFFICIENT_QUOTA" } })).toBe("分组可用额度不足");
    expect(mapPricingError({ code: "ERR_BAD_REQUEST", errorCode: "ACCOUNT_IN_DEBT" })).toBe("当前分组存在欠费，请联系管理员充值");
  });

  it("keeps only the latest model or duration response", async () => {
    const pending = new Map<string, (value: PricingEstimate) => void>();
    const request = vi.fn((input: PricingEstimateInput) => new Promise<PricingEstimate>((resolve) => {
      pending.set(`${input.model}:${input.units.seconds ?? 0}`, resolve);
    }));
    const latest = createLatestPricingEstimate(request);
    const applied: string[] = [];

    const oldRequest = latest.run(
      { taskType: "video", model: "model-a", units: { requests: 1, seconds: 5 } },
      (estimate) => applied.push(estimate.canonicalModel),
    );
    const newRequest = latest.run(
      { taskType: "video", model: "model-b", units: { requests: 1, seconds: 10 } },
      (estimate) => applied.push(estimate.canonicalModel),
    );

    pending.get("model-b:10")?.({ ...validEstimate, canonicalModel: "provider:model-b" });
    await newRequest;
    pending.get("model-a:5")?.({ ...validEstimate, canonicalModel: "provider:model-a" });
    await oldRequest;

    expect(applied).toEqual(["provider:model-b"]);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("aborts the previous request when a newer estimate starts", async () => {
    const signals: AbortSignal[] = [];
    const request = vi.fn((input: PricingEstimateInput, signal: AbortSignal) => {
      signals.push(signal);
      if (input.model === "model-b") return Promise.resolve({ ...validEstimate, canonicalModel: "provider:model-b" });
      return new Promise<PricingEstimate>((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    });
    const latest = createLatestPricingEstimate(request);
    const errors: string[] = [];

    const oldRequest = latest.run(
      { taskType: "video", model: "model-a", units: { requests: 1, seconds: 5 } },
      vi.fn(),
      (message) => errors.push(message),
    );
    const newRequest = latest.run(
      { taskType: "video", model: "model-b", units: { requests: 1, seconds: 10 } },
      vi.fn(),
      (message) => errors.push(message),
    );

    expect(signals[0].aborted).toBe(true);
    await expect(oldRequest).resolves.toBe(false);
    await expect(newRequest).resolves.toBe(true);
    expect(errors).toEqual([]);
  });

  it("invalidate aborts the active request without invoking callbacks", async () => {
    let signal: AbortSignal | undefined;
    const request = vi.fn((_input: PricingEstimateInput, currentSignal: AbortSignal) => {
      signal = currentSignal;
      return new Promise<PricingEstimate>((_resolve, reject) => {
        currentSignal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
      });
    });
    const latest = createLatestPricingEstimate(request);
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const pending = latest.run(
      { taskType: "image", model: "model-a", units: { requests: 1, images: 1 } },
      onSuccess,
      onError,
    );

    latest.invalidate();

    expect(signal?.aborted).toBe(true);
    await expect(pending).resolves.toBe(false);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
