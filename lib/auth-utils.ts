import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type UserRole = "ADMIN" | "ACCOUNTANT" | "SUPERVISOR" | "VIEWER";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const session = await requireAuth();
  const role = session.user.role as UserRole;
  if (!allowedRoles.includes(role)) {
    redirect("/unauthorized");
  }
  return session;
}

export function canManageUsers(role: string) {
  return role === "ADMIN";
}

export function canViewPartnerData(role: string) {
  return ["ADMIN", "ACCOUNTANT"].includes(role);
}

export function canViewCompanyTotals(role: string) {
  return ["ADMIN", "ACCOUNTANT"].includes(role);
}

export function canDeleteEntries(role: string) {
  return role === "ADMIN";
}

export function canEditEntries(role: string) {
  return ["ADMIN", "ACCOUNTANT"].includes(role);
}

export function canAddExpenses(role: string) {
  return ["ADMIN", "ACCOUNTANT", "SUPERVISOR"].includes(role);
}
