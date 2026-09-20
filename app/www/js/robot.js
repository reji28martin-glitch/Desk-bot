/* ------------------------------------------------------------
 * DeskBot.robot
 * Robot command dispatch + local "is this a hardware command or
 * an AI question" router, plus status/telemetry state.
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.robot = (function(){

  const state = {
    connected: false,
    wifi: 'Unknown',
    camera: 'Unknown',
    ai: 'Unknown',
    tracking: false,
    battery: null,
    robotState: 'OFFLINE',   // IDLE/LISTENING/THINKING/SPEAKING/TRACKING/FACE DETECTED/OWNER RECOGNIZED/OFFLINE/ERROR
    pan: null,
    tilt: null,
    faceDetected: false,
    ownerRecognized: false
  };

  // Command endpoints - see docs/ESP32_PROTOCOL.md. Centralised here so the
  // protocol can be swapped (e.g. to a different path scheme) in one spot.
  const ENDPOINTS = {
    panLeft:   '/servo/pan/left',
    panRight:  '/servo/pan/right',
    tiltUp:    '/servo/tilt/up',
    tiltDown:  '/servo/tilt/down',
    center:    '/servo/center',
    trackStart:'/tracking/start',
    trackStop: '/tracking/stop',
    status:    '/status'
  };

  async function send(path){
    return DeskBot.api.robotCommand(path);
  }

  async function refreshStatus(){
    try{
      const data = await DeskBot.api.robotGet(ENDPOINTS.status);
      applyTelemetry(data);
      state.connected = true;
    }catch(e){
      state.connected = false;
      state.robotState = 'OFFLINE';
    }
    return state;
  }

  function applyTelemetry(data){
    if(!data || typeof data !== 'object') return;
    if('wifi' in data) state.wifi = data.wifi;
    if('camera' in data) state.camera = data.camera;
    if('ai' in data) state.ai = data.ai;
    if('tracking' in data) state.tracking = !!data.tracking;
    if('battery' in data) state.battery = data.battery;
    if('state' in data) state.robotState = data.state;
    if('pan' in data) state.pan = data.pan;
    if('tilt' in data) state.tilt = data.tilt;
    if('face_detected' in data) state.faceDetected = !!data.face_detected;
    if('owner_recognized' in data) state.ownerRecognized = !!data.owner_recognized;
    state.connected = true;
  }

  /* --------------------------------------------------------
   * Local command router: decides whether a typed/spoken
   * utterance is a direct hardware command, a wake-phrase for a
   * hardware action, or should go to the AI backend instead.
   * Returns { type: 'hardware'|'ai', endpoint?, label? }
   * ------------------------------------------------------ */
  const HARDWARE_RULES = [
    { re: /\b(turn|look|pan|rotate)\s+left\b/i,        endpoint: ENDPOINTS.panLeft,   label: 'Turning left' },
    { re: /\b(turn|look|pan|rotate)\s+right\b/i,       endpoint: ENDPOINTS.panRight,  label: 'Turning right' },
    { re: /\b(look|tilt|face)\s+up\b/i,                endpoint: ENDPOINTS.tiltUp,    label: 'Tilting up' },
    { re: /\b(look|tilt|face)\s+down\b/i,              endpoint: ENDPOINTS.tiltDown,  label: 'Tilting down' },
    { re: /\bcenter\s*(yourself|camera)?\b/i,          endpoint: ENDPOINTS.center,    label: 'Centering' },
    { re: /\b(track|follow|watch)\s*me\b/i,            endpoint: ENDPOINTS.trackStart,label: 'Starting tracking' },
    { re: /\blook at me\b/i,                           endpoint: ENDPOINTS.trackStart,label: 'Starting tracking' },
    { re: /\bstop\s+track(ing)?\b/i,                   endpoint: ENDPOINTS.trackStop, label: 'Stopping tracking' }
  ];

  const MUSIC_RULES = [
    { re: /\bplay\s+(a\s+)?(song|music)\b/i, action: 'play' },
    { re: /\bpause\s+(the\s+)?music\b/i,     action: 'pause' },
    { re: /\bnext\s+(song|track)\b/i,        action: 'next' },
    { re: /\b(previous|last)\s+(song|track)\b/i, action: 'previous' }
  ];

  function route(text){
    for(const rule of HARDWARE_RULES){
      if(rule.re.test(text)) return { type: 'hardware', endpoint: rule.endpoint, label: rule.label };
    }
    for(const rule of MUSIC_RULES){
      if(rule.re.test(text)) return { type: 'music', action: rule.action };
    }
    return { type: 'ai' };
  }

  return { ENDPOINTS, state, send, refreshStatus, applyTelemetry, route };
})();
