const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_state_v8";

const nameInput = document.getElementById("nameInput");
const avatarSelect = document.getElementById("avatarSelect");
const winLimitInput = document.getElementById("winLimitInput");
const listEl = document.getElementById("list");
const castHint = document.getElementById("castHint");

let players = loadPlayers();
let winLimit = 50;
let receiverReady = false;

// Definerer nivåer (Ranks)
const RANKS = [
  { name: "Bronse", min: 0, class: "rank-bronze", icon: "🥉" },
  { name: "Sølv", min: 10, class: "rank-silver", icon: "🥈" },
  { name: "Gull", min: 25, class: "rank-gold", icon: "🥇" },
  { name: "Diamant", min: 50, class: "rank-diamond", icon: "💎" },
  { name: "Legend", min: 100, class: "rank-legend", icon: "👑" }
];

function loadPlayers() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}

function savePlayers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function getRank(points) {
  return [...RANKS].reverse().find(r => points >= r.min) || RANKS[0];
}

function render() {
  const sorted = [...players].sort((a, b) => b.points - a.points);
  listEl.innerHTML = sorted.map((p, idx) => {
    const rank = getRank(p.points);
    return `
      <div class="player-row ${rank.class}" data-key="${p.name}">
        <div class="rank-pill">${rank.icon}</div>
        <div class="p-avatar">${p.avatar}</div>
        <div class="p-name">${p.name} <small>(${rank.name})</small></div>
        <div class="p-points">${p.points} pts</div>
        <div class="actions">
          <button class="mini add" onclick="changePoints('${p.name}', 1)">+1</button>
          <button class="mini sub" onclick="changePoints('${p.name}', -1)">-1</button>
          <button class="mini del" onclick="removePlayer('${p.name}')">×</button>
        </div>
      </div>
    `;
  }).join("");
  sendStateToReceiver();
}

window.changePoints = (name, delta) => {
  const p = players.find(x => x.name === name);
  if (!p) return;
  p.points = Math.max(0, p.points + delta);
  if (p.points >= winLimit) {
    alert(`🎉 ${p.name} har vunnet!`);
    sendFinishToReceiver();
  }
  savePlayers();
  render();
};

window.removePlayer = (name) => {
  players = players.filter(p => p.name !== name);
  savePlayers();
  render();
};

// --- Chromecast Logikk ---
function sendStateToReceiver() {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (session && receiverReady) {
    session.sendMessage(NAMESPACE, {
      type: "STATE",
      players: players.map(p => ({ ...p, rank: getRank(p.points) })),
      winLimit: winLimit
    });
  }
}

function sendFinishToReceiver() {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (session) {
    const winners = [...players].sort((a, b) => b.points - a.points).slice(0, 3);
    session.sendMessage(NAMESPACE, { type: "FINISH", winners: winners });
  }
}

// Init Cast
window.__onGCastApiAvailable = (available) => {
  if (!available) return;
  const ctx = cast.framework.CastContext.getInstance();
  ctx.setOptions({ receiverApplicationId: APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED });
  ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e) => {
    if (e.sessionState === "SESSION_STARTED") {
      receiverReady = true;
      render();
    }
  });
};

document.getElementById("addBtn").onclick = () => {
  const name = nameInput.value.trim();
  if (name) {
    players.push({ name, points: 0, avatar: avatarSelect.value });
    nameInput.value = "";
    render();
  }
};

document.getElementById("updateSettingsBtn").onclick = () => {
  winLimit = parseInt(winLimitInput.value);
  alert("Vinnergrense oppdatert til " + winLimit);
  render();
};

render();
