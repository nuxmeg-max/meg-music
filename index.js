// ============================================================
// MEG-MUSIC — AUTO INSTALLER
// ============================================================
const fs = require("fs");
const path = require("path");

if (!fs.existsSync(path.join(__dirname, "node_modules"))) {
  console.log("[MEG-MUSIC] node_modules tidak ditemukan. Menjalankan npm install...");
  try {
    const { execSync } = require("child_process");
    execSync("npm install", { stdio: "inherit", cwd: __dirname });
    console.log("[MEG-MUSIC] Instalasi selesai!");
  } catch (err) {
    console.error("[MEG-MUSIC] Gagal install dependencies:", err.message);
    process.exit(1);
  }
}

// ============================================================
// DEPENDENCIES
// ============================================================
const express = require("express");
const cors = require("cors");
const ytdl = require("@distube/ytdl-core");
const YTMusic = require("ytmusic-api");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// YTMUSIC INIT
// ============================================================
let ytmusic = null;

async function initYTMusic() {
  try {
    ytmusic = new YTMusic.default();
    await ytmusic.initialize();
    console.log("[MEG-MUSIC] YTMusic API siap.");
  } catch (err) {
    console.error("[MEG-MUSIC] Gagal init YTMusic:", err.message);
    // Retry after 5 seconds
    setTimeout(initYTMusic, 5000);
  }
}

initYTMusic();

// ============================================================
// API: SEARCH
// GET /api/search?q=QUERY
// ============================================================
app.get("/api/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Parameter q diperlukan." });

  if (!ytmusic) {
    return res.status(503).json({ error: "YTMusic API belum siap, coba lagi sebentar." });
  }

  try {
    const results = await ytmusic.searchSongs(q);
    const songs = (results || []).slice(0, 20).map((song) => ({
      id: song.videoId,
      title: song.name || "Unknown Title",
      artist: song.artist?.name || (song.artists && song.artists[0]?.name) || "Unknown Artist",
      thumbnail:
        (song.thumbnails && song.thumbnails[song.thumbnails.length - 1]?.url) ||
        `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
      duration: song.duration || 0,
    }));

    res.json({ results: songs });
  } catch (err) {
    console.error("[MEG-MUSIC] Search error:", err.message);
    res.status(500).json({ error: "Gagal mencari lagu: " + err.message });
  }
});

// ============================================================
// API: STREAM
// GET /api/stream?id=VIDEO_ID
// ============================================================
app.get("/api/stream", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "Parameter id diperlukan." });

  const url = `https://www.youtube.com/watch?v=${id}`;

  try {
    const info = await ytdl.getInfo(url);
    const formats = ytdl.filterFormats(info.formats, "audioonly");

    // Pilih format audio terbaik
    const bestFormat = formats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

    if (!bestFormat || !bestFormat.url) {
      return res.status(404).json({ error: "Format audio tidak ditemukan." });
    }

    res.json({
      streamUrl: bestFormat.url,
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
      duration: parseInt(info.videoDetails.lengthSeconds),
    });
  } catch (err) {
    console.error("[MEG-MUSIC] Stream error:", err.message);
    res.status(500).json({ error: "Gagal mendapatkan stream: " + err.message });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Meg-Music", port: PORT });
});

// ============================================================
// CATCH-ALL → index.html
// ============================================================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`
  ███╗   ███╗███████╗ ██████╗       ███╗   ███╗██╗   ██╗███████╗██╗ ██████╗
  ████╗ ████║██╔════╝██╔════╝       ████╗ ████║██║   ██║██╔════╝██║██╔════╝
  ██╔████╔██║█████╗  ██║  ███╗      ██╔████╔██║██║   ██║███████╗██║██║
  ██║╚██╔╝██║██╔══╝  ██║   ██║      ██║╚██╔╝██║██║   ██║╚════██║██║██║
  ██║ ╚═╝ ██║███████╗╚██████╔╝      ██║ ╚═╝ ██║╚██████╔╝███████║██║╚██████╗
  ╚═╝     ╚═╝╚══════╝ ╚═════╝       ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝ ╚═════╝
  `);
  console.log(`[MEG-MUSIC] Server berjalan di port ${PORT}`);
});
module.exports = app;
