const APP_ID = "D6AC56C5"; // Din ID
const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

let players = JSON.parse(localStorage.getItem("lan_players")) || [];
let receiverReady = false;

// Definer alle mulige nivåer
let availableRanks = [
  { id: "bronze", name: "Bronse", icon: "🥉", class: "rank-bronze", min: 5, active: true },
  { id: "silver", name: "Sølv", icon: "🥈", class: "rank-silver", min: 10, active: true },
  { id: "gold", name: "Gull", icon: "🥇", class: "rank-gold", min: 15, active: true },
  { id: "diamond", name: "Diamant", icon: "💎", class: "rank-diamond", min: 20, active: true },
  { id: "platinum", name: "Platinum", icon: "💠", class: "rank-platinum", min: 40, active: false }
];
let winLimit = 50;

// Tegn admin-grensesnitt for nivåer
function renderRankSettings() {
  const container = document.getElementById("rankManager");
  container.innerHTML = availableRanks.map(r => `
    <div class="rank-row">
      <input type="checkbox" id="check-${r.id}" ${r.active ? 'checked' : ''}>
      <span>${r.icon} ${r.name}</span>
      <input type="number" id="min-${r.id}" value="${r.min}"> pts
    </div>
  `).join("");
}

// Finn rank basert på poeng og aktive valg
function getPlayerRank(pts) {
  const active = availableRanks.filter(r => r.active).sort((a,b) => b.min - a.min);
  return active.find(r => pts >= r.min) || null;
}

function render() {
  const listEl = document.getElementById("list");
  const sorted = [...players].sort((a,b) => b.points - a.points);
  
  listEl.innerHTML = sorted.map((p, i) => {
    const rank = getPlayerRank(p.points);
    return `
      <div class="player-row ${rank ? rank.class : ''}">
        <div class="rank-pill">#${i+1}</div>
        <div class="p-avatar">${p.avatar}</div>
        <div class="p-name">${p.name} ${rank ? `<span>(${rank.name})</span>` : ''}</div>
        <div class="p-points">${p.points} pts</div>
        <div class="actions">
          <button onclick="updatePoints('${p.name}', 1)">+1</button>
          <button onclick="updatePoints('${p.name}', -1)">-1</button>
        </div>
      </div>
    `;
  }).join("");
  
  sendState();
}

window.updatePoints = (name, delta) => {
  const p = players.find(x => x.name === name);
  if (p) {
    p.points = Math.max(0, p.points + delta);
    if (p.points >= winLimit) alert(p.name + " har vunnet!");
    localStorage.setItem("lan_players", JSON.stringify(players));
    render();
  }
};

// Chromecast sender
function sendState() {
  const session = cast.framework.CastContext.getInstance().getCurrentSession();
  if (session && receiverReady) {
    session.sendMessage(NAMESPACE, {
      type: "STATE",
      players: players.map(p => ({ ...p, rank: getPlayerRank(p.points) }))
    });
  }
}

document.getElementById("saveSettingsBtn").onclick = () => {
  winLimit = parseInt(document.getElementById("winLimitInput").value);
  availableRanks.forEach(r => {
    r.active = document.getElementById(`check-${r.id}`).checked;
    r.min = parseInt(document.getElementById(`min-${r.id}`).value);
  });
  render();
};

document.getElementById("addBtn").onclick = () => {
  const name = document.getElementById("nameInput").value;
  const avatar = document.getElementById("avatarSelect").value;
  if (name) {
    players.push({ name, points: 0, avatar });
    document.getElementById("nameInput").value = "";
    render();
  }
};

// Chromecast Init
window.__onGCastApiAvailable = (isAvailable) => {
  if (isAvailable) {
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({ receiverApplicationId: APP_ID, autoJoinPolicy: chrome.cast.AutoJoinPolicy.PAGE_SCOPED });
    context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (e) => {
      if (e.sessionState === "SESSION_STARTED") {
        receiverReady = true;
        render();
      }
    });
  }
};

renderRankSettings();
render();
