const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const CLIENT_ID = "A30094315cfa4c87821bff0e1b8f0763";
const CLIENT_SECRET = "2240075cd31c45f38ea5b2b439b44d05";

async function getSpotifyToken() {
    try {
        const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
        const res = await axios.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
            headers: {
                "Authorization": `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        return res.data.access_token;
    } catch (err) {
        return null;
    }
}

app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Hindia";
        const token = await getSpotifyToken();
        if (!token) return res.status(500).json({ error: "Auth failed" });

        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const songs = response.data.tracks.items.map(t => ({
            id: t.id,
            title: t.name,
            artist: t.artists[0].name,
            thumbnail: t.album.images[0].url,
            searchQuery: `${t.name} ${t.artists[0].name}`
        }));
        res.json({ results: songs });
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

app.get("/api/stream", async (req, res) => {
    try {
        const query = req.query.q;
        // Gunakan API alternatif yang lebih ringan untuk bypass YouTube
        const response = await axios.get(`https://api.vyt.ovh/v1/search?q=${encodeURIComponent(query)}`);
        const videoId = response.data[0].id;
        
        // Link stream langsung
        res.json({
            streamUrl: `https://api.vyt.ovh/v1/stream?id=${videoId}`,
            title: query
        });
    } catch (err) {
        res.status(500).json({ error: "Stream failed" });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
