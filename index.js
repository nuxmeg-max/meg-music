const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID diperlukan" });

        const url = `https://www.youtube.com/watch?v=${id}`;

        // Validasi dulu apakah video bisa diakses
        if (!ytdl.validateID(id)) {
            return res.status(400).json({ error: "ID video tidak valid" });
        }

        // Ambil info video untuk dapat stream URL audio
        const info = await ytdl.getInfo(url);

        // Pilih format audio terbaik (hanya audio, bukan video+audio)
        const audioFormat = ytdl.chooseFormat(info.formats, {
            quality: "highestaudio",
            filter: "audioonly"
        });

        if (!audioFormat || !audioFormat.url) {
            return res.status(500).json({ error: "Format audio tidak tersedia" });
        }

        // Kirim URL audio langsung ke frontend (bukan stream binary)
        // Frontend akan langsung fetch ke URL ini via <audio> tag
        return res.json({
            streamUrl: audioFormat.url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        });

    } catch (err) {
        console.error("Stream error:", err.message);
        res.status(500).json({ error: "Gagal stream: " + err.message });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
