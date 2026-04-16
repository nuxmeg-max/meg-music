const yts = require('yt-search');
const ytdl = require('ytdl-core');

module.exports = async (req, res) => {
  const { q } = req.query;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (!q) return res.status(400).json({ error: 'Query kosong' });

  try {
    // Cari versi official audio di YouTube
    const r = await yts(q + ' official audio');
    const video = r.videos[0];
    
    if (!video) return res.status(404).json({ error: 'Video tidak ditemukan' });

    // Tarik stream audio kualitas tinggi
    const info = await ytdl.getInfo(video.url);
    const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });

    res.status(200).json({ 
      url: format.url, 
      title: video.title 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
