import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../shared/api", () => ({
  createApiClient: vi.fn(() => client),
}));

import {
  AdminApiError,
  adjustQuota,
  cancelJob,
  getPolicies,
  getQuotaOverview,
  listAudit,
  listGroups,
  listJobs,
  listUsers,
  reprioritizeJob,
  updateGroupPolicy,
  updateUserPolicy,
} from "../api/adminApi";

function ok<T>(data: T) {
  return { data: { code: 200, data, message: "成功" } };
}

describe("adminApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps ApiResponse data and sends queue filters as query params", async () => {
    client.get.mockResolvedValue(ok({ items: [], counts: { queued: 0 } }));

    await expect(listJobs({ status: "queued", taskType: "image", ownerUserId: 7 })).resolves.toMatchObject({
      items: [],
    });
    expect(client.get).toHaveBeenCalledWith("/admin/queue/listJobs", {
      params: { status: "queued", taskType: "image", ownerUserId: 7 },
    });
  });

  it("uses the existing admin endpoints and typed request bodies", async () => {
    client.get.mockResolvedValue(ok([]));
    client.post.mockResolvedValue(ok({}));

    await cancelJob(12);
    await reprioritizeJob({ id: 12, priority: 8, reason: "紧急交付" });
    await getPolicies({ groupId: 3, userId: 7 });
    await updateGroupPolicy({ groupId: 3, total: 8, text: 4, image: 3, video: 1 });
    await updateUserPolicy({ userId: 7, total: 4, text: 2, image: 1, video: 1 });
    await listGroups();
    await listUsers();
    await getQuotaOverview();
    await adjustQuota({ groupId: 3, entryType: "manual_credit", amount: 2.5, reason: "运营补偿" });
    await listAudit({ page: 2, pageSize: 20, groupId: 3 });

    expect(client.post.mock.calls).toEqual([
      ["/admin/queue/cancelJob", { id: 12 }],
      ["/admin/queue/reprioritizeJob", { id: 12, priority: 8, reason: "紧急交付" }],
      ["/admin/concurrency/updateGroupPolicy", { groupId: 3, total: 8, text: 4, image: 3, video: 1 }],
      ["/admin/concurrency/updateUserPolicy", { userId: 7, total: 4, text: 2, image: 1, video: 1 }],
      ["/admin/quota/adjustQuota", { groupId: 3, entryType: "manual_credit", amount: 2.5, reason: "运营补偿" }],
    ]);
    expect(client.get.mock.calls).toEqual([
      ["/admin/concurrency/getPolicies", { params: { groupId: 3, userId: 7 } }],
      ["/admin/groups/listGroups"],
      ["/admin/users/listUsers"],
      ["/admin/quota/getOverview"],
      ["/admin/audit/listAudit", { params: { page: 2, pageSize: 20, groupId: 3 } }],
    ]);
  });

  it("returns Chinese errors without retaining rejected payload data", async () => {
    client.get.mockRejectedValue({
      status: 500,
      message: "Request failed with status code 500",
      data: { payload: "provider-secret", apiKey: "do-not-leak" },
    });

    const error = await listGroups().catch((cause) => cause);

    expect(error).toBeInstanceOf(AdminApiError);
    expect(error).toMatchObject({ status: 500, message: "服务器暂时无法处理请求" });
    expect(error).not.toHaveProperty("data");
    expect(JSON.stringify(error)).not.toContain("provider-secret");
    expect(JSON.stringify(error)).not.toContain("do-not-leak");
  });

  it("keeps a Chinese backend error message", async () => {
    client.post.mockRejectedValue({ status: 422, code: "USER_TOTAL_EXCEEDS_GROUP", message: "个人总并发不能超过分组总并发" });

    await expect(updateUserPolicy({ userId: 7, total: 9, text: 1, image: 1, video: 1 })).rejects.toThrow(
      "个人总并发不能超过分组总并发",
    );
  });

  it("extracts the stable backend error code from the real error envelope without retaining data", async () => {
    client.post.mockRejectedValue({
      status: 422,
      code: 400,
      message: "个人总并发不能超过分组总并发",
      data: { code: "USER_TOTAL_EXCEEDS_GROUP", internal: "do-not-retain" },
    });

    const error = await updateUserPolicy({ userId: 7, total: 9, text: 1, image: 1, video: 1 })
      .catch((cause) => cause);

    expect(error).toMatchObject({
      status: 422,
      code: "USER_TOTAL_EXCEEDS_GROUP",
      message: "个人总并发不能超过分组总并发",
    });
    expect(error).not.toHaveProperty("data");
    expect(JSON.stringify(error)).not.toContain("do-not-retain");
  });
});
