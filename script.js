/* ─────────────────────────────────────────────
   MEG MUSIC — FRONTEND LOGIC
   API endpoints: /api/search  /api/stream
───────────────────────────────────────────── */

'use strict';

// ── STATE ────────────────────────────────────
const state = {
  playlist:      [],
  searchResults: [],
  currentIndex:  -1,   // index in playlist or search results
  playingFrom:   null, // 'search' | 'playlist'
  isPlaying:     false,
  isSeeking:     false,
};

// ── DOM REFS ─────────────────────────────────
const $ = id => document.getElementById(id);

const searchInput    = $('searchInput');
const searchBtn      = $('searchBtn');
const resultsList    = $('resultsList');
const resultsHeader  = $('resultsHeader');
const resultsCount   = $('resultsCount');
const playlistList   = $('playlistList');
const playlistCount  = $('playlistCount');
const clearBtn       = $('clearPlaylistBtn');

const audio          = $('audioPlayer');
const playPauseBtn   = $('playPauseBtn');
const playIcon       = $('playIcon');
const prevBtn        = $('prevBtn');
const nextBtn        = $('nextBtn');
const progressBar    = $('progressBar');
const progressFill   = $('progressFill');
const progressThumb  = $('progressThumb');
const currentTime    = $('currentTime');
const totalTime      = $('totalTime');
const volSlider      = $('volSlider');
const volValue       = $('volValue');
const playerTrack    = $('playerTrack');
const playerArtist   = $('playerArtist');
const playIcon_ctrl  = $('playIcon');
const statusDot      = document.querySelector('.status-dot');
const statusText     = $('statusText');
const toastEl        = $('toast');

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────

async function fetchSongs(query) {
  if (!query.trim()) return;

  setStatus('SEARCHING...', 'loading');
  renderSkeletons();

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Spotify API returns { tracks: { items: [...] } }
    const tracks = data?.tracks?.items || data?.items || data || [];
    state.searchResults = tracks;
    renderResults(tracks);
    setStatus(`${tracks.length} RESULTS`, 'active');
  } catch (err) {
    console.error('Search error:', err);
    setStatus('ERROR', '');
    resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠</div>
        <p>SEARCH FAILED — CHECK API</p>
      </div>`;
    showToast('SEARCH FAILED');
  }
}

// ─────────────────────────────────────────────
// STREAM / PLAY
// ─────────────────────────────────────────────

async function playSong(track) {
  setStatus('LOADING...', 'loading');
  updatePlayerMeta(track);

  try {
    const query = `${track.name} ${getArtistName(track)}`;
    const res   = await fetch(`/api/stream?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data  = await res.json();

    // Expect { url: 'https://...' } or { stream: '...' }
    const url = data?.url || data?.stream || data?.audioUrl || data?.preview_url;

    if (!url) throw new Error('No stream URL returned');

    audio.src = url;
    audio.volume = volSlider.value / 100;
    await audio.play();

    state.isPlaying = true;
    setPlayIcon(true);
    setStatus('PLAYING', 'active');
    highlightPlaying();

  } catch (err) {
    console.error('Stream error:', err);
    setStatus('STREAM ERROR', '');
    showToast('STREAM UNAVAILABLE');

    // Fallback: try preview_url from Spotify data
    if (track.preview_url) {
      audio.src = track.preview_url;
      audio.volume = volSlider.value / 100;
      audio.play().then(() => {
        state.isPlaying = true;
        setPlayIcon(true);
        setStatus('PREVIEW MODE', 'active');
        showToast('PLAYING 30s PREVIEW');
        highlightPlaying();
      }).catch(() => setStatus('NO AUDIO', ''));
    }
  }
}

// ─────────────────────────────────────────────
// PLAYLIST — localStorage
// ─────────────────────────────────────────────

const STORAGE_KEY = 'meg_music_playlist';

function loadPlaylist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.playlist = raw ? JSON.parse(raw) : [];
  } catch { state.playlist = []; }
  renderPlaylist();
}

function savePlaylist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playlist));
}

function addToPlaylist(track) {
  const exists = state.playlist.find(t => t.id === track.id);
  if (exists) { showToast('ALREADY IN PLAYLIST'); return; }
  state.playlist.push(track);
  savePlaylist();
  renderPlaylist();
  showToast('ADDED TO PLAYLIST');
}

function removeFromPlaylist(id) {
  state.playlist = state.playlist.filter(t => t.id !== id);
  savePlaylist();
  renderPlaylist();
  showToast('REMOVED');
}

function clearPlaylist() {
  if (!state.playlist.length) return;
  state.playlist = [];
  savePlaylist();
  renderPlaylist();
  showToast('PLAYLIST CLEARED');
}

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

function renderResults(tracks) {
  resultsHeader.style.display = 'flex';
  resultsCount.textContent    = `${tracks.length} RESULTS`;

  if (!tracks.length) {
    resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◈</div>
        <p>NO TRACKS FOUND</p>
      </div>`;
    return;
  }

  resultsList.innerHTML = tracks.map((t, i) => `
    <div class="track-card" data-index="${i}" data-source="search">
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="track-art">
        ${getArtImage(t)}
      </div>
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(getArtistName(t))}</div>
      </div>
      <span class="track-duration">${formatDuration(t.duration_ms)}</span>
      <div class="track-actions">
        <button class="icon-btn add-btn" data-id="${t.id}" title="Add to playlist">+</button>
      </div>
    </div>
  `).join('');

  // Click to play
  resultsList.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('add-btn')) return;
      const idx = parseInt(card.dataset.index);
      state.currentIndex = idx;
      state.playingFrom  = 'search';
      playSong(state.searchResults[idx]);
    });
  });

  // Add to playlist
  resultsList.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id    = btn.dataset.id;
      const track = state.searchResults.find(t => t.id === id);
      if (track) addToPlaylist(track);
    });
  });
}

function renderPlaylist() {
  playlistCount.textContent = `[ ${state.playlist.length} ]`;

  if (!state.playlist.length) {
    playlistList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">◇</div>
        <p>NO TRACKS SAVED YET</p>
      </div>`;
    return;
  }

  playlistList.innerHTML = state.playlist.map((t, i) => `
    <div class="track-card" data-index="${i}" data-source="playlist">
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="track-art">
        ${getArtImage(t)}
      </div>
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(getArtistName(t))}</div>
      </div>
      <span class="track-duration">${formatDuration(t.duration_ms)}</span>
      <div class="track-actions">
        <button class="icon-btn remove-btn" data-id="${t.id}" title="Remove">✕</button>
      </div>
    </div>
  `).join('');

  // Click to play
  playlistList.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('remove-btn')) return;
      const idx = parseInt(card.dataset.index);
      state.currentIndex = idx;
      state.playingFrom  = 'playlist';
      playSong(state.playlist[idx]);
    });
  });

  // Remove buttons
  playlistList.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      removeFromPlaylist(btn.dataset.id);
    });
  });
}

function renderSkeletons() {
  resultsHeader.style.display = 'none';
  resultsList.innerHTML = Array(6).fill(0).map(() => `
    <div class="skeleton">
      <div class="skel-box skel-art"></div>
      <div class="skel-info">
        <div class="skel-box skel-line"></div>
        <div class="skel-box skel-line"></div>
      </div>
    </div>
  `).join('');
}

function highlightPlaying() {
  document.querySelectorAll('.track-card.playing').forEach(c => c.classList.remove('playing'));
  const source = state.playingFrom;
  const idx    = state.currentIndex;
  const list   = source === 'playlist' ? playlistList : resultsList;
  const cards  = list?.querySelectorAll('.track-card');
  if (cards?.[idx]) cards[idx].classList.add('playing');
}

// ─────────────────────────────────────────────
// PLAYER CONTROLS
// ─────────────────────────────────────────────

playPauseBtn.addEventListener('click', () => {
  if (!audio.src) return;
  if (state.isPlaying) {
    audio.pause();
    state.isPlaying = false;
    setPlayIcon(false);
    setStatus('PAUSED', '');
  } else {
    audio.play();
    state.isPlaying = true;
    setPlayIcon(true);
    setStatus('PLAYING', 'active');
  }
});

prevBtn.addEventListener('click', () => navigate(-1));
nextBtn.addEventListener('click', () => navigate(1));

function navigate(dir) {
  const list = state.playingFrom === 'playlist' ? state.playlist : state.searchResults;
  if (!list.length) return;
  state.currentIndex = (state.currentIndex + dir + list.length) % list.length;
  playSong(list[state.currentIndex]);
}

// Progress bar seek
progressBar.addEventListener('click', e => {
  if (!audio.duration) return;
  const rect = progressBar.getBoundingClientRect();
  const pct  = (e.clientX - rect.left) / rect.width;
  audio.currentTime = pct * audio.duration;
});

// Audio events
audio.addEventListener('timeupdate', () => {
  if (!audio.duration || state.isSeeking) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width  = `${pct}%`;
  progressThumb.style.left  = `${pct}%`;
  currentTime.textContent   = formatSecs(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  totalTime.textContent = formatSecs(audio.duration);
});

audio.addEventListener('ended', () => {
  state.isPlaying = false;
  setPlayIcon(false);
  setStatus('ENDED', '');
  navigate(1); // autoplay next
});

audio.addEventListener('error', () => {
  setStatus('ERROR', '');
  showToast('AUDIO ERROR');
});

// Volume
volSlider.addEventListener('input', () => {
  const v = volSlider.value;
  audio.volume = v / 100;
  volValue.textContent = v;
});

// ─────────────────────────────────────────────
// SEARCH INPUT
// ─────────────────────────────────────────────

searchBtn.addEventListener('click', () => fetchSongs(searchInput.value));
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') fetchSongs(searchInput.value);
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function updatePlayerMeta(track) {
  playerTrack.textContent  = track.name || '—';
  playerArtist.textContent = getArtistName(track) || '—';
  progressFill.style.width = '0%';
  progressThumb.style.left = '0%';
  currentTime.textContent  = '0:00';
  totalTime.textContent    = formatDuration(track.duration_ms);
  document.title = `${track.name} — MEG MUSIC`;
}

function getArtistName(track) {
  if (!track) return '';
  if (track.artists?.length) return track.artists.map(a => a.name).join(', ');
  if (track.artist) return track.artist;
  return '';
}

function getArtImage(track) {
  const url = track.album?.images?.[2]?.url
           || track.album?.images?.[0]?.url
           || track.image
           || null;
  return url
    ? `<img src="${escHtml(url)}" alt="" loading="lazy" />`
    : `<div class="track-art-placeholder">♪</div>`;
}

function formatDuration(ms) {
  if (!ms) return '—';
  return formatSecs(ms / 1000);
}

function formatSecs(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${sec}`;
}

function setPlayIcon(playing) {
  playIcon.innerHTML = playing ? '&#9646;&#9646;' : '&#9654;';
  playPauseBtn.classList.toggle('is-playing', playing);
}

function setStatus(text, type) {
  statusText.textContent = text;
  statusDot.className    = `status-dot ${type || ''}`.trim();
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

loadPlaylist();
clearBtn.addEventListener('click', clearPlaylist);
