const NAMESPACE = "urn:x-cast:com.panorama.lan.scoreboard";

const statusEl = document.getElementById("status");
const podiumEl = document.getElementById("podium");
const listEl = document.getElementById("list");

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function render(state) {
  const players = state.players || [];
  statusEl.textContent = players.length
    ? `Oppdatert: ${new Date(state.updatedAt).toLocaleTimeString()}`
    : "Ingen spillere ennå";

  renderPodium(players);
  renderList(players);
}

function renderPodium(players) {
  const top3 = players.slice(0, 3);
  const labels = ["1st", "2nd", "3rd"];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd (Kahoot-ish)

  podiumEl.innerHTML = order.map(i => {
    const p = top3[i];
    if (!p) {
      return `<div class="podiumCard"><div class="place">${labels[i]}</div><div class="name">—</div><div class="points">0 pts</div></div>`;
    }
    return `
      <div class="podiumCard">
        <div class="place">${labels[i]}</div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="points">${p.points} pts</div>
      </div>
    `;
  }).join("");
}

function renderList(players) {
  listEl.innerHTML = players.map((p, idx) => `
    <div class="row">
      <div class="badge">#${idx+1}</div>
      <div class="nameCell">${escapeHtml(p.name)}</div>
      <div class="pointsCell">${p.points} pts</div>
      <div></div>
    </div>
  `).join("");
}

// === CAF Receiver start ===
const context = cast.framework.CastReceiverContext.getInstance();

// Lytt på custom namespace (CAF sin måte å gjøre message bus)
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;
  if (!data || data.type !== "STATE") return;
  render(data);
});

context.start();
