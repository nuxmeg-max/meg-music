const express = require("express");
const cors = require("cors");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const YTMusic = require("ytmusic-api").default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Inisialisasi YTMusic di luar agar lebih cepat
const ytmusic = new YTMusic();
let isInitialized = false;

async function ensureInit() {
    if (!isInitialized) {
        await ytmusic.initialize();
        isInitialized = true;
    }
}

app.get("/api/search", async (req, res) => {
    const q = req.query.q || "Top Hits Indonesia";
    try {
        await ensureInit();
        const results = await ytmusic.searchSongs(q);
        
        // Map data dengan proteksi jika ada field yang kosong
        const songs = (results || []).slice(0, 20).map(song => ({
            id: song.videoId,
            title: song.name || "Unknown Title",
            artist: song.artist?.name || "Various Artists",
            thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
            duration: song.duration || 0
        }));
        
        res.json({ results: songs });
    } catch (err) {
        console.error("Search Error:", err);
        res.status(500).json({ error: "Gagal mencari lagu", details: err.message });
    }
});

app.get("/api/stream", async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: "ID diperlukan" });
    
    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
        const format = ytdl.filterFormats(info.formats, "audioonly")
                           .sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
        
        if (!format) throw new Error("Format audio tidak ditemukan");

        res.json({
            streamUrl: format.url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0]?.url || ""
        });
    } catch (err) {
        console.error("Stream Error:", err);
        res.status(500).json({ error: "Gagal memutar lagu" });
    }
});

// Route untuk index.html
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
}
