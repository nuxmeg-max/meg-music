const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// API untuk Search (Pakai yt-search karena paling bandel)
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Hindia";
        const r = await yts(query);
        const songs = r.videos.slice(0, 15).map(v => ({
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

// API untuk Stream (Pakai Proxy Player supaya gak diblokir)
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        // Pakai API bypass eksternal yang stabil untuk Vercel
        const streamUrl = `https://api.vyt.ovh/v1/stream?id=${id}`;
        
        res.json({
            streamUrl: streamUrl,
            title: "Playing..."
        });
    } catch (err) {
        res.status(500).json({ error: "Gagal memutar" });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
