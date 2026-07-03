(function () {
  const statusEl = document.getElementById("data-status");
  const cardEl = document.getElementById("word-card");
  const homeScreen = document.getElementById("home-screen");
  const practiceScreen = document.getElementById("practice-screen");
  const resultScreen = document.getElementById("result-screen");
  const categoryListEl = document.getElementById("category-list");
  const selectedCategorySummaryEl = document.getElementById("selected-category-summary");
  const missionOptionsEl = document.getElementById("mission-options");
  const startPracticeBtn = document.getElementById("start-practice");
  const practiceTitleEl = document.getElementById("practice-title");
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
  const reviewSummaryEl = document.getElementById("review-summary");
  const startReviewBtn = document.getElementById("start-review");

  const vocabulary = window.VOCABULARY_DATA || [];
  const STORAGE_KEY = "englishVocabularyPracticeProgress:v1";
  const PROGRESS_SCHEMA_VERSION = 2;
  const MISSION_SIZE_OPTIONS = [10, 20, 30];
  const REVIEW_MISSION_SIZE = 10;
  const state = {
    categories: [],
    wordById: new Map(),
    selectedCategoryKey: "",
    selectedMissionSize: null,
    practiceMode: "category",
    roundWords: [],
    currentIndex: 0,
    knownCount: 0,
    unknownCount: 0,
    roundResults: [],
    currentRoundStartIndex: 0,
    activeAudio: null,
    progress: {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      categories: {},
      words: {}
    }
  };

  function initialize() {
    if (!Array.isArray(vocabulary) || vocabulary.length === 0) {
      statusEl.textContent = "字庫載入失敗：沒有可用單字。";
      startPracticeBtn.disabled = true;
      cardEl.innerHTML = '<p class="empty-state">找不到單字資料。</p>';
      return;
    }

    state.categories = buildCategories(vocabulary);
    state.wordById = buildWordMap(vocabulary);
    state.progress = loadProgress();
    statusEl.textContent = `字庫已載入：${vocabulary.length} 個單字。`;
    renderCategoryList();
    renderMissionOptions();
    updateHomeProgress();
    updateReviewPanel();
    bindEvents();
  }

  function bindEvents() {
    startPracticeBtn.addEventListener("click", startPractice);
    speakWordBtn.addEventListener("click", function () {
      const current = state.roundWords[state.currentIndex];
      if (current) {
        playPronunciation(current, "word", { auto: false });
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
    startReviewBtn.addEventListener("click", startReview);
  }

  function startPractice() {
    const category = getSelectedCategory();
    if (!category || state.selectedMissionSize === null) {
      return;
    }

    state.practiceMode = "category";
    const progress = getCategoryProgress(category.key);
    state.currentRoundStartIndex = progress.nextStartIndex;
    state.roundWords = getRoundWords(category, progress.nextStartIndex, state.selectedMissionSize);
    if (state.roundWords.length === 0) {
      updateHomeProgress();
      return;
    }

    beginRound();
  }

  function startReview() {
    const reviewWords = getReviewWords(new Date()).slice(0, REVIEW_MISSION_SIZE);
    if (reviewWords.length === 0) {
      updateReviewPanel();
      return;
    }

    state.practiceMode = "review";
    state.currentRoundStartIndex = 0;
    state.roundWords = reviewWords;
    beginRound();
  }

  function beginRound() {
    state.currentIndex = 0;
    state.knownCount = 0;
    state.unknownCount = 0;
    state.roundResults = [];
    updatePracticeTitle();
    renderCurrentWord();
    showScreen(practiceScreen);
  }

  function startNextRound() {
    if (state.practiceMode === "review") {
      startReview();
      return;
    }

    const category = getSelectedCategory();
    if (!category || state.selectedMissionSize === null) {
      returnHome();
      return;
    }

    const progress = getCategoryProgress(category.key);
    state.currentRoundStartIndex = progress.nextStartIndex;
    state.roundWords = getRoundWords(category, progress.nextStartIndex, state.selectedMissionSize);
    if (state.roundWords.length === 0) {
      returnHome();
      return;
    }

    beginRound();
  }

  function repeatRound() {
    beginRound();
  }

  function returnHome() {
    renderCategoryList();
    renderMissionOptions();
    updateHomeProgress();
    updateReviewPanel();
    showScreen(homeScreen);
  }

  function resetProgress() {
    state.progress = createEmptyProgress();
    saveProgress();
    renderCategoryList();
    renderMissionOptions();
    updateHomeProgress();
    updateReviewPanel();
  }

  function buildCategories(rows) {
    const categoryMap = new Map();
    rows.forEach(function (word) {
      const key = word.categoryEn || "Uncategorized";
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          key,
          nameEn: key,
          nameZh: word.categoryZh || "",
          words: []
        });
      }

      categoryMap.get(key).words.push(word);
    });

    return Array.from(categoryMap.values());
  }

  function buildWordMap(rows) {
    const wordMap = new Map();
    rows.forEach(function (word) {
      if (word.wordId) {
        wordMap.set(word.wordId, word);
      }
    });
    return wordMap;
  }

  function renderCategoryList() {
    categoryListEl.innerHTML = state.categories.map(function (category) {
      const progress = getCategoryProgress(category.key);
      const completedCount = Math.min(progress.completedCount, category.words.length);
      const progressWidth = category.words.length > 0 ? (completedCount / category.words.length) * 100 : 0;
      const isSelected = category.key === state.selectedCategoryKey;
      const isComplete = completedCount >= category.words.length;
      return `
        <button class="category-card${isSelected ? " is-selected" : ""}${isComplete ? " is-complete" : ""}" type="button" data-category-key="${escapeHtml(category.key)}" aria-pressed="${isSelected ? "true" : "false"}">
          <span class="category-title">
            <span>${escapeHtml(getCategoryDisplayName(category))}</span>
            <span class="category-count">${category.words.length}</span>
          </span>
          <span class="category-progress">${completedCount} / ${category.words.length} completed</span>
          <span class="category-meter" aria-hidden="true"><span style="--progress-width: ${progressWidth}%"></span></span>
        </button>
      `;
    }).join("");

    categoryListEl.querySelectorAll(".category-card").forEach(function (button) {
      button.addEventListener("click", function () {
        selectCategory(button.getAttribute("data-category-key"));
      });
    });
  }

  function selectCategory(categoryKey) {
    state.selectedCategoryKey = categoryKey || "";
    state.selectedMissionSize = getDefaultMissionSize(getSelectedCategory());
    renderCategoryList();
    renderMissionOptions();
    updateHomeProgress();
  }

  function getCategoryDisplayName(category) {
    if (!category.nameZh) {
      return category.nameEn;
    }

    return `${category.nameEn} | ${category.nameZh}`;
  }

  function renderMissionOptions() {
    const category = getSelectedCategory();
    if (!category) {
      selectedCategorySummaryEl.textContent = "尚未選擇分類。";
      missionOptionsEl.innerHTML = "";
      startPracticeBtn.disabled = true;
      startPracticeBtn.textContent = "開始練習";
      return;
    }

    const progress = getCategoryProgress(category.key);
    const remainingCount = getRemainingCount(category);
    if (remainingCount <= 0) {
      selectedCategorySummaryEl.textContent = `${category.nameEn} 已完成，共 ${category.words.length} 個字。`;
      missionOptionsEl.innerHTML = "";
      startPracticeBtn.disabled = true;
      startPracticeBtn.textContent = "分類已完成";
      return;
    }

    selectedCategorySummaryEl.textContent = `${category.nameEn} 還有 ${remainingCount} / ${category.words.length} 個字可練，下一題從第 ${progress.nextStartIndex + 1} 個字開始。`;
    const options = getMissionOptions(remainingCount);
    if (!options.some(function (option) { return option.value === state.selectedMissionSize; })) {
      state.selectedMissionSize = getDefaultMissionSize(category);
    }

    missionOptionsEl.innerHTML = options.map(function (option) {
      const isSelected = option.value === state.selectedMissionSize;
      return `
        <button class="mission-option${isSelected ? " is-selected" : ""}" type="button" data-mission-size="${escapeHtml(option.value)}" aria-pressed="${isSelected ? "true" : "false"}">
          ${escapeHtml(option.label)}
        </button>
      `;
    }).join("");

    missionOptionsEl.querySelectorAll(".mission-option").forEach(function (button) {
      button.addEventListener("click", function () {
        const rawValue = button.getAttribute("data-mission-size");
        state.selectedMissionSize = rawValue === "all" ? "all" : Number(rawValue);
        renderMissionOptions();
        updateHomeProgress();
      });
    });

    startPracticeBtn.disabled = state.selectedMissionSize === null;
    startPracticeBtn.textContent = "開始練習";
  }

  function getMissionOptions(remainingCount) {
    const options = MISSION_SIZE_OPTIONS
      .filter(function (size) {
        return remainingCount >= size;
      })
      .map(function (size) {
        return {
          label: `${size} 字`,
          value: size
        };
      });

    options.push({
      label: `全部 ${remainingCount} 字`,
      value: "all"
    });

    return options;
  }

  function getDefaultMissionSize(category) {
    if (!category) {
      return null;
    }

    const remainingCount = getRemainingCount(category);
    if (remainingCount <= 0) {
      return null;
    }

    return remainingCount >= 10 ? 10 : "all";
  }

  function getRoundWords(category, startIndex, missionSize) {
    const remainingWords = category.words.slice(startIndex);
    const requestedCount = missionSize === "all" ? remainingWords.length : Number(missionSize);
    const roundSize = Math.min(requestedCount, remainingWords.length);
    return remainingWords.slice(0, roundSize);
  }

  function handleAnswer(result) {
    const current = state.roundWords[state.currentIndex];
    if (current) {
      state.roundResults.push({
        wordId: current.wordId,
        result
      });
    }

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

  function playPronunciation(wordEntry, target, options) {
    const text = target === "sentence" ? wordEntry.exampleSentence : wordEntry.word;
    const audioSrc = getAudioSrc(wordEntry, target);
    const isAuto = Boolean(options && options.auto);
    stopActiveAudio();

    if (target === "word" && !isAuto) {
      speakWordBtn.textContent = "播放中...";
    }

    return playAudioFile(audioSrc)
      .catch(function () {
        return speakText(text);
      })
      .catch(function () {
        if (target === "word" && !isAuto) {
          speakWordBtn.textContent = "此瀏覽器不支援發音";
          speakWordBtn.disabled = true;
        }
      })
      .finally(function () {
        if (target === "word" && !isAuto && !speakWordBtn.disabled) {
          restoreSpeakButtonLabel();
        }
      });
  }

  function getAudioSrc(wordEntry, target) {
    const setId = wordEntry.vocabularySetId || "g6-p1-p2";
    const folder = target === "sentence" ? "sentences" : "words";
    const baseName = wordEntry.audioBaseName || createAudioBaseName(wordEntry);
    return `audio/${encodeURIComponent(setId)}/${folder}/${encodeURIComponent(baseName)}.mp3`;
  }

  function createAudioBaseName(wordEntry) {
    return String(wordEntry.wordId || wordEntry.word || "word")
      .replace(/^g6-p1-p2:/, "")
      .replace(/:/g, "-")
      .replace(/[^a-zA-Z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function playAudioFile(src) {
    return new Promise(function (resolve, reject) {
      if (typeof Audio === "undefined" || !src) {
        reject(new Error("Audio is unavailable."));
        return;
      }

      const audio = new Audio(src);
      state.activeAudio = audio;
      audio.addEventListener("ended", resolve, { once: true });
      audio.addEventListener("error", reject, { once: true });

      const result = audio.play();
      if (result && typeof result.catch === "function") {
        result.catch(reject);
      }
    });
  }

  function stopActiveAudio() {
    if (state.activeAudio) {
      state.activeAudio.pause();
      state.activeAudio.currentTime = 0;
      state.activeAudio = null;
    }

    if (!speakWordBtn.disabled) {
      restoreSpeakButtonLabel();
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  function speakText(text) {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      return Promise.reject(new Error("Speech synthesis is unavailable."));
    }

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return Promise.resolve();
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    utterance.pitch = 1;

    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }

    return new Promise(function (resolve, reject) {
      utterance.onend = resolve;
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
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
      <p class="placeholder example-block">
        <span class="field-label-row">
          <span class="field-label">Example sentence</span>
          <button class="sentence-audio-action" type="button" aria-label="播放例句" title="播放例句">🔊</button>
        </span>
        <strong>${escapeHtml(current.exampleSentence || "待補充")}</strong>
      </p>
    `;

    cardEl.querySelectorAll(".sentence-audio-action").forEach(function (button) {
      button.addEventListener("click", function () {
        playPronunciation(current, "sentence", { auto: false });
      });
    });

    playPronunciation(current, "word", { auto: true });
  }

  function showResult() {
    const category = getSelectedCategory();
    if (state.practiceMode === "category" && category) {
      const nextStartIndex = Math.min(state.currentRoundStartIndex + state.roundWords.length, category.words.length);
      state.progress.categories[category.key] = {
        nextStartIndex,
        completedCount: nextStartIndex,
        savedAt: new Date().toISOString()
      };
    }

    applyRoundMasteryResults(new Date().toISOString());
    saveProgress();

    resultTotalEl.textContent = String(state.roundWords.length);
    resultKnownEl.textContent = String(state.knownCount);
    resultUnknownEl.textContent = String(state.unknownCount);
    updateResultActions();
    showScreen(resultScreen);
  }

  function updateHomeProgress() {
    const completedCount = state.categories.reduce(function (total, category) {
      return total + Math.min(getCategoryProgress(category.key).completedCount, category.words.length);
    }, 0);
    const hasProgress = completedCount > 0;
    const totalCount = vocabulary.length;
    const selectedCategory = getSelectedCategory();

    if (selectedCategory) {
      const remainingCount = getRemainingCount(selectedCategory);
      if (remainingCount > 0 && state.selectedMissionSize !== null) {
        const roundSize = state.selectedMissionSize === "all" ? remainingCount : Math.min(Number(state.selectedMissionSize), remainingCount);
        progressStatusEl.textContent = `本次將練 ${selectedCategory.nameEn} 的 ${roundSize} 個字。總進度 ${completedCount} / ${totalCount}。`;
      } else {
        progressStatusEl.textContent = `${selectedCategory.nameEn} 已完成。總進度 ${completedCount} / ${totalCount}。`;
      }
    } else {
      progressStatusEl.textContent = hasProgress
        ? `已保存分類進度：總共完成 ${completedCount} / ${totalCount} 個字。`
        : "尚未保存進度。先選分類，再選本次字數。";
    }

    resetProgressBtn.classList.toggle("is-hidden", !hasProgress);
  }

  function updateReviewPanel() {
    const reviewWords = getReviewWords(new Date());
    const reviewCount = reviewWords.length;

    if (reviewCount > 0) {
      const missionCount = Math.min(reviewCount, REVIEW_MISSION_SIZE);
      reviewSummaryEl.textContent = `今日複習：${reviewCount} 個字待加強，本輪會先練 ${missionCount} 個。`;
      startReviewBtn.disabled = false;
      startReviewBtn.textContent = `開始複習 ${missionCount} 題`;
      return;
    }

    reviewSummaryEl.textContent = "今日沒有到期複習的字。";
    startReviewBtn.disabled = true;
    startReviewBtn.textContent = "開始複習";
  }

  function updatePracticeTitle() {
    if (state.practiceMode === "review") {
      practiceTitleEl.textContent = "今日複習";
      return;
    }

    const category = getSelectedCategory();
    practiceTitleEl.textContent = category ? `${category.nameEn} 單字卡` : "單字卡";
  }

  function updateResultActions() {
    if (state.practiceMode === "review") {
      const remainingReviewCount = getReviewWords(new Date()).length;
      if (remainingReviewCount > 0) {
        const nextReviewSize = Math.min(remainingReviewCount, REVIEW_MISSION_SIZE);
        nextRoundBtn.disabled = false;
        nextRoundBtn.textContent = `繼續複習 ${nextReviewSize} 題`;
        resultNoteEl.textContent = `複習不會推進分類進度；目前還有 ${remainingReviewCount} 個字需要回頭看。`;
        return;
      }

      nextRoundBtn.disabled = true;
      nextRoundBtn.textContent = "今日複習完成";
      resultNoteEl.textContent = "今日複習已完成；可以回首頁繼續分類練習。";
      return;
    }

    const category = getSelectedCategory();
    const remainingCount = category ? getRemainingCount(category) : 0;
    const chosenSizeLabel = state.selectedMissionSize === "all" ? "全部" : `${state.selectedMissionSize} 字`;
    if (category && remainingCount > 0) {
      const nextRoundSize = state.selectedMissionSize === "all" ? remainingCount : Math.min(Number(state.selectedMissionSize), remainingCount);
      nextRoundBtn.disabled = false;
      nextRoundBtn.textContent = `繼續下一輪 ${nextRoundSize} 題`;
      resultNoteEl.textContent = `${category.nameEn} 還有 ${remainingCount} 個字；本次選擇是 ${chosenSizeLabel}，進度已保存在這台裝置。`;
      return;
    }

    nextRoundBtn.disabled = true;
    nextRoundBtn.textContent = "分類已完成";
    resultNoteEl.textContent = category
      ? `${category.nameEn} 已全部完成；可以回首頁選其他分類，或重複本輪加強。`
      : "本輪已完成；可以回首頁選其他分類，或重複本輪加強。";
  }

  function getSelectedCategory() {
    return state.categories.find(function (category) {
      return category.key === state.selectedCategoryKey;
    }) || null;
  }

  function getRemainingCount(category) {
    const progress = getCategoryProgress(category.key);
    return Math.max(category.words.length - progress.nextStartIndex, 0);
  }

  function getCategoryProgress(categoryKey) {
    const category = state.categories.find(function (item) {
      return item.key === categoryKey;
    });
    const total = category ? category.words.length : 0;
    const saved = state.progress.categories[categoryKey] || {};
    const nextStartIndex = normalizeIndex(saved.nextStartIndex, total);
    const completedCount = normalizeIndex(saved.completedCount ?? nextStartIndex, total);
    return {
      nextStartIndex,
      completedCount
    };
  }

  function getReviewWords(now) {
    const nowTime = now.getTime();
    return Object.keys(state.progress.words || {})
      .map(function (wordId) {
        const word = state.wordById.get(wordId);
        const record = normalizeWordProgress(state.progress.words[wordId]);
        if (!word || !isReviewDue(record, nowTime)) {
          return null;
        }

        return {
          word,
          record
        };
      })
      .filter(Boolean)
      .sort(compareReviewItems)
      .map(function (item) {
        return item.word;
      });
  }

  function isReviewDue(record, nowTime) {
    if (record.lastResult === "unknown") {
      return true;
    }

    if (!record.nextReviewAt) {
      return false;
    }

    const reviewTime = Date.parse(record.nextReviewAt);
    return Number.isFinite(reviewTime) && reviewTime <= nowTime;
  }

  function compareReviewItems(a, b) {
    const aUnknown = a.record.lastResult === "unknown" ? 1 : 0;
    const bUnknown = b.record.lastResult === "unknown" ? 1 : 0;
    if (aUnknown !== bUnknown) {
      return bUnknown - aUnknown;
    }

    return getReviewTime(a.record) - getReviewTime(b.record);
  }

  function getReviewTime(record) {
    const reviewTime = Date.parse(record.nextReviewAt || "");
    return Number.isFinite(reviewTime) ? reviewTime : Number.MAX_SAFE_INTEGER;
  }

  function normalizeIndex(value, total) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return 0;
    }

    return Math.min(numberValue, total);
  }

  function loadProgress() {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEY);
      if (!rawValue) {
        return createEmptyProgress();
      }

      const saved = JSON.parse(rawValue);
      if (saved && saved.categories && typeof saved.categories === "object") {
        return migrateProgress(saved);
      }
    } catch (error) {
      return createEmptyProgress();
    }

    return createEmptyProgress();
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        categories: state.progress.categories,
        words: state.progress.words,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      progressStatusEl.textContent = "此瀏覽器無法保存進度；下次打開可能需要重新開始。";
    }
  }

  function createEmptyProgress() {
    return {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      categories: {},
      words: {}
    };
  }

  function migrateProgress(saved) {
    if (saved.schemaVersion === PROGRESS_SCHEMA_VERSION) {
      return {
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        categories: saved.categories || {},
        words: saved.words && typeof saved.words === "object" ? saved.words : {}
      };
    }

    return {
      schemaVersion: PROGRESS_SCHEMA_VERSION,
      categories: saved.categories || {},
      words: {}
    };
  }

  function applyRoundMasteryResults(timestamp) {
    state.roundResults.forEach(function (answer) {
      if (!answer.wordId) {
        return;
      }

      const currentRecord = normalizeWordProgress(state.progress.words[answer.wordId]);
      state.progress.words[answer.wordId] = updateWordProgress(currentRecord, answer.result, timestamp);
    });
  }

  function normalizeWordProgress(record) {
    const saved = record && typeof record === "object" ? record : {};
    return {
      knownCount: normalizeCount(saved.knownCount),
      unknownCount: normalizeCount(saved.unknownCount),
      lastPracticedAt: typeof saved.lastPracticedAt === "string" ? saved.lastPracticedAt : null,
      lastResult: saved.lastResult === "known" || saved.lastResult === "unknown" ? saved.lastResult : null,
      streakKnown: normalizeCount(saved.streakKnown),
      masteryLevel: normalizeMasteryLevel(saved.masteryLevel),
      nextReviewAt: typeof saved.nextReviewAt === "string" ? saved.nextReviewAt : null
    };
  }

  function updateWordProgress(record, result, timestamp) {
    const isKnown = result === "known";
    const nextKnownCount = record.knownCount + (isKnown ? 1 : 0);
    const nextUnknownCount = record.unknownCount + (isKnown ? 0 : 1);
    const nextStreakKnown = isKnown ? record.streakKnown + 1 : 0;
    const nextMasteryLevel = calculateMasteryLevel(record.masteryLevel, isKnown, nextStreakKnown);

    return {
      knownCount: nextKnownCount,
      unknownCount: nextUnknownCount,
      lastPracticedAt: timestamp,
      lastResult: result,
      streakKnown: nextStreakKnown,
      masteryLevel: nextMasteryLevel,
      nextReviewAt: calculateNextReviewAt(timestamp, nextMasteryLevel, isKnown)
    };
  }

  function calculateMasteryLevel(currentLevel, isKnown, streakKnown) {
    if (!isKnown) {
      return Math.max(currentLevel - 1, 0);
    }

    if (currentLevel === 0) {
      return 1;
    }

    if (streakKnown >= 2 && currentLevel < 3) {
      return currentLevel + 1;
    }

    if (streakKnown >= 3 && currentLevel < 4) {
      return currentLevel + 1;
    }

    return currentLevel;
  }

  function calculateNextReviewAt(timestamp, masteryLevel, isKnown) {
    const daysByLevel = isKnown
      ? [1, 1, 3, 7, 14]
      : [1, 1, 1, 2, 3];
    const baseDate = new Date(timestamp);
    baseDate.setDate(baseDate.getDate() + daysByLevel[masteryLevel]);
    return baseDate.toISOString();
  }

  function normalizeCount(value) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return 0;
    }

    return numberValue;
  }

  function normalizeMasteryLevel(value) {
    const numberValue = Number(value);
    if (!Number.isInteger(numberValue) || numberValue < 0) {
      return 0;
    }

    return Math.min(numberValue, 4);
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
