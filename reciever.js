const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const statusEl = document.getElementById("status");
const podiumEl = document.getElementById("podium");
const listEl = document.getElementById("list");

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function render(state) {
  const players = Array.isArray(state.players) ? state.players : [];
  statusEl.textContent = `Mottok data! Spillere: ${players.length}`;

  const top3 = players.slice(0, 3);
  podiumEl.innerHTML = top3.map((p, i) =>
    `<div><b>#${i+1}</b> ${esc(p.name)} — ${p.points} pts</div>`
  ).join("");

  listEl.innerHTML = players.map((p, i) =>
    `<div>#${i+1} ${esc(p.name)} — ${p.points} pts</div>`
  ).join("");
}

const context = cast.framework.CastReceiverContext.getInstance();

// Lytt på custom messages fra sender
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;
  if (!data || data.type !== "STATE") return;
  render(data);
});

context.start();
