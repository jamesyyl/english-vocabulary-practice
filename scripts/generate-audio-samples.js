const fs = require("fs");
const https = require("https");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const VOCABULARY_JS_PATH = path.join(PROJECT_ROOT, "js", "vocabulary.js");
const DEFAULT_LIMIT = 5;
const REQUEST_DELAY_MS = 450;

function main() {
  const options = parseArgs(process.argv.slice(2));
  const rows = loadVocabulary().slice(0, options.limit);

  if (rows.length === 0) {
    throw new Error("No vocabulary rows found.");
  }

  rows.reduce(function (chain, entry) {
    return chain.then(function () {
      return generateEntryAudio(entry, options.force);
    });
  }, Promise.resolve())
    .then(function () {
      console.log(`Generated audio samples for ${rows.length} words.`);
    })
    .catch(function (error) {
      console.error(error.message);
      process.exitCode = 1;
    });
}

function parseArgs(args) {
  const options = {
    limit: DEFAULT_LIMIT,
    force: false
  };

  args.forEach(function (arg) {
    if (arg === "--force") {
      options.force = true;
      return;
    }

    if (arg.startsWith("--limit=")) {
      const limit = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(limit) || limit < 1) {
        throw new Error("--limit must be a positive integer.");
      }
      options.limit = limit;
    }
  });

  return options;
}

function loadVocabulary() {
  const sandbox = { window: {} };
  const code = fs.readFileSync(VOCABULARY_JS_PATH, "utf8");
  vm.runInNewContext(code, sandbox, { filename: "js/vocabulary.js" });
  return sandbox.window.VOCABULARY_DATA || [];
}

function generateEntryAudio(entry, force) {
  const wordPath = getAudioPath(entry, "words");
  const sentencePath = getAudioPath(entry, "sentences");

  return downloadIfNeeded(entry.word, wordPath, force)
    .then(function () {
      return wait(REQUEST_DELAY_MS);
    })
    .then(function () {
      return downloadIfNeeded(entry.exampleSentence, sentencePath, force);
    })
    .then(function () {
      return wait(REQUEST_DELAY_MS);
    });
}

function getAudioPath(entry, folder) {
  const setId = entry.vocabularySetId || "g6-p1-p2";
  const baseName = entry.audioBaseName || createAudioBaseName(entry);
  return path.join(PROJECT_ROOT, "audio", setId, folder, `${baseName}.mp3`);
}

function createAudioBaseName(entry) {
  return String(entry.wordId || entry.word || "word")
    .replace(/^g6-p1-p2:/, "")
    .replace(/:/g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function downloadIfNeeded(text, targetPath, force) {
  if (!force && fs.existsSync(targetPath) && fs.statSync(targetPath).size > 500) {
    console.log(`Skip existing ${path.relative(PROJECT_ROOT, targetPath)}`);
    return Promise.resolve();
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  return fetchGoogleTranslateTts(text)
    .then(function (buffer) {
      if (buffer.length < 500) {
        throw new Error(`Downloaded audio is too small for ${text}.`);
      }

      fs.writeFileSync(targetPath, buffer);
      console.log(`Wrote ${path.relative(PROJECT_ROOT, targetPath)} (${buffer.length} bytes)`);
    });
}

function fetchGoogleTranslateTts(text) {
  const url = new URL("https://translate.google.com/translate_tts");
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("tl", "en");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("q", text);

  return new Promise(function (resolve, reject) {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "audio/mpeg,*/*;q=0.8"
      }
    }, function (response) {
      const chunks = [];
      response.on("data", function (chunk) {
        chunks.push(chunk);
      });
      response.on("end", function () {
        const buffer = Buffer.concat(chunks);
        if (response.statusCode !== 200) {
          reject(new Error(`TTS request failed with HTTP ${response.statusCode}.`));
          return;
        }
        resolve(buffer);
      });
    }).on("error", reject);
  });
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

main();
