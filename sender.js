const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_state_v6";

const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const listEl = document.getElementById("list");
const castHint = document.getElementById("castHint");

let players = loadPlayers();
let receiverReady = false;
let pingTimer = null;

// ---------------- storage ----------------
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

// ---------------- helpers ----------------
function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}
function sortedPlayers() {
  return [...players].sort((a, b) => (b.points - a.points) || a.name.localeCompare(b.name));
}
function setHint(text, ok) {
  castHint.textContent = text;
  castHint.classList.toggle("ok", !!ok);
}

// Keep cast button visible
function protectCastButtonVisibility() {
  const el = document.querySelector("google-cast-launcher");
  if (!el) return;
  const show = () => { el.style.display = "block"; };
  show();
  const obs = new MutationObserver(show);
  obs.observe(el, { attributes: true, attributeFilter: ["style"] });
  el.style.width = "38px";
  el.style.height = "38px";
}

// ---------------- cast session ----------------
function getContext() {
  return cast.framework.CastContext.getInstance();
}
function getSession() {
  try { return getContext().getCurrentSession(); } catch { return null; }
}

// Lytt på READY/PONG fra receiver
function attachMessageListeners(session) {
  if (!session) return;

  // Unngå å legge til flere listeners (enkelt “flag”)
  if (session.__lanListenersAttached) return;
  session.__lanListenersAttached = true;

  session.addMessageListener(NAMESPACE, (_ns, message) => {
  // ✅ Noen ganger kommer meldingen som JSON-string
  let msg = message;
  if (typeof message === "string") {
    try { msg = JSON.parse(message); } catch { /* ignore */ }
  }

  console.log("[SENDER] msg from receiver (raw):", message);
  console.log("[SENDER] msg from receiver (parsed):", msg);

  if (msg && (msg.type === "READY" || msg.type === "PONG")) {
    receiverReady = true;
    setHint("✅ Receiver klar – sender oppdateringer", true);
    sendStateToReceiver();
    return;
  }
});

}

function startPing() {
  stopPing();
  pingTimer = setInterval(() => {
    const session = getSession();
    if (!session) return;
    session.sendMessage(NAMESPACE, { type: "PING", t: Date.now() }).catch(() => {});
  }, 2500);
}
function stopPing() {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function sendStateToReceiver() {
  const session = getSession();
  if (!session) {
    setHint("🔄 Ikke tilkoblet Chromecast", false);
    return;
  }

  // viktig: vent til READY
  if (!receiverReady) {
    setHint("🔄 Koblet – venter på receiver…", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  console.log("[SENDER] sending STATE:", payload);

  session.sendMessage(NAMESPACE, payload)
    .then(() => {
      setHint("✅ Sender oppdateringer til TV", true);
    })
    .catch((err) => {
      console.warn("[SENDER] sendMessage failed:", err);
      // Hvis receiveren restartet, mister vi READY-status
      receiverReady = false;
      setHint("🔄 Receiver restartet? Venter på receiver…", false);
    });
}

// ---------------- UI actions ----------------
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

  // send oppdatering hver gang UI endres
  sendStateToReceiver();
}

// ---------------- Cast init ----------------
window.__onGCastApiAvailable = (available) => {
  console.log("__onGCastApiAvailable:", available);
  if (!available) {
    setHint("⚠️ Cast API ikke tilgjengelig (bruk Chrome)", false);
    return;
  }

  protectCastButtonVisibility();

  const ctx = getContext();
  ctx.setOptions({
    receiverApplicationId: APP_ID,
    // viktig: for å unngå å auto-join’e countdown-sessionen
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED
  });

  ctx.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    (e) => {
      console.log("SESSION_STATE_CHANGED:", e.sessionState, "errorCode:", e.errorCode);

      const session = getSession();

      if (e.sessionState === cast.framework.SessionState.SESSION_STARTED ||
          e.sessionState === cast.framework.SessionState.SESSION_RESUMED) {

        receiverReady = false;
        setHint("🔄 Koblet – venter på receiver…", false);

        attachMessageListeners(session);

        // ✅ NY: Be receiveren sende READY (så vi ikke misser den pga timing)
        session.sendMessage(NAMESPACE, { type: "HELLO", t: Date.now() }).catch(()=>{});
        
        startPing();

        // Gi receiver litt tid til å sende READY
        setTimeout(sendStateToReceiver, 800);
      }

      if (e.sessionState === cast.framework.SessionState.SESSION_ENDED) {
        receiverReady = false;
        stopPing();
        setHint("🔄 Ikke tilkoblet Chromecast", false);
      }
    }
  );

  setHint("Klar. Trykk Cast-ikonet for å velge TV.", false);
};

// ---------------- wire UI ----------------
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
