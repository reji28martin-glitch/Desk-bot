/* ------------------------------------------------------------
 * DeskBot.music
 * Phone-side music control. In a plain web/PWA build this can
 * only drive audio the page itself plays and reflect state via
 * the MediaSession API. Controlling a separate app (Spotify,
 * YouTube Music, etc.) requires a native Android bridge - see
 * the note in docs/SETUP.md ("Music control: current vs future").
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.music = (function(){
  let playing = false;
  const audio = new Audio(); // left with no src by default - hook up a real source/plugin here

  function el(id){ return document.getElementById(id); }

  function reflect(){
    el('btnPlayPause').textContent = playing ? '⏸' : '▶';
    el('musicStatus').textContent = playing ? 'Playing' : 'Stopped';
  }

  function setNowPlaying(title, artist){
    el('musicTitle').textContent = title || 'Nothing playing';
    el('musicArtist').textContent = artist || '--';
    if('mediaSession' in navigator){
      navigator.mediaSession.metadata = new MediaMetadata({ title: title || '', artist: artist || '' });
    }
  }

  function play(){
    playing = true; reflect();
    if('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  }
  function pause(){
    playing = false; reflect();
    if('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  }
  function next(){ DeskBot.app.toast('Next track (hook up your media source)'); }
  function previous(){ DeskBot.app.toast('Previous track (hook up your media source)'); }

  function handleVoiceAction(action){
    if(action === 'play') play();
    else if(action === 'pause') pause();
    else if(action === 'next') next();
    else if(action === 'previous') previous();
  }

  function init(){
    el('btnPlayPause').addEventListener('click', () => playing ? pause() : play());
    el('btnNext').addEventListener('click', next);
    el('btnPrev').addEventListener('click', previous);
    setNowPlaying(null, null);
    reflect();
  }

  return { init, play, pause, next, previous, handleVoiceAction, setNowPlaying };
})();
