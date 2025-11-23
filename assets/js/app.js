/* PRO — FINAL: CRUD + Pin + Trash Drawer + Filter Drawer + Drag + Theme + Tooltip */

const $ = sel => document.querySelector(sel);

// DOM refs
const titleInput = $('#title');
const contentInput = $('#content');
const saveBtn = $('#saveBtn');
const clearBtn = $('#clearBtn');
const palette = $('#colorPalette');
const searchInput = $('#searchInput');
const notesGrid = $('#notesGrid');
const emptyState = $('#emptyState');
const clearFilter = $('#clearFilter');
const themeToggle = $('#themeToggle');
const globalFooter = $('#globalFooter');

const openTrashBtn = $('#openTrashBtn');
const trashDrawer = $('#trashDrawer');
const closeTrashBtn = $('#closeTrashBtn');
const trashList = $('#trashList');
const emptyTrashBtn = $('#emptyTrashBtn');

const filterBtn = $('#filterBtn');
const filterMenu = $('#filterMenu');

const LS_NOTES = 'sticky_notes_v4';
const LS_TRASH = 'sticky_trash_v4';
const LS_THEME = 'sticky_theme_v4';

let notes = [];
let trash = [];
let editingId = null;
let dragSrcId = null;
let currentFilter = 'all';

// built-in filter list (emoji, key, label)
const FILTERS = [
  { key: 'all', label: 'All', emoji: '⭐' },
  { key: 'yellow', label: 'Yellow', emoji: '🟡' },
  { key: 'pink', label: 'Pink', emoji: '💗' },
  { key: 'green', label: 'Green', emoji: '🟢' },
  { key: 'blue', label: 'Blue', emoji: '🔵' },
  { key: 'orange', label: 'Orange', emoji: '🟠' },
  { key: 'red', label: 'Red', emoji: '❤️' },
  { key: 'teal', label: 'Teal', emoji: '💧' },
  { key: 'purple', label: 'Purple', emoji: '🟣' }
];

const colorClass = { yellow:'c-yellow', pink:'c-pink', green:'c-green', orange:'c-orange', blue:'c-blue', red:'c-red', teal:'c-teal', purple:'c-purple' };

// ---------- footer ----------
function setFooterDate(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  globalFooter.innerHTML = `© ${y}/${m}/${dd} — Built with 🐦‍🔥 by <strong>Vishnu Dev</strong>`;
}
setFooterDate();

// ---------- theme ----------
function loadTheme(){ applyTheme(localStorage.getItem(LS_THEME) || 'dark'); }
function applyTheme(name){
  if(name==='light'){ document.body.classList.add('light'); themeToggle.textContent = '☀'; }
  else { document.body.classList.remove('light'); themeToggle.textContent = '🌙'; }
  localStorage.setItem(LS_THEME, name);
}
themeToggle.addEventListener('click', ()=> applyTheme(document.body.classList.contains('light') ? 'dark' : 'light'));

// ---------- storage ----------
function loadAll(){
  try{ notes = JSON.parse(localStorage.getItem(LS_NOTES) || '[]'); } catch(e){ notes = []; }
  try{ trash = JSON.parse(localStorage.getItem(LS_TRASH) || '[]'); } catch(e){ trash = []; }
  render();
  renderTrash();
}
function saveAll(){ localStorage.setItem(LS_NOTES, JSON.stringify(notes)); localStorage.setItem(LS_TRASH, JSON.stringify(trash)); }

// ---------- filter menu build ----------
function buildFilterMenu(){
  filterMenu.innerHTML = '';
  FILTERS.forEach(f=>{
    const row = document.createElement('div');
    row.className = 'filter-row' + (currentFilter===f.key ? ' active' : '');
    row.dataset.filter = f.key;
    row.innerHTML = `<span class="emoji">${f.emoji}</span><span class="label">${f.label}</span>`;
    row.addEventListener('click', ()=> {
      currentFilter = f.key;
      // close
      closeFilterMenu();
      // update UI: search remains same
      render(searchInput.value.trim());
      updateFilterButtonText();
      // highlight active
      filterMenu.querySelectorAll('.filter-row').forEach(r=>r.classList.toggle('active', r.dataset.filter===currentFilter));
    });
    filterMenu.appendChild(row);
  });
}
function updateFilterButtonText(){
  const f = FILTERS.find(x=>x.key===currentFilter) || FILTERS[0];
  filterBtn.innerHTML = `${f.emoji} ${f.label} <span class="chev">▾</span>`;
}
function openFilterMenu(){
  filterMenu.classList.add('open');
  filterMenu.setAttribute('aria-hidden','false');
  filterBtn.setAttribute('aria-expanded','true');
}
function closeFilterMenu(){
  filterMenu.classList.remove('open');
  filterMenu.setAttribute('aria-hidden','true');
  filterBtn.setAttribute('aria-expanded','false');
}
filterBtn.addEventListener('click', (e)=> {
  e.stopPropagation();
  if(filterMenu.classList.contains('open')) closeFilterMenu();
  else { buildFilterMenu(); openFilterMenu(); }
});

// close menu on outside click or ESC
document.addEventListener('click', (e)=> {
  if(!filterMenu.contains(e.target) && e.target !== filterBtn) closeFilterMenu();
});
document.addEventListener('keydown', (e)=> { if(e.key==='Escape') closeFilterMenu(); });

// ---------- form helpers ----------
function getSelectedColor(){ const sel = palette.querySelector('.color-btn.selected'); return sel ? sel.dataset.color : 'yellow'; }
function selectColor(name){ palette.querySelectorAll('.color-btn').forEach(b => b.classList.toggle('selected', b.dataset.color === name)); }
function clearForm(){ titleInput.value=''; contentInput.value=''; selectColor('yellow'); editingId = null; saveBtn.textContent = 'Add Note'; }

// ---------- upsert ----------
function upsertNote(){
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const color = getSelectedColor();
  if(!title && !content){ alert('Please add title or content.'); return; }

  if(editingId){
    const idx = notes.findIndex(n=>n.id===editingId);
    if(idx!==-1){
      notes[idx].title = title;
      notes[idx].content = content;
      notes[idx].color = color;
      notes[idx].updatedAt = Date.now();
    }
    editingId = null;
  } else {
    notes.unshift({ id: String(Date.now()) + Math.floor(Math.random()*9999), title, content, color, pinned:false, updatedAt: Date.now() });
  }
  saveAll();
  render();
  clearForm();
}

// ---------- render notes ----------
function render(filterText=''){
  notesGrid.innerHTML = '';

  let list = notes.slice();

  // apply color filter
  if(currentFilter !== 'all') list = list.filter(n => n.color === currentFilter);

  // apply search
  if(filterText){
    const q = filterText.toLowerCase();
    list = list.filter(n => (n.title + ' ' + n.content).toLowerCase().includes(q));
  }

  // pinned first
  const pinned = list.filter(n=>n.pinned);
  const unpinned = list.filter(n=>!n.pinned);
  const ordered = [...pinned, ...unpinned];

  emptyState.style.display = ordered.length ? 'none' : 'block';

  ordered.forEach(note => {
    const el = document.createElement('article');
    el.className = 'note-card ' + (colorClass[note.color] || 'c-yellow') + (note.pinned ? ' pinned' : '');
    el.setAttribute('draggable','true');
    el.dataset.id = note.id;

    el.innerHTML = `
      <div class="card-actions">
        <button class="icon-btn pin-btn" title="${note.pinned ? 'Unpin' : 'Pin'}" data-id="${note.id}">📌</button>
        <button class="icon-btn edit-btn" title="Edit" data-id="${note.id}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM21.41 6.34a1.25 1.25 0 0 0 0-1.77l-2.98-2.98a1.25 1.25 0 0 0-1.77 0L14.13 3.1l3.75 3.75 3.53-0.51z"/>
          </svg>
        </button>
        <button class="icon-btn del-btn" title="Delete" data-id="${note.id}">🗑️</button>
      </div>
      <h3 class="note-title">${escapeHtml(note.title||'Untitled')}</h3>
      <div class="note-content">${escapeHtml(note.content||'')}</div>
    `;

    // drag events
    el.addEventListener('dragstart', (e) => {
      dragSrcId = note.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      const crt = el.cloneNode(true);
      crt.style.width = getComputedStyle(el).width;
      crt.style.opacity = '0.85';
      document.body.appendChild(crt);
      e.dataTransfer.setDragImage(crt, 20, 20);
      setTimeout(()=> document.body.removeChild(crt), 0);
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      dragSrcId = null;
      document.querySelectorAll('.note-drag-over').forEach(n => n.classList.remove('note-drag-over'));
    });

    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if(el.dataset.id !== dragSrcId) el.classList.add('note-drag-over');
    });

    el.addEventListener('dragleave', () => el.classList.remove('note-drag-over'));

    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('note-drag-over');
      const targetId = el.dataset.id;
      if(!dragSrcId || dragSrcId === targetId) return;

      const src = notes.find(n => n.id === dragSrcId);
      const tgt = notes.find(n => n.id === targetId);
      if(!src || !tgt) return;
      // only allow reorder when both pinned status are same
      if(!!src.pinned !== !!tgt.pinned) return;

      reorderNotes(dragSrcId, targetId);
      saveAll();
      render(searchInput.value.trim());
    });

    notesGrid.appendChild(el);
  });

  attachActions();
}

// ---------- attach actions ----------
function attachActions(){
  // pin
  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const idx = notes.findIndex(n=>n.id===id);
      if(idx===-1) return;
      notes[idx].pinned = !notes[idx].pinned;
      // move item to group top/bottom
      const [item] = notes.splice(idx,1);
      if(item.pinned){
        const insertIdx = notes.findIndex(n=>!n.pinned);
        if(insertIdx === -1) notes.unshift(item); else notes.splice(insertIdx,0,item);
      } else {
        const firstUnpinned = notes.findIndex(n=>!n.pinned);
        if(firstUnpinned === -1) notes.push(item); else notes.splice(firstUnpinned,0,item);
      }
      saveAll();
      render(searchInput.value.trim());
    };
  });

  // edit
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const note = notes.find(n=>n.id===id);
      if(!note) return;
      titleInput.value = note.title;
      contentInput.value = note.content;
      selectColor(note.color||'yellow');
      editingId = id;
      saveBtn.textContent = 'Save Changes';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  // delete -> move to trash
  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      if(!confirm('Move this note to Trash?')) return;
      const idx = notes.findIndex(n=>n.id===id);
      if(idx===-1) return;
      const [item] = notes.splice(idx,1);
      item.deletedAt = Date.now();
      trash.unshift(item);
      saveAll();
      render(searchInput.value.trim());
      renderTrash();
    };
  });
}

// reorder notes array
function reorderNotes(sourceId, targetId){
  const srcIndex = notes.findIndex(n=>n.id===sourceId);
  const tgtIndex = notes.findIndex(n=>n.id===targetId);
  if(srcIndex === -1 || tgtIndex === -1) return;
  const [item] = notes.splice(srcIndex,1);
  notes.splice(tgtIndex,0,item);
}

// ---------- trash drawer ----------
openTrashBtn.addEventListener('click', ()=> { trashDrawer.classList.add('open'); trashDrawer.setAttribute('aria-hidden','false'); renderTrash(); });
closeTrashBtn.addEventListener('click', ()=> { trashDrawer.classList.remove('open'); trashDrawer.setAttribute('aria-hidden','true'); });

function renderTrash(){
  trashList.innerHTML = '';
  if(trash.length === 0){ trashList.innerHTML = '<div class="empty">Trash is empty.</div>'; return; }
  for(const item of trash){
    const node = document.createElement('div');
    node.className = 'trash-item';
    node.innerHTML = `
      <div>
        <div style="font-weight:700">${escapeHtml(item.title||'Untitled')}</div>
        <div class="meta">${escapeHtml(item.content||'')}</div>
      </div>
      <div class="trash-actions">
        <button class="btn ghost restore-btn" data-id="${item.id}">Restore</button>
        <button class="btn" style="background:#e5534b;color:#fff" data-id="${item.id}">Delete</button>
      </div>
    `;
    trashList.appendChild(node);
  }

  // attach trash actions
  document.querySelectorAll('.restore-btn').forEach(b=>{
    b.onclick = () => {
      const id = b.dataset.id;
      const idx = trash.findIndex(t=>t.id===id); if(idx===-1) return;
      const [item] = trash.splice(idx,1);
      delete item.deletedAt;
      notes.unshift(item);
      saveAll();
      render();
      renderTrash();
    };
  });

  document.querySelectorAll('.trash-item .btn:not(.ghost)').forEach(b=>{
    b.onclick = () => {
      const id = b.dataset.id;
      if(!confirm('Delete permanently? This cannot be undone.')) return;
      const idx = trash.findIndex(t=>t.id===id); if(idx===-1) return;
      trash.splice(idx,1);
      saveAll();
      renderTrash();
    };
  });
}

emptyTrashBtn.addEventListener('click', ()=>{
  if(trash.length===0){ alert('Trash is already empty'); return; }
  if(!confirm('Empty trash permanently?')) return;
  trash = [];
  saveAll();
  renderTrash();
});

// ---------- utilities ----------
function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'", '&#39;'); }

// ---------- events ----------
document.querySelectorAll('.color-btn').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}));

// search / clear filter
searchInput.addEventListener('input', ()=> render(searchInput.value.trim()));
clearFilter.addEventListener('click', ()=> {
  currentFilter = 'all';
  updateFilterButtonText();
  render();
});

// keyboard save
saveBtn.addEventListener('click', upsertNote);
clearBtn.addEventListener('click', clearForm);
document.addEventListener('keydown', (e) => { if((e.ctrlKey||e.metaKey) && e.key==='Enter') upsertNote(); });

// close filter menu on outside click handled earlier

// debug & init
window._stickyNotes = { loadAll, saveAll, all: ()=> notes.slice(), trash: ()=> trash.slice() };
loadTheme();
loadAll();
buildFilterMenu();
updateFilterButtonText();
