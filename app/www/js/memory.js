/* ------------------------------------------------------------
 * DeskBot.memory
 * Memory screen: list/add/edit/delete against the backend's
 * memory API, which is itself a synced mirror of what the robot
 * eventually persists to its microSD card (see docs/API.md).
 * ---------------------------------------------------------- */
window.DeskBot = window.DeskBot || {};

DeskBot.memory = (function(){
  let items = [];

  function el(id){ return document.getElementById(id); }

  function render(){
    const list = el('memoryList');
    if(items.length === 0){
      list.innerHTML = '<div class="empty-state">No memories yet. Add one to help DeskBot remember things about you.</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'memory-item';
      row.innerHTML = `
        <div>
          <div class="k">${escapeHtml(item.key)}</div>
          <div class="v">${escapeHtml(item.value)}</div>
        </div>
        <div class="memory-actions" style="display:flex;gap:6px">
          <button class="btn ghost" data-edit="${item.id}">Edit</button>
          <button class="btn danger" data-delete="${item.id}">Delete</button>
        </div>`;
      list.appendChild(row);
    });
    list.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => edit(b.dataset.edit)));
    list.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => remove(b.dataset.delete)));
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  async function load(){
    try{
      const res = await DeskBot.api.backendGet('/api/memory/list');
      items = res.items || [];
    }catch(e){
      // Offline fallback: show whatever is cached locally
      try{ items = JSON.parse(localStorage.getItem('deskbot.memory.cache') || '[]'); }catch(_){ items = []; }
    }
    render();
  }

  function cache(){
    try{ localStorage.setItem('deskbot.memory.cache', JSON.stringify(items)); }catch(e){}
  }

  async function add(key, value){
    const local = { id: 'local-' + Date.now(), key, value };
    items.push(local);
    render(); cache();
    try{
      const res = await DeskBot.api.backendPost('/api/memory/add', { key, value });
      if(res.item){ local.id = res.item.id; cache(); }
    }catch(e){ DeskBot.app.toast('Saved locally - backend unreachable'); }
  }

  async function update(id, key, value){
    const item = items.find(i => i.id === id);
    if(item){ item.key = key; item.value = value; render(); cache(); }
    try{ await DeskBot.api.backendPost('/api/memory/update', { id, key, value }); }
    catch(e){ DeskBot.app.toast('Updated locally - backend unreachable'); }
  }

  async function remove(id){
    items = items.filter(i => i.id !== id);
    render(); cache();
    try{ await DeskBot.api.backendPost('/api/memory/delete', { id }); }
    catch(e){ DeskBot.app.toast('Deleted locally - backend unreachable'); }
  }

  function edit(id){
    const item = items.find(i => i.id === id);
    if(!item) return;
    const key = prompt('Label', item.key);
    if(key === null) return;
    const value = prompt('Value', item.value);
    if(value === null) return;
    update(id, key, value);
  }

  function init(){
    el('btnAddMemory').addEventListener('click', () => {
      const key = prompt('Label (e.g. "Favorite music")');
      if(!key) return;
      const value = prompt('Value');
      if(value === null) return;
      add(key, value);
    });
    load();
  }

  return { init, load, add, update, remove };
})();
