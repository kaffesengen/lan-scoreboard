const APP_ID = "D6AC56C5";
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
const STORAGE_KEY = "lan_scoreboard_state_v9";

const nameInput = document.getElementById("nameInput");
const avatarSelect = document.getElementById("avatarSelect");
const winLimitInput = document.getElementById("winLimitInput");
const listEl = document.getElementById("list");
const castHint = document.getElementById("castHint");

// Definer mulige nivåer som admin kan skru av/på
let availableRanks = [
  { id: "bronze", name: "Bronse", icon: "🥉", class: "rank-bronze", min: 5, active: false },
  { id: "silver", name: "Sølv", icon: "🥈", class: "rank-silver", min: 10, active: true },
  { id: "gold", name: "Gull", icon: "🥇", class: "rank-gold", min: 15, active: true },
  { id: "diamond", name: "Diamant", icon: "💎", class: "rank-diamond", min: 20, active: true },
  { id: "platinum", name: "Platinum", icon: "💠", class: "rank-platinum", min: 40, active: false }
];

let players = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let winLimit = 50;
let receiverReady = false;

// Genererer admin-grensesnittet for nivåer
function initRankManager() {
  const container = document.getElementById("rankManager");
  container.innerHTML = availableRanks.map(r => `
    <div class="rank-set-row" style="display:flex; align-items:center; gap:10px; margin-bottom:8px; background:rgba(255,255,255,0.05); padding:5px; border-radius:8px;">
      <input type="checkbox" id="check-${r.id}" ${r.active ? 'checked' : ''}>
      <span style="width:100px; font-weight:bold;">${r.icon} ${r.name}</span>
      <input type="number" id="min-${r.id}" value="${r.min}" style="width:60px; padding:4px; border-radius:4px;"> pts
    </div>
  `).join("");
}

// Finn ut hvilken rank en spiller har basert på admin sine valg
function getPlayerRank(points) {
  const activeRanks = availableRanks
    .filter(r => r.active)
    .sort((a, b) => b.min - a.min); // Sjekk høyeste krav først
  
  return activeRanks.find(r => points >= r.min) || null;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function render() {
  const sorted = [...players].sort((a, b) => b.points - a.points);
  listEl.innerHTML = sorted.map((p, idx) => {
    const rank = getPlayerRank(p.points);
    return `
      <div class="player-row ${rank ? rank.class : ''}" data-key="${p.name}">
        <div class="rank-pill">${idx + 1}</div>
        <div class="p-avatar">${p.avatar}</div>
        <div class="p-name">${p.name} ${rank ? `<span class="badge">${rank.icon} ${rank.name}</span>` : ''}</div>
        <div class="p-points">${p.points} pts</div>
        <div class="actions">
          <button class="mini add" onclick="updatePoints('${p.name}', 1)">+1</button>
          <button class="mini add" onclick="updatePoints('${p.name}', 5)">+5</button>
          <button class="mini sub" onclick="updatePoints('${p.name}', -1)">-1</button>
          <button class="mini del" onclick="deletePlayer('${p.name}')">×</button>
        </div>
      </div>
    `;
  }).join("");
  sendToTV();
}

window.updatePoints = (name, delta) => {
  const p = players.find(x => x.name === name);
  if (!p) return;
  p.points = Math.max(0, p.points + delta);
  if (p.points >= winLimit) {
    alert("🎉 " + p.name + " har vunnet!");
    sendFinish();
  }
  save();
  render();
};

window.deletePlayer = (name) => {
  if(confirm("Slette " + name + "?")) {
    players = players.filter(p => p.name !== name);
    save();
    render();
  }
};

// --- Admin Lagring ---
document.getElementById("updateSettingsBtn").onclick = () => {
  winLimit = parseInt(winLimitInput.value);
  availableRanks.forEach(r => {
    r.active = document.getElementById(`check-${r.id}`).checked;
    r.min = parseInt(document.getElementById(`min-${r.id}`).value);
  });
  alert("Regler oppdatert!");
  render();
};

// --- Chromecast ---
function sendToTV() {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (session && receiverReady) {
    session.sendMessage(NAMESPACE, {
      type: "STATE",
      players: players.map(p => ({ ...p, rank: getPlayerRank(p.points) }))
    });
  }
}

function sendFinish() {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (session) {
    const winners = [...players].sort((a, b) => b.points - a.points).slice(0, 3);
    session.sendMessage(NAMESPACE, { type: "FINISH", winners });
  }
}

window.__onGCastApiAvailable = (available) => {
  if (!available) return;
  const ctx = cast.framework.CastContext.getInstance();
  ctx.setOptions({ receiverApplicationId: APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED });
  ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e) => {
    if (e.sessionState === "SESSION_STARTED" || e.sessionState === "SESSION_RESUMED") {
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

document.getElementById("resetBtn").onclick = () => {
  if(confirm("Reset alt?")) { players = []; save(); render(); }
};

document.getElementById("finishBtn").onclick = sendFinish;

initRankManager();
render();
