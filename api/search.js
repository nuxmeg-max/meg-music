const axios = require('axios');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (!q) return res.status(400).json({ error: 'Query kosong' });

  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=20`);
    
    const tracks = response.data.results.map(track => ({
      id: track.trackId.toString(),
      name: track.trackName,
      artist: track.artistName,
      duration_ms: track.trackTimeMillis,
      preview_url: track.previewUrl,
      image: track.artworkUrl100
    }));

    res.status(200).json({ tracks });
  } catch (error) {
    res.status(500).json({ error: 'Gagal mencari lagu' });
  }
};
