const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route untuk mencari lagu
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Top Hits Indonesia";
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

// Route untuk mendapatkan link streaming audio (Anti-Blokir)
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        // Percobaan 1: Menggunakan Cobapi
        const apiUrl = `https://cobapi.com/api/json?url=https://www.youtube.com/watch?v=${id}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (data && data.url) {
            return res.json({
                streamUrl: data.url,
                title: data.title || "Unknown Title",
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
            });
        } else {
            // Percobaan 2: Fallback ke Cobalt API jika Cobapi gagal
            const backupResponse = await fetch(`https://api.cobalt.tools/api/json`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Accept": "application/json" 
                },
                body: JSON.stringify({ 
                    url: `https://www.youtube.com/watch?v=${id}`, 
                    downloadMode: "audio" 
                })
            });
            const backupData = await backupResponse.json();
            
            return res.json({
                streamUrl: backupData.url,
                title: "Streaming Audio",
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
            });
        }
    } catch (err) {
        console.error("Stream Error:", err.message);
        res.status(500).json({ error: "Gagal stream: YouTube memblokir akses." });
    }
});

// Mengarahkan semua request lain ke halaman utama (index.html)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Export untuk Vercel
module.exports = app;
