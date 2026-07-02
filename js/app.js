(function () {
  const statusEl = document.getElementById("data-status");
  const countEl = document.getElementById("word-count");
  const cardEl = document.getElementById("word-card");
  const homeScreen = document.getElementById("home-screen");
  const practiceScreen = document.getElementById("practice-screen");
  const resultScreen = document.getElementById("result-screen");
  const startPracticeBtn = document.getElementById("start-practice");
  const progressLabel = document.getElementById("progress-label");
  const speakWordBtn = document.getElementById("speak-word");
  const markKnownBtn = document.getElementById("mark-known");
  const markUnknownBtn = document.getElementById("mark-unknown");
  const resultTotalEl = document.getElementById("result-total");
  const resultKnownEl = document.getElementById("result-known");
  const resultUnknownEl = document.getElementById("result-unknown");
  const nextRoundBtn = document.getElementById("next-round");
  const repeatRoundBtn = document.getElementById("repeat-round");
  const returnHomeBtn = document.getElementById("return-home");
  const resultNoteEl = document.getElementById("result-note");
  const progressStatusEl = document.getElementById("progress-status");
  const resetProgressBtn = document.getElementById("reset-progress");

  const vocabulary = window.VOCABULARY_DATA || [];
  const STORAGE_KEY = "englishVocabularyPracticeProgress:v1";
  const state = {
    roundWords: [],
    currentIndex: 0,
    knownCount: 0,
    unknownCount: 0,
    nextStartIndex: 0
  };

  function initialize() {
    if (!Array.isArray(vocabulary) || vocabulary.length === 0) {
      statusEl.textContent = "字庫載入失敗：沒有可用單字。";
      startPracticeBtn.disabled = true;
      cardEl.innerHTML = '<p class="empty-state">找不到單字資料。</p>';
      return;
    }

    statusEl.textContent = `字庫已載入：${vocabulary.length} 個單字。`;
    countEl.textContent = `${vocabulary.length} words`;
    state.roundWords = vocabulary.slice(0, 10);
    updateHomeProgress();
    bindEvents();
  }

  function bindEvents() {
    startPracticeBtn.addEventListener("click", startPractice);
    speakWordBtn.addEventListener("click", function () {
      const current = state.roundWords[state.currentIndex];
      if (current) {
        speakWord(current.word);
      }
    });
    markKnownBtn.addEventListener("click", function () {
      handleAnswer("known");
    });
    markUnknownBtn.addEventListener("click", function () {
      handleAnswer("unknown");
    });
    nextRoundBtn.addEventListener("click", startNextRound);
    repeatRoundBtn.addEventListener("click", repeatRound);
    returnHomeBtn.addEventListener("click", returnHome);
    resetProgressBtn.addEventListener("click", resetProgress);
  }

  function startPractice() {
    state.nextStartIndex = getSavedStartIndex();
    state.roundWords = getRoundWords(state.nextStartIndex);
    state.nextStartIndex = getNextStartIndex(state.nextStartIndex);
    beginRound();
  }

  function beginRound() {
    state.currentIndex = 0;
    state.knownCount = 0;
    state.unknownCount = 0;
    renderCurrentWord();
    showScreen(practiceScreen);
  }

  function startNextRound() {
    state.roundWords = getRoundWords(state.nextStartIndex);
    state.nextStartIndex = getNextStartIndex(state.nextStartIndex);
    beginRound();
  }

  function repeatRound() {
    beginRound();
  }

  function returnHome() {
    updateHomeProgress();
    showScreen(homeScreen);
  }

  function resetProgress() {
    saveProgress(0);
    state.nextStartIndex = 0;
    updateHomeProgress();
  }

  function getRoundWords(startIndex) {
    const round = [];
    for (let i = 0; i < 10; i += 1) {
      round.push(vocabulary[(startIndex + i) % vocabulary.length]);
    }
    return round;
  }

  function getNextStartIndex(currentStartIndex) {
    return (currentStartIndex + 10) % vocabulary.length;
  }

  function handleAnswer(result) {
    if (result === "known") {
      state.knownCount += 1;
    } else {
      state.unknownCount += 1;
    }

    state.currentIndex += 1;
    if (state.currentIndex >= state.roundWords.length) {
      showResult();
      return;
    }

    renderCurrentWord();
  }

  function speakWord(word) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      speakWordBtn.textContent = "此瀏覽器不支援發音";
      speakWordBtn.disabled = true;
      return;
    }

    const cleanWord = String(word || "").trim();
    if (!cleanWord) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    utterance.pitch = 1;

    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    speakWordBtn.textContent = "播放中...";
    utterance.onend = restoreSpeakButtonLabel;
    utterance.onerror = restoreSpeakButtonLabel;
    window.speechSynthesis.speak(utterance);
  }

  function pickEnglishVoice() {
    const voices = window.speechSynthesis.getVoices();
    return voices.find(function (voice) {
      return voice.lang === "en-US";
    }) || voices.find(function (voice) {
      return voice.lang && voice.lang.toLowerCase().startsWith("en");
    }) || null;
  }

  function restoreSpeakButtonLabel() {
    speakWordBtn.textContent = "發音 / 重播";
  }

  function renderCurrentWord() {
    const current = state.roundWords[state.currentIndex];
    if (!current) {
      cardEl.innerHTML = '<p class="empty-state">這一輪沒有可顯示的單字。</p>';
      return;
    }

    progressLabel.textContent = `${state.currentIndex + 1} / ${state.roundWords.length}`;
    cardEl.innerHTML = `
      <div class="word-card-top">
        <div class="word-primary">
          <div class="word-line">
            <div class="word">${escapeHtml(current.word)}</div>
            <div class="meta">${escapeHtml(current.partOfSpeech)} · ${escapeHtml(current.categoryZh)}</div>
          </div>
          <p class="placeholder definition-block"><span class="field-label">English definition</span><strong>${escapeHtml(current.englishDefinition || "待補充")}</strong></p>
        </div>
        <div class="word-summary">
          <div class="meaning">${escapeHtml(current.chineseMeaning)}</div>
          <p class="phonics-hint"><span class="field-label">Sound chunks</span>${escapeHtml(current.phonicsHint || "待補充")}</p>
        </div>
      </div>
      <p class="placeholder phrase-block"><span class="field-label">Common phrase</span>${escapeHtml(current.phrase || "待補充")}</p>
      <p class="placeholder example-block"><span class="field-label">Example sentence</span><strong>${escapeHtml(current.exampleSentence || "待補充")}</strong></p>
    `;
  }

  function showResult() {
    saveProgress(state.nextStartIndex);
    resultTotalEl.textContent = String(state.roundWords.length);
    resultKnownEl.textContent = String(state.knownCount);
    resultUnknownEl.textContent = String(state.unknownCount);
    resultNoteEl.textContent = `下一輪將從第 ${state.nextStartIndex + 1} 個單字開始；進度已保存在這台裝置，也可以重複本輪 10 題。`;
    showScreen(resultScreen);
  }

  function updateHomeProgress() {
    const savedStartIndex = getSavedStartIndex();
    const hasProgress = savedStartIndex > 0;
    if (hasProgress) {
      progressStatusEl.textContent = `已記住進度：下次從第 ${savedStartIndex + 1} 個單字開始。`;
      startPracticeBtn.textContent = "從上次進度繼續";
      resetProgressBtn.classList.remove("is-hidden");
      return;
    }

    progressStatusEl.textContent = "尚未保存進度。完成一輪後會自動記住下一輪起點。";
    startPracticeBtn.textContent = "開始練習";
    resetProgressBtn.classList.add("is-hidden");
  }

  function getSavedStartIndex() {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return 0;
      }

      const saved = JSON.parse(rawValue);
      const nextStartIndex = Number(saved.nextStartIndex);
      if (Number.isInteger(nextStartIndex) && nextStartIndex >= 0 && nextStartIndex < vocabulary.length) {
        return nextStartIndex;
      }
    } catch (error) {
      return 0;
    }

    return 0;
  }

  function saveProgress(nextStartIndex) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        nextStartIndex,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      progressStatusEl.textContent = "此瀏覽器無法保存進度；下次打開可能需要重新開始。";
    }
  }

  function showScreen(screenToShow) {
    [homeScreen, practiceScreen, resultScreen].forEach(function (screen) {
      const isTarget = screen === screenToShow;
      screen.classList.toggle("is-active", isTarget);
      if (isTarget) {
        screen.removeAttribute("aria-hidden");
      } else {
        screen.setAttribute("aria-hidden", "true");
      }
    });

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  initialize();
})();
