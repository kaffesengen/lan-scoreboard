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

const context = cast.framework.CastReceiverContext.getInstance();
const options = new cast.framework.CastReceiverOptions();
options.disableIdleTimeout = true;

// Hold styr på sendere som er koblet til
const senders = new Set();

function sendTo(senderId, msg) {
  try {
    context.sendCustomMessage(NAMESPACE, senderId, msg);
  } catch (e) {
    console.warn("sendCustomMessage failed:", e);
  }
}

function sendReady(senderId) {
  sendTo(senderId, { type: "READY", t: Date.now() });
}

function broadcastReady() {
  for (const id of senders) sendReady(id);
}

// Event strings (fungerer hos deg)
context.addEventListener("senderconnected", (e) => {
  senders.add(e.senderId);
  setStatus("👤 Sender tilkoblet ✅");
  sendReady(e.senderId);
});

context.addEventListener("senderdisconnected", (e) => {
  senders.delete(e.senderId);
  setStatus("👤 Sender frakoblet");
});

// Meldinger fra sender
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;

  // Håndtrykk: hvis sender sier HELLO/PING, svar READY hver gang
  if (data?.type === "HELLO") {
    setStatus("✅ HELLO mottatt – sender READY");
    sendReady(event.senderId);
    return;
  }

  if (data?.type === "PING") {
    // Svar både PONG og READY (så sender alltid blir “ready”)
    sendTo(event.senderId, { type: "PONG", t: Date.now() });
    sendReady(event.senderId);
    return;
  }

  if (data?.type === "STATE") {
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

// Broadcast READY noen ganger etter start (i tilfelle timing)
setTimeout(broadcastReady, 300);
setTimeout(broadcastReady, 1000);
setTimeout(broadcastReady, 2500);
