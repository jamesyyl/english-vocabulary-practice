const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function main() {
  run("node", ["--check", "scripts/generate-vocabulary-js.js"]);
  run("node", ["--check", "js/app.js"]);
  run("node", ["--check", "js/vocabulary.js"]);
  run("node", ["--check", "scripts/smoke-test.js"]);
  run("node", ["--check", "scripts/verify-release.js"]);
  run("node", ["scripts/generate-vocabulary-js.js"]);
  verifyVocabularyData();
  run("node", ["scripts/smoke-test.js"]);
  console.log("Release verification passed.");
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: PROJECT_ROOT,
    shell: process.platform === "win32",
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function verifyVocabularyData() {
  const code = fs.readFileSync(path.join(PROJECT_ROOT, "js", "vocabulary.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: "js/vocabulary.js" });

  const rows = sandbox.window.VOCABULARY_DATA;
  const missing = rows.filter(function (entry) {
    return !entry.vocabularySetId || !entry.wordId || !entry.englishDefinition || !entry.exampleSentence || !entry.phrase || !entry.phonicsHint;
  });
  const shortExamples = rows.filter(function (entry) {
    return String(entry.exampleSentence).split(/[^A-Za-z']+/).filter(Boolean).length < 7;
  });
  const wordIds = new Set(rows.map(function (entry) {
    return entry.wordId;
  }));

  if (rows.length !== 230 || missing.length !== 0 || shortExamples.length !== 0 || wordIds.size !== rows.length) {
    throw new Error(`Vocabulary verification failed: ${JSON.stringify({
      total: rows.length,
      missing: missing.length,
      shortExamples: shortExamples.length,
      uniqueWordIds: wordIds.size
    })}`);
  }

  console.log("Vocabulary verification passed: 230 words, 0 missing fields, 0 short examples, unique word IDs.");
}

main();
