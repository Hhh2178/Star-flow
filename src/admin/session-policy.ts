import type { AuthSession } from "../shared/auth";

export type AdminSessionEvaluation =
  | { allowed: true; session: AuthSession }
  | { allowed: false; message: string };

export function evaluateAdminSession(session: AuthSession): AdminSessionEvaluation {
  if (session.role === "admin" || session.role === "super_admin") {
    return { allowed: true, session };
  }

  return {
    allowed: false,
    message: "当前账号无权进入管理后台",
  };
}
