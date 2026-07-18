import axios from "@/utils/axios";

export type PricingTaskType = "text" | "image" | "video";
export type PricingBillingMode = "per_request" | "per_second" | "per_token";

export interface PricingUnits {
  requests?: number;
  images?: number;
  seconds?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface PricingEstimateInput {
  taskType: PricingTaskType;
  model: string;
  units: PricingUnits;
}

export interface PricingEstimate {
  taskType: PricingTaskType;
  canonicalModel: string;
  billingMode: PricingBillingMode;
  estimatedCost: number;
  currency: "CNY";
  account: {
    groupId: number;
    balance: number;
    reservedBalance: number;
    availableBalance: number;
    billingStatus: "active" | "debt";
  };
}

export const pricingErrorMessages = {
  PRICING_NOT_CONFIGURED: "当前模型尚未配置价格",
  INSUFFICIENT_QUOTA: "分组可用额度不足",
  ACCOUNT_IN_DEBT: "当前分组存在欠费，请联系管理员充值",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toMoneyMicros(value: number): number {
  return Math.round(value * 1_000_000);
}

export function parsePricingEstimate(value: unknown): PricingEstimate {
  const rootKeys = ["taskType", "canonicalModel", "billingMode", "estimatedCost", "currency", "account"];
  const accountKeys = ["groupId", "balance", "reservedBalance", "availableBalance", "billingStatus"];
  if (!isRecord(value) || !hasExactKeys(value, rootKeys) || !isRecord(value.account) || !hasExactKeys(value.account, accountKeys)) {
    throw new Error("计价响应格式无效");
  }
  const taskTypes: PricingTaskType[] = ["text", "image", "video"];
  const billingModes: PricingBillingMode[] = ["per_request", "per_second", "per_token"];
  if (
    !taskTypes.includes(value.taskType as PricingTaskType)
    || typeof value.canonicalModel !== "string"
    || value.canonicalModel.length === 0
    || !billingModes.includes(value.billingMode as PricingBillingMode)
    || !isFiniteNumber(value.estimatedCost)
    || value.estimatedCost < 0
    || value.currency !== "CNY"
    || !Number.isInteger(value.account.groupId)
    || Number(value.account.groupId) <= 0
    || !isFiniteNumber(value.account.balance)
    || !isFiniteNumber(value.account.reservedBalance)
    || value.account.reservedBalance < 0
    || !isFiniteNumber(value.account.availableBalance)
    || toMoneyMicros(value.account.availableBalance) !== toMoneyMicros(value.account.balance) - toMoneyMicros(value.account.reservedBalance)
    || !["active", "debt"].includes(value.account.billingStatus as string)
  ) {
    throw new Error("计价响应格式无效");
  }
  return value as unknown as PricingEstimate;
}

export function mapPricingError(error: unknown, fallback = "暂时无法获取预计费用"): string {
  if (isRecord(error)) {
    const nestedCode = isRecord(error.data) ? error.data.code : undefined;
    const code = [error.code, nestedCode, error.errorCode]
      .find((candidate): candidate is string => typeof candidate === "string" && candidate in pricingErrorMessages);
    if (code) {
      return pricingErrorMessages[code as keyof typeof pricingErrorMessages];
    }
  }
  return fallback;
}

export async function requestPricingEstimate(input: PricingEstimateInput, signal?: AbortSignal): Promise<PricingEstimate> {
  const response = await axios.post("/generation/getPricingEstimate", input, { signal });
  const estimate = parsePricingEstimate(response.data);
  if (estimate.taskType !== input.taskType) throw new Error("计价响应格式无效");
  return estimate;
}

type EstimateRequest = (input: PricingEstimateInput, signal: AbortSignal) => Promise<PricingEstimate>;

function isAbortError(error: unknown): boolean {
  return isRecord(error) && error.name === "AbortError";
}

export function createLatestPricingEstimate(request: EstimateRequest = requestPricingEstimate) {
  let latestRequest = 0;
  let activeController: AbortController | null = null;
  return {
    invalidate() {
      latestRequest += 1;
      activeController?.abort();
      activeController = null;
    },
    async run(
      input: PricingEstimateInput,
      onSuccess: (estimate: PricingEstimate) => void,
      onError?: (message: string) => void,
    ): Promise<boolean> {
      const requestId = ++latestRequest;
      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      try {
        const estimate = await request(input, controller.signal);
        if (requestId !== latestRequest) return false;
        onSuccess(estimate);
        return true;
      } catch (error) {
        if (requestId !== latestRequest || isAbortError(error)) return false;
        onError?.(mapPricingError(error));
        return false;
      } finally {
        if (activeController === controller) activeController = null;
      }
    },
  };
}

export function formatEstimatedCost(estimate: PricingEstimate): string {
  return `预计费用 ¥${estimate.estimatedCost.toFixed(6)}`;
}

export async function runCreatorPricingGuard<T>(options: {
  blocked: boolean;
  message: string;
  onBlocked: (message: string) => void;
  submit: () => Promise<T>;
}): Promise<T | null> {
  if (options.blocked) {
    options.onBlocked(options.message);
    return null;
  }
  return options.submit();
}

export class CreatorPricingBlockedError extends Error {
  readonly name = "CreatorPricingBlockedError";

  constructor(public readonly code: keyof typeof pricingErrorMessages) {
    super(pricingErrorMessages[code]);
  }
}

export async function runCreatorPricedEnqueue<T>(options: {
  input: PricingEstimateInput;
  requestEstimate?: (input: PricingEstimateInput) => Promise<PricingEstimate>;
  confirm: (estimate: PricingEstimate) => Promise<boolean>;
  enqueue: () => Promise<T>;
}): Promise<T | null> {
  const estimate = await (options.requestEstimate ?? requestPricingEstimate)(options.input);
  if (estimate.account.billingStatus === "debt") {
    throw new CreatorPricingBlockedError("ACCOUNT_IN_DEBT");
  }
  if (estimate.account.availableBalance < estimate.estimatedCost) {
    throw new CreatorPricingBlockedError("INSUFFICIENT_QUOTA");
  }
  if (!await options.confirm(estimate)) return null;
  return options.enqueue();
}

function snapshotValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => snapshotValue(item)) as T;
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, snapshotValue(item)]),
    ) as T;
  }
  return value;
}

export function runCreatorPricedBatchEnqueue<TItem, TResult>(options: {
  items: readonly TItem[];
  createInput: (snapshot: TItem[]) => PricingEstimateInput;
  requestEstimate?: (input: PricingEstimateInput) => Promise<PricingEstimate>;
  confirm: (estimate: PricingEstimate, snapshot: TItem[]) => Promise<boolean>;
  enqueue: (snapshot: TItem[]) => Promise<TResult>;
}): Promise<TResult | null> {
  const snapshot = snapshotValue([...options.items]);
  return runCreatorPricedEnqueue({
    input: options.createInput(snapshot),
    requestEstimate: options.requestEstimate,
    confirm: (estimate) => options.confirm(estimate, snapshot),
    enqueue: () => options.enqueue(snapshot),
  });
}
