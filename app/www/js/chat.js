/* ------------------------------------------------------------
 * DeskBot.chat
 * Chat screen logic: rendering, routing utterances between the
 * robot (direct hardware command) and the AI backend, and a
 * placeholder voice pipeline (Web Speech API where available).
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.chat = (function(){
  const history = [];
  let recognizing = false;
  let recognizer = null;

  function el(id){ return document.getElementById(id); }

  function render(){
    const log = el('chatLog');
    log.innerHTML = '';
    history.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg ' + m.role;
      div.textContent = m.text;
      log.appendChild(div);
    });
    log.scrollTop = log.scrollHeight;
  }

  function pushSystem(text){
    history.push({ role: 'sys', text });
    render();
  }

  function pushUser(text){
    history.push({ role: 'user', text });
    render();
  }

  function pushBot(text){
    history.push({ role: 'bot', text });
    render();
  }

  async function handleUserMessage(text){
    text = (text || '').trim();
    if(!text) return;
    pushUser(text);

    const decision = DeskBot.robot.route(text);

    if(decision.type === 'hardware'){
      pushSystem(decision.label + '...');
      try{
        await DeskBot.robot.send(decision.endpoint);
        pushBot('Done.');
      }catch(e){
        pushBot("I couldn't reach the robot (" + e.message + ").");
      }
      return;
    }

    if(decision.type === 'music'){
      DeskBot.music.handleVoiceAction(decision.action);
      pushBot('🎵 ' + decision.action);
      return;
    }

    // Otherwise: send to AI backend
    pushSystem('Thinking...');
    try{
      const res = await DeskBot.api.backendPost('/api/chat', {
        message: text,
        history: history.slice(-10).map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text })).filter(m => m.role !== 'sys')
      });
      history.pop(); // remove the "Thinking..." system line
      pushBot(res.reply || '(no reply)');
      if(res.speak && DeskBot.settings) DeskBot.settings.speak(res.reply);
    }catch(e){
      history.pop();
      pushBot('Backend unreachable: ' + e.message + '. Configure it in Settings > AI backend.');
    }
  }

  function initVoice(){
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){
      el('btnMic').addEventListener('click', () => {
        DeskBot.app.toast('Voice input not supported on this browser/WebView');
      });
      return;
    }
    recognizer = new SR();
    recognizer.lang = 'en-US';
    recognizer.interimResults = false;
    recognizer.onresult = (evt) => {
      const text = evt.results[0][0].transcript;
      handleUserMessage(text);
    };
    recognizer.onend = () => {
      recognizing = false;
      el('btnMic').classList.remove('rec');
    };
    el('btnMic').addEventListener('click', () => {
      if(recognizing){ recognizer.stop(); return; }
      recognizing = true;
      el('btnMic').classList.add('rec');
      recognizer.start();
    });
  }

  function initTextInput(){
    el('btnSend').addEventListener('click', () => {
      const input = el('chatInput');
      handleUserMessage(input.value);
      input.value = '';
    });
    el('chatInput').addEventListener('keydown', (e) => {
      if(e.key === 'Enter'){
        e.preventDefault();
        el('btnSend').click();
      }
    });
  }

  function init(){
    initVoice();
    initTextInput();
    if(history.length === 0){
      pushBot("Hi, I'm DeskBot. Ask me something, or tell me to turn, track you, or play music.");
    }
  }

  return { init, handleUserMessage, pushBot, pushUser, pushSystem };
})();
