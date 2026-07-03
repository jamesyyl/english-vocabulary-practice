const fs = require("fs");
const https = require("https");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const VOCABULARY_JS_PATH = path.join(PROJECT_ROOT, "js", "vocabulary.js");
const DEFAULT_LIMIT = 5;
const DEFAULT_DELAY_MS = 900;
const DEFAULT_JITTER_MS = 700;
const DEFAULT_RETRIES = 2;
const MIN_AUDIO_BYTES = 500;

function main() {
  const options = parseArgs(process.argv.slice(2));
  const vocabulary = loadVocabulary();
  const rows = vocabulary.slice(options.startIndex, options.endIndex || vocabulary.length);

  if (rows.length === 0) {
    throw new Error("No vocabulary rows found.");
  }

  console.log(`Audio generation plan: ${rows.length} words, ${rows.length * 2} MP3 files.`);
  console.log(`Delay: ${options.delayMs}-${options.delayMs + options.jitterMs}ms; retries: ${options.retries}; force: ${options.force}.`);

  rows.reduce(function (chain, entry, index) {
    return chain.then(function (failures) {
      return generateEntryAudio(entry, options, options.startIndex + index + 1)
        .then(function (entryFailures) {
          return failures.concat(entryFailures);
        });
    });
  }, Promise.resolve([]))
    .then(function (failures) {
      if (failures.length > 0) {
        console.error("Audio generation finished with failures:");
        failures.forEach(function (failure) {
          console.error(`- ${failure.file}: ${failure.error}`);
        });
        process.exitCode = 1;
        return;
      }

      console.log(`Audio generation complete: ${rows.length} words.`);
    })
    .catch(function (error) {
      console.error(error.message);
      process.exitCode = 1;
    });
}

function parseArgs(args) {
  const options = {
    delayMs: DEFAULT_DELAY_MS,
    endIndex: DEFAULT_LIMIT,
    force: false,
    jitterMs: DEFAULT_JITTER_MS,
    retries: DEFAULT_RETRIES,
    startIndex: 0
  };

  args.forEach(function (arg) {
    if (arg === "--all") {
      options.endIndex = null;
      return;
    }

    if (arg === "--force") {
      options.force = true;
      return;
    }

    if (arg.startsWith("--limit=")) {
      const rawValue = arg.slice("--limit=".length);
      if (rawValue === "all") {
        options.endIndex = null;
        return;
      }

      options.endIndex = readPositiveInteger(rawValue, "--limit");
      return;
    }

    if (arg.startsWith("--start=")) {
      options.startIndex = readPositiveInteger(arg.slice("--start=".length), "--start") - 1;
      return;
    }

    if (arg.startsWith("--delay-ms=")) {
      options.delayMs = readNonNegativeInteger(arg.slice("--delay-ms=".length), "--delay-ms");
      return;
    }

    if (arg.startsWith("--jitter-ms=")) {
      options.jitterMs = readNonNegativeInteger(arg.slice("--jitter-ms=".length), "--jitter-ms");
      return;
    }

    if (arg.startsWith("--retries=")) {
      options.retries = readNonNegativeInteger(arg.slice("--retries=".length), "--retries");
    }
  });

  if (options.endIndex !== null) {
    options.endIndex = options.startIndex + options.endIndex;
  }

  return options;
}

function readPositiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new Error(`${name} must be a positive integer or "all".`);
  }
  return numberValue;
}

function readNonNegativeInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return numberValue;
}

function loadVocabulary() {
  const sandbox = { window: {} };
  const code = fs.readFileSync(VOCABULARY_JS_PATH, "utf8");
  vm.runInNewContext(code, sandbox, { filename: "js/vocabulary.js" });
  return sandbox.window.VOCABULARY_DATA || [];
}

function generateEntryAudio(entry, options, ordinal) {
  const tasks = [
    {
      label: `${ordinal}. word ${entry.word}`,
      text: entry.word,
      targetPath: getAudioPath(entry, "words")
    },
    {
      label: `${ordinal}. sentence ${entry.word}`,
      text: entry.exampleSentence,
      targetPath: getAudioPath(entry, "sentences")
    }
  ];

  return tasks.reduce(function (chain, task) {
    return chain.then(function (failures) {
      return downloadWithRetries(task, options)
        .then(function () {
          return wait(randomDelay(options)).then(function () {
            return failures;
          });
        })
        .catch(function (error) {
          return wait(randomDelay(options)).then(function () {
            return failures.concat({
              file: path.relative(PROJECT_ROOT, task.targetPath),
              error: error.message
            });
          });
        });
    });
  }, Promise.resolve([]));
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

function downloadWithRetries(task, options) {
  let attempt = 0;

  function runAttempt() {
    attempt += 1;
    return downloadIfNeeded(task, options.force)
      .catch(function (error) {
        if (attempt > options.retries) {
          throw error;
        }

        console.log(`Retry ${attempt}/${options.retries}: ${task.label} (${error.message})`);
        return wait(randomDelay(options) * attempt).then(runAttempt);
      });
  }

  return runAttempt();
}

function downloadIfNeeded(task, force) {
  if (!force && isValidAudioFile(task.targetPath)) {
    console.log(`Skip existing ${path.relative(PROJECT_ROOT, task.targetPath)}`);
    return Promise.resolve();
  }

  fs.mkdirSync(path.dirname(task.targetPath), { recursive: true });
  return fetchGoogleTranslateTts(task.text)
    .then(function (result) {
      if (!isLikelyMp3(result.buffer, result.contentType)) {
        throw new Error(`Response is not MP3 audio (${result.contentType || "unknown content type"}).`);
      }

      fs.writeFileSync(task.targetPath, result.buffer);
      console.log(`Wrote ${path.relative(PROJECT_ROOT, task.targetPath)} (${result.buffer.length} bytes)`);
    });
}

function isValidAudioFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).size > MIN_AUDIO_BYTES;
}

function isLikelyMp3(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || buffer.length <= MIN_AUDIO_BYTES) {
    return false;
  }

  const startsWithId3 = buffer.slice(0, 3).toString("ascii") === "ID3";
  const startsWithMp3Frame = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;
  const hasAudioContentType = String(contentType || "").toLowerCase().includes("audio");
  return hasAudioContentType || startsWithId3 || startsWithMp3Frame;
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "audio/mpeg,audio/*,*/*;q=0.8"
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
        resolve({
          buffer,
          contentType: response.headers["content-type"] || ""
        });
      });
    }).on("error", reject);
  });
}

function randomDelay(options) {
  return options.delayMs + Math.floor(Math.random() * (options.jitterMs + 1));
}

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

main();
