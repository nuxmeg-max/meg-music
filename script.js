/* ─────────────────────────────────────────────
   MEG MUSIC — FRONTEND LOGIC (ADAPTED)
   API endpoint: /api/search
───────────────────────────────────────────── */

'use strict';

const state = {
  playlist:      [],
  searchResults: [],
  currentIndex:  -1,
  playingFrom:   null,
  isPlaying:     false,
  isSeeking:     false,
};

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
const currentTime    = $('currentTime');
const totalTime      = $('totalTime');
const volSlider      = $('volSlider');
const volValue       = $('volValue');
const playerTrack    = $('playerTrack');
const playerArtist   = $('playerArtist');
const statusDot      = document.querySelector('.status-dot');
const statusText     = $('statusText');
const toastEl        = $('toast');

// ── SEARCH LOGIC ─────────────────────────────
async function fetchSongs(query) {
  if (!query.trim()) return;

  setStatus('SEARCHING...', 'loading');
  renderSkeletons();

  try {
    // Memanggil API yang kamu buat di folder /api/search.js
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const tracks = data.tracks || [];
    state.searchResults = tracks;
    renderResults(tracks);
    setStatus(`${tracks.length} RESULTS`, 'active');
  } catch (err) {
    console.error('Search error:', err);
    setStatus('ERROR', '');
    resultsList.innerHTML = `<div class="empty-state"><p>SEARCH FAILED</p></div>`;
    showToast('CHECK PACKAGE.JSON & API FOLDER');
  }
}

// ── PLAY LOGIC ───────────────────────────────
async function playSong(track) {
  setStatus('LOADING...', 'loading');
  updatePlayerMeta(track);

  try {
    // Karena pakai iTunes, link MP3 ada di preview_url
    if (!track.preview_url) throw new Error('No preview URL');

    audio.src = track.preview_url;
    audio.volume = volSlider.value / 100;
    
    await audio.play();

    state.isPlaying = true;
    setPlayIcon(true);
    setStatus('PLAYING', 'active');
    highlightPlaying();

  } catch (err) {
    console.error('Play error:', err);
    setStatus('PREVIEW UNAVAILABLE', '');
    showToast('MP3 LINK NOT FOUND');
  }
}

// ── RENDER RESULTS ───────────────────────────
function renderResults(tracks) {
  resultsHeader.style.display = 'flex';
  resultsCount.textContent = `${tracks.length} RESULTS`;

  if (!tracks.length) {
    resultsList.innerHTML = `<div class="empty-state"><p>NO TRACKS FOUND</p></div>`;
    return;
  }

  resultsList.innerHTML = tracks.map((t, i) => `
    <div class="track-card" data-index="${i}" data-source="search">
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="track-art"><img src="${t.image}" alt="" /></div>
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(t.artist)}</div>
      </div>
      <div class="track-actions">
        <button class="icon-btn add-btn" data-id="${t.id}">+</button>
      </div>
    </div>
  `).join('');

  resultsList.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('add-btn')) return;
      const idx = parseInt(card.dataset.index);
      state.currentIndex = idx;
      state.playingFrom = 'search';
      playSong(state.searchResults[idx]);
    });
  });

  resultsList.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const track = state.searchResults.find(t => t.id === btn.dataset.id);
      if (track) addToPlaylist(track);
    });
  });
}

// ── PLAYLIST LOGIC ───────────────────────────
const STORAGE_KEY = 'meg_music_playlist';

function loadPlaylist() {
  const raw = localStorage.getItem(STORAGE_KEY);
  state.playlist = raw ? JSON.parse(raw) : [];
  renderPlaylist();
}

function savePlaylist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.playlist));
}

function addToPlaylist(track) {
  if (state.playlist.find(t => t.id === track.id)) return showToast('ALREADY IN LIST');
  state.playlist.push(track);
  savePlaylist();
  renderPlaylist();
  showToast('ADDED');
}

function renderPlaylist() {
  playlistCount.textContent = `[ ${state.playlist.length} ]`;
  if (!state.playlist.length) {
    playlistList.innerHTML = `<div class="empty-state"><p>EMPTY</p></div>`;
    return;
  }
  playlistList.innerHTML = state.playlist.map((t, i) => `
    <div class="track-card" data-index="${i}" data-source="playlist">
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(t.artist)}</div>
      </div>
      <button class="icon-btn remove-btn" data-id="${t.id}">✕</button>
    </div>
  `).join('');

  playlistList.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('remove-btn')) return;
      state.currentIndex = parseInt(card.dataset.index);
      state.playingFrom = 'playlist';
      playSong(state.playlist[state.currentIndex]);
    });
  });

  playlistList.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.playlist = state.playlist.filter(t => t.id !== btn.dataset.id);
      savePlaylist();
      renderPlaylist();
    });
  });
}

// ── PLAYER CONTROLS ──────────────────────────
playPauseBtn.addEventListener('click', () => {
  if (!audio.src) return;
  if (state.isPlaying) {
    audio.pause();
    state.isPlaying = false;
    setPlayIcon(false);
  } else {
    audio.play();
    state.isPlaying = true;
    setPlayIcon(true);
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

audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = `${pct}%`;
  currentTime.textContent = formatSecs(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
  totalTime.textContent = formatSecs(audio.duration);
});

volSlider.addEventListener('input', () => {
  audio.volume = volSlider.value / 100;
  volValue.textContent = volSlider.value;
});

// ── HELPERS ──────────────────────────────────
function updatePlayerMeta(track) {
  playerTrack.textContent = track.name;
  playerArtist.textContent = track.artist;
}

function formatSecs(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return `${m}:${sec}`;
}

function setPlayIcon(playing) {
  playIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play';
}

function setStatus(text, type) {
  statusText.textContent = text;
  statusDot.className = `status-dot ${type || ''}`;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2000);
}

function escHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function renderSkeletons() {
  resultsList.innerHTML = '<p style="padding:20px; color:gray;">LOADING TRACKS...</p>';
}

function highlightPlaying() {
  document.querySelectorAll('.track-card.playing').forEach(c => c.classList.remove('playing'));
}

// ── INIT ─────────────────────────────────────
searchBtn.addEventListener('click', () => fetchSongs(searchInput.value));
searchInput.addEventListener('keydown', e => e.key === 'Enter' && fetchSongs(searchInput.value));
clearBtn.addEventListener('click', () => { state.playlist = []; savePlaylist(); renderPlaylist(); });
loadPlaylist();
