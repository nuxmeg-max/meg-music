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

        const videoUrl = `https://www.youtube.com/watch?v=${id}`;
        
        // Menggunakan opsi request untuk meminimalisir blokir dari YouTube
        const info = await ytdl.getInfo(videoUrl, {
            requestOptions: {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                }
            }
        });

        // Pilih format audio saja dengan bitrate tertinggi
        const format = ytdl.chooseFormat(info.formats, { 
            filter: "audioonly", 
            quality: "highestaudio" 
        });

        if (!format || !format.url) {
            throw new Error("Format audio tidak ditemukan");
        }

        res.json({
            streamUrl: format.url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url || ""
        });
    } catch (err) {
        console.error("Stream Error:", err.message);
        res.status(500).json({ 
            error: "Gagal memutar lagu", 
            message: "YouTube memblokir akses server. Coba lagi beberapa saat." 
        });
    }
});

module.exports = app;
