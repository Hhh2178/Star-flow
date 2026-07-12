import type { AxiosResponse } from "axios";
import { createApiClient } from "../../shared/api";
import type { ApiResponse, UserRole } from "../../shared/auth";

export type GenerationTaskType = "text" | "image" | "video";
export type BillingMode = "per_request" | "per_second" | "per_token";
export interface BillingUnits { requests?: number; images?: number; seconds?: number; inputTokens?: number; outputTokens?: number }
export interface ModelPricing {
  pricingId: number; providerId: string; modelId: string; taskType: GenerationTaskType; billingMode: BillingMode;
  requestPrice: number | null; secondPrice: number | null; inputPricePerMillion: number | null;
  outputPricePerMillion: number | null; fallbackRequestPrice: number | null; currency: "CNY"; version: number; effectiveAt: number;
}
export type PricingSnapshot = Omit<ModelPricing, "requestPrice" | "secondPrice" | "inputPricePerMillion" | "outputPricePerMillion" | "fallbackRequestPrice">
  & Partial<Pick<ModelPricing, "requestPrice" | "secondPrice" | "inputPricePerMillion" | "outputPricePerMillion" | "fallbackRequestPrice">>;
export type UpdatePricingInput = Pick<ModelPricing, "providerId" | "modelId" | "taskType" | "billingMode" | "currency">
  & Partial<Pick<ModelPricing, "requestPrice" | "secondPrice" | "inputPricePerMillion" | "outputPricePerMillion" | "fallbackRequestPrice">>;
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

export interface GenerationJobMutationResult {
  id: number;
  groupId: number;
  ownerUserId: number;
  projectId: number | null;
  sourceTaskId: number | null;
  handlerKey: string;
  taskType: GenerationTaskType;
  status: GenerationJobStatus;
  priority: number;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
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

export interface CreateUserInput {
  name: string;
  password: string;
  role: UserRole;
  status?: "enabled" | "disabled";
  groupId?: number;
  groupName?: string;
  creatorLimit?: number;
}

export interface UpdateUserInput {
  id: number;
  name?: string;
  role?: UserRole;
  status?: "enabled" | "disabled";
  groupId?: number;
}

export interface UpdateGroupInput {
  id: number;
  name?: string;
  adminUserId?: number;
  creatorLimit?: number;
  status?: "enabled" | "disabled";
}

export interface QuotaSummary {
  balance: number;
  reservedBalance: number;
  availableBalance: number;
  billingStatus: "active" | "debt";
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

interface PolicyResult {
  group: ConcurrencyLimit;
  user: ConcurrencyLimit;
}

interface QuotaAdjustmentResult {
  account: { groupId: number; balance: number; updatedAt: number };
  ledger: QuotaLedgerItem;
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

export interface MonitoringFilters {
  page?: number;
  pageSize?: number;
  groupId?: number;
  ownerUserId?: number;
  search?: string;
}

export interface ProjectListItem {
  id: number;
  name: string;
  projectType: string | null;
  type: string | null;
  ownerUserId: number | null;
  ownerName: string | null;
  groupId: number;
  groupName: string;
  createTime: number | null;
  taskCount: number;
}

export interface ProjectListResult {
  page: number;
  pageSize: number;
  total: number;
  items: ProjectListItem[];
}

export interface TaskListFilters extends MonitoringFilters {
  projectId?: number;
  state?: string;
  taskClass?: string;
}

export interface TaskListItem {
  id: number;
  projectId: number;
  projectName: string;
  ownerUserId: number | null;
  ownerName: string | null;
  groupId: number;
  groupName: string;
  taskClass: string | null;
  model: string | null;
  description: string | null;
  state: string | null;
  startTime: number | null;
  reason: string | null;
}

export interface TaskListResult {
  page: number;
  pageSize: number;
  total: number;
  items: TaskListItem[];
}

export interface UsageFilters extends MonitoringFilters {
  projectId?: number;
  taskType?: string;
  providerId?: string;
  modelId?: string;
}

export interface UsageListItem {
  id: number;
  jobId: number;
  groupId: number;
  groupName: string;
  userId: number;
  userName: string;
  projectId: number | null;
  projectName: string | null;
  providerId: string | null;
  modelId: string | null;
  taskType: string;
  estimatedCost: number | null;
  currency: string | null;
  result: string;
  createdAt: number;
  units: BillingUnits;
  pricingSnapshot: PricingSnapshot | null;
  billingMode: BillingMode | null;
  finalCost: number | null;
}

export interface UsageOverview {
  summary: { recordCount: number; estimatedCost: number };
  breakdown: Array<{ taskType: string; recordCount: number; estimatedCost: number }>;
  page: number;
  pageSize: number;
  total: number;
  items: UsageListItem[];
}

export interface AdminCapability {
  read: boolean;
  update: boolean;
}

export interface ProviderOverview {
  providers: Array<{
    id: string;
    name: string;
    enabled: boolean;
    configured: boolean;
    inputs: Array<{ key: string; label: string; type: string; required: boolean; configured: boolean }>;
    modelCount: number;
    modelTypes: Array<{ type: string; count: number }>;
    models: Array<{ name: string; modelName: string; type: GenerationTaskType }>;
  }>;
  capabilities: AdminCapability;
}

export interface AiConfigOverview {
  useMode: "0" | "1";
  deployments: Array<{
    id: number;
    name: string;
    description: string;
    vendorId: string | null;
    model: string | null;
    modelName: string | null;
    temperature: number | null;
    maxOutputTokens: number | null;
    disabled: boolean;
    configured: boolean;
  }>;
  capabilities: AdminCapability;
}

export interface ProviderConnectionResult {
  providerId: string;
  modelName: string;
  status: "available";
  modelAvailable: boolean;
  latencyMs: number;
  checkedAt: number;
}

export interface SystemOverview {
  database: { tables: Array<{ name: string; rowCount: number }> };
  development: { aiDevToolsEnabled: boolean };
  runtime: { nodeVersion: string; platform: string; environment: string };
  capabilities: {
    updateDevelopment: boolean;
    clearDatabase: boolean;
    importDatabase: boolean;
    exportDatabase: boolean;
  };
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
const invalidEnvelopeText = "服务器响应格式无效，请稍后重试";
const invalidDataText = "服务器响应数据无效，请稍后重试";
const generationStatuses: readonly GenerationJobStatus[] = ["queued", "running", "recovering", "needs_attention", "succeeded", "failed", "cancelled"];
const generationTaskTypes: readonly GenerationTaskType[] = ["text", "image", "video"];
const userRoles: readonly UserRole[] = ["super_admin", "admin", "creator"];
const quotaEntryTypes: readonly QuotaEntryType[] = ["manual_topup", "manual_credit", "manual_debit", "usage_debit"];

type DataGuard<T> = (value: unknown) => value is T;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function isArrayOf<T>(value: unknown, guard: DataGuard<T>): value is T[] {
  return Array.isArray(value) && value.every(guard);
}

function isConcurrencyLimit(value: unknown): value is ConcurrencyLimit {
  return isRecord(value)
    && isInteger(value.total)
    && isInteger(value.text)
    && isInteger(value.image)
    && isInteger(value.video);
}

function isGenerationJob(value: unknown): value is GenerationJobListItem {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.groupId)
    && isInteger(value.ownerUserId)
    && isNullableNumber(value.projectId)
    && isOneOf(value.taskType, generationTaskTypes)
    && isOneOf(value.status, generationStatuses)
    && isInteger(value.priority)
    && isNullableNumber(value.queuePosition)
    && isFiniteNumber(value.queuedAt)
    && isNullableNumber(value.startedAt)
    && isNullableNumber(value.finishedAt)
    && isNullableString(value.errorMessage);
}

function isGenerationJobMutationResult(value: unknown): value is GenerationJobMutationResult {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.groupId)
    && isInteger(value.ownerUserId)
    && isNullableNumber(value.projectId)
    && isNullableNumber(value.sourceTaskId)
    && typeof value.handlerKey === "string"
    && isOneOf(value.taskType, generationTaskTypes)
    && isOneOf(value.status, generationStatuses)
    && isInteger(value.priority)
    && isFiniteNumber(value.queuedAt)
    && isNullableNumber(value.startedAt)
    && isNullableNumber(value.finishedAt);
}

function isJobListResult(value: unknown): value is JobListResult {
  if (!isRecord(value) || !isArrayOf(value.items, isGenerationJob)) return false;
  const counts = value.counts;
  if (!isRecord(counts)) return false;
  return generationStatuses.every((status) => isFiniteNumber(counts[status]));
}

function isPolicyResult(value: unknown): value is PolicyResult {
  return isRecord(value) && isConcurrencyLimit(value.group) && isConcurrencyLimit(value.user);
}

function isGroup(value: unknown): value is GroupDto {
  return isRecord(value)
    && isInteger(value.id)
    && typeof value.name === "string"
    && isNullableNumber(value.adminUserId)
    && isInteger(value.creatorLimit)
    && (value.status === "enabled" || value.status === "disabled")
    && isFiniteNumber(value.createdAt)
    && isFiniteNumber(value.updatedAt);
}

function isUser(value: unknown): value is UserDto {
  return isRecord(value)
    && isInteger(value.id)
    && typeof value.name === "string"
    && isOneOf(value.role, userRoles)
    && (value.status === "enabled" || value.status === "disabled")
    && isNullableNumber(value.groupId)
    && typeof value.mustChangePassword === "boolean"
    && isNullableNumber(value.createdAt)
    && isNullableNumber(value.updatedAt)
    && isNullableNumber(value.lastLoginAt);
}

function isQuotaSummary(value: unknown): value is QuotaSummary & Record<string, unknown> {
  return isRecord(value)
    && isMoneyAmount(value.balance)
    && isPrice(value.reservedBalance)
    && isMoneyAmount(value.availableBalance)
    && moneyMicros(value.availableBalance) === moneyMicros(value.balance) - moneyMicros(value.reservedBalance)
    && (value.billingStatus === "active" || value.billingStatus === "debt")
    && isPrice(value.totalRecharge)
    && isPrice(value.totalUsage);
}

function isQuotaGroup(value: unknown): value is QuotaGroupSummary {
  return isQuotaSummary(value)
    && isInteger(value.groupId)
    && typeof value.groupName === "string";
}

function isQuotaLedger(value: unknown): value is QuotaLedgerItem {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.groupId)
    && isOneOf(value.entryType, quotaEntryTypes)
    && isFiniteNumber(value.amount)
    && isFiniteNumber(value.balanceBefore)
    && isFiniteNumber(value.balanceAfter)
    && isNullableNumber(value.actorUserId)
    && isNullableNumber(value.usageLedgerId)
    && typeof value.reason === "string"
    && isFiniteNumber(value.createdAt);
}

function isQuotaOverview(value: unknown): value is QuotaOverview {
  return isRecord(value)
    && isQuotaSummary(value.summary)
    && isArrayOf(value.groups, isQuotaGroup)
    && isArrayOf(value.logs, isQuotaLedger);
}

function isQuotaAdjustmentResult(value: unknown): value is QuotaAdjustmentResult {
  return isRecord(value)
    && isRecord(value.account)
    && isInteger(value.account.groupId)
    && isFiniteNumber(value.account.balance)
    && isFiniteNumber(value.account.updatedAt)
    && isQuotaLedger(value.ledger);
}

function isAuditSummary(value: unknown): value is Record<string, AuditScalar> {
  return isRecord(value) && Object.values(value).every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
}

function isAuditItem(value: unknown): value is AuditItem {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.actorUserId)
    && isOneOf(value.actorRole, userRoles)
    && typeof value.actorRoleLabel === "string"
    && isNullableNumber(value.groupId)
    && typeof value.action === "string"
    && typeof value.actionLabel === "string"
    && typeof value.targetType === "string"
    && typeof value.targetTypeLabel === "string"
    && isNullableString(value.targetId)
    && (value.targetRole === null || isOneOf(value.targetRole, userRoles))
    && isAuditSummary(value.summary)
    && typeof value.result === "string"
    && typeof value.resultLabel === "string"
    && isNullableString(value.requestId)
    && isFiniteNumber(value.createdAt);
}

function isAuditListResult(value: unknown): value is AuditListResult {
  return isRecord(value)
    && isInteger(value.page)
    && isInteger(value.pageSize)
    && isInteger(value.total)
    && isArrayOf(value.items, isAuditItem);
}

function isPageEnvelope(value: unknown): value is Record<string, unknown> {
  return isRecord(value) && isInteger(value.page) && isInteger(value.pageSize) && isInteger(value.total);
}

function isProjectItem(value: unknown): value is ProjectListItem {
  return isRecord(value)
    && isInteger(value.id)
    && typeof value.name === "string"
    && isNullableString(value.projectType)
    && isNullableString(value.type)
    && isNullableNumber(value.ownerUserId)
    && isNullableString(value.ownerName)
    && isInteger(value.groupId)
    && typeof value.groupName === "string"
    && isNullableNumber(value.createTime)
    && isInteger(value.taskCount);
}

function isProjectListResult(value: unknown): value is ProjectListResult {
  return isPageEnvelope(value) && isArrayOf(value.items, isProjectItem);
}

function isTaskItem(value: unknown): value is TaskListItem {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.projectId)
    && typeof value.projectName === "string"
    && isNullableNumber(value.ownerUserId)
    && isNullableString(value.ownerName)
    && isInteger(value.groupId)
    && typeof value.groupName === "string"
    && isNullableString(value.taskClass)
    && isNullableString(value.model)
    && isNullableString(value.description)
    && isNullableString(value.state)
    && isNullableNumber(value.startTime)
    && isNullableString(value.reason);
}

function isTaskListResult(value: unknown): value is TaskListResult {
  return isPageEnvelope(value) && isArrayOf(value.items, isTaskItem);
}

function isUsageItem(value: unknown): value is UsageListItem {
  return isRecord(value)
    && isInteger(value.id)
    && isInteger(value.jobId)
    && isInteger(value.groupId)
    && typeof value.groupName === "string"
    && isInteger(value.userId)
    && typeof value.userName === "string"
    && isNullableNumber(value.projectId)
    && isNullableString(value.projectName)
    && isNullableString(value.providerId)
    && isNullableString(value.modelId)
    && isOneOf(value.taskType, generationTaskTypes)
    && isNullableNumber(value.estimatedCost)
    && isNullableString(value.currency)
    && typeof value.result === "string"
    && isBillingUnits(value.units)
    && (value.pricingSnapshot === null || isPricingSnapshot(value.pricingSnapshot))
    && (value.billingMode === null || ["per_request", "per_second", "per_token"].includes(String(value.billingMode)))
    && (value.pricingSnapshot === null ? value.billingMode === null : value.billingMode === value.pricingSnapshot.billingMode)
    && isNullableNumber(value.finalCost)
    && isFiniteNumber(value.createdAt);
}

const priceKeys = ["requestPrice", "secondPrice", "inputPricePerMillion", "outputPricePerMillion", "fallbackRequestPrice"] as const;

function isPrice(value: unknown): value is number {
  return isMoneyAmount(value) && value >= 0;
}

function isMoneyAmount(value: unknown): value is number {
  return isFiniteNumber(value) && Math.abs(value * 1_000_000 - Math.round(value * 1_000_000)) < 1e-7;
}

function moneyMicros(value: number) {
  return Math.round(value * 1_000_000);
}

function hasPricingBase(value: Record<string, unknown>) {
  return isInteger(value.pricingId)
    && typeof value.providerId === "string"
    && typeof value.modelId === "string"
    && isOneOf(value.taskType, generationTaskTypes)
    && ["per_request", "per_second", "per_token"].includes(String(value.billingMode))
    && value.currency === "CNY"
    && isInteger(value.version)
    && isFiniteNumber(value.effectiveAt);
}

function hasModePrices(value: Record<string, unknown>, absent: null | undefined) {
  const isAbsent = (key: typeof priceKeys[number]) => value[key] === absent;
  if (value.billingMode === "per_request") {
    return isPrice(value.requestPrice) && isAbsent("secondPrice") && isAbsent("inputPricePerMillion") && isAbsent("outputPricePerMillion") && isAbsent("fallbackRequestPrice");
  }
  if (value.billingMode === "per_second") {
    return isAbsent("requestPrice") && isPrice(value.secondPrice) && isAbsent("inputPricePerMillion") && isAbsent("outputPricePerMillion") && isAbsent("fallbackRequestPrice");
  }
  return isAbsent("requestPrice") && isAbsent("secondPrice") && isPrice(value.inputPricePerMillion) && isPrice(value.outputPricePerMillion) && isPrice(value.fallbackRequestPrice);
}

function isModelPricing(value: unknown): value is ModelPricing {
  return isRecord(value) && hasPricingBase(value) && priceKeys.every((key) => key in value) && hasModePrices(value, null);
}

function isPricingSnapshot(value: unknown): value is PricingSnapshot {
  return isRecord(value) && hasPricingBase(value) && hasModePrices(value, undefined);
}

function isBillingUnits(value: unknown): value is BillingUnits {
  if (!isRecord(value)) return false;
  const allowed = new Set(["requests", "images", "seconds", "inputTokens", "outputTokens"]);
  if (!Object.keys(value).every((key) => allowed.has(key))) return false;
  return Object.entries(value).every(([key, unit]) => isFiniteNumber(unit) && unit >= 0
    && (!(["requests", "images", "inputTokens", "outputTokens"].includes(key)) || Number.isInteger(unit)));
}

function isUsageOverview(value: unknown): value is UsageOverview {
  return isPageEnvelope(value)
    && isRecord(value.summary)
    && isInteger(value.summary.recordCount)
    && isFiniteNumber(value.summary.estimatedCost)
    && Array.isArray(value.breakdown)
    && value.breakdown.every((item) => isRecord(item) && typeof item.taskType === "string" && isInteger(item.recordCount) && isFiniteNumber(item.estimatedCost))
    && isArrayOf(value.items, isUsageItem);
}

function isAdminCapability(value: unknown): value is AdminCapability {
  return isRecord(value) && typeof value.read === "boolean" && typeof value.update === "boolean";
}

function isProviderOverview(value: unknown): value is ProviderOverview {
  return isRecord(value)
    && isAdminCapability(value.capabilities)
    && Array.isArray(value.providers)
    && value.providers.every((provider) => isRecord(provider)
      && typeof provider.id === "string"
      && typeof provider.name === "string"
      && typeof provider.enabled === "boolean"
      && typeof provider.configured === "boolean"
      && Array.isArray(provider.inputs)
      && provider.inputs.every((input) => isRecord(input)
        && typeof input.key === "string"
        && typeof input.label === "string"
        && typeof input.type === "string"
        && typeof input.required === "boolean"
        && typeof input.configured === "boolean")
      && isInteger(provider.modelCount)
      && Array.isArray(provider.modelTypes)
      && provider.modelTypes.every((item) => isRecord(item) && typeof item.type === "string" && isInteger(item.count))
      && Array.isArray(provider.models)
      && provider.models.every((model) => isRecord(model)
        && typeof model.name === "string"
        && typeof model.modelName === "string"
        && (model.type === "text" || model.type === "image" || model.type === "video")));
}

function isAiConfigOverview(value: unknown): value is AiConfigOverview {
  return isRecord(value)
    && (value.useMode === "0" || value.useMode === "1")
    && isAdminCapability(value.capabilities)
    && Array.isArray(value.deployments)
    && value.deployments.every((deployment) => isRecord(deployment)
      && isInteger(deployment.id)
      && typeof deployment.name === "string"
      && typeof deployment.description === "string"
      && isNullableString(deployment.vendorId)
      && isNullableString(deployment.model)
      && isNullableString(deployment.modelName)
      && isNullableNumber(deployment.temperature)
      && (deployment.maxOutputTokens === null || isInteger(deployment.maxOutputTokens))
      && typeof deployment.disabled === "boolean"
      && typeof deployment.configured === "boolean");
}

function isSystemOverview(value: unknown): value is SystemOverview {
  return isRecord(value)
    && isRecord(value.database)
    && Array.isArray(value.database.tables)
    && value.database.tables.every((table) => isRecord(table) && typeof table.name === "string" && isInteger(table.rowCount))
    && isRecord(value.development)
    && typeof value.development.aiDevToolsEnabled === "boolean"
    && isRecord(value.runtime)
    && typeof value.runtime.nodeVersion === "string"
    && typeof value.runtime.platform === "string"
    && typeof value.runtime.environment === "string"
    && isRecord(value.capabilities)
    && typeof value.capabilities.updateDevelopment === "boolean"
    && typeof value.capabilities.clearDatabase === "boolean"
    && typeof value.capabilities.importDatabase === "boolean"
    && typeof value.capabilities.exportDatabase === "boolean";
}

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

async function unwrap<T>(request: Promise<AxiosResponse<ApiResponse<T>>>, guard: DataGuard<T>): Promise<T> {
  try {
    const response = await request;
    const envelope: unknown = response.data;
    if (
      typeof envelope !== "object"
      || envelope === null
      || Array.isArray(envelope)
      || !Number.isInteger((envelope as { code?: unknown }).code)
      || !Object.prototype.hasOwnProperty.call(envelope, "data")
      || (envelope as { data?: unknown }).data === undefined
    ) {
      throw new AdminApiError(invalidEnvelopeText);
    }
    const validEnvelope = envelope as ApiResponse<T>;
    if (validEnvelope.code < 200 || validEnvelope.code >= 300) {
      throw new AdminApiError(
        adminErrorText({ status: validEnvelope.code }),
        validEnvelope.code,
        errorCode(validEnvelope.data) ?? errorCode(validEnvelope),
      );
    }
    if (!guard(validEnvelope.data)) throw new AdminApiError(invalidDataText);
    return validEnvelope.data;
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
  return unwrap<JobListResult>(client.get("/admin/queue/listJobs", { params: filters }), isJobListResult);
}

export function cancelJob(id: number) {
  return unwrap<GenerationJobMutationResult>(client.post("/admin/queue/cancelJob", { id }), isGenerationJobMutationResult);
}

export function reprioritizeJob(input: { id: number; priority: number; reason: string }) {
  return unwrap<GenerationJobMutationResult>(client.post("/admin/queue/reprioritizeJob", input), isGenerationJobMutationResult);
}

export function getPolicies(input: { groupId: number; userId: number }) {
  return unwrap<PolicyResult>(
    client.get("/admin/concurrency/getPolicies", { params: input }),
    isPolicyResult,
  );
}

export function updateGroupPolicy(input: { groupId: number } & ConcurrencyLimit) {
  return unwrap<ConcurrencyLimit>(client.post("/admin/concurrency/updateGroupPolicy", input), isConcurrencyLimit);
}

export function updateUserPolicy(input: { userId: number } & ConcurrencyLimit) {
  return unwrap<ConcurrencyLimit>(client.post("/admin/concurrency/updateUserPolicy", input), isConcurrencyLimit);
}

export function listGroups() {
  return unwrap<GroupDto[]>(client.get("/admin/groups/listGroups"), (value): value is GroupDto[] => isArrayOf(value, isGroup));
}

export function listUsers() {
  return unwrap<UserDto[]>(client.get("/admin/users/listUsers"), (value): value is UserDto[] => isArrayOf(value, isUser));
}

export function createUser(input: CreateUserInput) {
  return unwrap<UserDto>(client.post("/admin/users/createUser", input), isUser);
}

export function updateUser(input: UpdateUserInput) {
  return unwrap<UserDto>(client.post("/admin/users/updateUser", input), isUser);
}

export function resetUserPassword(input: { id: number; password: string }) {
  return unwrap<null>(client.post("/admin/users/resetPassword", input), (value): value is null => value === null);
}

export function updateGroup(input: UpdateGroupInput) {
  return unwrap<GroupDto>(client.post("/admin/groups/updateGroup", input), isGroup);
}

export function getQuotaOverview() {
  return unwrap<QuotaOverview>(client.get("/admin/quota/getOverview"), isQuotaOverview);
}

export function adjustQuota(input: QuotaAdjustmentInput) {
  return unwrap<QuotaAdjustmentResult>(
    client.post("/admin/quota/adjustQuota", input),
    isQuotaAdjustmentResult,
  );
}

export function listAudit(filters: AuditListFilters = {}) {
  return unwrap<AuditListResult>(client.get("/admin/audit/listAudit", { params: filters }), isAuditListResult);
}

export function listProjects(filters: MonitoringFilters = {}) {
  return unwrap<ProjectListResult>(client.get("/admin/projects/listProjects", { params: filters }), isProjectListResult);
}

export function listTasks(filters: TaskListFilters = {}) {
  return unwrap<TaskListResult>(client.get("/admin/tasks/listTasks", { params: filters }), isTaskListResult);
}

export function getUsageOverview(filters: UsageFilters = {}) {
  return unwrap<UsageOverview>(client.get("/admin/usage/getOverview", { params: filters }), isUsageOverview);
}

export function getProviderOverview() {
  return unwrap<ProviderOverview>(client.get("/admin/providers/getOverview"), isProviderOverview);
}

export function updateProvider(input: { id: string; enabled?: boolean; inputValues?: Record<string, string> }) {
  return unwrap<{ id: string; updated: boolean }>(client.post("/admin/providers/updateProvider", input), (value): value is { id: string; updated: boolean } => isRecord(value) && typeof value.id === "string" && value.updated === true);
}

export function getModelPricing() {
  return unwrap<{ items: ModelPricing[] }>(
    client.get("/admin/providers/getPricing"),
    (value): value is { items: ModelPricing[] } => isRecord(value) && isArrayOf(value.items, isModelPricing),
  );
}

export function updateModelPricing(input: UpdatePricingInput) {
  return unwrap<ModelPricing>(
    client.post("/admin/providers/updatePricing", input),
    isModelPricing,
  );
}

export function testProviderConnection(input: { id: string; modelName: string }) {
  return unwrap<ProviderConnectionResult>(client.post("/admin/providers/testConnection", input), (value): value is ProviderConnectionResult => isRecord(value)
    && typeof value.providerId === "string"
    && typeof value.modelName === "string"
    && value.status === "available"
    && value.modelAvailable === true
    && isFiniteNumber(value.latencyMs)
    && isFiniteNumber(value.checkedAt));
}

export function getAiConfigOverview() {
  return unwrap<AiConfigOverview>(client.get("/admin/ai-config/getOverview"), isAiConfigOverview);
}

export function updateAiUseMode(agentUseMode: "0" | "1") {
  return unwrap<{ agentUseMode: "0" | "1" }>(client.post("/admin/ai-config/updateUseMode", { agentUseMode }), (value): value is { agentUseMode: "0" | "1" } => isRecord(value) && (value.agentUseMode === "0" || value.agentUseMode === "1"));
}

export function updateAiDeployment(input: AiConfigOverview["deployments"][number]) {
  const payload = {
    id: input.id, vendorId: input.vendorId, model: input.model ?? "", modelName: input.modelName ?? "",
    ...(input.temperature === null ? {} : { temperature: input.temperature }),
    ...(input.maxOutputTokens === null ? {} : { maxOutputTokens: input.maxOutputTokens }),
    disabled: input.disabled,
  };
  return unwrap<{ id: number; updated: boolean }>(client.post("/admin/ai-config/updateDeployment", payload), (value): value is { id: number; updated: boolean } => isRecord(value) && isInteger(value.id) && value.updated === true);
}

export function getSystemOverview() {
  return unwrap<SystemOverview>(client.get("/admin/system/getOverview"), isSystemOverview);
}

export function updateDevelopmentSettings(aiDevToolsEnabled: boolean) {
  return unwrap<{ aiDevToolsEnabled: boolean }>(client.post("/admin/system/updateDevelopment", { aiDevToolsEnabled }), (value): value is { aiDevToolsEnabled: boolean } => isRecord(value) && typeof value.aiDevToolsEnabled === "boolean");
}

export function updateCurrentProfile(input: { name: string; password?: string }) {
  return unwrap<UserDto>(client.post("/setting/loginConfig/updateUserPwd", input), isUser);
}
