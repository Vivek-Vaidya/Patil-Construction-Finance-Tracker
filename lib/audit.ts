import { prisma } from "@/lib/prisma";

export async function logAudit({
  entityType,
  entityId,
  action,
  userId,
  oldValue,
  newValue,
  transactionId,
}: {
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "LOCK";
  userId: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  transactionId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        transactionId: transactionId ?? (entityType === "TRANSACTION" ? entityId : null),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

