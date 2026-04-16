const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route Pencarian
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Top Hits Indonesia";
        const r = await yts(query);
        const videos = r.videos.slice(0, 20);
        
        // Format data agar sesuai dengan kebutuhan UI kamu
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

// Route Streaming (Ini kode yang kamu buat tadi, sudah benar!)
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        const apiUrl = `https://api.vyt.ovh/v1/info?id=${id}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        const audioFormat = data.formats.filter(f => f.type === 'audio').sort((a, b) => b.bitrate - a.bitrate)[0];

        if (audioFormat && audioFormat.url) {
            res.json({
                streamUrl: audioFormat.url,
                title: data.title,
                thumbnail: data.thumbnail
            });
        } else {
            throw new Error("Format tidak ditemukan");
        }
    } catch (err) {
        console.error("Stream Error:", err.message);
        res.status(500).json({ error: "Gagal mendapatkan stream audio" });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
