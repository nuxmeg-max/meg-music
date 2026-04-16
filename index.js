const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API untuk Search (Tetap pakai yt-search karena stabil)
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Hindia";
        const r = await yts(query);
        const songs = r.videos.slice(0, 20).map(v => ({
            id: v.videoId,
            title: v.title,
            artist: v.author.name,
            thumbnail: v.thumbnail,
            duration: v.timestamp
        }));
        res.json({ results: songs });
    } catch (err) {
        res.status(500).json({ error: "Gagal mencari lagu" });
    }
});

// API untuk Stream (Ganti ke provider API yang lebih kuat)
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        // Pakai API pihak ketiga yang sering dipakai bot WhatsApp
        // Provider: Shatech API
        const response = await fetch(`https://api.shatech.my.id/api/download/ytmp3?url=https://www.youtube.com/watch?v=${id}`);
        const data = await response.json();

        if (data.status && data.result && data.result.download) {
            return res.json({
                streamUrl: data.result.download,
                title: data.result.title || "Playing...",
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
            });
        } else {
            // Backup ke API lain kalau provider utama gagal
            const backup = await fetch(`https://api.zenkey.my.id/api/download/ytmp3?url=https://www.youtube.com/watch?v=${id}`);
            const resBackup = await backup.json();
            
            if (resBackup.result && resBackup.result.download) {
                return res.json({
                    streamUrl: resBackup.result.download,
                    title: "Streaming Audio",
                    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                });
            }
            throw new Error("Semua provider sedang down.");
        }
    } catch (err) {
        console.error("Stream Error:", err.message);
        res.status(500).json({ error: "Gagal stream: YouTube sangat ketat hari ini." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
