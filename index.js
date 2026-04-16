const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route Search
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

// Route Stream (Versi Baru menggunakan API Downloader yang lebih kuat)
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Menggunakan API dari tmate.is / ddownr (Pihak ketiga yang sangat stabil)
        const response = await fetch(`https://api.boxentriq.com/tool/get-video-info?v=${id}`);
        const data = await response.json();

        // Jika API di atas tidak memberikan direct link, kita pakai Cobalt dengan mode Tunnel
        if (data && data.url) {
            return res.json({
                streamUrl: data.url,
                title: data.title || "Music Stream",
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
            });
        } else {
            // Fallback terakhir ke instance Cobalt yang berbeda
            const backupResponse = await fetch(`https://co.wuk.sh/api/json`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json", 
                    "Accept": "application/json" 
                },
                body: JSON.stringify({ 
                    url: videoUrl, 
                    downloadMode: "audio",
                    asAudio: true
                })
            });
            const backupData = await backupResponse.json();
            
            if (backupData.url) {
                return res.json({
                    streamUrl: backupData.url,
                    title: "Streaming Audio",
                    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                });
            }
            throw new Error("Semua API Downloader sedang sibuk");
        }
    } catch (err) {
        console.error("Critical Stream Error:", err.message);
        res.status(500).json({ error: "Gagal memutar lagu. YouTube sedang memproteksi server." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
