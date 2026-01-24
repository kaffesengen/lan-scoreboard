/**
 * LAN Scoreboard - Receiver V2 (Fullversjon)
 * Håndterer visning på TV via Chromecast CAF
 */

const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const status2El = document.getElementById("status2");
const gridEl = document.getElementById("grid");
const overlayEl = document.getElementById("winnerOverlay");
const winnerCardsEl = document.getElementById("winnerCards");
const sparklesEl = document.getElementById("sparkles");

// --- Hjelpefunksjoner ---

function setStatus(t) {
  if (status2El) status2El.textContent = t;
  console.log("[RECEIVER]", t);
}

function esc(s) {
  if (!s) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

// --- FLIP animasjon for myk re-sortering ---
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
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          { transform: "translate(0,0)" }
        ],
        { duration: 520, easing: "cubic-bezier(.2,.9,.1,1)" }
      );
    });
  };
}

// --- Vinner-effekter (Sparkles) ---
function makeSparkles() {
  sparklesEl.innerHTML = "";
  for (let i = 0; i < 40; i++) {
    const s = document.createElement("div");
    s.className = "sparkle";
    s.style.left = Math.random() * 100 + "vw";
    s.style.top = (-Math.random() * 20) + "vh";
    s.style.animationDelay = (Math.random() * 2) + "s";
    s.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
    sparklesEl.appendChild(s);
  }
}

// --- Vinner-skjerm (Overlay) ---
function showWinners(winners) {
  const safe = Array.isArray(winners) ? winners : [];
  const [first, second, third] = [safe[0], safe[1], safe[2]];

  winnerCardsEl.innerHTML = `
    <div class="win-card dance">
      <div class="win-place">2. plass</div>
      <div class="win-avatar">${second ? esc(second.avatar) : "🥈"}</div>
      <div class="win-name">${second ? esc(second.name) : "—"}</div>
      <div class="win-pts">${second ? second.points + " pts" : ""}</div>
    </div>

    <div class="win-card first">
      <div class="win-place">1. plass</div>
      <div class="win-avatar" style="font-size: 6rem;">${first ? esc(first.avatar) : "🏆"}</div>
      <div class="win-name">${first ? esc(first.name) : "—"}</div>
      <div class="win-pts">${first ? first.points + " pts" : ""}</div>
    </div>

    <div class="win-card dance">
      <div class="win-place">3. plass</div>
      <div class="win-avatar">${third ? esc(third.avatar) : "🥉"}</div>
      <div class="win-name">${third ? esc(third.name) : "—"}</div>
      <div class="win-pts">${third ? third.points + " pts" : ""}</div>
    </div>
  `;

  overlayEl.classList.add("show");
  sparklesEl.classList.add("show");
  makeSparkles();

  // Skjuler automatisk etter 15 sekunder
  setTimeout(() => {
    overlayEl.classList.remove("show");
    sparklesEl.classList.remove("show");
  }, 15000);
}

// --- Scoreboard Grid Oppdatering ---
function renderGrid(players) {
  const top9 = (Array.isArray(players) ? players : []).slice(0, 9);
  const runFlip = animateReorder(gridEl);

  gridEl.innerHTML = top9.map((p, i) => {
    // Hent rank-data sendt fra senderen
    const rank = p.rank || { icon: "🥉", class: "rank-bronze", name: "Bronse" };
    
    return `
      <div class="player-tile ${rank.class}" data-key="${esc(p.name)}">
        <div class="tile-rank">#${i + 1}</div>
        <div class="rank-badge">${rank.icon}</div>
        <div class="tile-avatar">${esc(p.avatar)}</div>
        <div class="tile-name">${esc(p.name)}</div>
        <div class="tile-pts">${p.points} pts</div>
        <div class="rank-label">${rank.name}</div>
      </div>
    `;
  }).join("");

  requestAnimationFrame(runFlip);
}

// --- Chromecast Receiver Setup ---

window.onerror = (m) => setStatus("❌ JS-feil: " + m);

const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();

// Hindrer at TV-en skrur av appen ved inaktivitet under LAN-et
options.disableIdleTimeout = true;

context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;

  if (data?.type === "HELLO") {
    setStatus("Tilkoblet ✅");
    context.sendCustomMessage(NAMESPACE, event.senderId, { type: "READY" });
    return;
  }

  if (data?.type === "PING") {
    context.sendCustomMessage(NAMESPACE, event.senderId, { type: "PONG" });
    return;
  }

  if (data?.type === "STATE") {
    // Oppdaterer rutenettet med spillere og deres nivåer
    renderGrid(data.players || []);
    return;
  }

  if (data?.type === "FINISH") {
    setStatus("🏆 KAMP FERDIG!");
    showWinners(data.winners || []);
    return;
  }
});

// Start mottakeren
context.start(options);
setStatus("Klar for LAN! 🚀");
