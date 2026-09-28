import mongoose from "mongoose";

const learnerOnboardingSchema = new mongoose.Schema(
  {
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", required: true },
    membershipId: { type: mongoose.Schema.Types.ObjectId, ref: "CohortMembership", required: true },
    invitationId: { type: mongoose.Schema.Types.ObjectId, ref: "CohortInvitation", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["in_progress", "completed"], default: "in_progress", index: true },
    preferredName: { type: String, trim: true, maxlength: 80 },
    timezone: { type: String, trim: true, maxlength: 100 },
    language: { type: String, trim: true, maxlength: 50 },
    goal: { type: String, trim: true, maxlength: 1000 },
    experienceLevel: { type: String, enum: ["beginner", "some_experience", "experienced"] },
    communicationPreference: { type: String, enum: ["email", "in_app", "both"] },
    profileVisibility: { type: String, enum: ["private", "cohort"], default: "private" },
    showProgressToCohort: { type: Boolean, default: false },
    completedAt: Date
  },
  { timestamps: true }
);

learnerOnboardingSchema.index({ userId: 1, cohortId: 1 }, { unique: true });
learnerOnboardingSchema.index({ membershipId: 1 }, { unique: true });

export const LearnerOnboarding = mongoose.models.LearnerOnboarding || mongoose.model("LearnerOnboarding", learnerOnboardingSchema);
