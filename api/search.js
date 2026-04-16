const axios = require('axios');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    // Kita pakai search engine Deezer (lebih stabil & tidak butuh API Key)
    const response = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(q)}`);
    
    const tracks = response.data.data.map(track => ({
      id: track.id.toString(),
      name: track.title,
      artist: track.artist.name,
      image: track.album.cover_medium,
      preview_url: track.preview // Tetap sediakan preview untuk cadangan
    }));

    res.status(200).json({ tracks });
  } catch (error) {
    res.status(500).json({ error: 'Server Error' });
  }
};
