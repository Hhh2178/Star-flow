export type UserRole = "super_admin" | "admin" | "creator";

export type AdminRole = Extract<UserRole, "super_admin" | "admin">;

export interface AuthSession {
  id: number;
  name: string;
  role: UserRole;
  groupId: number | null;
  groupName: string | null;
}

export interface LoginPayload {
  token: string;
  id: number;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
