/* ------------------------------------------------------------
 * DeskBot.app
 * Screen navigation, status polling loop, toast helper, and
 * wiring for the plain (non-chat) command buttons (D-pad etc.)
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.app = (function(){
  const SCREENS = ['home','control','camera','chat','memory','music','settings'];
  let pollTimer = null;

  function el(id){ return document.getElementById(id); }
  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  function navigate(name){
    if(SCREENS.indexOf(name) === -1) return;
    SCREENS.forEach(s => el('screen-' + s).classList.toggle('hidden', s !== name));
    $all('.tab').forEach(t => t.classList.toggle('active', t.dataset.nav === name));
    el('chatInputBar').classList.toggle('hidden', name !== 'chat');
  }

  function toast(msg){
    const t = el('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function wireNav(){
    $all('[data-nav]').forEach(b => b.addEventListener('click', () => navigate(b.dataset.nav)));
  }

  function wireCommandButtons(){
    $all('[data-cmd]').forEach(b => {
      b.addEventListener('click', async () => {
        try{
          await DeskBot.robot.send(b.dataset.cmd);
          toast('Sent: ' + b.dataset.cmd);
        }catch(e){
          toast('Robot unreachable');
        }
      });
    });
  }

  function wireFaceButtons(){
    el('btnRegisterFace').addEventListener('click', async () => {
      try{
        await DeskBot.api.robotGet('/face/register');
        toast('Face registration started - follow the robot\'s display prompts');
      }catch(e){ toast('Robot unreachable'); }
    });
    el('btnRemoveFace').addEventListener('click', async () => {
      if(!confirm('Remove the registered owner face?')) return;
      try{
        await DeskBot.api.robotGet('/face/remove');
        toast('Owner face removed');
      }catch(e){ toast('Robot unreachable'); }
    });
  }

  function renderConnection(connected){
    el('connDot').className = 'dot ' + (connected ? 'on' : 'off');
    el('connLabel').textContent = connected ? 'Connected' : 'Offline';
  }

  function renderStatus(){
    const s = DeskBot.robot.state;
    el('statWifi').textContent = s.wifi;
    el('statCam').textContent = s.camera;
    el('statAI').textContent = s.ai;
    el('statTrack').textContent = s.tracking ? 'On' : 'Off';
    el('statBatt').textContent = s.battery != null ? s.battery + '%' : 'N/A';
    el('statState').textContent = s.robotState;

    el('ctlPan').textContent = s.pan != null ? s.pan + '°' : '--°';
    el('ctlTilt').textContent = s.tilt != null ? s.tilt + '°' : '--°';
    el('ctlTracking').textContent = s.tracking ? 'Active' : 'Idle';

    el('visFace').textContent = s.faceDetected ? 'Yes' : 'No';
    el('visRecog').textContent = s.ownerRecognized ? 'Owner recognized' : (s.faceDetected ? 'Unknown person' : '--');
    el('visTrack').textContent = s.tracking ? 'On' : 'Off';

    el('homeCamBadge').textContent = s.robotState;
    el('camBadge').textContent = s.faceDetected ? (s.ownerRecognized ? 'OWNER RECOGNIZED' : 'FACE DETECTED') : 'NO FACE';

    renderConnection(s.connected);
  }

  async function pollOnce(){
    await DeskBot.robot.refreshStatus();
    renderStatus();
  }

  function startPolling(){
    clearInterval(pollTimer);
    pollOnce();
    pollTimer = setInterval(pollOnce, 4000);
  }

  function reconnect(){
    DeskBot.api.connectWs();
    startPolling();
  }

  function wireLiveTelemetry(){
    DeskBot.api.on('telemetry', (data) => {
      DeskBot.robot.applyTelemetry(data);
      renderStatus();
    });
    DeskBot.api.on('status', (s) => {
      if('connected' in s) renderConnection(s.connected);
    });
  }

  function init(){
    wireNav();
    wireCommandButtons();
    wireFaceButtons();
    wireLiveTelemetry();

    DeskBot.chat.init();
    DeskBot.memory.init();
    DeskBot.music.init();
    DeskBot.settings.init();

    navigate('home');
    reconnect();
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, toast, reconnect };
})();
