const express = require("express");
const cors = require("cors");
const path = require("path");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- KONFIGURASI SPOTIFY (Harta Karun Meg) ---
const CLIENT_ID = "A30094315cfa4c87821bff0e1b8f0763";
const CLIENT_SECRET = "2240075cd31c45f38ea5b2b439b44d05";

// Fungsi buat dapetin Token akses otomatis
async function getSpotifyToken() {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    const res = await axios.post("https://accounts.spotify.com/api/token", params, {
        headers: {
            "Authorization": "Basic " + Buffer.from(CLIENT_ID + ":" + CLIENT_SECRET).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    return res.data.access_token;
}

// API Search: Sekarang ambil data langsung dari Spotify
app.get("/api/search", async (req, res) => {
    try {
        const query = req.query.q || "Hindia";
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const songs = response.data.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists[0].name,
            thumbnail: track.album.images[0].url,
            duration: (track.duration_ms / 1000 / 60).toFixed(2), // Konversi ke menit
            searchQuery: `${track.name} ${track.artists[0].name}` // Buat nyari audionya nanti
        }));

        res.json({ results: songs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Gagal mencari lagu via Spotify" });
    }
});

// API Stream: Ngambil audio lewat provider bypass
app.get("/api/stream", async (req, res) => {
    try {
        const query = req.query.q; // Kita pakai judul + artis buat nyari audionya
        if (!query) return res.status(400).json({ error: "Query diperlukan" });

        // Pakai API downloader yang stabil
        const response = await axios.get(`https://api.shatech.my.id/api/download/ytmp3?url=${encodeURIComponent(query)}`);
        const data = response.data;

        if (data.status && data.result && data.result.download) {
            res.json({
                streamUrl: data.result.download,
                title: data.result.title
            });
        } else {
            throw new Error("Audio tidak ditemukan");
        }
    } catch (err) {
        res.status(500).json({ error: "Gagal memutar lagu." });
    }
});

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
