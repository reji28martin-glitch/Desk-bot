/* ------------------------------------------------------------
 * DeskBot.config
 * Central place for endpoint config. Values load from
 * localStorage (set on the Settings screen) and fall back to
 * sane local-network defaults. No secrets live here or anywhere
 * else in the client - the AI provider key stays on the backend.
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.config = {
  KEY: 'deskbot.config.v1',

  defaults: {
    robotName: 'DeskBot',
    robotHost: 'deskbot.local',       // ESP32 mDNS name or IP, no scheme
    backendUrl: '',                   // e.g. https://deskbot-api.example.com
    backendToken: '',                 // shared secret, sent as X-DeskBot-Token
    voiceOutput: 'phone',
    volume: 70,
    panMin: 0, panMax: 180,
    tiltMin: 30, tiltMax: 150,
    sensitivity: 5
  },

  load(){
    try{
      const raw = localStorage.getItem(this.KEY);
      return raw ? { ...this.defaults, ...JSON.parse(raw) } : { ...this.defaults };
    }catch(e){ return { ...this.defaults }; }
  },

  save(cfg){
    try{ localStorage.setItem(this.KEY, JSON.stringify(cfg)); }catch(e){}
  },

  robotBaseUrl(cfg){
    cfg = cfg || this.load();
    const host = cfg.robotHost || this.defaults.robotHost;
    return `http://${host}`;
  },

  robotWsUrl(cfg){
    cfg = cfg || this.load();
    const host = cfg.robotHost || this.defaults.robotHost;
    return `ws://${host}/ws`;
  }
};
