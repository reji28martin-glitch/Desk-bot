/* ------------------------------------------------------------
 * DeskBot.api
 * Thin transport layer. Two targets:
 *   - robot: HTTP REST + WebSocket to the ESP32 on the LAN
 *   - backend: HTTPS to your own PHP backend (AI + memory sync)
 * Keeping this file the only place that knows about URLs/paths
 * means the wire protocol can change later without touching UI code.
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.api = (function(){
  let ws = null;
  let wsReady = false;
  let reconnectTimer = null;
  const listeners = { status: [], telemetry: [] };

  function on(event, fn){ (listeners[event] = listeners[event] || []).push(fn); }
  function emit(event, payload){ (listeners[event] || []).forEach(fn => fn(payload)); }

  // ---------- Robot: REST ----------
  async function robotGet(path, timeoutMs = 3000){
    const cfg = DeskBot.config.load();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try{
      const res = await fetch(DeskBot.config.robotBaseUrl(cfg) + path, { signal: ctrl.signal });
      clearTimeout(t);
      if(!res.ok) throw new Error('HTTP ' + res.status);
      const ct = res.headers.get('content-type') || '';
      return ct.includes('application/json') ? await res.json() : await res.text();
    }catch(err){
      clearTimeout(t);
      throw err;
    }
  }

  async function robotCommand(path){
    try{
      const result = await robotGet(path);
      emit('status', { ok: true, path });
      return result;
    }catch(err){
      emit('status', { ok: false, path, error: err.message });
      throw err;
    }
  }

  // ---------- Robot: WebSocket (telemetry + low-latency control) ----------
  function connectWs(){
    const cfg = DeskBot.config.load();
    try{
      ws = new WebSocket(DeskBot.config.robotWsUrl(cfg));
    }catch(e){ scheduleReconnect(); return; }

    ws.onopen = () => { wsReady = true; emit('status', { connected: true }); };
    ws.onclose = () => { wsReady = false; emit('status', { connected: false }); scheduleReconnect(); };
    ws.onerror = () => { wsReady = false; };
    ws.onmessage = (evt) => {
      try{
        const data = JSON.parse(evt.data);
        emit('telemetry', data);
      }catch(e){ /* ignore malformed frame */ }
    };
  }

  function scheduleReconnect(){
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWs, 4000);
  }

  function wsSend(obj){
    if(wsReady && ws) ws.send(JSON.stringify(obj));
  }

  // ---------- Backend (AI + memory sync) ----------
  async function backendPost(path, body){
    const cfg = DeskBot.config.load();
    if(!cfg.backendUrl) throw new Error('No backend URL configured (Settings > AI backend)');
    const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-DeskBot-Token': cfg.backendToken || '' },
      body: JSON.stringify(body || {})
    });
    if(!res.ok) throw new Error('Backend HTTP ' + res.status);
    return res.json();
  }

  async function backendGet(path){
    const cfg = DeskBot.config.load();
    if(!cfg.backendUrl) throw new Error('No backend URL configured (Settings > AI backend)');
    const res = await fetch(cfg.backendUrl.replace(/\/$/, '') + path, {
      headers: { 'X-DeskBot-Token': cfg.backendToken || '' }
    });
    if(!res.ok) throw new Error('Backend HTTP ' + res.status);
    return res.json();
  }

  return {
    on, robotGet, robotCommand, connectWs, wsSend, backendPost, backendGet,
    isWsConnected: () => wsReady
  };
})();
