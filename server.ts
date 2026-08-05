import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // --- API ROUTES ---
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "workout-tracker-api",
      timestamp: new Date().toISOString()
    });
  });

  // In-memory server cache for exercise database proxy
  let cachedExerciseDb: any[] | null = null;

  // GET /api/external-exercises - Proxy for 800+ exercise database with server caching
  app.get("/api/external-exercises", async (req, res) => {
    try {
      if (cachedExerciseDb && cachedExerciseDb.length > 0) {
        return res.json({ success: true, count: cachedExerciseDb.length, data: cachedExerciseDb });
      }

      console.log("[SERVER] Fetching exercise database...");
      const response = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch exercise database: ${response.statusText}`);
      }
      const data = await response.json();
      cachedExerciseDb = data;
      console.log(`[SERVER] Loaded ${data.length} exercises into server cache.`);
      return res.json({ success: true, count: data.length, data });
    } catch (err: any) {
      console.error("[SERVER] Error fetching exercises JSON:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to load exercises database" });
    }
  });

  // --- VITE MIDDLEWARE / STATIC SERVING ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Full-stack Express server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();

