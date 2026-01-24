const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const status2El = document.getElementById("status2");
const gridEl = document.getElementById("grid");

const overlayEl = document.getElementById("winnerOverlay");
const winnerCardsEl = document.getElementById("winnerCards");
const sparklesEl = document.getElementById("sparkles");

function setStatus(t){
  if (status2El) status2El.textContent = t;
  console.log("[RECEIVER]", t);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// FLIP anim
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
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0,0)" }],
        { duration: 520, easing: "cubic-bezier(.2,.9,.1,1)" }
      );
    });
  };
}

// Winner show
function makeSparkles() {
  sparklesEl.innerHTML = "";
  for (let i = 0; i < 32; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.style.left = Math.random() * 100 + "vw";
    s.style.top = (-Math.random() * 20) + "vh";
    s.style.animationDelay = (Math.random() * 1.2) + "s";
    s.style.opacity = (0.55 + Math.random() * 0.45).toFixed(2);
    sparklesEl.appendChild(s);
  }
}

function showWinners(winners) {
  const safe = Array.isArray(winners) ? winners : [];
  const [first, second, third] = [safe[0], safe[1], safe[2]];

  winnerCardsEl.innerHTML = `
    <div class="win-card dance">
      <div class="win-place">2. plass</div>
      <div class="win-name">${second ? esc(second.name) : "—"}</div>
      <div class="win-pts">${second ? `${second.points} pts` : ""}</div>
    </div>

    <div class="win-card first">
      <div class="win-place">1. plass</div>
      <div class="win-name">${first ? esc(first.name) : "—"}</div>
      <div class="win-pts">${first ? `${first.points} pts` : ""}</div>
    </div>

    <div class="win-card dance">
      <div class="win-place">3. plass</div>
      <div class="win-name">${third ? esc(third.name) : "—"}</div>
      <div class="win-pts">${third ? `${third.points} pts` : ""}</div>
    </div>
  `;

  overlayEl.classList.add("show");
  sparklesEl.classList.add("show");
  makeSparkles();

  // Skru av igjen etter 12 sek (kan endres)
  setTimeout(() => {
    overlayEl.classList.remove("show");
    sparklesEl.classList.remove("show");
  }, 12000);
}

// Render TOPP 9
function renderGrid(players) {
  const top9 = (Array.isArray(players) ? players : []).slice(0, 9);
  const runFlip = animateReorder(gridEl);

  gridEl.innerHTML = top9.map((p, i) => `
    <div class="player-tile" data-key="${esc(p.name)}">
      <div class="tile-rank">#${i + 1}</div>
      <div class="tile-name">${esc(p.name)}</div>
      <div class="tile-pts">${p.points} pts</div>
    </div>
  `).join("");

  requestAnimationFrame(runFlip);
}

window.onerror = (m) => setStatus("❌ JS-feil: " + m);

setStatus("CAF init…");
const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

const senders = new Set();
function sendTo(senderId, msg) {
  try { context.sendCustomMessage(NAMESPACE, senderId, msg); } catch {}
}
function sendReady(senderId) { sendTo(senderId, { type:"READY", t: Date.now() }); }

context.addEventListener("senderconnected", (e) => {
  senders.add(e.senderId);
  setStatus("Sender tilkoblet ✅");
  sendReady(e.senderId);
});

context.addEventListener("senderdisconnected", (e) => {
  senders.delete(e.senderId);
  setStatus("Venter på sender…");
});

context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;

  if (data?.type === "HELLO") {
    setStatus("HELLO mottatt ✅");
    sendReady(event.senderId);
    return;
  }

  if (data?.type === "PING") {
    sendTo(event.senderId, { type:"PONG", t: Date.now() });
    sendReady(event.senderId);
    return;
  }

  if (data?.type === "STATE") {
    setStatus(`Oppdatert ✅ (${(data.players || []).length} spillere)`);
    renderGrid(data.players || []);
    return;
  }

  if (data?.type === "FINISH") {
    setStatus("🏆 FERDIG – viser vinnere!");
    showWinners(data.winners || []);
    return;
  }
});

context.start(options);
setStatus("Receiver startet ✅");
