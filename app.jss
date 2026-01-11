const nameInput = document.getElementById("nameInput");
const addBtn = document.getElementById("addBtn");
const resetBtn = document.getElementById("resetBtn");
const listEl = document.getElementById("list");
const podiumEl = document.getElementById("podium");

const STORAGE_KEY = "lan_scoreboard_v1";

let players = load();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function normalizeName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function addPlayer(name) {
  const clean = normalizeName(name);
  if (!clean) return;

  // prevent duplicates (same name)
  if (players.some(p => p.name.toLowerCase() === clean.toLowerCase())) {
    alert("That username already exists!");
    return;
  }

  players.push({ name: clean, points: 0 });
  save();
  render();
}

function changePoints(name, delta) {
  const p = players.find(x => x.name === name);
  if (!p) return;
  p.points += delta;
  if (p.points < 0) p.points = 0;
  save();
  render();
}

function removePlayer(name) {
  players = players.filter(p => p.name !== name);
  save();
  render();
}

function resetAll() {
  if (!confirm("Reset everything?")) return;
  players = [];
  save();
  render();
}

function sortedPlayers() {
  // sort by points (high -> low), then name (A -> Z)
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });
}

function renderPodium(sorted) {
  const top3 = sorted.slice(0, 3);
  const places = ["1st", "2nd", "3rd"];

  // Kahoot-ish: 2nd, 1st, 3rd layout
  const order = [1, 0, 2];

  podiumEl.innerHTML = order.map(i => {
    const p = top3[i];
    if (!p) {
      return `<div class="podiumCard"><div class="place">${places[i]}</div><div class="name">—</div><div class="points">0 pts</div></div>`;
    }
    return `
      <div class="podiumCard">
        <div class="place">${places[i]}</div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="points">${p.points} pts</div>
      </div>
    `;
  }).join("");
}

function renderList(sorted) {
  listEl.innerHTML = sorted.map((p, index) => {
    const rank = index + 1;
    return `
      <div class="row">
        <div class="badge">#${rank}</div>
        <div class="nameCell">${escapeHtml(p.name)}</div>
        <div class="pointsCell">${p.points} pts</div>
        <div class="actions">
          <button class="small" data-add="${p.name}">+1</button>
          <button class="small" data-sub="${p.name}">-1</button>
          <button class="remove" data-del="${p.name}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  // Hook up button clicks
  listEl.querySelectorAll("button").forEach(btn => {
    if (btn.dataset.add) btn.onclick = () => changePoints(btn.dataset.add, +1);
    if (btn.dataset.sub) btn.onclick = () => changePoints(btn.dataset.sub, -1);
    if (btn.dataset.del) btn.onclick = () => removePlayer(btn.dataset.del);
  });
}

function render() {
  const sorted = sortedPlayers();
  renderPodium(sorted);
  renderList(sorted);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));
}

// Events
addBtn.onclick = () => {
  addPlayer(nameInput.value);
  nameInput.value = "";
  nameInput.focus();
};

nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addBtn.click();
});

resetBtn.onclick = resetAll;

// First render
render();
