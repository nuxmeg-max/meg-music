const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Piped API instances - lebih stabil dari Invidious
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.coldtea.lol",
  "https://pipedapi.darkness.services",
  "https://piped-api.garudalinux.org",
  "https://pipedapi.in.projectsegfau.lt",
];

async function getAudioFromPiped(videoId) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      if (data.error) continue;

      // Piped returns audioStreams array
      const audioStreams = (data.audioStreams || [])
        .filter(s => s.url)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      if (!audioStreams.length) continue;

      const best = audioStreams[0];
      const thumbnail = data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      return {
        streamUrl: best.url,
        title: data.title || "Unknown",
        thumbnail,
      };
    } catch (err) {
      console.warn(`Piped ${instance} gagal:`, err.message);
      continue;
    }
  }
  throw new Error("Semua server tidak tersedia. Coba lagi nanti.");
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

    const result = await getAudioFromPiped(id);
    return res.json(result);
  } catch (err) {
    console.error("Stream error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
