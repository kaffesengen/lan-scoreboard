<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>LAN Scoreboard (Receiver)</title>

  <script src="https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js"></script>
  <link rel="stylesheet" href="style.css" />
</head>

<body>
  <!-- Winner overlay -->
  <div class="winner-overlay" id="winnerOverlay">
    <div class="winner-wrap">
      <div class="winner-title">🏆 VINNERE 🏆</div>

      <div class="winner-cards" id="winnerCards"></div>
    </div>
  </div>

  <div class="sparkles" id="sparkles"></div>

  <div class="app">
    <header class="topbar glass">
      <div class="topbar-left">
        <h1>LAN Scoreboard</h1>
        <p id="status2">Venter på sender…</p>
      </div>
    </header>

    <section class="card">
      <h2>TOPP 9</h2>
      <div class="grid9" id="grid"></div>
    </section>
  </div>

  <script src="receiver_v2.js"></script>
</body>
</html>    broadcastState();
  }
};

// Lokal render for kontrollpanelet
function renderLocalList() {
  const list = document.getElementById('list');
  const sorted = [...players].sort((a, b) => b.points - a.points);
  
  list.innerHTML = sorted.map((p, i) => `
    <div class="player-row" data-name="${esc(p.name)}">
      <div class="rank-pill">${i + 1}</div>
      <div class="p-avatar">${esc(p.avatar)}</div> <div class="p-name">${esc(p.name)}</div>
      <div class="p-points">${p.points} pts</div>
      <div class="actions">
        <button class="mini add" onclick="changeScoreByName('${esc(p.name)}', 1)">+1</button>
        <button class="mini add" onclick="changeScoreByName('${esc(p.name)}', 5)">+5</button>
        <button class="mini sub" onclick="changeScoreByName('${esc(p.name)}', -1)">-1</button>
        <button class="mini del" onclick="removePlayer('${esc(p.name)}')">Slett</button>
      </div>
    </div>
  `).join('');
}

// Hjelpefunksjoner for å håndtere endringer via navn (siden listen re-sorteres)
function changeScoreByName(name, delta) {
  const player = players.find(p => p.name === name);
  if (player) {
    player.points += delta;
    renderLocalList();
    broadcastState();
  }
}

function removePlayer(name) {
  if(confirm(`Fjerne ${name}?`)) {
    players = players.filter(p => p.name !== name);
    renderLocalList();
    broadcastState();
  }
}

// Initial render ved start
renderLocalList();

// Hjelpefunksjon for XSS-beskyttelse
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}
    // Her kan du senere tegne scoreboard UI
    return;
  }
});

// 6) HER er linjene jeg mente:
//    - en status rett før context.start()
//    - en status rett etter context.start()
context.start();
setStatus("CAF startet ✅ (venter på meldinger)");
