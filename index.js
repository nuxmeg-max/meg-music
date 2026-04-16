const express = require("express");
const cors = require("cors");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const YTMusic = require("ytmusic-api").default;

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Route Search
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Top Hits Indonesia";
        const ytmusic = new YTMusic();
        await ytmusic.initialize();
        const results = await ytmusic.searchSongs(query);
        
        const songs = results.map(song => ({
            id: song.videoId,
            title: song.name,
            artist: song.artist?.name || "Unknown",
            thumbnail: song.thumbnails?.[song.thumbnails.length - 1]?.url || "",
            duration: song.duration
        }));
        
        res.json({ results: songs });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route Stream
app.get("/api/stream", async (req, res) => {
    try {
        const id = req.query.id;
        if (!id) return res.status(400).json({ error: "ID Missing" });

        const info = await ytdl.getInfo(id);
        const format = ytdl.filterFormats(info.formats, "audioonly")[0];
        
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

module.exports = app;
