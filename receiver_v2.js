const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const status2El = document.getElementById("status2");
const gridEl = document.getElementById("grid");
const overlayEl = document.getElementById("winnerOverlay");
const winnerCardsEl = document.getElementById("winnerCards");
const sparklesEl = document.getElementById("sparkles");

function setStatus(t){ if (status2El) status2El.textContent = t; }

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function animateReorder(container) {
  const children = Array.from(container.children);
  const first = new Map();
  children.forEach(el => first.set(el.dataset.key, el.getBoundingClientRect()));
  return () => {
    const newChildren = Array.from(container.children);
    newChildren.forEach(el => {
      const f = first.get(el.dataset.key);
      if (!f) return;
      const last = el.getBoundingClientRect();
      const dx = f.left - last.left;
      const dy = f.top - last.top;
      if (dx === 0 && dy === 0) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0,0)" }], { duration: 520, easing: "cubic-bezier(.2,.9,.1,1)" });
    });
  };
}

function makeSparkles() {
  sparklesEl.innerHTML = "";
  for (let i = 0; i < 32; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.style.left = Math.random() * 100 + "vw";
    s.style.top = (-Math.random() * 20) + "vh";
    s.style.animationDelay = (Math.random() * 1.2) + "s";
    sparklesEl.appendChild(s);
  }
}

function showWinners(winners) {
  const safe = Array.isArray(winners) ? winners : [];
  const [f, s, t] = [safe[0], safe[1], safe[2]];

  winnerCardsEl.innerHTML = `
    <div class="win-card dance">
      <div class="win-place">2. plass</div>
      <div class="win-avatar" style="font-size: 3rem;">${s ? esc(s.avatar) : "🎮"}</div>
      <div class="win-name">${s ? esc(s.name) : "—"}</div>
      <div class="win-pts">${s ? s.points + " pts" : ""}</div>
    </div>
    <div class="win-card first">
      <div class="win-place">1. plass</div>
      <div class="win-avatar" style="font-size: 5rem;">${f ? esc(f.avatar) : "🏆"}</div>
      <div class="win-name">${f ? esc(f.name) : "—"}</div>
      <div class="win-pts">${f ? f.points + " pts" : ""}</div>
    </div>
    <div class="win-card dance">
      <div class="win-place">3. plass</div>
      <div class="win-avatar" style="font-size: 3rem;">${t ? esc(t.avatar) : "🎮"}</div>
      <div class="win-name">${t ? esc(t.name) : "—"}</div>
      <div class="win-pts">${t ? t.points + " pts" : ""}</div>
    </div>
  `;

  overlayEl.classList.add("show");
  sparklesEl.classList.add("show");
  makeSparkles();
  setTimeout(() => { overlayEl.classList.remove("show"); sparklesEl.classList.remove("show"); }, 12000);
}

function renderGrid(players) {
  const top9 = (Array.isArray(players) ? players : []).slice(0, 9);
  const runFlip = animateReorder(gridEl);

  gridEl.innerHTML = top9.map((p, i) => `
    <div class="player-tile" data-key="${esc(p.name)}">
      <div class="tile-rank">#${i + 1}</div>
      <div class="tile-avatar" style="font-size: 2rem; grid-row: 1/3;">${p.avatar || '🎮'}</div>
      <div class="tile-name">${esc(p.name)}</div>
      <div class="tile-pts">${p.points} pts</div>
    </div>
  `).join("");

  requestAnimationFrame(runFlip);
}

const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;
  if (data?.type === "HELLO") { setStatus("Tilkoblet ✅"); context.sendCustomMessage(NAMESPACE, event.senderId, {type:"READY"}); }
  if (data?.type === "PING") { context.sendCustomMessage(NAMESPACE, event.senderId, {type:"PONG"}); }
  if (data?.type === "STATE") { renderGrid(data.players || []); }
  if (data?.type === "FINISH") { showWinners(data.winners || []); }
});

context.start(options);
setStatus("Klar for kamp! 🚀");
