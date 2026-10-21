const express = require("express");
const path = require("path");
const fs = require("fs");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./configs/db");
const { connectMySQL } = require("./configs/mysql");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const helmet = require("helmet");

process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
});
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM');
  process.exit(0);
});
process.on('exit', (code) => {
  console.log(`🛑 Process exiting with code: ${code}`);
});

// Khởi tạo thư mục uploads cho hệ thống ExamGuard AI
const uploadDirInit = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadDirInit)) {
    fs.mkdirSync(uploadDirInit, { recursive: true });
    console.log(`🚀 Created uploads directory: ${uploadDirInit}`);
  }
} catch (e) {
  console.warn(`⚠️ Warning: Could not create upload directory ${uploadDirInit}:`, e.message);
}

const app = express();
const PORT = process.env.PORT || 3011;

// ==============================
// ✅ CORS CONFIG (DEV + PROD)
// ==============================
const allowedOrigins = [
  // ── Local dev ──
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3012",
  "http://localhost:3011",
  "http://localhost:3111",
  "http://localhost:3112",
  "http://localhost:3100",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3011",
  // ── ExamGuard Domains ──
  "https://examguard.edu.vn",
  "https://thi.examguard.edu.vn",
  "https://proctor.examguard.edu.vn",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.trim().replace(/\/$/, "");

    if (allowedOrigins.includes(cleanOrigin) || cleanOrigin.endsWith('.examguard.edu.vn') || cleanOrigin.includes('localhost')) {
      callback(null, true);
    } else {
      console.error("CORS BLOCKED ORIGIN:", origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

app.set('trust proxy', 1);

app.use(cors(corsOptions));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        // Script: cho phép self + inline (Vite inject) + Cloudflare analytics
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",   // Vite SPA inline bootstrap script
          "https://static.cloudflareinsights.com",
          "https://cdnjs.cloudflare.com",
        ],

        // Style: cho phép inline (emotion/tailwind runtime)
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],

        // Font
        fontSrc: [
          "'self'",
          "data:",
          "https://fonts.gstatic.com",
        ],

        // Ảnh: cho phép data URI + mọi https
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:",
          "http:",
        ],

        // API calls: self + Nominatim (geocoding GPS) + Cloudflare + Google Maps
        connectSrc: [
          "'self'",
          "https://examguard.edu.vn",
          "https://*.examguard.edu.vn",
          "https://nominatim.openstreetmap.org",  // Reverse geocoding địa chỉ GPS
          "https://freeipapi.com",                 // IP geolocation fallback HTTPS
          "https://cloudflareinsights.com",
          "https://static.cloudflareinsights.com",
          "https://maps.googleapis.com",
          "wss://examguard.edu.vn",                // WebSocket nếu có
          "ws://localhost:3011",
          "ws://127.0.0.1:3011",
          "http://localhost:3011",
          "ws:",
        ],

        // Frame (Google Maps embed nếu cần)
        frameSrc: [
          "'self'",
          "https://www.google.com",
        ],

        // Worker (Vite HMR & service worker)
        workerSrc: ["'self'", "blob:"],

        // Media (camera, microphone nếu cần)
        mediaSrc: ["'self'", "blob:"],

        // Upgrade insecure requests (production)
        ...(process.env.NODE_ENV === 'production'
          ? { upgradeInsecureRequests: [] }
          : {}),
      },
    },
  })
);


// ==============================
// Middleware
// ==============================
app.use(express.json());
app.use(cookieParser());

// ==============================
// DB
// ==============================
connectDB();
connectMySQL();

// ==============================
// Routes
// ==============================
const routes = require("./routes/index");
app.use("/api", routes);

// Test API
app.get("/api/hello", (req, res) => {
  res.json({ message: "API running 🚀" });
});

// MySQL Health & Status
app.get("/api/mysql/status", async (req, res) => {
  try {
    const { mysqlPool } = require("./configs/mysql");
    const [rows] = await mysqlPool.query("SELECT COUNT(*) AS total_students FROM sinh_vien");
    const [tables] = await mysqlPool.query("SHOW TABLES");
    res.json({
      success: true,
      database: process.env.MYSQL_DATABASE || "examguard_db",
      tablesCount: tables.length,
      totalStudents: rows[0].total_students,
      message: "MySQL 8.0 is active and connected to ExamGuard Core"
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==============================
// FRONTEND & STATIC (CHUNG PORT 3011)
// ==============================
const clientDist = path.join(__dirname, "..", "dist");
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'images');
app.use('/uploads', express.static(uploadDir));

// ==============================
// ERROR HANDLER
// ==============================
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS blocked" });
  }

  res.status(500).json({ message: "Internal Server Error" });
});

// ==============================
// START UNIFIED SERVER (PORT 3011)
// ==============================
const server = http.createServer(app);
const { initSocket } = require("./services/socket.service");
const io = initSocket(server);
app.set("io", io);

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production' && process.env.SERVE_STATIC !== 'true';

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: { server } },
        appType: 'spa',
        root: path.join(__dirname, '..'),
      });
      app.use(vite.middlewares);
      console.log(`⚡ Vite Dev Middleware (HMR) đã được tích hợp thành công trên cùng port ${PORT}`);
    } catch (viteErr) {
      console.warn(`⚠️ Vite dev middleware error, fallback sang dist:`, viteErr.message);
      app.use(express.static(clientDist));
      app.use((req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.sendFile(path.join(clientDist, "index.html"));
      });
    }
  } else {
    app.use(express.static(clientDist));
    app.use((req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(clientDist, "index.html"));
    });
  }

  server.listen(PORT, () => {
    console.log(`🚀 Hệ thống ExamGuard AI (Frontend + Backend) đang chạy tại: http://localhost:${PORT}`);
  });
}

startServer();