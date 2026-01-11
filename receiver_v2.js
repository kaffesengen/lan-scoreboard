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

// CAF
setStatus("CAF init…");
const context = cast.framework.CastReceiverContext.getInstance();

// Disable idle timeout (hindrer at den lukkes)
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

// Send READY til en sender
function sendReady(senderId) {
  try {
    context.sendCustomMessage(NAMESPACE, senderId, { type: "READY", t: Date.now() });
  } catch (e) {
    console.warn("sendReady failed:", e);
  }
}

// ✅ Ikke bruk CastReceiverContextEventType (var undefined hos deg).
// Bruk streng-eventnavn som alltid fungerer:
context.addEventListener("senderconnected", (e) => {
  setStatus("👤 Sender tilkoblet ✅");
  sendReady(e.senderId);
});

context.addEventListener("senderdisconnected", (e) => {
  setStatus("👤 Sender frakoblet");
});

// Meldinger fra sender
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === "PING") {
    // Hold liv + (valgfritt) svar
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

  const top3 = players.slice(0, 3);
  if (podiumEl) {
    podiumEl.innerHTML = top3.map((p, i) => `
      <div class="podiumCard">
        <div class="place">#${i + 1}</div>
        <div class="podiumName">${esc(p.name)}</div>
        <div class="podiumPoints">${p.points} pts</div>
      </div>
    `).join("");
  }

  if (listEl) {
    listEl.innerHTML = players.map((p, i) => `
      <div class="row" style="grid-template-columns: 70px 1fr 110px 10px;">
        <div class="rank">#${i + 1}</div>
        <div class="name">${esc(p.name)}</div>
        <div class="points">${p.points} pts</div>
        <div></div>
      </div>
    `).join("");
  }
}

setStatus("CAF start()…");
context.start(options);
setStatus("CAF startet ✅ (venter på sender)");
