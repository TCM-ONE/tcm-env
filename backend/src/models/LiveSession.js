import mongoose from "mongoose";

const liveSessionSchema = new mongoose.Schema(
  {
    legacyIds: { mysql: Number },
    sourceSystem: { type: String, default: "app" },
    migrationBatchId: { type: String, index: true },
    schemaVersion: { type: Number, default: 1 },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program", index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", index: true },
    cohortId: { type: mongoose.Schema.Types.ObjectId, ref: "Cohort", index: true },
    title: { type: String, required: true },
    description: String,
    host: String,
    sessionDate: Date,
    startTime: String,
    endTime: String,
    meetingUrl: { type: String, select: false },
    recordingUrl: String,
    status: { type: String, enum: ["scheduled", "live", "completed", "cancelled"], default: "scheduled", index: true }
  },
  { timestamps: true }
);

liveSessionSchema.index({ sourceSystem: 1, "legacyIds.mysql": 1 }, { unique: true, sparse: true });

export const LiveSession = mongoose.models.LiveSession || mongoose.model("LiveSession", liveSessionSchema);
