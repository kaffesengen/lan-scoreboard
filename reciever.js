const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";

// 1) Finn status-elementet på siden
const statusEl = document.getElementById("status");

// 2) Lag en liten funksjon som skriver tekst på TV-skjermen
function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
  console.log("[RECEIVER]", text);
}

// 3) Hvis JavaScript krasjer, vis feilen på skjermen
window.onerror = function (message, source, lineno, colno, error) {
  setStatus("❌ JS-feil: " + message);
};

// 4) Si at JS har lastet
setStatus("JS lastet ✅");

// 5) Start CAF receiver
setStatus("CAF start() kalles…");
const context = cast.framework.CastReceiverContext.getInstance();

// Lytt på meldinger fra sender
context.addCustomMessageListener(NAMESPACE, (event) => {
  const data = event.data;

  if (data && data.type === "PING") {
    setStatus("PING ✅ (holder receiver aktiv)");
    // (Valgfritt) svar tilbake:
    context.sendCustomMessage(NAMESPACE, event.senderId, { type: "PONG", t: Date.now() });
    return;
  }

  if (data && data.type === "STATE") {
    setStatus("STATE ✅ Spillere: " + ((data.players || []).length));
    // Her kan du senere tegne scoreboard UI
    return;
  }
});

// 6) HER er linjene jeg mente:
//    - en status rett før context.start()
//    - en status rett etter context.start()
context.start();
setStatus("CAF startet ✅ (venter på meldinger)");
