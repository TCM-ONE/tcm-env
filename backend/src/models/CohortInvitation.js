import mongoose from "mongoose";

const cohortInvitationSchema = new mongoose.Schema(
  {
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", required: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    status: { type: String, enum: ["pending", "accepted", "revoked"], default: "pending", index: true },
    expiresAt: { type: Date, required: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    acceptedAt: Date,
    revokedAt: Date
  },
  { timestamps: true }
);

cohortInvitationSchema.index({ cohortId: 1, status: 1, expiresAt: 1 });

export const CohortInvitation = mongoose.models.CohortInvitation || mongoose.model("CohortInvitation", cohortInvitationSchema);
