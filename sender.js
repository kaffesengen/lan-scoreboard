const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_state_v7";

const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const finishBtn = document.getElementById("finishBtn");
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
  el.style.width = "40px";
  el.style.height = "40px";
}

// ---------------- FLIP animation for reordering ----------------
function animateReorder(container) {
  const children = Array.from(container.children);
  const first = new Map();
  children.forEach(el => first.set(el.dataset.key, el.getBoundingClientRect()));

  // after DOM update will call this again; so we return a function to run after update
  return () => {
    const newChildren = Array.from(container.children);
    newChildren.forEach(el => {
      const key = el.dataset.key;
      const f = first.get(key);
      if (!f) return;

      const last = el.getBoundingClientRect();
      const dx = f.left - last.left;
      const dy = f.top - last.top;
      if (dx === 0 && dy === 0) return;

      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0px, 0px)" }
        ],
        { duration: 420, easing: "cubic-bezier(.2,.9,.1,1)" }
      );
    });
  };
}

// ---------------- cast session ----------------
function getContext() {
  return cast.framework.CastContext.getInstance();
}
function getSession() {
  try { return getContext().getCurrentSession(); } catch { return null; }
}

// message listener (parse string JSON)
function attachMessageListeners(session) {
  if (!session || session.__lanListenersAttached) return;
  session.__lanListenersAttached = true;

  session.addMessageListener(NAMESPACE, (_ns, message) => {
    let msg = message;
    if (typeof message === "string") {
      try { msg = JSON.parse(message); } catch {}
    }

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
    session.sendMessage(NAMESPACE, { type: "PING", t: Date.now() }).catch(()=>{});
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
  if (!receiverReady) {
    setHint("🔄 Koblet – venter på receiver…", false);
    return;
  }

  const payload = {
    type: "STATE",
    updatedAt: Date.now(),
    players: sortedPlayers()
  };

  session.sendMessage(NAMESPACE, payload).catch(() => {
    receiverReady = false;
    setHint("🔄 Venter på receiver…", false);
  });
}

function sendFinishToReceiver() {
  const session = getSession();
  if (!session) return alert("Koble til Chromecast først.");

  const top = sortedPlayers().slice(0, 3);
  if (top.length === 0) return alert("Legg til minst én spiller først.");

  const payload = {
    type: "FINISH",
    updatedAt: Date.now(),
    winners: top
  };

  session.sendMessage(NAMESPACE, payload).catch(() => {
    alert("Kunne ikke sende vinnerne til TV. Sjekk tilkobling.");
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

// ---------------- render ----------------
function render() {
  const sorted = sortedPlayers();
  const runFlip = animateReorder(listEl);

  listEl.innerHTML = sorted.map((p, idx) => `
    <div class="player-row" data-key="${escapeHtml(p.name)}">
      <div class="rank-pill">#${idx + 1}</div>
      <div class="p-name">${escapeHtml(p.name)}</div>
      <div class="p-points">${p.points} pts</div>
      <div class="actions">
        <button class="mini add" data-add="${escapeHtml(p.name)}">+1</button>
        <button class="mini add" data-add3="${escapeHtml(p.name)}">+3</button>
        <button class="mini sub" data-sub="${escapeHtml(p.name)}">-1</button>
        <button class="mini del" data-del="${escapeHtml(p.name)}">Fjern</button>
      </div>
    </div>
  `).join("");

  // bind actions
  listEl.querySelectorAll("button").forEach(btn => {
    if (btn.dataset.add) btn.onclick = () => changePoints(btn.dataset.add, +1);
    if (btn.dataset.add3) btn.onclick = () => changePoints(btn.dataset.add3, +3);
    if (btn.dataset.sub) btn.onclick = () => changePoints(btn.dataset.sub, -1);
    if (btn.dataset.del) btn.onclick = () => removePlayer(btn.dataset.del);
  });

  // animate reorder
  requestAnimationFrame(runFlip);

  // push updates to TV
  sendStateToReceiver();
}

// ---------------- Cast init ----------------
window.__onGCastApiAvailable = (available) => {
  if (!available) {
    setHint("⚠️ Cast API ikke tilgjengelig (bruk Chrome)", false);
    return;
  }

  protectCastButtonVisibility();

  const ctx = getContext();
  ctx.setOptions({
    receiverApplicationId: APP_ID,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED
  });

  ctx.addEventListener(
    cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
    (e) => {
      const session = getSession();

      if (e.sessionState === cast.framework.SessionState.SESSION_STARTED ||
          e.sessionState === cast.framework.SessionState.SESSION_RESUMED) {

        receiverReady = false;
        setHint("🔄 Koblet – venter på receiver…", false);

        attachMessageListeners(session);

        // HELLO så receiver sender READY uansett timing
        session.sendMessage(NAMESPACE, { type: "HELLO", t: Date.now() }).catch(()=>{});

        startPing();
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
finishBtn.onclick = () => sendFinishToReceiver();

render();
