'use strict';

const state = { playlist: [], searchResults: [], currentIndex: -1, playingFrom: null, isPlaying: false };

const $ = id => document.getElementById(id);
const audio = $('audioPlayer');
const playIcon = $('playIcon');
const statusText = $('statusText');
const statusDot = document.querySelector('.status-dot');
const progressFill = $('progressFill');
const toastEl = $('toast');

// SEARCH
async function fetchSongs(query) {
  if (!query.trim()) return;
  setStatus('SEARCHING...', 'loading');
  $('resultsList').innerHTML = `<div class="empty-state"><p>LOADING DATABASE...</p></div>`;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    state.searchResults = data.tracks || [];
    renderResults(state.searchResults);
    setStatus(`${state.searchResults.length} RESULTS`, 'active');
  } catch (err) {
    setStatus('ERROR', '');
    $('resultsList').innerHTML = `<div class="empty-state"><p>SEARCH FAILED</p></div>`;
  }
}

// PLAY FULL SONG (YT MUSIC)
async function playSong(track) {
  setStatus('CONNECTING TO YT MUSIC...', 'loading');
  updatePlayerMeta(track);
  audio.pause();
  audio.src = '';
  progressFill.style.width = '0%';

  try {
    const query = `${track.name} ${track.artist}`;
    const res = await fetch(`/api/stream?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    if (!data.url) throw new Error('Stream URL missing');

    audio.src = data.url;
    audio.volume = $('volSlider').value / 100;
    await audio.play();

    state.isPlaying = true;
    setPlayIcon(true);
    setStatus('PLAYING FULL', 'active');
    highlightPlaying();
  } catch (err) {
    console.warn('YT Stream failed, using preview.', err);
    showToast('PLAYING 30s PREVIEW');
    
    // Fallback ke Preview iTunes
    if (track.preview_url) {
      audio.src = track.preview_url;
      await audio.play();
      state.isPlaying = true;
      setPlayIcon(true);
      setStatus('PLAYING PREVIEW', 'active');
      highlightPlaying();
    } else {
      setStatus('NO AUDIO', '');
      showToast('AUDIO TIDAK TERSEDIA');
    }
  }
}

// RENDER RESULTS
function renderResults(tracks) {
  $('resultsHeader').style.display = 'flex';
  $('resultsCount').textContent = `${tracks.length} RESULTS`;

  if (!tracks.length) {
    $('resultsList').innerHTML = `<div class="empty-state"><p>NO TRACKS FOUND</p></div>`;
    return;
  }

  $('resultsList').innerHTML = tracks.map((t, i) => `
    <div class="track-card" data-index="${i}">
      <span class="track-num">${String(i + 1).padStart(2, '0')}</span>
      <div class="track-art"><img src="${t.image}" alt="cover" /></div>
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(t.artist)}</div>
      </div>
      <button class="icon-btn add-btn" data-id="${t.id}">+</button>
    </div>
  `).join('');

  document.querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('add-btn')) return;
      state.currentIndex = parseInt(card.dataset.index);
      state.playingFrom = 'search';
      playSong(state.searchResults[state.currentIndex]);
    });
  });

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const track = state.searchResults.find(t => t.id === btn.dataset.id);
      if (track) addToPlaylist(track);
    });
  });
}

// PLAYLIST
function loadPlaylist() {
  const raw = localStorage.getItem('meg_playlist');
  state.playlist = raw ? JSON.parse(raw) : [];
  renderPlaylist();
}
function savePlaylist() { localStorage.setItem('meg_playlist', JSON.stringify(state.playlist)); }
function addToPlaylist(t) {
  if (state.playlist.find(x => x.id === t.id)) return showToast('ALREADY IN LIST');
  state.playlist.push(t); savePlaylist(); renderPlaylist(); showToast('ADDED TO PLAYLIST');
}
function renderPlaylist() {
  $('playlistCount').textContent = `[ ${state.playlist.length} ]`;
  if (!state.playlist.length) {
    $('playlistList').innerHTML = `<div class="empty-state"><p>NO TRACKS SAVED</p></div>`;
    return;
  }
  $('playlistList').innerHTML = state.playlist.map((t, i) => `
    <div class="track-card" data-index="${i}">
      <div class="track-info">
        <div class="track-name">${escHtml(t.name)}</div>
        <div class="track-artist">${escHtml(t.artist)}</div>
      </div>
      <button class="icon-btn remove-btn" data-index="${i}">✕</button>
    </div>
  `).join('');

  $('playlistList').querySelectorAll('.track-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.classList.contains('remove-btn')) return;
      state.currentIndex = parseInt(card.dataset.index);
      state.playingFrom = 'playlist';
      playSong(state.playlist[state.currentIndex]);
    });
  });

  $('playlistList').querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.playlist.splice(btn.dataset.index, 1);
      savePlaylist(); renderPlaylist();
    });
  });
}

// CONTROLS
$('playPauseBtn').addEventListener('click', () => {
  if (!audio.src) return;
  if (state.isPlaying) { audio.pause(); state.isPlaying = false; setPlayIcon(false); setStatus('PAUSED', ''); } 
  else { audio.play(); state.isPlaying = true; setPlayIcon(true); setStatus('PLAYING', 'active'); }
});
$('prevBtn').addEventListener('click', () => navigate(-1));
$('nextBtn').addEventListener('click', () => navigate(1));
function navigate(dir) {
  const list = state.playingFrom === 'playlist' ? state.playlist : state.searchResults;
  if (!list.length) return;
  state.currentIndex = (state.currentIndex + dir + list.length) % list.length;
  playSong(list[state.currentIndex]);
}

// PROGRESS & TIME
audio.addEventListener('timeupdate', () => {
  if (!audio.duration) return;
  progressFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
  $('currentTime').textContent = formatSecs(audio.currentTime);
});
audio.addEventListener('loadedmetadata', () => { $('totalTime').textContent = formatSecs(audio.duration); });
audio.addEventListener('ended', () => navigate(1));

$('progressBar').addEventListener('click', e => {
  if (!audio.duration) return;
  const rect = $('progressBar').getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

$('volSlider').addEventListener('input', e => audio.volume = e.target.value / 100);

// EVENT LISTENERS
$('searchBtn').addEventListener('click', () => fetchSongs($('searchInput').value));
$('searchInput').addEventListener('keydown', e => e.key === 'Enter' && fetchSongs($('searchInput').value));
$('clearPlaylistBtn').addEventListener('click', () => { state.playlist = []; savePlaylist(); renderPlaylist(); });

// HELPERS
function updatePlayerMeta(track) {
  $('playerTrack').textContent = track.name;
  $('playerArtist').textContent = track.artist;
  $('totalTime').textContent = '0:00';
}
function formatSecs(s) {
  if (isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}
function setPlayIcon(playing) { playIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-play'; }
function setStatus(text, type) { statusText.textContent = text; statusDot.className = `status-dot ${type}`; }
function showToast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(() => toastEl.classList.remove('show'), 2000); }
function escHtml(str) { return String(str).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function highlightPlaying() {
  document.querySelectorAll('.track-card.playing').forEach(c => c.classList.remove('playing'));
  const list = state.playingFrom === 'playlist' ? $('playlistList') : $('resultsList');
  const cards = list.querySelectorAll('.track-card');
  if (cards[state.currentIndex]) cards[state.currentIndex].classList.add('playing');
}

// INITIALIZE WAKTU WEB DIBUKA
window.addEventListener('DOMContentLoaded', () => {
  loadPlaylist();
  fetchSongs('Hindia'); // Langsung nyari "Hindia" biar webnya gak kosong
});
