import cors from "cors";
import "dotenv/config";
import express from "express";
import { rateLimit } from "express-rate-limit";
import fs from "fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "./config/db.js";
import { createVisualSeedData } from "./data/visualSeed.js";
import { authRouter } from "./routes/auth.js";
import { homeRouter, serveOpenGraphPreview } from "./routes/home.js";
import { profileRouter } from "./routes/profile.js";
import { chatRouter } from "./routes/chat.js";
import { jobsRouter } from "./routes/jobs.js";
import { governmentRouter } from "./routes/government.js";
import { adminRouter } from "./routes/admin.js";
import { cohortsRouter } from "./routes/cohorts.js";
import path from "path";
import { uploadsRouter, UPLOADS_DIR, getMediaFromDb, saveMediaToDb } from "./routes/uploads.js";
import { OutboxEvent } from "./models/OutboxEvent.js";
import { getOperationalMetrics, markDatabaseDisconnect, requestMetrics } from "./services/operationalMetrics.js";

const app = express();
const port = process.env.PORT || 5000;
const production = process.env.NODE_ENV === "production";
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
const allowedOrigins = (process.env.CLIENT_ORIGIN || "*").split(",").map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)),
    credentials: true
  })
);
app.use(express.json({ limit: "120mb" }));
app.use(requestMetrics);

mongoose.connection.on("disconnected", markDatabaseDisconnect);

app.get("/api/health", async (req, res) => {
  const mongoHealthy = mongoose.connection.readyState === 1;
  let outboxFailed = 0;
  let outboxStalePending = 0;
  if (mongoHealthy) {
    try {
      [outboxFailed, outboxStalePending] = await Promise.all([
        OutboxEvent.countDocuments({ status: "failed" }).maxTimeMS(1500),
        OutboxEvent.countDocuments({ status: { $in: ["pending", "processing"] }, availableAt: { $lt: new Date(Date.now() - 15 * 60 * 1000) } }).maxTimeMS(1500)
      ]);
    } catch (error) {
      return res.status(503).json({ ok: false, service: "tcm-backend", mongo: mongoose.connection.readyState, healthQuery: false });
    }
  }
  const ok = !production || mongoHealthy;
  res.status(ok ? 200 : 503).json({
    ok,
    service: "tcm-backend",
    mongo: mongoose.connection.readyState,
    uptimeSeconds: Math.floor(process.uptime()),
    metrics: getOperationalMetrics(),
    outbox: { failed: outboxFailed, stalePending: outboxStalePending }
  });
});

app.use("/api", (req, res, next) => {
  if (production && mongoose.connection.readyState !== 1) {
    res.setHeader("x-tcm-database-unavailable", "1");
    return res.status(503).json({ message: "Database unavailable. Please try again shortly." });
  }
  next();
});

// Top-Level OpenGraph Share Preview Endpoints for WhatsApp Crawlers
app.get("/post/:id", (req, res) => { req.params.type = "post"; serveOpenGraphPreview(req, res); });
app.get("/p/:id", (req, res) => { req.params.type = "post"; serveOpenGraphPreview(req, res); });
app.get("/job/:id", (req, res) => { req.params.type = "job"; serveOpenGraphPreview(req, res); });
app.get("/course/:id", (req, res) => { req.params.type = "course"; serveOpenGraphPreview(req, res); });
app.get("/community/:id", (req, res) => { req.params.type = "community"; serveOpenGraphPreview(req, res); });
app.get("/share/:type/:id", serveOpenGraphPreview);
app.get("/share/preview/:type/:id", serveOpenGraphPreview);
app.get("/api/share/:type/:id", serveOpenGraphPreview);
app.get("/api/share/preview/:type/:id", serveOpenGraphPreview);

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-8", legacyHeaders: false }), authRouter);
app.use("/api/home", homeRouter);
app.use("/api/profile", profileRouter);
app.use("/api/chat", chatRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/government", governmentRouter);
app.use("/api/admin", adminRouter);
app.use("/api/cohorts", cohortsRouter);
app.use("/api/uploads", uploadsRouter);

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
  console.warn(`Could not create uploads dir ${UPLOADS_DIR}: ${e.message}`);
}

async function serveOrRestoreMedia(filename, res, next) {
  if (!/^[a-z0-9_-]+\.(png|jpg|jpeg|webp|gif|heic|heif|avif|pdf|mp4|mov|m4v|3gp|webm|avi|mkv|mpeg|ogv|flv|wmv|doc|docx|ppt|pptx|xls|xlsx|txt|csv|md|rtf|zip|rar|7z)$/i.test(filename)) {
    return next();
  }
  const filePath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Auto-heal: If missing on disk (e.g. server restarted), restore from MongoDB database backup!
  try {
    const dbMedia = await getMediaFromDb(filename);
    if (dbMedia && dbMedia.data) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(filePath, dbMedia.data);
      if (dbMedia.mimeType) {
        res.setHeader("Content-Type", dbMedia.mimeType);
      }
      return res.send(dbMedia.data);
    }
  } catch (err) {
    console.warn(`Could not restore ${filename} from DB: ${err.message}`);
  }
  next();
}

app.use(
  "/uploads",
  express.static(UPLOADS_DIR, {
    maxAge: "30d",
    immutable: true,
    index: false,
    setHeaders(res, filePath) {
      if (path.basename(filePath) === "logo.png") {
        res.setHeader("Cache-Control", "no-cache");
      }
      const m = /\.(heic|heif|avif)$/i.exec(filePath);
      if (m) {
        const map = { heic: "image/heic", heif: "image/heif", avif: "image/avif" };
        res.setHeader("Content-Type", map[m[1].toLowerCase()]);
      }
    }
  })
);

app.get("/uploads/:filename", (req, res, next) => serveOrRestoreMedia(req.params.filename, res, next));
app.get("/:filename", (req, res, next) => serveOrRestoreMedia(req.params.filename, res, next));

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error("Request failed:", error.message);
  const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
  res.status(status).json({ message: status === 413 ? "File too large" : status === 400 ? "Invalid request" : "Request failed. Please try again." });
});

import { User } from "./models/User.js";

async function ensureDefaultAdmin() {
  try {
    const passwordHash = await bcrypt.hash("password123", 12);
    const existing = await User.findOne({ email: "admin@tcm.com" });
    if (!existing) {
      await User.create({
        name: "Admin User",
        email: "admin@tcm.com",
        passwordHash,
        role: "admin",
        isApproved: true,
        verified: true,
        memberBadge: "TCM Administrator",
        bio: "TCM Platform Administrator"
      });
      console.log("Created default admin user (admin@tcm.com)");
    } else if (existing.role !== "admin") {
      existing.role = "admin";
      existing.isApproved = true;
      await existing.save();
    }
  } catch (e) {
    console.warn("Could not auto-create admin user in MongoDB:", e.message);
  }
}

async function ensureDefaultPartner() {
  try {
    const passwordHash = await bcrypt.hash("password123", 12);
    const existing = await User.findOne({ email: "partner@tcm.com" });
    if (!existing) {
      await User.create({
        name: "Future Tech Institute",
        instituteName: "Future Tech Institute",
        email: "partner@tcm.com",
        passwordHash,
        role: "partner",
        isApproved: true,
        verified: true,
        memberBadge: "TCM Partner Institute",
        partnerCategory: "TCM Partner Institute",
        location: "Bilaspur, Chhattisgarh",
        contactNumber: "",
        totalRevenue: "₹0",
        monthlyRevenue: "₹0",
        totalStudentsCount: 0,
        activeMentorsCount: 0,
        rating: 5.0,
        reviewsCount: "0 Reviews",
        existingCourses: [],
        avatarUrl: "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=300&q=80"
      });
      console.log("Created default partner user (partner@tcm.com)");
    } else {
      if (existing.totalRevenue === "₹48,750" || existing.monthlyRevenue === "₹18,250" || existing.totalStudentsCount === 56) {
        existing.totalRevenue = "₹0";
        existing.monthlyRevenue = "₹0";
        existing.totalStudentsCount = 0;
        existing.activeMentorsCount = 0;
        existing.rating = 5.0;
        existing.reviewsCount = "0 Reviews";
        existing.existingCourses = [];
        existing.enrolledCourses = [];
        await existing.save();
        console.log("Cleaned seed stats on partner@tcm.com in MongoDB");
      }
    }
  } catch (e) {
    console.warn("Could not auto-create partner user in MongoDB:", e.message);
  }
}

async function cleanDatabaseSeeds() {
  try {
    // 1. Strip fake auto-generated enrolledCourses from any user documents created by schema defaults
    await User.updateMany(
      { "enrolledCourses.coursePrice": "₹4,999", "enrolledCourses.enrolledDate": "14 May 2025" },
      { $set: { enrolledCourses: [] } }
    );
    // 2. Clean partner stats
    await User.updateMany(
      { email: "partner@tcm.com", totalRevenue: "₹48,750" },
      {
        $set: {
          totalRevenue: "₹0",
          monthlyRevenue: "₹0",
          totalStudentsCount: 0,
          activeMentorsCount: 0,
          rating: 5.0,
          reviewsCount: "0 Reviews",
          existingCourses: []
        }
      }
    );
  } catch (e) {
    console.warn("Seed cleanup check error:", e.message);
  }
}

async function ensureAppLogo() {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const targetLogoPath = path.join(UPLOADS_DIR, "logo.png");
    const candidatePaths = [
      path.join(process.cwd(), "frontend", "assets", "icon.png"),
      path.join(process.cwd(), "..", "frontend", "assets", "icon.png"),
      path.join(process.cwd(), "assets", "icon.png")
    ];
    const sourcePath = candidatePaths.find((p) => fs.existsSync(p));
    if (sourcePath) {
      fs.copyFileSync(sourcePath, targetLogoPath);
      await saveMediaToDb("logo.png", "image/png", targetLogoPath);
    }
  } catch (err) {
    console.warn("Logo seeding warning:", err.message);
  }
}

async function start() {
  if (production && (!process.env.JWT_SECRET || !process.env.PUBLIC_ORIGIN || !path.isAbsolute(process.env.UPLOADS_DIR || ""))) {
    throw new Error("Production requires JWT_SECRET, PUBLIC_ORIGIN and an absolute UPLOADS_DIR");
  }
  try {
    await connectDatabase();
    if (!production) {
      await ensureDefaultAdmin();
      await ensureDefaultPartner();
      await cleanDatabaseSeeds();
    }
    await ensureAppLogo();
    try {
      const { hydratePushTokens } = await import("./services/pushNotificationService.js");
      await hydratePushTokens();
    } catch (e) {
      console.warn("Push token hydration skipped:", e.message);
    }
    if (!production) try {
      const { seedGovData } = await import("./seedGovData.js");
      await seedGovData();
    } catch (e) {
      console.warn("Gov data auto-seed skipped:", e.message);
    }
  } catch (error) {
    if (production) throw error;
    console.warn("MongoDB unavailable. Starting with in-memory visual seed data.");
    const passwordHash = await bcrypt.hash("password123", 12);
    app.locals.memoryStore = createVisualSeedData(passwordHash);
    await ensureAppLogo();
  }

  app.listen(port, process.env.HOST || "0.0.0.0", () => {
    console.log(`API running on http://${process.env.HOST || "0.0.0.0"}:${port}`);
  });
}

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});
