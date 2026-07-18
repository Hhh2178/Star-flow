import { describe, expect, it, vi } from "vitest";
import {
  runCreatorPricedBatchEnqueue,
  runCreatorPricedEnqueue,
  runCreatorPricingGuard,
  type PricingEstimate,
  type PricingEstimateInput,
} from "../creatorPricing";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

const allowedEstimate: PricingEstimate = {
  taskType: "text",
  canonicalModel: "mimo:mimo-v2.5",
  billingMode: "per_request",
  estimatedCost: 0.1,
  currency: "CNY",
  account: {
    groupId: 7,
    balance: 10,
    reservedBalance: 0,
    availableBalance: 10,
    billingStatus: "active",
  },
};

describe("Creator priced enqueue controller", () => {
  it("does not run an image submission when pricing is blocked", async () => {
    const onBlocked = vi.fn();
    const submit = vi.fn(async () => "submitted");

    await expect(runCreatorPricingGuard({
      blocked: true,
      message: "分组可用额度不足",
      onBlocked,
      submit,
    })).resolves.toBeNull();

    expect(onBlocked).toHaveBeenCalledWith("分组可用额度不足");
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not confirm or enqueue when the completed estimate is blocked", async () => {
    const estimateDeferred = deferred<PricingEstimate>();
    const requestEstimate = vi.fn(() => estimateDeferred.promise);
    const confirm = vi.fn(async () => true);
    const enqueue = vi.fn(async () => "queued");
    const pending = runCreatorPricedEnqueue({
      input: { taskType: "text", model: "universalAi", units: { requests: 2 } },
      requestEstimate,
      confirm,
      enqueue,
    });

    expect(requestEstimate).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();

    estimateDeferred.resolve({
      ...allowedEstimate,
      estimatedCost: 2,
      account: { ...allowedEstimate.account, availableBalance: 1 },
    });

    await expect(pending).rejects.toMatchObject({ code: "INSUFFICIENT_QUOTA" });
    expect(confirm).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("waits for estimate and confirmation before enqueueing", async () => {
    const calls: string[] = [];
    const estimateDeferred = deferred<PricingEstimate>();
    const confirmDeferred = deferred<boolean>();
    const pending = runCreatorPricedEnqueue({
      input: { taskType: "text", model: "universalAi", units: { requests: 2 } },
      requestEstimate: () => {
        calls.push("estimate");
        return estimateDeferred.promise;
      },
      confirm: (estimate) => {
        calls.push(`confirm:${estimate.estimatedCost}`);
        return confirmDeferred.promise;
      },
      enqueue: async () => {
        calls.push("enqueue");
        return "queued";
      },
    });

    expect(calls).toEqual(["estimate"]);
    estimateDeferred.resolve(allowedEstimate);
    await vi.waitFor(() => expect(calls).toEqual(["estimate", "confirm:0.1"]));
    expect(calls).not.toContain("enqueue");

    confirmDeferred.resolve(true);
    await expect(pending).resolves.toBe("queued");
    expect(calls).toEqual(["estimate", "confirm:0.1", "enqueue"]);
  });

  it("keeps estimate, confirmation and enqueue on the same initial batch snapshot", async () => {
    const estimateDeferred = deferred<PricingEstimate>();
    const selectedRows = [{ index: 1, chapter: "第一章", chapterData: "原始内容" }];
    let estimateInput: PricingEstimateInput | undefined;
    let confirmedRows: typeof selectedRows | undefined;
    let enqueuedRows: typeof selectedRows | undefined;

    const pending = runCreatorPricedBatchEnqueue({
      items: selectedRows,
      createInput: (snapshot) => ({
        taskType: "text",
        model: "universalAi",
        units: { requests: snapshot.length },
      }),
      requestEstimate: (input) => {
        estimateInput = input;
        return estimateDeferred.promise;
      },
      confirm: async (_estimate, snapshot) => {
        confirmedRows = snapshot;
        return true;
      },
      enqueue: async (snapshot) => {
        enqueuedRows = snapshot;
        return "queued";
      },
    });

    selectedRows[0].chapterData = "已被界面修改";
    selectedRows.push({ index: 2, chapter: "第二章", chapterData: "新增内容" });
    estimateDeferred.resolve(allowedEstimate);

    await expect(pending).resolves.toBe("queued");
    expect(estimateInput?.units.requests).toBe(1);
    expect(confirmedRows).toEqual([{ index: 1, chapter: "第一章", chapterData: "原始内容" }]);
    expect(enqueuedRows).toEqual([{ index: 1, chapter: "第一章", chapterData: "原始内容" }]);
    expect(enqueuedRows).not.toBe(selectedRows);
  });
});
