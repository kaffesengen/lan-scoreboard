// ======================
// CONFIG
// ======================
const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_cast_v1";

// ======================
// UI ELEMENTS
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

// ----------------------
// Local storage
// ----------------------
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

// ----------------------
// Helpers
// ----------------------
function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function sortedPlayers() {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

// ----------------------
// CRUD
// ----------------------
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
    if (btn.dataset.del) btn.onclick = () => removePlayer(btn.dataset.del);
  });

  // Hver gang vi rendrer, sender vi state til receiver hvis vi er koblet
  sendStateToReceiver();
}

// ======================
// CAST (Sender)
// ======================
function getCastSession() {
  try {
    return cast.framework.CastContext.getInstance().getCurrentSession();
  } catch {
    return null;
  }
}

function setCastHint(text, ok) {
  castHint.textContent = text;
  castHint.classList.toggle("ok", !!ok);
}

function sendStateToReceiver() {
  const session = getCastSession();
  if (!session) {
    setCastHint("🔄 Ikke tilkoblet Chromecast", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  session.sendMessage(NAMESPACE, payload)
    .then(() => setCastHint("✅ Tilsynelatende tilkoblet – oppdaterer TV", true))
    .catch(err => {
      console.warn("sendMessage feilet:", err);
      setCastHint("⚠️ Koblet, men kunne ikke sende data (sjekk namespace/receiver)", false);
    });
}

// Cast init callback (kalles av cast_sender.js)
window.__onGCastApiAvailable = function(isAvailable) {
  if (!isAvailable) return;

  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  // 🔥 VIKTIG: tving cast-knappen synlig når SDK er klar
  const castButton = document.querySelector("google-cast-launcher");
  if (castButton) {
    castButton.style.display = "block";
  }
};


  const context = cast.framework.CastContext.getInstance();
  context.setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  // Oppdater status når session endrer seg
  context.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    () => sendStateToReceiver()
  );

  // Første status
  sendStateToReceiver();
};

// ======================
// UI EVENTS
// ======================
addBtn.onclick = () => {
  addPlayer(nameInput.value);
  nameInput.value = "";
  nameInput.focus();
};

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

resetBtn.onclick = resetAll;

// Start
render();
