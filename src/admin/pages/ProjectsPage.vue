<template>
  <section class="admin-page projects-page">
    <PageHeader title="项目监管"><template #actions><t-button variant="outline" :loading="refreshing" :disabled="refreshing" @click="loadProjects(true)"><template #icon><i-refresh theme="outline" /></template>刷新</t-button></template></PageHeader>
    <div class="toolbar">
      <label><span>搜索</span><t-input v-model="filters.search" placeholder="项目名称" @enter="applyFilters" /></label>
      <label v-if="isSuperAdmin"><span>分组</span><t-select v-model="filters.groupId" :options="groupOptions" @change="applyFilters" /></label>
      <label><span>负责人</span><t-select v-model="filters.ownerUserId" :options="userOptions" @change="applyFilters" /></label>
      <t-button class="search-button" variant="outline" @click="applyFilters"><template #icon><i-search theme="outline" /></template>查询</t-button>
    </div>
    <LoadingState v-if="loading" text="正在加载项目..." />
    <ErrorState v-else-if="loadError" :message="loadError" retryable @retry="loadProjects()" />
    <section v-else class="data-section" aria-labelledby="projects-title">
      <div class="section-heading"><h2 id="projects-title">项目列表</h2><span>共 {{ result.total }} 个</span></div>
      <EmptyState v-if="result.items.length === 0" text="暂无符合条件的项目" />
      <div v-else class="table-scroll"><table><thead><tr><th>项目</th><th>类型</th><th>负责人</th><th>分组</th><th>任务</th><th>创建时间</th></tr></thead><tbody>
        <tr v-for="project in result.items" :key="project.id"><td><strong>{{ project.name }}</strong><small>#{{ project.id }}</small></td><td>{{ project.type || project.projectType || "-" }}</td><td>{{ project.ownerName || "-" }}<small v-if="project.ownerUserId">#{{ project.ownerUserId }}</small></td><td>{{ project.groupName }}<small>#{{ project.groupId }}</small></td><td>{{ project.taskCount }} 个任务</td><td>{{ formatAdminDate(project.createTime) }}</td></tr>
      </tbody></table></div>
      <div v-if="result.total > pageSize" class="pagination" aria-label="项目分页"><t-button variant="outline" size="small" :disabled="page <= 1" @click="changePage(page - 1)">上一页</t-button><span>第 {{ page }} / {{ totalPages }} 页</span><t-button variant="outline" size="small" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</t-button></div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
import PageHeader from "../components/PageHeader.vue";
import LoadingState from "../components/LoadingState.vue";
import EmptyState from "../components/EmptyState.vue";
import ErrorState from "../components/ErrorState.vue";
import { formatAdminDate } from "../components/adminDate";
import { useAdminSessionStore } from "../session";
import { adminErrorText, listGroups, listProjects, listUsers, type GroupDto, type ProjectListResult, type UserDto } from "../api/adminApi";

const sessionStore = useAdminSessionStore(); const { session } = storeToRefs(sessionStore);
const isSuperAdmin = computed(() => session.value?.role === "super_admin");
const emptyResult = (): ProjectListResult => ({ page: 1, pageSize: 20, total: 0, items: [] });
const result = ref(emptyResult()); const groups = ref<GroupDto[]>([]); const users = ref<UserDto[]>([]);
const loading = ref(true); const refreshing = ref(false); const loadError = ref(""); const page = ref(1); const pageSize = 20; let requestSequence = 0;
const filters = reactive<{ search: string; groupId: number | ""; ownerUserId: number | "" }>({ search: "", groupId: "", ownerUserId: "" });
const groupOptions = computed(() => [{ label: "全部分组", value: "" }, ...groups.value.map((group) => ({ label: group.name, value: group.id }))]);
const userOptions = computed(() => [{ label: "全部负责人", value: "" }, ...users.value.filter((user) => !filters.groupId || user.groupId === Number(filters.groupId)).map((user) => ({ label: `${user.name} (#${user.id})`, value: user.id }))]);
const totalPages = computed(() => Math.max(1, Math.ceil(result.value.total / pageSize)));

async function loadTargets() {
  const [nextUsers, nextGroups] = await Promise.all([listUsers(), isSuperAdmin.value ? listGroups() : Promise.resolve([])]);
  users.value = nextUsers;
  groups.value = nextGroups;
}
async function loadProjects(silent = false) {
  const sequence = ++requestSequence; if (silent) refreshing.value = true; else loading.value = true; loadError.value = "";
  try {
    result.value = await listProjects({ page: page.value, pageSize, ...(filters.search.trim() ? { search: filters.search.trim() } : {}), ...(isSuperAdmin.value && filters.groupId ? { groupId: Number(filters.groupId) } : {}), ...(filters.ownerUserId ? { ownerUserId: Number(filters.ownerUserId) } : {}) });
  } catch (cause) { if (sequence === requestSequence) loadError.value = adminErrorText(cause, "项目加载失败"); }
  finally { if (sequence === requestSequence) { loading.value = false; refreshing.value = false; } }
}
function applyFilters() { page.value = 1; void loadProjects(); }
function changePage(nextPage: number) { page.value = nextPage; void loadProjects(); }
onMounted(async () => { try { await loadTargets(); await loadProjects(); } catch (cause) { loadError.value = adminErrorText(cause, "项目筛选项加载失败"); loading.value = false; } });
</script>

<style scoped lang="scss">
.admin-page { width: min(100%, 1240px); margin: 0 auto; }.toolbar { display: grid; grid-template-columns: minmax(200px, 1fr) minmax(150px, 220px) minmax(170px, 240px) auto; align-items: end; gap: 8px; margin-bottom: 12px; }.toolbar label { display: grid; gap: 5px; color: var(--stars-text-muted); font-size: 12px; }.search-button { min-width: 76px; }.data-section { border: 1px solid var(--stars-border); border-radius: 6px; background: #fff; }.section-heading { display: flex; min-height: 42px; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border-bottom: 1px solid var(--stars-border); }.section-heading h2 { margin: 0; font-size: 14px; }.section-heading span { color: var(--stars-text-muted); font-size: 11px; }.table-scroll { overflow-x: auto; } table { width: 100%; min-width: 820px; border-collapse: collapse; font-size: 12px; } th { padding: 8px 10px; background: var(--stars-surface-muted); color: var(--stars-text-muted); font-weight: 600; text-align: left; white-space: nowrap; } td { padding: 8px 10px; border-top: 1px solid var(--stars-border); } td small { display: block; margin-top: 2px; color: var(--stars-text-muted); }.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 10px 12px; border-top: 1px solid var(--stars-border); color: var(--stars-text-muted); font-size: 12px; }
@media (max-width: 760px) { .toolbar { grid-template-columns: 1fr; }.search-button { width: 100%; } }
</style>
