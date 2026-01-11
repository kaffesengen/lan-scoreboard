// ======================
// CONFIG
// ======================
const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_cast_v2";

// ======================
// UI
// ======================
const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const listEl = document.getElementById("list");
const castHint = document.getElementById("castHint");

// ======================
// STATE
// ======================
let players = loadPlayers();

function savePlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}
function loadPlayers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
function sortedPlayers() {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });
}

// ======================
// CAST BUTTON VISIBILITY (robust)
// ======================
function getCastButtonEl() {
  return document.getElementById("castButton") || document.querySelector("google-cast-launcher");
}

function forceShowCastButton() {
  const el = getCastButtonEl();
  if (!el) return;
  // Cast SDK kan sette inline style="display:none". Vi overstyrer til block.
  el.style.display = "block";
  el.style.width = "38px";
  el.style.height = "38px";
}

function setHint(text, ok) {
  castHint.textContent = text;
  castHint.classList.toggle("ok", !!ok);
}

function getSession() {
  try {
    return cast.framework.CastContext.getInstance().getCurrentSession();
  } catch {
    return null;
  }
}

function sendStateToReceiver() {
  const session = getSession();
  if (!session) {
    setHint("🔄 Ikke tilkoblet Chromecast", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  session.sendMessage(NAMESPACE, payload)
    .then(() => setHint("✅ Sender oppdateringer til TV", true))
    .catch((err) => {
      console.warn("sendMessage feilet:", err);
      setHint("⚠️ Koblet, men kunne ikke sende data (sjekk namespace/receiver)", false);
    });
}

// ======================
// CRUD
// ======================
function addPlayer(name) {
  const clean = normalizeName(name);
  if (!clean) return;

  if (players.some(p => p.name.toLowerCase() === clean.toLowerCase())) {
    alert("Navnet finnes allerede.");
    return;
  }

  players.push({ name: clean, points: 0 });
  savePlayers();
  render();
}

function changePoints(name, delta) {
  const p = players.find(x => x.name === name);
  if (!p) return;
  p.points = Math.max(0, p.points + delta);
  savePlayers();
  render();
}

function removePlayer(name) {
  players = players.filter(p => p.name !== name);
  savePlayers();
  render();
}

function resetAll() {
  if (!confirm("Vil du resette alt?")) return;
  players = [];
  savePlayers();
  render();
}

// ======================
// RENDER
// ======================
function render() {
  const sorted = sortedPlayers();

  listEl.innerHTML = sorted.map((p, idx) => `
    <div class="row">
      <div class="rank">#${idx + 1}</div>
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="points">${p.points} pts</div>
      <div class="actions">
        <button class="small" data-add="${p.name}">+1</button>
        <button class="small" data-add3="${p.name}">+3</button>
        <button class="small" data-sub="${p.name}">-1</button>
        <button class="remove" data-del="${p.name}">Fjern</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("button").forEach(btn => {
    if (btn.dataset.add) btn.onclick = () => changePoints(btn.dataset.add, +1);
    if (btn.dataset.add3) btn.onclick = () => changePoints(btn.dataset.add3, +3);
    if (btn.dataset.sub) btn.onclick = () => changePoints(btn.dataset.sub, -1);
    if (btn.d
