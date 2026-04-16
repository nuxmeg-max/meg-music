const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Daftar Invidious public instances (fallback jika satu down)
const INVIDIOUS_INSTANCES = [
  "https://invidious.io.lol",
  "https://inv.nadeko.net",
  "https://invidious.privacydev.net",
  "https://yt.cdaut.de",
  "https://invidious.fdn.fr",
];

async function getAudioFromInvidious(videoId) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${instance}/api/v1/videos/${videoId}?fields=title,videoThumbnails,adaptiveFormats`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();

      // Cari format audio only, urutkan dari bitrate tertinggi
      const audioFormats = (data.adaptiveFormats || [])
        .filter(f => f.type && f.type.startsWith("audio/") && f.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (!audioFormats.length) continue;

      const bestAudio = audioFormats[0];
      const thumbnail =
        (data.videoThumbnails || []).find(t => t.quality === "high")?.url ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      return {
        streamUrl: bestAudio.url,
        title: data.title || "Unknown",
        thumbnail: thumbnail.startsWith("http")
          ? thumbnail
          : `${instance}${thumbnail}`,
      };
    } catch (err) {
      console.warn(`Instance ${instance} gagal:`, err.message);
      continue;
    }
  }
  throw new Error("Semua server Invidious tidak tersedia saat ini");
}

app.get("/api/search", async (req, res) => {
  try {
    const query = req.query.q || "Hindia";
    const r = await yts(query);
    const songs = r.videos.slice(0, 20).map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author.name,
      thumbnail: v.thumbnail,
      duration: v.timestamp,
    }));
    res.json({ results: songs });
  } catch (err) {
    res.status(500).json({ error: "Gagal mencari lagu" });
  }
});

app.get("/api/stream", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "ID diperlukan" });

    const result = await getAudioFromInvidious(id);
    return res.json(result);
  } catch (err) {
    console.error("Stream error:", err.message);
    res.status(500).json({ error: "Gagal stream: " + err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
