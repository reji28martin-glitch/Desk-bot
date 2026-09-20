/* ------------------------------------------------------------
 * DeskBot.settings
 * Reads/writes DeskBot.config (localStorage) from the Settings
 * screen, plus text-to-speech playback for AI replies.
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.settings = (function(){
  function el(id){ return document.getElementById(id); }

  function populate(){
    const cfg = DeskBot.config.load();
    el('cfgRobotName').value = cfg.robotName;
    el('cfgRobotHost').value = cfg.robotHost;
    el('cfgBackendUrl').value = cfg.backendUrl;
    el('cfgBackendToken').value = cfg.backendToken;
    el('cfgVoiceOutput').value = cfg.voiceOutput;
    el('cfgVolume').value = cfg.volume;
    el('cfgPanMin').value = cfg.panMin;
    el('cfgPanMax').value = cfg.panMax;
    el('cfgTiltMin').value = cfg.tiltMin;
    el('cfgTiltMax').value = cfg.tiltMax;
    el('cfgSensitivity').value = cfg.sensitivity;
  }

  function collect(){
    return {
      robotName: el('cfgRobotName').value.trim() || 'DeskBot',
      robotHost: el('cfgRobotHost').value.trim() || 'deskbot.local',
      backendUrl: el('cfgBackendUrl').value.trim(),
      backendToken: el('cfgBackendToken').value.trim(),
      voiceOutput: el('cfgVoiceOutput').value,
      volume: Number(el('cfgVolume').value),
      panMin: Number(el('cfgPanMin').value),
      panMax: Number(el('cfgPanMax').value),
      tiltMin: Number(el('cfgTiltMin').value),
      tiltMax: Number(el('cfgTiltMax').value),
      sensitivity: Number(el('cfgSensitivity').value)
    };
  }

  function speak(text){
    const cfg = DeskBot.config.load();
    if(cfg.voiceOutput !== 'phone') return; // 'robot' output happens on the ESP32 speaker instead
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(u);
  }

  function init(){
    populate();
    el('btnSaveSettings').addEventListener('click', () => {
      const cfg = collect();
      DeskBot.config.save(cfg);
      DeskBot.app.toast('Settings saved');
      DeskBot.app.reconnect();
    });
    el('btnWipeMemory').addEventListener('click', async () => {
      if(!confirm('This clears memory on the robot\'s microSD card. Continue?')) return;
      try{
        await DeskBot.api.backendPost('/api/memory/wipe', {});
        DeskBot.app.toast('Memory wipe requested');
      }catch(e){ DeskBot.app.toast('Could not reach backend'); }
    });
  }

  return { init, populate, collect, speak };
})();
