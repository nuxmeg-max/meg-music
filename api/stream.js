const axios = require('axios');
const yts = require('yt-search');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const r = await yts(q + " official audio");
    const video = r.videos[0];
    if (!video) return res.status(404).json({ error: 'Not found' });

    // Menggunakan API Cobalt untuk bypass limit YouTube
    const cobalt = await axios.post('https://api.cobalt.tools/api/json', {
      url: video.url,
      downloadMode: 'audio'
    }, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });

    res.status(200).json({ url: cobalt.data.url });
  } catch (error) {
    res.status(500).json({ error: 'Gagal memuat suara, coba lagi.' });
  }
};
