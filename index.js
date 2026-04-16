const express = require("express");
const cors = require("cors");
const path = require("path");
const yts = require("yt-search");

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

        // Pakai API pihak ketiga yang biasa dipakai scripter bot
        // Ini lebih kuat dibanding ytdl-core biasa
        const response = await fetch(`https://api.vyt.ovh/v1/info?id=${id}`);
        const data = await response.json();

        // Cari format audio saja yang kualitasnya oke
        const audio = data.formats.filter(f => f.type === 'audio').sort((a, b) => b.bitrate - a.bitrate)[0];

        if (audio && audio.url) {
            return res.json({
                streamUrl: audio.url,
                title: data.title,
                thumbnail: data.thumbnail
            });
        } else {
            // Fallback ke API lain jika yang pertama gagal
            const backup = await fetch(`https://api.shatech.my.id/api/download/ytmp3?url=https://www.youtube.com/watch?v=${id}`);
            const resBackup = await backup.json();
            
            if (resBackup.result && resBackup.result.download) {
                return res.json({
                    streamUrl: resBackup.result.download,
                    title: resBackup.result.title,
                    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                });
            }
            throw new Error("Proteksi YouTube terlalu kuat.");
        }
    } catch (err) {
        res.status(500).json({ error: "Gagal stream: Server YouTube menolak koneksi." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
