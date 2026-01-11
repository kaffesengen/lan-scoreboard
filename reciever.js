const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const statusEl = document.getElementById("status");
const podiumEl = document.getElementById("podium");
const listEl = document.getElementById("list");

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function render(state) {
  const players = Array.isArray(state.players) ? state.players : [];
  const time = state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : "";

  statusEl.textContent = players.length
    ? `Oppdatert: ${time}`
    : "Ingen spillere ennå";

  renderPodium(players);
  renderList(players);
}

function renderPodium(players) {
  const top3 = players.slice(0, 3);

  // Kahoot-ish: 2., 1., 3.
  const slots = [
    { label: "2. plass", idx: 1 },
    { label: "1. plass", idx: 0 },
    { label: "3. plass", idx: 2 },
  ];

  podiumEl.innerHTML = slots.map(s => {
    const p = top3[s.idx];
    if (!p) {
      return `
        <div class="podiumCard">
          <div class="place">${s.label}</div>
          <div class="podiumName">—</div>
          <div class="podiumPoints">0 pts</div>
        </div>
      `;
    }
    return `
      <div class="podiumCard">
        <div class="place">${s.label}</div>
        <div class="podiumName">${escapeHtml(p.name)}</div>
        <div class="podiumPoints">${p.points} pts</div>
      </div>
    `;
  }).join("");
}

function renderList(players) {
  listEl.innerHTML = players.map((p, idx) => `
    <div class="row" style="grid-template-columns: 70px 1fr 110px 10px;">
      <div class="rank">#${idx + 1}</div>
      <div class="name">${escapeHtml(p.name)}</div>
      <div class="points">${p.points} pts</div>
      <div></div>
    </div>
  `).join("");
}

// Start CAF receiver
const context = cast.framework.CastReceiverContext.getInstance();
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;
  if (!data || data.type !== "STATE") return;
  render(data);
});
context.start();
