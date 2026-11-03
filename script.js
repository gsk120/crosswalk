/**
 * 🚦 신호등을 건너라! (Cross the Traffic Light!)
 * 단계별 스테이지 시스템(Stage 1~4 + Stage 5 무한 마스터 모드) 포함 Vanilla JS
 */

// --- 상수 및 설정 ---
const INITIAL_TIME = 60;      // 기본 제한 시간 60초
const MAX_MISTAKES = 3;       // 최대 허용 실수 3회
const STAGE_CLEAR_BONUS = 50; // 스테이지 클리어 보너스 점수
const STAGE_CLEAR_TIME = 10;  // 스테이지 클리어 추가 시간(+10초)
const STORAGE_KEY = 'trafficGameBestScore_v1';

// --- 5단계 스테이지 구성 데이터 ---
const STAGES = [
  {
    stage: 1,
    badge: 'STAGE 1',
    name: '🏡 집 앞 골목길',
    goal: 3, // 안전 횡단 3회 성공 시 클리어
    themeClass: 'theme-stage-1',
    buildings: '🏡 🌳 🏠 🌳 🏡',
    skyIcons: ['☁️', '☀️'],
    rain: false,
    redRange: [1200, 2100],
    yellowChance: 0,      // Stage 1은 노란불 없이 빨간불/초록불만 등장
    fakeRedChance: 0,
    greenRange: [1300, 1850]
  },
  {
    stage: 2,
    badge: 'STAGE 2',
    name: '🏪 번화가 사거리',
    goal: 4, // 안전 횡단 4회 성공 시 클리어
    themeClass: 'theme-stage-2',
    buildings: '🏪 🏢 🌳 🏬 🏪',
    skyIcons: ['☁️', '☁️'],
    rain: false,
    redRange: [1200, 2400],
    yellowChance: 0.65,   // 노란불 본격 등장
    fakeRedChance: 0.25,  // 노란불 뒤 다시 빨간불로 가는 속임수(페이크)
    greenRange: [1100, 1600]
  },
  {
    stage: 3,
    badge: 'STAGE 3',
    name: '🌇 학원가 저녁길',
    goal: 4, // 안전 횡단 4회 성공 시 클리어
    themeClass: 'theme-stage-3',
    buildings: '🏫 🌇 🏢 🌳 🏫',
    skyIcons: ['🌥️', '🐦'],
    rain: false,
    redRange: [1000, 2200],
    yellowChance: 0.7,
    fakeRedChance: 0.3,
    greenRange: [920, 1380] // 초록불 유지 시간이 짧아짐
  },
  {
    stage: 4,
    badge: 'STAGE 4',
    name: '🌧️ 비 오는 밤길',
    goal: 5, // 안전 횡단 5회 성공 시 클리어
    themeClass: 'theme-stage-4',
    buildings: '🏢 🏮 🏦 🏮 🏠',
    skyIcons: ['🌧️', '⚡'],
    rain: true,
    redRange: [950, 2100],
    yellowChance: 0.75,
    fakeRedChance: 0.35,
    greenRange: [820, 1250]
  },
  {
    stage: 5,
    badge: 'MASTER',
    name: '🏆 교통안전 마스터',
    goal: Infinity, // 무한 챌린지 모드 (남은 시간/하트 소진까지 최고 점수 도전)
    themeClass: 'theme-stage-5',
    buildings: '🎡 🏙️ 🗼 🏙️ 🎠',
    skyIcons: ['🌟', '🌙'],
    rain: false,
    redRange: [850, 1950],
    yellowChance: 0.75,
    fakeRedChance: 0.35,
    greenRange: [760, 1180]
  }
];

// 교통안전 교육 팁 목록
const SAFETY_TIPS = [
  '초록불이 켜져도 좌우를 살피며 차가 완전히 멈췄는지 확인하고 건너요!',
  '초록불이 깜빡이기 시작하면 무리해서 뛰지 말고 다음 신호를 기다려요!',
  '횡단보도를 건널 때는 스마트폰이나 이어폰을 보지 않고 앞을 보고 걸어요!',
  '빨간불과 노란불일 때는 차가 오지 않더라도 절대 길을 건너지 않기로 약속해요!',
  '비 오는 날이나 밤길에는 운전자 눈에 잘 띄도록 밝은 옷을 입고 더 주의해요!'
];

// --- 게임 상태 변수 ---
let score = 0;
let combo = 0;
let maxCombo = 0;
let mistakes = 0;
let successCount = 0;
let timeLeft = INITIAL_TIME;
let bestScore = 0;

let currentStageIndex = 0; // 0(Stage 1) ~ 4(Stage 5)
let stageProgress = 0;     // 현재 스테이지에서 성공한 횡단 횟수

let lightState = 'red'; // 'red' | 'yellow' | 'green'
let hasCrossedThisGreen = false;
let isGameRunning = false;
let isStageTransitioning = false;
let selectedChar = '🧒';
let soundEnabled = true;

// 타이머 ID 관리
let gameTimerInterval = null;
let lightCycleTimeout = null;
let blinkHintTimeout = null;
let feedbackTimeout = null;
let charResetTimeout = null;
let stageModalTimeout = null;

// --- DOM 요소 참조 ---
const screens = {
  start: document.getElementById('start-screen'),
  game: document.getElementById('game-screen'),
  result: document.getElementById('result-screen')
};

const appContainer = document.getElementById('app-container');
const soundToggleBtn = document.getElementById('sound-toggle-btn');

// 시작 화면 DOM
const startBestScoreEl = document.getElementById('start-best-score');
const startBtn = document.getElementById('start-btn');
const charOptions = document.getElementById('character-options');

// 게임 화면 DOM
const timeDisplayEl = document.getElementById('time-display');
const timeBoxEl = document.querySelector('.time-box');
const timerBarEl = document.getElementById('timer-bar');
const scoreDisplayEl = document.getElementById('score-display');
const comboDisplayEl = document.getElementById('combo-display');
const mistakeCountEl = document.getElementById('mistake-count');
const heartsDisplayEl = document.getElementById('hearts-display');

// 스테이지 UI DOM
const gameStageEl = document.getElementById('game-stage');
const stageBadgeEl = document.getElementById('stage-badge');
const stageTitleEl = document.getElementById('stage-title');
const stageGoalTextEl = document.getElementById('stage-goal-text');
const stageDotsEl = document.getElementById('stage-dots');
const skyIcon1El = document.getElementById('sky-icon-1');
const skyIcon2El = document.getElementById('sky-icon-2');
const rainLayerEl = document.getElementById('rain-layer');
const stageBuildingsEl = document.getElementById('stage-buildings');

const stageClearModalEl = document.getElementById('stage-clear-modal');
const stageClearTitleEl = document.getElementById('stage-clear-title');
const stageClearBonusEl = document.getElementById('stage-clear-bonus');
const stageClearNextEl = document.getElementById('stage-clear-next');

const lightRedEl = document.getElementById('light-red');
const lightYellowEl = document.getElementById('light-yellow');
const lightGreenEl = document.getElementById('light-green');
const lightStatusTextEl = document.getElementById('light-status-text');

const feedbackBannerEl = document.getElementById('feedback-banner');
const playerCharacterEl = document.getElementById('player-character');
const charEmojiEl = document.getElementById('char-emoji');
const charBubbleEl = document.getElementById('char-bubble');
const passingCarEl = document.getElementById('passing-car');
const crossBtn = document.getElementById('cross-btn');

// 결과 화면 DOM
const resultEmojiEl = document.getElementById('result-emoji');
const resultTitleEl = document.getElementById('result-title');
const resultSubtitleEl = document.getElementById('result-subtitle');
const newRecordBadgeEl = document.getElementById('new-record-badge');
const finalScoreEl = document.getElementById('final-score');
const finalStageReachedEl = document.getElementById('final-stage-reached');
const finalMaxComboEl = document.getElementById('final-max-combo');
const finalSuccessCountEl = document.getElementById('final-success-count');
const finalMistakesEl = document.getElementById('final-mistakes');
const finalBestScoreEl = document.getElementById('final-best-score');
const safetyTipTextEl = document.getElementById('safety-tip-text');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

// --- Web Audio API 효과음 생성기 ---
let audioCtx = null;

function playSound(type) {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'stageclear') {
      // 스테이지 클리어 팡파레
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);       // C5
      osc.frequency.setValueAtTime(659.25, now + 0.09); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.18); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.27); // C6
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === 'mistake') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.setValueAtTime(140, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'green') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'gameover') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(349.23, now + 0.15);
      osc.frequency.setValueAtTime(261.63, now + 0.3);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch (e) {
    // 오디오 제한 시 무시
  }
}

// --- 초기화 및 로컬 스토리지 로드 ---
function initApp() {
  loadBestScore();
  bindEvents();
}

function loadBestScore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  bestScore = saved ? parseInt(saved, 10) || 0 : 0;
  startBestScoreEl.textContent = bestScore;
}

function saveBestScore(newScore) {
  if (newScore > bestScore) {
    bestScore = newScore;
    localStorage.setItem(STORAGE_KEY, String(bestScore));
    startBestScoreEl.textContent = bestScore;
    return true;
  }
  return false;
}

function showScreen(screenName) {
  Object.values(screens).forEach((sec) => sec.classList.remove('active'));
  screens[screenName].classList.add('active');
}

function clearAllTimers() {
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  if (lightCycleTimeout) clearTimeout(lightCycleTimeout);
  if (blinkHintTimeout) clearTimeout(blinkHintTimeout);
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  if (charResetTimeout) clearTimeout(charResetTimeout);
  if (stageModalTimeout) clearTimeout(stageModalTimeout);

  gameTimerInterval = null;
  lightCycleTimeout = null;
  blinkHintTimeout = null;
  feedbackTimeout = null;
  charResetTimeout = null;
  stageModalTimeout = null;
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getCurrentStageConfig() {
  return STAGES[currentStageIndex];
}

// --- 스테이지 테마 및 진행도 UI 적용 ---
function applyStageTheme() {
  const cfg = getCurrentStageConfig();

  // 배경 테마 클래스 교체
  STAGES.forEach((s) => gameStageEl.classList.remove(s.themeClass));
  gameStageEl.classList.add(cfg.themeClass);

  // 상단 스테이지 배지 & 이름
  stageBadgeEl.textContent = cfg.badge;
  if (cfg.stage === 5) {
    stageBadgeEl.classList.add('master');
  } else {
    stageBadgeEl.classList.remove('master');
  }
  stageTitleEl.textContent = cfg.name;

  // 하늘 아이콘, 비 효과, 배경 건물 변경
  skyIcon1El.textContent = cfg.skyIcons[0];
  skyIcon2El.textContent = cfg.skyIcons[1];
  if (cfg.rain) {
    rainLayerEl.classList.remove('hidden');
  } else {
    rainLayerEl.classList.add('hidden');
  }
  stageBuildingsEl.textContent = cfg.buildings;

  updateStageProgressUI();
}

function updateStageProgressUI() {
  const cfg = getCurrentStageConfig();

  if (cfg.goal === Infinity) {
    stageGoalTextEl.textContent = `무한 최고점 도전! (${stageProgress}회)`;
    stageDotsEl.innerHTML = '';
    return;
  }

  stageGoalTextEl.textContent = `목표 ${stageProgress} / ${cfg.goal}회`;
  stageDotsEl.innerHTML = '';

  for (let i = 0; i < cfg.goal; i++) {
    const dot = document.createElement('span');
    dot.className = 'goal-dot' + (i < stageProgress ? ' filled' : '');
    stageDotsEl.appendChild(dot);
  }
}

// --- 게임 시작 ---
function startGame() {
  clearAllTimers();

  score = 0;
  combo = 0;
  maxCombo = 0;
  mistakes = 0;
  successCount = 0;
  timeLeft = INITIAL_TIME;

  currentStageIndex = 0;
  stageProgress = 0;

  isGameRunning = true;
  isStageTransitioning = false;
  hasCrossedThisGreen = false;

  charEmojiEl.textContent = selectedChar;
  charBubbleEl.textContent = '신호를 봐요!';
  playerCharacterEl.classList.remove('crossing', 'hurt');
  feedbackBannerEl.classList.remove('show', 'success', 'danger', 'miss');
  stageClearModalEl.classList.remove('show');
  timeBoxEl.classList.remove('urgent');

  applyStageTheme();
  updateHUD();
  updateTimerBar();
  showScreen('game');

  setTrafficLight('red');
  scheduleNextLight('red');

  // 1초마다 감소하는 전체 제한 시간 타이머
  gameTimerInterval = setInterval(() => {
    if (!isGameRunning || isStageTransitioning) return;
    timeLeft -= 1;
    updateHUD();
    updateTimerBar();

    if (timeLeft <= 10) {
      timeBoxEl.classList.add('urgent');
    } else {
      timeBoxEl.classList.remove('urgent');
    }

    if (timeLeft <= 0) {
      endGame('timeup');
    }
  }, 1000);
}

// --- 상단 상태바(HUD) 업데이트 ---
function updateHUD() {
  timeDisplayEl.textContent = Math.max(0, timeLeft);
  scoreDisplayEl.textContent = score;
  comboDisplayEl.textContent = combo;
  mistakeCountEl.textContent = mistakes;

  const remainingLives = Math.max(0, MAX_MISTAKES - mistakes);
  const fullHearts = '❤️'.repeat(remainingLives);
  const emptyHearts = '🖤'.repeat(MAX_MISTAKES - remainingLives);
  heartsDisplayEl.textContent = fullHearts + emptyHearts;
}

function updateTimerBar() {
  const percent = Math.min(100, Math.max(0, (timeLeft / INITIAL_TIME) * 100));
  timerBarEl.style.width = `${percent}%`;
  if (timeLeft <= 10) {
    timerBarEl.style.background = '#ef4444';
  } else if (timeLeft <= 25) {
    timerBarEl.style.background = '#f59e0b';
  } else {
    timerBarEl.style.background = 'linear-gradient(90deg, #2ecc71, #3498db)';
  }
}

// --- 신호등 상태 설정 및 시각 효과 ---
function setTrafficLight(state) {
  lightState = state;
  lightRedEl.classList.remove('active');
  lightYellowEl.classList.remove('active');
  lightGreenEl.classList.remove('active', 'blinking');
  lightStatusTextEl.classList.remove('state-red', 'state-yellow', 'state-green');

  if (state === 'red') {
    lightRedEl.classList.add('active');
    lightStatusTextEl.textContent = '🛑 빨간불! 멈춰서 기다려요';
    lightStatusTextEl.classList.add('state-red');
    charBubbleEl.textContent = '기다려요 👀';
    triggerPassingCar();
  } else if (state === 'yellow') {
    lightYellowEl.classList.add('active');
    lightStatusTextEl.textContent = '⚠️ 노란불! 아직 건너지 마세요';
    lightStatusTextEl.classList.add('state-yellow');
    charBubbleEl.textContent = '준비... ✋';
  } else if (state === 'green') {
    hasCrossedThisGreen = false;
    lightGreenEl.classList.add('active');
    lightStatusTextEl.textContent = '🚶 초록불! 지금 건너세요!';
    lightStatusTextEl.classList.add('state-green');
    charBubbleEl.textContent = '지금이야! 🏃';
    playSound('green');
  }
}

function triggerPassingCar() {
  const cars = ['🚗', '🚕', '🚌', '🚙', '🚚'];
  passingCarEl.textContent = cars[Math.floor(Math.random() * cars.length)];
  passingCarEl.classList.remove('drive');
  void passingCarEl.offsetWidth;
  passingCarEl.classList.add('drive');
}

// --- 스테이지별 신호등 주기 스케줄러 ---
function scheduleNextLight(currentState) {
  if (!isGameRunning || isStageTransitioning) return;
  if (lightCycleTimeout) clearTimeout(lightCycleTimeout);
  if (blinkHintTimeout) clearTimeout(blinkHintTimeout);

  const cfg = getCurrentStageConfig();

  if (currentState === 'red') {
    const duration = randomBetween(cfg.redRange[0], cfg.redRange[1]);
    lightCycleTimeout = setTimeout(() => {
      if (!isGameRunning || isStageTransitioning) return;
      if (Math.random() < cfg.yellowChance) {
        setTrafficLight('yellow');
        scheduleNextLight('yellow');
      } else {
        setTrafficLight('green');
        scheduleNextLight('green');
      }
    }, duration);
  } else if (currentState === 'yellow') {
    const duration = randomBetween(580, 1020);
    lightCycleTimeout = setTimeout(() => {
      if (!isGameRunning || isStageTransitioning) return;
      // 스테이지별 속임수(페이크) 확률에 따라 다시 빨간불로 전환
      if (Math.random() < cfg.fakeRedChance) {
        setTrafficLight('red');
        scheduleNextLight('red');
      } else {
        setTrafficLight('green');
        scheduleNextLight('green');
      }
    }, duration);
  } else if (currentState === 'green') {
    const greenDuration = randomBetween(cfg.greenRange[0], cfg.greenRange[1]);

    blinkHintTimeout = setTimeout(() => {
      if (isGameRunning && !isStageTransitioning && lightState === 'green') {
        lightGreenEl.classList.add('blinking');
      }
    }, Math.max(260, greenDuration - 360));

    lightCycleTimeout = setTimeout(() => {
      if (!isGameRunning || isStageTransitioning) return;
      if (!hasCrossedThisGreen) {
        handleMissedGreen();
      }
      setTrafficLight('red');
      scheduleNextLight('red');
    }, greenDuration);
  }
}

function handleMissedGreen() {
  if (combo > 0) {
    combo = 0;
    updateHUD();
    showFeedback('⏰ 신호를 놓쳤어요! (콤보 초기화)', 'miss');
  } else {
    showFeedback('⏰ 초록불에 버튼을 눌러보세요!', 'miss');
  }
  charBubbleEl.textContent = '놓쳤다! 😮';
}

// --- 스테이지 승급 처리 ---
function advanceStage() {
  const clearedStage = getCurrentStageConfig();
  isStageTransitioning = true;

  if (lightCycleTimeout) clearTimeout(lightCycleTimeout);
  if (blinkHintTimeout) clearTimeout(blinkHintTimeout);

  // 클리어 보상 지급 (+50점, +10초)
  score += STAGE_CLEAR_BONUS;
  timeLeft += STAGE_CLEAR_TIME;
  currentStageIndex = Math.min(STAGES.length - 1, currentStageIndex + 1);
  stageProgress = 0;

  const nextStage = getCurrentStageConfig();
  playSound('stageclear');

  // 스테이지 클리어 모달 표시
  if (clearedStage.stage === 4) {
    stageClearTitleEl.textContent = '👑 모든 정규 스테이지 클리어!';
    stageClearBonusEl.textContent = `보너스 +${STAGE_CLEAR_BONUS}점 | 시간 +${STAGE_CLEAR_TIME}초 ⏱️`;
    stageClearNextEl.textContent = '🏆 교통안전 마스터 (무한 최고점 도전!) 시작!';
  } else {
    stageClearTitleEl.textContent = `🎉 STAGE ${clearedStage.stage} CLEAR!`;
    stageClearBonusEl.textContent = `보너스 +${STAGE_CLEAR_BONUS}점 | 시간 +${STAGE_CLEAR_TIME}초 ⏱️`;
    stageClearNextEl.textContent = `다음: ${nextStage.name}`;
  }

  stageClearModalEl.classList.add('show');
  applyStageTheme();
  updateHUD();
  updateTimerBar();

  stageModalTimeout = setTimeout(() => {
    stageClearModalEl.classList.remove('show');
    isStageTransitioning = false;
    if (isGameRunning) {
      setTrafficLight('red');
      scheduleNextLight('red');
    }
  }, 1500);
}

// --- [건너기!] 버튼 입력 판정 ---
function handleCrossAttempt() {
  if (!isGameRunning || isStageTransitioning) return;

  crossBtn.classList.add('pressed');
  setTimeout(() => crossBtn.classList.remove('pressed'), 100);

  if (lightState === 'green') {
    if (hasCrossedThisGreen) return;
    hasCrossedThisGreen = true;

    const cfg = getCurrentStageConfig();

    // 1. 점수 및 콤보 계산 (기본 10점 + 콤보 보너스 + 스테이지5 추가 보너스)
    combo += 1;
    if (combo > maxCombo) maxCombo = combo;
    successCount += 1;
    stageProgress += 1;

    const comboBonus = combo > 1 ? combo * 2 : 0;
    const masterBonus = cfg.stage === 5 ? 5 : 0;
    const gained = 10 + comboBonus + masterBonus;
    score += gained;

    updateHUD();
    updateStageProgressUI();
    animateCharacterCross();

    // 2. 스테이지 목표 달성 여부 확인
    if (cfg.goal !== Infinity && stageProgress >= cfg.goal) {
      setTimeout(() => {
        if (isGameRunning) advanceStage();
      }, 360);
      return;
    }

    playSound('success');
    if (combo >= 3) {
      showFeedback(`🎉 안전 횡단! +${gained}점 (${combo}콤보🔥)`, 'success');
    } else {
      showFeedback(`✨ 안전하게 건넜어요! +${gained}점`, 'success');
    }

    // 3. 성공 후 다음 빨간불 신호로 전환
    if (lightCycleTimeout) clearTimeout(lightCycleTimeout);
    if (blinkHintTimeout) clearTimeout(blinkHintTimeout);

    lightCycleTimeout = setTimeout(() => {
      if (!isGameRunning || isStageTransitioning) return;
      setTrafficLight('red');
      scheduleNextLight('red');
    }, 430);

  } else {
    // 빨간불 또는 노란불에 누른 경우 -> 실수 처리!
    mistakes += 1;
    combo = 0;
    playSound('mistake');
    updateHUD();

    const reasonText =
      lightState === 'red'
        ? '🚨 위험해요! 빨간불엔 멈춰요! (-❤️)'
        : '⚠️ 노란불엔 건너지 않고 기다려요! (-❤️)';
    showFeedback(reasonText, 'danger');

    animateCharacterMistake();

    if (mistakes >= MAX_MISTAKES) {
      setTimeout(() => {
        if (isGameRunning) endGame('mistakes');
      }, 380);
    }
  }
}

// --- 캐릭터 애니메이션 & 피드백 연출 ---
function animateCharacterCross() {
  charBubbleEl.textContent = '안전하게 건너요! 🎵';
  playerCharacterEl.classList.remove('hurt');
  playerCharacterEl.classList.add('crossing');

  if (charResetTimeout) clearTimeout(charResetTimeout);
  charResetTimeout = setTimeout(() => {
    playerCharacterEl.style.transition = 'none';
    playerCharacterEl.classList.remove('crossing');
    void playerCharacterEl.offsetWidth;
    playerCharacterEl.style.transition = '';
  }, 400);
}

function animateCharacterMistake() {
  charBubbleEl.textContent = '앗, 위험해! 😱';
  playerCharacterEl.classList.remove('hurt');
  void playerCharacterEl.offsetWidth;
  playerCharacterEl.classList.add('hurt');

  appContainer.classList.remove('shake');
  void appContainer.offsetWidth;
  appContainer.classList.add('shake');

  triggerPassingCar();
}

function showFeedback(message, type) {
  if (feedbackTimeout) clearTimeout(feedbackTimeout);
  feedbackBannerEl.textContent = message;
  feedbackBannerEl.className = `feedback-banner show ${type}`;

  feedbackTimeout = setTimeout(() => {
    feedbackBannerEl.classList.remove('show');
  }, 1050);
}

// --- 게임 종료 및 결과 화면 표시 ---
function endGame(reason) {
  isGameRunning = false;
  isStageTransitioning = false;
  clearAllTimers();
  playSound('gameover');

  const isNewRecord = saveBestScore(score);
  const reachedCfg = getCurrentStageConfig();

  if (reason === 'mistakes') {
    resultEmojiEl.textContent = '🚑';
    resultTitleEl.textContent = '앗, 신호를 잘 살펴봐요!';
    resultSubtitleEl.textContent = '빨간불과 노란불에는 꼭 멈춰서 기다려야 해요.';
  } else if (reachedCfg.stage === 5) {
    resultEmojiEl.textContent = '👑';
    resultTitleEl.textContent = '교통안전 마스터 달성!';
    resultSubtitleEl.textContent = '모든 스테이지를 클리어하고 최고 기록에 도전했어요!';
  } else {
    resultEmojiEl.textContent = '🏅';
    resultTitleEl.textContent = '안전하게 도착했어요!';
    resultSubtitleEl.textContent = '시간 동안 침착하게 신호를 잘 지켰어요!';
  }

  if (isNewRecord && score > 0) {
    newRecordBadgeEl.classList.remove('hidden');
  } else {
    newRecordBadgeEl.classList.add('hidden');
  }

  // 최종 도달 스테이지 표시
  if (reachedCfg.stage === 5) {
    finalStageReachedEl.textContent = '도달: 🏆 교통안전 마스터 (전 스테이지 올클리어!)';
  } else {
    finalStageReachedEl.textContent = `도달: Stage ${reachedCfg.stage} (${reachedCfg.name})`;
  }

  finalScoreEl.textContent = `${score}점`;
  finalMaxComboEl.textContent = `${maxCombo}연속 🔥`;
  finalSuccessCountEl.textContent = `${successCount}회 🚶`;
  finalMistakesEl.textContent = `${mistakes}회 ⚠️`;
  finalBestScoreEl.textContent = `${bestScore}점 🏆`;

  const randomTip = SAFETY_TIPS[Math.floor(Math.random() * SAFETY_TIPS.length)];
  safetyTipTextEl.textContent = randomTip;

  showScreen('result');
}

// --- 이벤트 리스너 등록 ---
function bindEvents() {
  startBtn.addEventListener('click', startGame);
  restartBtn.addEventListener('click', startGame);

  homeBtn.addEventListener('click', () => {
    clearAllTimers();
    isGameRunning = false;
    loadBestScore();
    showScreen('start');
  });

  charOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.char-btn');
    if (!btn) return;
    document.querySelectorAll('.char-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedChar = btn.dataset.char || '🧒';
    document.querySelector('.hero-character').textContent = selectedChar;
  });

  crossBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handleCrossAttempt();
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (isGameRunning) {
        e.preventDefault();
        handleCrossAttempt();
      }
    }
  });

  soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
  });
}

initApp();
