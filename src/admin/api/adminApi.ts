import type { AxiosResponse } from "axios";
import { createApiClient } from "../../shared/api";
import type { ApiResponse, UserRole } from "../../shared/auth";

export type GenerationTaskType = "text" | "image" | "video";
export type GenerationJobStatus =
  | "queued"
  | "running"
  | "recovering"
  | "needs_attention"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ConcurrencyLimit {
  total: number;
  text: number;
  image: number;
  video: number;
}

export interface GenerationJobListItem {
  id: number;
  groupId: number;
  ownerUserId: number;
  projectId: number | null;
  taskType: GenerationTaskType;
  status: GenerationJobStatus;
  priority: number;
  queuePosition: number | null;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  errorMessage: string | null;
}

export type JobStatusCounts = Record<GenerationJobStatus, number>;

export interface JobListFilters {
  status?: GenerationJobStatus;
  taskType?: GenerationTaskType;
  ownerUserId?: number;
}

export interface JobListResult {
  items: GenerationJobListItem[];
  counts: JobStatusCounts;
}

export interface GroupDto {
  id: number;
  name: string;
  adminUserId: number | null;
  creatorLimit: number;
  status: "enabled" | "disabled";
  createdAt: number;
  updatedAt: number;
}

export interface UserDto {
  id: number;
  name: string;
  role: UserRole;
  status: "enabled" | "disabled";
  groupId: number | null;
  mustChangePassword: boolean;
  createdAt: number | null;
  updatedAt: number | null;
  lastLoginAt: number | null;
}

export interface QuotaSummary {
  balance: number;
  totalRecharge: number;
  totalUsage: number;
}

export type QuotaEntryType =
  | "manual_topup"
  | "manual_credit"
  | "manual_debit"
  | "usage_debit";

export interface QuotaGroupSummary extends QuotaSummary {
  groupId: number;
  groupName: string;
}

export interface QuotaLedgerItem {
  id: number;
  groupId: number;
  entryType: QuotaEntryType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  actorUserId: number | null;
  usageLedgerId: number | null;
  reason: string;
  createdAt: number;
}

export interface QuotaOverview {
  summary: QuotaSummary;
  groups: QuotaGroupSummary[];
  logs: QuotaLedgerItem[];
}

export interface QuotaAdjustmentInput {
  groupId: number;
  entryType: Extract<QuotaEntryType, "manual_topup" | "manual_credit" | "manual_debit">;
  amount: number;
  reason: string;
}

export type AuditScalar = string | number | boolean | null;

export interface AuditItem {
  id: number;
  actorUserId: number;
  actorRole: UserRole;
  actorRoleLabel: string;
  groupId: number | null;
  action: string;
  actionLabel: string;
  targetType: string;
  targetTypeLabel: string;
  targetId: string | null;
  targetRole: UserRole | null;
  summary: Record<string, AuditScalar>;
  result: string;
  resultLabel: string;
  requestId: string | null;
  createdAt: number;
}

export interface AuditListFilters {
  page?: number;
  pageSize?: number;
  groupId?: number;
}

export interface AuditListResult {
  page: number;
  pageSize: number;
  total: number;
  items: AuditItem[];
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string | number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

const client = createApiClient();
const hasChinese = (value: string) => /[\u3400-\u9fff]/u.test(value);

function errorCode(value: unknown): string | number | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? code : undefined;
}

export function adminErrorText(error: unknown, fallback = "请求失败，请稍后重试"): string {
  if (error instanceof AdminApiError) return error.message;
  const value = typeof error === "object" && error !== null
    ? error as { status?: unknown; message?: unknown }
    : {};
  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (message && hasChinese(message)) return message;

  const status = Number(value.status);
  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "无权执行此操作";
  if (status === 404) return "请求的数据不存在";
  if (status === 409) return "操作冲突，请刷新后重试";
  if (status === 422) return "提交的数据不符合要求";
  if (status >= 500) return "服务器暂时无法处理请求";
  if (message && /network|timeout/i.test(message)) return "网络连接失败，请稍后重试";
  return fallback;
}

async function unwrap<T>(request: Promise<AxiosResponse<ApiResponse<T>>>): Promise<T> {
  try {
    const response = await request;
    const envelope = response.data;
    if (!envelope || envelope.code < 200 || envelope.code >= 300) {
      throw new AdminApiError(
        adminErrorText({ status: envelope?.code, message: envelope?.message }),
        envelope?.code,
        errorCode(envelope?.data) ?? errorCode(envelope),
      );
    }
    return envelope.data;
  } catch (cause) {
    if (cause instanceof AdminApiError) throw cause;
    const value = typeof cause === "object" && cause !== null
      ? cause as { status?: unknown; code?: unknown; data?: unknown }
      : {};
    const status = Number.isFinite(Number(value.status)) ? Number(value.status) : undefined;
    const code = errorCode(value.data) ?? errorCode(value);
    throw new AdminApiError(adminErrorText(cause), status, code);
  }
}

export function listJobs(filters: JobListFilters = {}) {
  return unwrap<JobListResult>(client.get("/admin/queue/listJobs", { params: filters }));
}

export function cancelJob(id: number) {
  return unwrap<GenerationJobListItem>(client.post("/admin/queue/cancelJob", { id }));
}

export function reprioritizeJob(input: { id: number; priority: number; reason: string }) {
  return unwrap<GenerationJobListItem>(client.post("/admin/queue/reprioritizeJob", input));
}

export function getPolicies(input: { groupId: number; userId: number }) {
  return unwrap<{ group: ConcurrencyLimit; user: ConcurrencyLimit }>(
    client.get("/admin/concurrency/getPolicies", { params: input }),
  );
}

export function updateGroupPolicy(input: { groupId: number } & ConcurrencyLimit) {
  return unwrap<ConcurrencyLimit>(client.post("/admin/concurrency/updateGroupPolicy", input));
}

export function updateUserPolicy(input: { userId: number } & ConcurrencyLimit) {
  return unwrap<ConcurrencyLimit>(client.post("/admin/concurrency/updateUserPolicy", input));
}

export function listGroups() {
  return unwrap<GroupDto[]>(client.get("/admin/groups/listGroups"));
}

export function listUsers() {
  return unwrap<UserDto[]>(client.get("/admin/users/listUsers"));
}

export function getQuotaOverview() {
  return unwrap<QuotaOverview>(client.get("/admin/quota/getOverview"));
}

export function adjustQuota(input: QuotaAdjustmentInput) {
  return unwrap<{ account: { groupId: number; balance: number; updatedAt: number }; ledger: QuotaLedgerItem }>(
    client.post("/admin/quota/adjustQuota", input),
  );
}

export function listAudit(filters: AuditListFilters = {}) {
  return unwrap<AuditListResult>(client.get("/admin/audit/listAudit", { params: filters }));
}
