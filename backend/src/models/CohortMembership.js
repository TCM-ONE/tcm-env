import mongoose from "mongoose";

const cohortMembershipSchema = new mongoose.Schema(
  {
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "CohortInvitation", index: true },
    role: { type: String, enum: ["learner", "assistant"], default: "learner" },
    status: {
      type: String,
      enum: ["invited", "active", "paused", "completed", "revoked"],
      default: "invited",
      index: true
    },
    enrollmentSource: {
      type: String,
      enum: ["manual", "legacy_mysql", "invitation", "self_enrolled", "admin_import"],
      default: "manual"
    },
    accessStartsAt: Date,
    accessEndsAt: Date,
    activatedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    schemaVersion: { type: Number, default: 1 },
    sourceSystem: { type: String, default: "app" }
  },
  { timestamps: true }
);

cohortMembershipSchema.index({ cohortId: 1, userId: 1, role: 1 }, { unique: true });
cohortMembershipSchema.index({ userId: 1, status: 1, accessStartsAt: 1, accessEndsAt: 1 });
cohortMembershipSchema.path("accessEndsAt").validate(function validateAccessEnd(value) {
  return !value || !this.accessStartsAt || value > this.accessStartsAt;
}, "accessEndsAt must be after accessStartsAt");

export const CohortMembership = mongoose.models.CohortMembership || mongoose.model("CohortMembership", cohortMembershipSchema);
