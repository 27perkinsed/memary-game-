const numberItems = Array.from({ length: 20 }, (_, index) => ({
  id: `number-${index + 1}`,
  content: index + 1,
  kind: "number",
  color: "#f5f3ed"
}));
const colorItems = [
  ["coral", "#ff806b"], ["aqua", "#8adbd0"], ["gold", "#f4c95d"], ["blue", "#8eb8ff"], ["violet", "#d69cff"],
  ["orange", "#ffad66"], ["green", "#70d68c"], ["pink", "#f48bb4"], ["sky", "#6fd1ee"], ["lime", "#e4ed72"]
].map(([name, color]) => ({ id: `color-${name}`, content: name, kind: "color", color }));
const animalItems = [
  ["cat", "🐈"], ["dog", "🐕"], ["fox", "🦊"], ["frog", "🐸"], ["owl", "🦉"],
  ["whale", "🐋"], ["panda", "🐼"], ["tiger", "🐅"], ["rabbit", "🐇"], ["bear", "🐻"]
].map(([name, icon]) => ({ id: `animal-${name}`, content: icon, label: name, kind: "animal", color: "#f5f3ed" }));
const pairItems = [...numberItems, ...colorItems, ...animalItems];

const board = document.querySelector("#board");
const timerElement = document.querySelector("#timer");
const movesElement = document.querySelector("#moves");
const bestScoreElement = document.querySelector("#bestScore");
const newGameButton = document.querySelector("#newGameButton");
const quitButton = document.querySelector("#quitButton");
const startScreen = document.querySelector("#startScreen");
const difficultyScreen = document.querySelector("#difficultyScreen");
const gameScreen = document.querySelector("#gameScreen");
const playButton = document.querySelector("#playButton");
const backButton = document.querySelector("#backButton");
const difficultyQuitButton = document.querySelector("#difficultyQuitButton");
const difficultyButtons = document.querySelectorAll(".difficulty-button");
const leaderboardRows = document.querySelector("#leaderboardRows");
const winDialog = document.querySelector("#winDialog");
const playAgainButton = document.querySelector("#playAgainButton");
const resultMoves = document.querySelector("#resultMoves");
const resultTime = document.querySelector("#resultTime");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let matchedPairs = 0;
let moves = 0;
let elapsedSeconds = 0;
let timerId = null;
let flipTimeoutId = null;
let currentDifficulty = "normal";
let currentPairCount = 12;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function getBestScore(difficulty = currentDifficulty) {
  const storedScore = localStorage.getItem(`flip-match-best-${difficulty}`);
  return storedScore ? JSON.parse(storedScore) : null;
}

function renderLeaderboard() {
  const difficulties = [
    ["superEasy", "Super easy"],
    ["easy", "Easy"],
    ["normal", "Normal"],
    ["hard", "Hard"]
  ];
  leaderboardRows.replaceChildren();
  difficulties.forEach(([difficulty, label]) => {
    const bestScore = getBestScore(difficulty);
    const row = document.createElement("tr");
    const nameCell = document.createElement("th");
    nameCell.scope = "row";
    nameCell.textContent = label;
    const timeCell = document.createElement("td");
    timeCell.textContent = bestScore ? formatTime(bestScore.time) : "--:--";
    const movesCell = document.createElement("td");
    movesCell.textContent = bestScore ? bestScore.moves.toString().padStart(2, "0") : "--";
    row.append(nameCell, timeCell, movesCell);
    leaderboardRows.appendChild(row);
  });
}

function updateBestScore() {
  const bestScore = getBestScore();
  bestScoreElement.textContent = bestScore ? formatTime(bestScore.time) : "--:--";
}

function startTimer() {
  if (timerId) return;
  timerId = setInterval(() => {
    elapsedSeconds += 1;
    timerElement.textContent = formatTime(elapsedSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

function createCard(item, index) {
  const card = document.createElement("button");
  card.className = "card";
  card.type = "button";
  card.dataset.pairId = item.id;
  card.dataset.label = item.label || item.content;
  card.dataset.kind = item.kind;
  card.style.setProperty("--pair-color", item.color);
  card.dataset.index = index;
  card.setAttribute("aria-label", "Hidden memory card");
  card.style.animationDelay = `${index * 35}ms`;
  card.innerHTML = `
    <span class="card-face card-front" aria-hidden="true"></span>
    <span class="card-face card-back ${item.kind}-face" aria-hidden="true">${item.content}</span>
  `;
  card.addEventListener("click", () => flipCard(card));
  return card;
}

function flipCard(card) {
  if (lockBoard || card === firstCard || card.classList.contains("is-matched")) return;
  startTimer();
  card.classList.add("is-flipped");
  card.setAttribute("aria-label", `${card.dataset.label} card`);

  if (!firstCard) {
    firstCard = card;
    return;
  }

  secondCard = card;
  moves += 1;
  movesElement.textContent = moves.toString().padStart(2, "0");
  checkForMatch();
}

function checkForMatch() {
  const isMatch = firstCard.dataset.pairId === secondCard.dataset.pairId;
  lockBoard = true;
  if (isMatch) {
    markAsMatched();
  } else {
    unflipCards();
  }
}

function markAsMatched() {
  firstCard.classList.add("is-matched");
  secondCard.classList.add("is-matched");
  firstCard.setAttribute("aria-label", `${firstCard.dataset.label} matched`);
  secondCard.setAttribute("aria-label", `${secondCard.dataset.label} matched`);
  matchedPairs += 1;
  resetTurn();
  if (matchedPairs === currentPairCount) finishGame();
}

function unflipCards() {
  flipTimeoutId = setTimeout(() => {
    flipTimeoutId = null;
    firstCard.classList.remove("is-flipped");
    secondCard.classList.remove("is-flipped");
    firstCard.setAttribute("aria-label", "Hidden memory card");
    secondCard.setAttribute("aria-label", "Hidden memory card");
    resetTurn();
  }, 500);
}

function resetTurn() {
  [firstCard, secondCard] = [null, null];
  lockBoard = false;
}

function finishGame() {
  stopTimer();
  const currentScore = { time: elapsedSeconds, moves };
  const bestScore = getBestScore();
  if (!bestScore || currentScore.time < bestScore.time || (currentScore.time === bestScore.time && moves < bestScore.moves)) {
    localStorage.setItem(`flip-match-best-${currentDifficulty}`, JSON.stringify(currentScore));
    updateBestScore();
  }
  resultMoves.textContent = moves.toString().padStart(2, "0");
  resultTime.textContent = formatTime(elapsedSeconds);
  setTimeout(() => winDialog.showModal(), 480);
}

function startNewGame() {
  stopTimer();
  clearTimeout(flipTimeoutId);
  flipTimeoutId = null;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  matchedPairs = 0;
  moves = 0;
  elapsedSeconds = 0;
  timerElement.textContent = "00:00";
  movesElement.textContent = "00";
  board.replaceChildren();
  const deck = pairItems.slice(0, currentPairCount).flatMap((item) => [item, item]);
  shuffle(deck).forEach((item, index) => {
    board.appendChild(createCard(item, index));
  });
}

function showScreen(screenToShow) {
  [startScreen, difficultyScreen, gameScreen].forEach((screen) => {
    screen.hidden = screen !== screenToShow;
  });
}

function quitToDifficulty() {
  stopTimer();
  clearTimeout(flipTimeoutId);
  flipTimeoutId = null;
  firstCard = null;
  secondCard = null;
  lockBoard = false;
  renderLeaderboard();
  showScreen(difficultyScreen);
}

function chooseDifficulty(difficulty) {
  currentDifficulty = difficulty;
  currentPairCount = { superEasy: 4, easy: 8, normal: 12, hard: 16 }[difficulty];
  updateBestScore();
  showScreen(gameScreen);
  startNewGame();
}

playButton.addEventListener("click", () => {
  renderLeaderboard();
  showScreen(difficultyScreen);
});
backButton.addEventListener("click", () => showScreen(startScreen));
difficultyQuitButton.addEventListener("click", () => showScreen(startScreen));
difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => chooseDifficulty(button.dataset.difficulty));
});
newGameButton.addEventListener("click", startNewGame);
quitButton.addEventListener("click", quitToDifficulty);
playAgainButton.addEventListener("click", () => {
  winDialog.close();
  startNewGame();
});

showScreen(startScreen);
