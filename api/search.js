const axios = require('axios');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (!q) return res.status(200).json({ tracks: [] });

  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=20`);
    
    if (!response.data.results) {
      return res.status(200).json({ tracks: [] });
    }

    const tracks = response.data.results.map(track => ({
      id: track.trackId.toString(),
      name: track.trackName,
      artist: track.artistName,
      image: track.artworkUrl100.replace('100x100', '500x500'), // Biar gambar HD
      preview_url: track.previewUrl
    }));

    res.status(200).json({ tracks });
  } catch (error) {
    res.status(200).json({ tracks: [], error: error.message });
  }
};
