const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

const statusEl = document.getElementById("status");
const status2El = document.getElementById("status2");
const podiumEl = document.getElementById("podium");
const listEl = document.getElementById("list");

function setStatus(t) {
  if (statusEl) statusEl.textContent = t;
  if (status2El) status2El.textContent = t;
  console.log("[RECEIVER]", t);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

window.onerror = function (message) {
  setStatus("❌ JS-feil: " + message);
};

setStatus("JS lastet ✅");

// Start CAF receiver
setStatus("CAF init…");
const context = cast.framework.CastReceiverContext.getInstance();

// 🚀 Viktig: hindrer at receiveren lukkes pga idle
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

function sendReady(senderId) {
  try {
    context.sendCustomMessage(NAMESPACE, senderId, { type: "READY", t: Date.now() });
  } catch (e) {
    console.warn("sendReady failed:", e);
  }
}

context.addEventListener(
  cast.framework.CastReceiverContextEventType.SENDER_CONNECTED,
  (e) => {
    setStatus("👤 Sender tilkoblet ✅");
    sendReady(e.senderId);
  }
);

context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;

  if (!data || !data.type) return;

  if (data.type === "PING") {
    // valgfritt svar:
    context.sendCustomMessage(NAMESPACE, event.senderId, { type: "PONG", t: Date.now() });
    return;
  }

  if (data.type === "STATE") {
    setStatus("✅ STATE mottatt (" + (data.players?.length || 0) + " spillere)");
    render(data);
    return;
  }
});

function render(state) {
  const players = Array.isArray(state.players) ? state.players : [];

  // enkel topp3
  const top3 = players.slice(0, 3);
  podiumEl.innerHTML = top3.map((p, i) => `
    <div class="podiumCard">
      <div class="place">#${i+1}</div>
      <div class="podiumName">${esc(p.name)}</div>
      <div class="podiumPoints">${p.points} pts</div>
    </div>
  `).join("");

  listEl.innerHTML = players.map((p, i) => `
    <div class="row" style="grid-template-columns: 70px 1fr 110px 10px;">
      <div class="rank">#${i+1}</div>
      <div class="name">${esc(p.name)}</div>
      <div class="points">${p.points} pts</div>
      <div></div>
    </div>
  `).join("");
}

setStatus("CAF start()…");
context.start(options);
setStatus("CAF startet ✅ (venter på sender)");
