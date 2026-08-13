import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

function sanitizeScriptUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let url = rawUrl.trim().replace(/^['"]|['"]$/g, "");
  
  // Extract script.google.com URL if present anywhere in string
  const scriptIdx = url.indexOf("script.google.com");
  if (scriptIdx !== -1) {
    return "https://" + url.substring(scriptIdx);
  }

  // If user provided another standard http/https URL
  if (url.startsWith("https://") || url.startsWith("http://")) {
    return url;
  }

  // Attempt to fix protocol if user wrote scrhttps or similar
  url = url.replace(/^[a-zA-Z]+:\/*/, "https://");
  if (url.includes("script.google.com")) {
    return url;
  }

  return "";
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API Proxy for Google Apps Script to bypass Browser CORS
  app.post("/api/proxy-sheet", async (req, res) => {
    try {
      const { scriptUrl, payload } = req.body;
      if (!scriptUrl) {
        return res.status(400).json({ status: "error", message: "URL Google Apps Script wajib diisi" });
      }

      const cleanUrl = sanitizeScriptUrl(scriptUrl);
      if (!cleanUrl) {
        return res.status(400).json({ 
          status: "error", 
          message: "URL Google Apps Script tidak valid. URL harus berupa link Google Apps Script (https://script.google.com/macros/s/.../exec)" 
        });
      }

      const targetUrl = new URL(cleanUrl);
      if (payload && payload.action) {
        targetUrl.searchParams.set("action", payload.action);
      }
      if (payload && payload.spreadsheetId) {
        targetUrl.searchParams.set("spreadsheetId", payload.spreadsheetId);
      }

      const response = await fetch(targetUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload || {}),
        redirect: "follow",
      });

      const responseText = await response.text();
      try {
        const json = JSON.parse(responseText);
        return res.json(json);
      } catch (e) {
        // If response is HTML, user likely hasn't set deployment access to "Anyone"
        if (responseText.includes("<!DOCTYPE html") || responseText.includes("<html")) {
          return res.json({
            status: "error",
            message: "Google Apps Script menolak akses. Pastikan saat Deploy -> New Deployment, 'Who has access' diatur ke 'Anyone' (Siapa Saja)."
          });
        }
        return res.json({ status: "success", raw: responseText });
      }
    } catch (err: any) {
      console.error("Apps Script Proxy Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Gagal menghubungi Google Apps Script via Proxy Server. Pastikan URL diawali dengan 'https://script.google.com/...'",
      });
    }
  });

  app.get("/api/proxy-sheet", async (req, res) => {
    try {
      const scriptUrl = req.query.scriptUrl as string;
      const action = req.query.action as string;
      const spreadsheetId = req.query.spreadsheetId as string;

      if (!scriptUrl) {
        return res.status(400).json({ status: "error", message: "URL Google Apps Script wajib diisi" });
      }

      const cleanUrl = sanitizeScriptUrl(scriptUrl);
      if (!cleanUrl) {
        return res.status(400).json({ 
          status: "error", 
          message: "URL Google Apps Script tidak valid. URL harus berupa link Google Apps Script (https://script.google.com/macros/s/.../exec)" 
        });
      }

      const targetUrl = new URL(cleanUrl);
      if (action) targetUrl.searchParams.set("action", action);
      if (spreadsheetId) targetUrl.searchParams.set("spreadsheetId", spreadsheetId);

      const response = await fetch(targetUrl.toString(), {
        method: "GET",
        redirect: "follow",
      });

      const responseText = await response.text();
      try {
        const json = JSON.parse(responseText);
        return res.json(json);
      } catch (e) {
        return res.json({ status: "success", raw: responseText });
      }
    } catch (err: any) {
      console.error("Apps Script Proxy GET Error:", err);
      return res.status(500).json({
        status: "error",
        message: err?.message || "Gagal mengambil data dari Google Apps Script",
      });
    }
  });

  // Vite middleware for development
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
