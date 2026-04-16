const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- DATA SPOTIFY MEG ---
const CLIENT_ID = "A30094315cfa4c87821bff0e1b8f0763";
const CLIENT_SECRET = "2240075cd31c45f38ea5b2b439b44d05";

async function getSpotifyToken() {
    try {
        const params = new URLSearchParams();
        params.append("grant_type", "client_credentials");
        const res = await axios.post("https://accounts.spotify.com/api/token", params, {
            headers: {
                "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded"
            }
        });
        return res.data.access_token;
    } catch (err) {
        console.error("Token Error:", err.response ? err.response.data : err.message);
        return null;
    }
}

app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Hindia";
        const token = await getSpotifyToken();
        if (!token) return res.status(500).json({ error: "Gagal autentikasi Spotify" });

        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const songs = response.data.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0].name,
            thumbnail: track.album.images[0].url,
            searchQuery: `${track.name} ${track.artists[0].name}`
        }));

        res.json({ results: songs });
    } catch (err) {
        res.status(500).json({ error: "Gagal mencari lagu." });
    }
});

app.get("/api/stream", async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: "Lagu tidak ditentukan" });

        // Menggunakan API Shatech sebagai bypass YouTube
        const response = await axios.get(`https://api.shatech.my.id/api/download/ytmp3?url=${encodeURIComponent(query)}`);
        
        if (response.data && response.data.result) {
            res.json({
                streamUrl: response.data.result.download,
                title: response.data.result.title
            });
        } else {
            res.status(404).json({ error: "Audio tidak ditemukan" });
        }
    } catch (err) {
        res.status(500).json({ error: "Gagal mengambil stream audio." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
