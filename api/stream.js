const yts = require('yt-search');
const axios = require('axios');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!q) return res.status(400).json({ error: 'Query required' });

  try {
    // 1. Cari video di YT Music
    const r = await yts(q + " official audio");
    const video = r.videos[0];
    if (!video) return res.status(404).json({ error: 'Not found' });

    // 2. Ambil link stream lewat Cobalt (High Quality)
    const cobaltRes = await axios.post('https://api.cobalt.tools/api/json', {
      url: video.url,
      downloadMode: 'audio',
      audioFormat: 'mp3'
    }, {
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
    });

    if (cobaltRes.data && cobaltRes.data.url) {
      res.status(200).json({ url: cobaltRes.data.url });
    } else {
      throw new Error('Streaming failed');
    }
  } catch (error) {
    res.status(500).json({ error: 'Server busy' });
  }
};
