// ======================
// CONFIG
// ======================
const APP_ID = "D6AC56C5";

// Custom namespace for scoreboard state
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

// Local storage key
const STORAGE_KEY = "lan_scoreboard_cast_v4";

// "Dummy media" for å få Chromecast til å vise enheter (samme prinsipp som Vision Countdown)
const DUMMY_MEDIA_URL =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const DUMMY_MEDIA_MIME = "video/mp4";

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

// ----------------------
// Storage
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

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[c]));
}

function sortedPlayers() {
  return [...players].sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));
}

function setHint(text, ok) {
  castHint.textContent = text;
  castHint.classList.toggle("ok", !!ok);
}

// ======================
// CAST BUTTON: hold it visible
// ======================
function protectCastButtonVisibility() {
  const el = document.querySelector("google-cast-launcher");
  if (!el) return;

  const show = () => { el.style.display = "block"; };
  show();

  // If something (Cast SDK) sets display:none again, undo it
  const obs = new MutationObserver(() => show());
  obs.observe(el, { attributes: true, attributeFilter: ["style"] });

  // Ensure size (in case CSS missing)
  el.style.width = "38px";
  el.style.height = "38px";
}

// ======================
// CAST: session helpers
// ======================
function getContext() {
  return cast.framework.CastContext.getInstance();
}

function getSession() {
  try {
    return getContext().getCurrentSession();
  } catch {
    return null;
  }
}

// ======================
// IMPORTANT: make device list appear
// We do this by using a media LoadRequest like your working app.
// ======================
async function loadDummyMediaToWakeReceiver() {
  const session = getSession();
  if (!session) return;

  try {
    const mediaInfo = new chrome.cast.media.MediaInfo(DUMMY_MEDIA_URL, DUMMY_MEDIA_MIME);
    const request = new chrome.cast.media.LoadRequest(mediaInfo);

    // We don't need it to play loudly; it's just to make Chromecast behave like media casting
    request.autoplay = false;
    request.currentTime = 0;

    await session.loadMedia(request);
  } catch (err) {
    // Not fatal — sometimes receiver already launched or load is blocked
    console.warn("Dummy media load failed (not fatal):", err);
  }
}

// ======================
// SEND scoreboard state to receiver
// ======================
function sendStateToReceiver() {
  const session = getSession();
  if (!session) {
    setHint("🔄 Ikke tilkoblet Chromecast", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers(),
  };

  session.sendMessage(NAMESPACE, payload)
    .then(() => setHint("✅ Koblet – oppdaterer TV", true))
    .catch((err) => {
      console.warn("sendMessage failed:", err);
      setHint("⚠️ Koblet, men kunne ikke sende data (sjekk receiver/namespace)", false);
    });
}

// ======================
// CRUD
// ======================
function addPlayer(name) {
  const clean = normalizeName(name);
  if (!clean) return;

  if (players.some((p) => p.name.toLowerCase() === clean.toLowerCase())) {
    alert("Navnet finnes allerede.");
    return;
  }

  players.push({ name: clean, points: 0 });
  savePlayers();
  render();
}

function changePoints(name, delta) {
  const p = players.find((x) => x.name === name);
  if (!p) return;
  p.points = Math.max(0, p.points + delta);
  savePlayers();
  render();
}

function removePlayer(name) {
  players = players.filter((p) => p.name !== name);
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

  listEl.querySelectorAll("button").forEach((btn) => {
    if (btn.dataset.add) btn.onclick = () => changePoints(btn.dataset.add, +1);
    if (btn.dataset.add3) btn.onclick = () => changePoints(btn.dataset.add3, +3);
    if (btn.dataset.sub) btn.onclick = () => changePoints(btn.dataset.sub, -1);
    if (btn.dataset.del) btn.onclick = () => removePlayer(btn.dataset.del);
  });

  // Always try to send updates if we're connected
  sendStateToReceiver();
}

// ======================
// CAST INIT (same style as your working app)
// ======================
window.__onGCastApiAvailable = (available) => {
  if (!available) {
    setHint("⚠️ Cast API ikke tilgjengelig (bruk Chrome)", false);
    return;
  }

  protectCastButtonVisibility();

  const ctx = getContext();
  ctx.setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
  });

  // When user starts a session, immediately load dummy media so the device list behaves like your other app
  ctx.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    async (e) => {
      // These are strings like "SESSION_STARTED", "SESSION_ENDED", etc.
      console.log("SESSION_STATE_CHANGED:", e.sessionState);

      if (e.sessionState === cast.framework.SessionState.SESSION_STARTED ||
          e.sessionState === cast.framework.SessionState.SESSION_RESUMED) {
        setHint("✅ Koblet – starter receiver…", true);

        // Wake Chromecast like media apps do
        await loadDummyMediaToWakeReceiver();

        // Then send initial state
        sendStateToReceiver();
      }

      if (e.sessionState === cast.framework.SessionState.SESSION_ENDED) {
        setHint("🔄 Ikke tilkoblet Chromecast", false);
      }

      // Keep button visible
      protectCastButtonVisibility();
    }
  );

  setHint("Klar. Trykk Cast-ikonet for å velge TV.", false);
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
