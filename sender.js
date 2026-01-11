const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_cast_v3";

const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const listEl = document.getElementById("list");
const castHint = document.getElementById("castHint");

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
  return [...players].sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));
}

function setHint(text, ok) {
  castHint.textContent = text;
  castHint.classList.toggle("ok", !!ok);
}

/**
 * ✅ Dette er “trikset”: Cast SDK kan sette display:none.
 * Vi observerer knappen og sørger for at den alltid er synlig.
 */
function protectCastButtonVisibility() {
  const el = document.querySelector("google-cast-launcher");
  if (!el) return;

  const show = () => { el.style.display = "block"; };

  // Vis med en gang
  show();

  // Hvis Cast SDK endrer style-attributten, sett den tilbake
  const obs = new MutationObserver(() => show());
  obs.observe(el, { attributes: true, attributeFilter: ["style"] });

  // Ekstra: sikre størrelse (i tilfelle noe overskriver)
  el.style.width = "38px";
  el.style.height = "38px";
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
    setHint("Klar for oppkobling (trykk Cast-ikonet)", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  session.sendMessage(NAMESPACE, payload)
    .then(() => setHint("✅ Sender oppdateringer til TV", true))
    .catch(() => setHint("⚠️ Koblet, men kunne ikke sende data (sjekk receiver/namespace)", false));
}

// ---- UI actions ----
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

  sendStateToReceiver();
}

// ---- Cast init (samme stil som countdown-appen din) ----
window.__onGCastApiAvailable = (available) => {
  if (!available) {
    setHint("⚠️ Cast API ikke tilgjengelig (bruk Chrome)", false);
    return;
  }

  // 1) Beskytt knappen først (så den ikke blir skjult)
  protectCastButtonVisibility();

  // 2) Cast options (som i countdown-appen)
  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
  });

  // 3) Oppdater hint når session endrer seg
  const ctx = cast.framework.CastContext.getInstance();
  ctx.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    () => sendStateToReceiver()
  );

  setHint("Klar for oppkobling (trykk Cast-ikonet)", false);
};

// Events
addBtn.onclick = () => {
  addPlayer(nameInput.value);
  nameInput.value = "";
  nameInput.focus();
};
nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addBtn.click(); });
resetBtn.onclick = resetAll;

// Start
render();
