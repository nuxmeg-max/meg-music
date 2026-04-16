const express = require("express");
const cors = require("cors");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const YTMusic = require("ytmusic-api").default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Fungsi pembantu untuk init YTMusic di setiap request (Cocok untuk Vercel)
async function getYT() {
    const yt = new YTMusic();
    await yt.initialize();
    return yt;
}

app.get("/api/search", async (req, res) => {
    const q = req.query.q || "Top Hits Indonesia";
    try {
        const ytmusic = await getYT();
        const results = await ytmusic.searchSongs(q);
        const songs = results.slice(0, 20).map(song => ({
            id: song.videoId,
            title: song.name,
            artist: song.artist.name,
            thumbnail: song.thumbnails[song.thumbnails.length - 1].url,
            duration: song.duration
        }));
        res.json({ results: songs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/stream", async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).send("ID missing");
    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
        const format = ytdl.filterFormats(info.formats, "audioonly").sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];
        res.json({
            streamUrl: format.url,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Penting untuk Vercel
module.exports = app;

// Tetap ada listen untuk lokal/panel
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server jalan di ${PORT}`));
}
