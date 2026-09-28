import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: String, trim: true },
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", index: true },
    outcome: { type: String, enum: ["started", "succeeded", "failed"], default: "started", index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    requestId: { type: String, trim: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    completedAt: Date
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, action: 1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
