import mongoose from "mongoose";

const cohortSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 40, match: /^[A-Z0-9][A-Z0-9_-]*$/ },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    lifecycle: {
      type: String,
      enum: ["draft", "enrolling", "active", "completed", "cancelled", "archived"],
      default: "draft",
      index: true
    },
    capacity: { type: Number, required: true, min: 1, max: 10000 },
    timezone: { type: String, required: true, trim: true, maxlength: 100, default: "Asia/Kolkata" },
    instructorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    enrollmentOpensAt: Date,
    enrollmentClosesAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    schemaVersion: { type: Number, default: 1 },
    sourceSystem: { type: String, default: "app" }
  },
  { timestamps: true }
);

cohortSchema.index({ instructorIds: 1, lifecycle: 1 });
cohortSchema.index({ courseId: 1, startsAt: -1 });
cohortSchema.path("endsAt").validate(function validateEnd(value) {
  return !this.startsAt || value > this.startsAt;
}, "endsAt must be after startsAt");

export const Cohort = mongoose.models.Cohort || mongoose.model("Cohort", cohortSchema);
