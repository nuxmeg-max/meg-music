const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route Pencarian Menggunakan yt-search (Lebih Stabil)
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Top Hits Indonesia";
        const r = await yts(query);
        const videos = r.videos.slice(0, 20);
        
        const songs = videos.map(v => ({
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

// Route Streaming
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        const info = await ytdl.getInfo(id);
        const format = ytdl.filterFormats(info.formats, "audioonly")[0];
        
        res.json({
            streamUrl: format.url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (err) {
        res.status(500).json({ error: "Gagal memutar audio" });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
