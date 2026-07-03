const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const STORAGE_KEY = "englishVocabularyPracticeProgress:v1";
const FIRST_WORD_ID = "g6-p1-p2:verbs:1:agree";
const ELEMENT_IDS = [
  "data-status",
  "word-card",
  "home-screen",
  "practice-screen",
  "result-screen",
  "category-list",
  "selected-category-summary",
  "mission-options",
  "start-practice",
  "practice-title",
  "progress-label",
  "speak-word",
  "mark-known",
  "mark-unknown",
  "result-total",
  "result-known",
  "result-unknown",
  "next-round",
  "repeat-round",
  "return-home",
  "result-note",
  "progress-status",
  "reset-progress",
  "review-summary",
  "start-review"
];

class ClassList {
  constructor(initialValue = "") {
    this.classes = new Set(initialValue.split(/\s+/).filter(Boolean));
  }

  add(className) {
    this.classes.add(className);
  }

  remove(className) {
    this.classes.delete(className);
  }

  contains(className) {
    return this.classes.has(className);
  }

  toggle(className, force) {
    const shouldAdd = force === undefined ? !this.classes.has(className) : Boolean(force);
    if (shouldAdd) {
      this.add(className);
    } else {
      this.remove(className);
    }
    return shouldAdd;
  }

  toString() {
    return Array.from(this.classes).join(" ");
  }
}

class TestElement {
  constructor(tagName = "div", options = {}) {
    this.tagName = tagName.toUpperCase();
    this.id = options.id || "";
    this.attributes = {};
    this.children = [];
    this.eventListeners = {};
    this.disabled = false;
    this._textContent = options.textContent || "";
    this._innerHTML = "";
    this.classList = new ClassList(options.className || "");
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this.children = parseChildButtons(this._innerHTML);
  }

  addEventListener(type, handler) {
    if (!this.eventListeners[type]) {
      this.eventListeners[type] = [];
    }
    this.eventListeners[type].push(handler);
  }

  click() {
    if (this.disabled) {
      return;
    }
    (this.eventListeners.click || []).forEach(function (handler) {
      handler.call(this);
    }, this);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  querySelectorAll(selector) {
    if (!selector.startsWith(".")) {
      return [];
    }

    const className = selector.slice(1);
    return this.children.filter(function (child) {
      return child.classList.contains(className);
    });
  }
}

class TestAudio {
  constructor(src) {
    this.src = src;
    this.currentTime = 0;
    this.eventListeners = {};
  }

  addEventListener(type, handler) {
    this.eventListeners[type] = handler;
  }

  play() {
    return Promise.reject(new Error(`Audio fixture missing: ${this.src}`));
  }

  pause() {}
}

class TestSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.lang = "";
    this.rate = 1;
    this.pitch = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  }
}

function parseChildButtons(html) {
  const buttons = [];
  const buttonPattern = /<button\s+([^>]*)>([\s\S]*?)<\/button>/g;
  let match;

  while ((match = buttonPattern.exec(html)) !== null) {
    const button = new TestElement("button", {
      className: readAttribute(match[1], "class") || "",
      textContent: stripTags(match[2]).replace(/\s+/g, " ").trim()
    });

    const attributePattern = /([a-zA-Z0-9-:]+)="([^"]*)"/g;
    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(match[1])) !== null) {
      button.setAttribute(attributeMatch[1], decodeHtml(attributeMatch[2]));
    }

    buttons.push(button);
  }

  return buttons;
}

function readAttribute(attributeText, name) {
  const match = new RegExp(`${name}="([^"]*)"`).exec(attributeText);
  return match ? decodeHtml(match[1]) : "";
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "");
}

function decodeHtml(value) {
  return String(value)
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function createStorage(initialData = {}) {
  const store = { ...initialData };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach(function (key) {
        delete store[key];
      });
    },
    snapshot() {
      return { ...store };
    }
  };
}

function createHarness(initialStorage = {}) {
  const elements = {};
  ELEMENT_IDS.forEach(function (id) {
    elements[id] = new TestElement("div", { id });
  });

  elements["home-screen"].classList = new ClassList("screen home-screen is-active");
  elements["practice-screen"].classList = new ClassList("screen practice-screen");
  elements["result-screen"].classList = new ClassList("screen result-screen");
  elements["start-practice"].disabled = true;
  elements["start-review"].disabled = true;

  const storage = createStorage(initialStorage);
  const sandbox = {
    window: {
      localStorage: storage,
      scrollTo() {},
      VOCABULARY_DATA: undefined,
      speechSynthesis: {
        cancel() {},
        getVoices() {
          return [];
        },
        speak(utterance) {
          if (typeof utterance.onend === "function") {
            utterance.onend();
          }
        }
      }
    },
    Audio: TestAudio,
    document: {
      getElementById(id) {
        return elements[id] || null;
      }
    },
    console,
    SpeechSynthesisUtterance: TestSpeechSynthesisUtterance
  };

  vm.createContext(sandbox);
  vm.runInContext(readProjectFile("js", "vocabulary.js"), sandbox, { filename: "js/vocabulary.js" });
  vm.runInContext(readProjectFile("js", "app.js"), sandbox, { filename: "js/app.js" });

  return { elements, storage };
}

function readProjectFile(...segments) {
  return fs.readFileSync(path.join(PROJECT_ROOT, ...segments), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function completeFirstRound() {
  const harness = createHarness();
  const categoryButtons = harness.elements["category-list"].querySelectorAll(".category-card");
  assert(categoryButtons.length > 0, "Expected category cards to render.");

  categoryButtons[0].click();
  assert(harness.elements["start-practice"].disabled === false, "Expected start button to be enabled after selecting a category.");

  harness.elements["start-practice"].click();
  assert(harness.elements["practice-screen"].classList.contains("is-active"), "Expected practice screen to be active.");
  assert(harness.elements["progress-label"].textContent === "1 / 10", "Expected first mission to start at 1 / 10.");
  assert(
    harness.elements["word-card"].querySelectorAll(".sentence-audio-action").length === 1,
    "Expected example sentence audio button to render on the word card."
  );

  for (let index = 0; index < 10; index += 1) {
    harness.elements["mark-known"].click();
  }

  assert(harness.elements["result-screen"].classList.contains("is-active"), "Expected result screen to be active after 10 answers.");
  assert(harness.elements["result-total"].textContent === "10", "Expected result total to be 10.");
  assert(harness.elements["result-known"].textContent === "10", "Expected known count to be 10.");
  assert(harness.elements["result-unknown"].textContent === "0", "Expected unknown count to be 0.");

  const saved = JSON.parse(harness.storage.getItem(STORAGE_KEY));
  assert(saved.schemaVersion === 2, "Expected saved progress schemaVersion to be 2.");
  assert(saved.categories.Verbs.completedCount === 10, "Expected Verbs completedCount to be saved as 10.");
  assert(saved.categories.Verbs.nextStartIndex === 10, "Expected Verbs nextStartIndex to be saved as 10.");
  assert(Object.keys(saved.words).length === 10, "Expected 10 word mastery records after first round.");

  const firstWord = saved.words[FIRST_WORD_ID];
  assert(firstWord, `Expected mastery record for ${FIRST_WORD_ID}.`);
  assert(firstWord.knownCount === 1, "Expected first word knownCount to be 1.");
  assert(firstWord.unknownCount === 0, "Expected first word unknownCount to be 0.");
  assert(firstWord.lastResult === "known", "Expected first word lastResult to be known.");
  assert(firstWord.streakKnown === 1, "Expected first word streakKnown to be 1.");
  assert(firstWord.masteryLevel === 1, "Expected first word masteryLevel to be 1 after first known answer.");
  assert(typeof firstWord.lastPracticedAt === "string", "Expected first word lastPracticedAt to be saved.");
  assert(typeof firstWord.nextReviewAt === "string", "Expected first word nextReviewAt to be saved.");

  return harness.storage.snapshot();
}

function resumeAndReset(savedStorage) {
  const harness = createHarness(savedStorage);
  const categoryButtons = harness.elements["category-list"].querySelectorAll(".category-card");
  categoryButtons[0].click();

  assert(
    harness.elements["selected-category-summary"].textContent.includes("下一題從第 11 個字開始"),
    "Expected saved progress to resume from the 11th word."
  );

  assert(!harness.elements["reset-progress"].classList.contains("is-hidden"), "Expected reset button to be visible when progress exists.");
  harness.elements["reset-progress"].click();

  const savedAfterReset = JSON.parse(harness.storage.getItem(STORAGE_KEY));
  assert(savedAfterReset.schemaVersion === 2, "Expected reset progress schemaVersion to stay 2.");
  assert(Object.keys(savedAfterReset.categories).length === 0, "Expected reset to clear category progress.");
  assert(Object.keys(savedAfterReset.words).length === 0, "Expected reset to clear word progress.");
  assert(harness.elements["reset-progress"].classList.contains("is-hidden"), "Expected reset button to hide after clearing progress.");
}

function migrateLegacyProgress() {
  const legacyStorage = {};
  legacyStorage[STORAGE_KEY] = JSON.stringify({
    categories: {
      Verbs: {
        nextStartIndex: 10,
        completedCount: 10,
        savedAt: "2026-07-03T00:00:00.000Z"
      }
    },
    savedAt: "2026-07-03T00:00:00.000Z"
  });

  const harness = createHarness(legacyStorage);
  const categoryButtons = harness.elements["category-list"].querySelectorAll(".category-card");
  categoryButtons[0].click();

  assert(
    harness.elements["selected-category-summary"].textContent.includes("下一題從第 11 個字開始"),
    "Expected legacy category progress to migrate and resume from the 11th word."
  );

  harness.elements["start-practice"].click();
  for (let index = 0; index < 10; index += 1) {
    harness.elements["mark-unknown"].click();
  }

  const migrated = JSON.parse(harness.storage.getItem(STORAGE_KEY));
  assert(migrated.schemaVersion === 2, "Expected legacy progress to save as schemaVersion 2.");
  assert(migrated.categories.Verbs.nextStartIndex === 20, "Expected migrated progress to continue from old nextStartIndex.");
  assert(migrated.words["g6-p1-p2:verbs:11:cover"].unknownCount === 1, "Expected migrated progress to create word mastery records.");
}

function reviewModeDoesNotAdvanceCategory() {
  const reviewStorage = {};
  reviewStorage[STORAGE_KEY] = JSON.stringify({
    schemaVersion: 2,
    categories: {
      Verbs: {
        nextStartIndex: 10,
        completedCount: 10,
        savedAt: "2026-07-03T00:00:00.000Z"
      }
    },
    words: {
      "g6-p1-p2:verbs:11:cover": {
        knownCount: 0,
        unknownCount: 1,
        lastPracticedAt: "2026-07-03T00:00:00.000Z",
        lastResult: "unknown",
        streakKnown: 0,
        masteryLevel: 0,
        nextReviewAt: "2026-07-04T00:00:00.000Z"
      }
    },
    savedAt: "2026-07-03T00:00:00.000Z"
  });

  const harness = createHarness(reviewStorage);
  assert(harness.elements["review-summary"].textContent.includes("今日複習：1 個字"), "Expected review panel to show one review word.");
  assert(harness.elements["start-review"].disabled === false, "Expected review button to be enabled.");

  harness.elements["start-review"].click();
  assert(harness.elements["practice-title"].textContent === "今日複習", "Expected review practice title.");
  assert(harness.elements["progress-label"].textContent === "1 / 1", "Expected one review card.");

  harness.elements["mark-known"].click();

  const saved = JSON.parse(harness.storage.getItem(STORAGE_KEY));
  assert(saved.categories.Verbs.nextStartIndex === 10, "Expected review mode not to advance category nextStartIndex.");
  assert(saved.categories.Verbs.completedCount === 10, "Expected review mode not to advance category completedCount.");

  const reviewed = saved.words["g6-p1-p2:verbs:11:cover"];
  assert(reviewed.knownCount === 1, "Expected review known answer to update knownCount.");
  assert(reviewed.unknownCount === 1, "Expected review to preserve previous unknownCount.");
  assert(reviewed.lastResult === "known", "Expected review lastResult to update to known.");
  assert(harness.elements["next-round"].disabled === true, "Expected no next review round after clearing the only review word.");
  assert(harness.elements["result-note"].textContent.includes("今日複習已完成"), "Expected review completion note.");
}

function main() {
  const savedStorage = completeFirstRound();
  resumeAndReset(savedStorage);
  migrateLegacyProgress();
  reviewModeDoesNotAdvanceCategory();
  console.log("Smoke test passed: category mission, review mode, schema v2 mastery, legacy migration, resume, and reset.");
}

main();
