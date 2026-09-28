import { AuditLog } from "../models/AuditLog.js";
import { userIdOf } from "./cohortAccess.js";

export async function beginAudit(req, details) {
  return AuditLog.create({
    actorId: userIdOf(req.user),
    action: details.action,
    targetType: details.targetType,
    targetId: details.targetId,
    cohortId: details.cohortId,
    metadata: details.metadata || {},
    requestId: req.get("x-request-id") || undefined,
    ip: req.ip,
    userAgent: req.get("user-agent") || undefined,
    outcome: "started"
  });
}

export async function finishAudit(audit, outcome, targetId) {
  audit.outcome = outcome;
  audit.targetId = targetId || audit.targetId;
  audit.completedAt = new Date();
  await audit.save();
}
