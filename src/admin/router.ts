import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import type { AdminRole } from "../shared/auth";
import { useAdminSessionStore } from "./session";
import { ADMIN_ROUTE_ACCESS, decideAdminGuard, type AdminAuthState } from "./router-policy";

declare module "vue-router" {
  interface RouteMeta {
    title?: string;
    public?: boolean;
    roles?: readonly AdminRole[];
  }
}

export const ADMIN_HISTORY_BASE = "/admin/";

export const adminRoutes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("./pages/AdminLogin.vue"),
    meta: { title: "登录", ...ADMIN_ROUTE_ACCESS.login },
  },
  {
    path: "/forbidden",
    name: "forbidden",
    component: () => import("./pages/AdminForbidden.vue"),
    meta: { title: "无权访问", ...ADMIN_ROUTE_ACCESS.forbidden },
  },
  {
    path: "/",
    name: "layout",
    component: () => import("./components/AdminLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("./pages/AdminHome.vue"),
        meta: { title: "总览", ...ADMIN_ROUTE_ACCESS.home },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

function currentAuthState(store: ReturnType<typeof useAdminSessionStore>): AdminAuthState {
  if (!store.token || !store.session) return { status: "anonymous" };
  return {
    status: "authenticated",
    role: store.session.role as AdminRole,
  };
}

export function createAdminRouter(): Router {
  const router = createRouter({
    history: createWebHistory(ADMIN_HISTORY_BASE),
    routes: adminRoutes,
  });

  router.beforeEach(async (to) => {
    const store = useAdminSessionStore();
    let auth = currentAuthState(store);

    if (!to.meta.public && store.token && !store.session) {
      try {
        const restored = await store.restore();
        auth = restored === "authenticated"
          ? currentAuthState(store)
          : { status: restored };
      } catch {
        return {
          name: "login",
          query: { redirect: to.fullPath, reason: "session" },
        };
      }
    }

    const decision = decideAdminGuard({
      publicRoute: Boolean(to.meta.public),
      auth,
      requiredRoles: to.meta.roles,
    });

    if (decision.type === "allow") return true;
    if (decision.to === "login") {
      return { name: "login", query: { redirect: to.fullPath } };
    }
    return { name: "forbidden" };
  });

  return router;
}
