import mongoose from "mongoose";

const learnerConsentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", required: true },
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "CohortMembership", required: true },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "CohortInvitation", required: true },
    type: { type: String, enum: ["terms", "privacy", "safe_lab", "adult_confirmation"], required: true },
    documentVersion: { type: String, required: true },
    acceptedAt: { type: Date, required: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true }
  },
  { timestamps: true }
);

learnerConsentSchema.index({ userId: 1, cohortId: 1, type: 1, documentVersion: 1 }, { unique: true });

export const LearnerConsent = mongoose.models.LearnerConsent || mongoose.model("LearnerConsent", learnerConsentSchema);
