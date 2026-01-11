// === Cast config ===
const APP_ID = "D6AC56C5"; // din nåværende ID
const NAMESPACE = "urn:x-cast:com.panorama.lan.scoreboard";

// === UI ===
const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const listEl = document.getElementById("list");

const STORAGE_KEY = "lan_scoreboard_v2_cast";
let players = load();

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(players)); }
function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function normalizeName(name) { return name.trim().replace(/\s+/g, " "); }

function sortedPlayers() {
  return [...players].sort((a,b) => (b.points - a.points) || a.name.localeCompare(b.name));
}

function render() {
  const sorted = sortedPlayers();
  listEl.innerHTML = sorted.map((p, i) => `
    <div class="row">
      <div class="badge">#${i+1}</div>
      <div class="nameCell">${escapeHtml(p.name)}</div>
      <div class="pointsCell">${p.points} pts</div>
      <div class="actions">
        <button class="small" data-add="${p.name}">+1</button>
        <button class="small" data-sub="${p.name}">-1</button>
        <button class="remove" data-del="${p.name}">Fjern</button>
      </div>
    </div>
  `).join("");

  listEl.querySelectorAll("button").forEach(btn => {
    if (btn.dataset.add) btn.onclick = () => changePoints(btn.dataset.add, +1);
    if (btn.dataset.sub) btn.onclick = () => changePoints(btn.dataset.sub, -1);
    if (btn.dataset.del) btn.onclick = () => removePlayer(btn.dataset.del);
  });

  // Push oppdatering til TV hver gang UI rendres
  sendStateToReceiver();
}

function addPlayer(name) {
  const clean = normalizeName(name);
  if (!clean) return;

  if (players.some(p => p.name.toLowerCase() === clean.toLowerCase())) {
    alert("Navnet finnes allerede!");
    return;
  }
  players.push({ name: clean, points: 0 });
  save();
  render();
}

function changePoints(name, delta) {
  const p = players.find(x => x.name === name);
  if (!p) return;
  p.points = Math.max(0, p.points + delta);
  save();
  render();
}

function removePlayer(name) {
  players = players.filter(p => p.name !== name);
  save();
  render();
}

function resetAll() {
  if (!confirm("Reset alt?")) return;
  players = [];
  save();
  render();
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// === Cast sender setup (CAF) ===
window.__onGCastApiAvailable = function(isAvailable) {
  if (!isAvailable) return;

  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  // Når session starter/slutter, push state
  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    () => sendStateToReceiver()
  );
};

function getSession() {
  const context = cast.framework.CastContext.getInstance();
  return context.getCurrentSession();
}

function sendStateToReceiver() {
  const session = getSession();
  if (!session) return;

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  session.sendMessage(NAMESPACE, payload).catch(err => {
    console.warn("Kunne ikke sende til receiver:", err);
  });
}

// === UI events ===
addBtn.onclick = () => { addPlayer(nameInput.value); nameInput.value = ""; nameInput.focus(); };
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });
resetBtn.onclick = resetAll;

render();

