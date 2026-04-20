export const ADMIN_SESSION_UPDATED_EVENT = "inturb-admin-session-updated";

export type AdminGender = "FEMALE" | "MALE" | "NON_BINARY" | "PREFER_NOT_TO_SAY";
export type AdminRole = "ADMIN" | "OPERATOR";

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  gender?: AdminGender;
  isActive: boolean;
};

export type AdminSession = {
  expiresAt?: string;
  user: AdminSessionUser;
};

let currentAdminSession: AdminSession | null = null;

export function getStoredAdminSession(): AdminSession | null {
  return currentAdminSession;
}

export function storeAdminSession(session: AdminSession): void {
  currentAdminSession = session;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_UPDATED_EVENT));
  }
}

export function clearAdminSession(): void {
  currentAdminSession = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_SESSION_UPDATED_EVENT));
  }
}
