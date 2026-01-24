const NAMESPACE = "urn:x-cast:com.kaffesengen.lanscoreboard";
let castSession = null;
let players = [];

// Artige emojis å velge mellom
const AVATAR_EMOJIS = [
  '😀', '😎', '🥳', '🚀', '👽', '🦄', '🤖', '👾', '👻', '🦖', '🐉', '🐙', '🐸', '🐔', '🐧', '🦉',
  '🦊', '🐻', '🐼', '🐯', '🦁', '🙈', '🙉', '🙊', '🐵', '🐱', '🐶', '🐭', '🐹', '🐰', '🦝', '🐴',
  '🐷', '🐮', '🐞', '🕷️', '🦋', '🐠', '🐬', '🐳', '🦈', '🦀', '🐢', '🐍', '🌲', '🍄', '🍓', '🍕',
  '🍔', '🍟', '🍦', '🍩', '🍬', '🍭', '🌈', '🌟', '✨', '⚡', '🔥', '💧', '🌊', '❄️', '☃️', '☀️',
  '🌙', '⭐', '🌎', '🌍', '🌏', '💯', '🏆', '🏅', '🥇', '🥈', '🥉', '🎯', '🎮', '🎲', '🧩', '🎨',
  '🎵', '🎶', '🥁', '🎸', '🎺', '🎻', '🎹', '🎷', '🎤', '🎧', '🎬', '🎭', '🎪', '🪄', '🎩', '👑'
];


// Fyller avatar-dropdownen
const avatarSelect = document.getElementById('avatarSelect');
AVATAR_EMOJIS.forEach(emoji => {
  const option = document.createElement('option');
  option.value = emoji;
  option.textContent = emoji;
  avatarSelect.appendChild(option);
});

// Initialiser Cast
window.__onGCastApiAvailable = function(isAvailable) {
  if (isAvailable) {
    const context = cast.framework.CastContext.getInstance();
    context.setOptions({
      receiverApplicationId: 'DIN_APP_ID', // Bytt ut med din ID fra Cast Console
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    context.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, (event) => {
      castSession = context.getCurrentSession();
      const castHint = document.getElementById('castHint');
      if (event.sessionState === cast.framework.SessionState.SESSION_STARTED) {
        castHint.textContent = 'Tilkoblet TV ✅';
        castHint.classList.add('ok');
        broadcastState(); // Send status umiddelbart ved tilkobling
      } else {
        castHint.textContent = 'Klar for oppkobling';
        castHint.classList.remove('ok');
      }
    });
  }
};

// Funksjon for å sende data til TV
function broadcastState() {
  castSession = cast.framework.CastContext.getInstance().getCurrentSession();
  if (castSession) {
    const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
    const msg = {
      type: "STATE",
      players: sortedPlayers
    };
    castSession.sendMessage(NAMESPACE, msg);
  }
}

// Legg til spiller
document.getElementById('addBtn').onclick = () => {
  const nameInput = document.getElementById('nameInput');
  const name = nameInput.value.trim();
  const avatar = avatarSelect.value; // Hent valgt avatar

  if (name && !players.find(p => p.name === name)) {
    players.push({ name: name, points: 0, avatar: avatar }); // Lagrer avataren
    nameInput.value = '';
    // Velg en ny tilfeldig avatar etter at en er lagt til for å oppmuntre til variasjon
    avatarSelect.value = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    renderLocalList();
    broadcastState();
  }
};

// "FERDIG" - Trigger vinner-overlay på TV
document.getElementById('finishBtn').onclick = () => {
  castSession = cast.framework.CastContext.getInstance().getCurrentSession();
  if (castSession) {
    const winners = [...players].sort((a, b) => b.points - a.points).slice(0, 3);
    castSession.sendMessage(NAMESPACE, {
      type: "FINISH",
      winners: winners
    });
  }
};

// Reset funksjon
document.getElementById('resetBtn').onclick = () => {
  if (confirm("Vil du slette alle spillere og starte på nytt?")) {
    players = [];
    renderLocalList();
    broadcastState();
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
