# English Vocabulary Practice

A lightweight English vocabulary practice app for elementary school learners. It is a static front-end project: no login, no backend, no build step, and no dev server required.

- Current version: `0.3.1`
- Live demo: <https://jamesyyl.github.io/english-vocabulary-practice/>
- Vocabulary set: G6 vocabulary p1-p2, 230 words
- Runtime: browser only

## Features

- Practice words by category.
- Choose a mission size: 10, 20, 30, or all remaining words in the selected category.
- View word details: English word, part of speech, Chinese meaning, English definition, phrase, example sentence, and phonics hint.
- Auto-play word pronunciation when a word card opens.
- Play word and example sentence pronunciation from local MP3 files, with browser Web Speech fallback.
- Mark each card as `學會了` or `還不會`.
- See round results after each mission.
- Continue the next mission, repeat the current mission, or return home.
- Save per-category progress in `localStorage`.
- Track word-level mastery data locally for future review and quiz modes.
- Start a minimal review round for due or recently missed words.
- Reset local progress from the home screen.

## Quick Start

Open `index.html` directly in a browser:

```text
index.html
```

The app is intentionally compatible with `file://`, so a local dev server is not required.

## Project Structure

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   └── vocabulary.js
├── data/
│   ├── G6_vocabulary_p1-p2.original.json
│   └── vocabulary.enriched.json
├── scripts/
│   └── generate-vocabulary-js.js
├── CHANGELOG.md
├── TODO.md
└── README.md
```

## Data Workflow

The browser reads `js/vocabulary.js` instead of fetching JSON directly. This keeps the app usable through `file://`.

```text
data/G6_vocabulary_p1-p2.original.json
→ data/vocabulary.enriched.json
→ scripts/generate-vocabulary-js.js
→ js/vocabulary.js
→ index.html
```

File roles:

- `data/G6_vocabulary_p1-p2.original.json`: original source copy. Do not edit the source word, part of speech, Chinese meaning, or category fields manually.
- `data/vocabulary.enriched.json`: maintainable vocabulary source with added English definitions, example sentences, phrases, and phonics hints.
- `scripts/generate-vocabulary-js.js`: validates enriched data and regenerates the front-end data file.
- `js/vocabulary.js`: generated browser data exposed as `window.VOCABULARY_DATA`.

To update vocabulary data, edit `data/vocabulary.enriched.json`, then run:

```powershell
node scripts/generate-vocabulary-js.js
```

## Data Quality Rules

Every generated vocabulary entry must include:

- `word`
- `partOfSpeech`
- `chineseMeaning`
- `categoryZh`
- `categoryEn`
- `vocabularySetId`
- `wordId`
- `audioBaseName`
- `englishDefinition`
- `exampleSentence`
- `phrase`
- `phonicsHint`

Validation rules:

- Generated total must match `total_count`.
- Category counts must match the source category entry counts.
- Words must not be duplicated.
- Each example sentence must contain at least 7 English words.
- Original source fields must remain consistent with `data/G6_vocabulary_p1-p2.original.json`.
- Every word must have a unique `wordId`.

## Audio Workflow

The app first tries to play a local MP3 file. If the file is missing, blocked, or cannot be played, it falls back to the browser Web Speech API.

Audio file paths are deterministic:

```text
audio/<vocabularySetId>/words/<audioBaseName>.mp3
audio/<vocabularySetId>/sentences/<audioBaseName>.mp3
```

Example:

```text
audio/g6-p1-p2/words/verbs-1-agree.mp3
audio/g6-p1-p2/sentences/verbs-1-agree.mp3
```

Generate all Google Translate TTS audio files:

```powershell
node scripts/generate-audio-samples.js --all
```

Generate a smaller sample set:

```powershell
node scripts/generate-audio-samples.js --limit=5
```

Regenerate existing files:

```powershell
node scripts/generate-audio-samples.js --all --force
```

The generator is resumable: existing valid MP3 files are skipped unless `--force` is used. Google Translate TTS is used as an unofficial source. It is suitable for trying this project locally, but it can change, rate-limit, or fail without notice. For a more reliable audio library, use a formal TTS provider and keep the same local MP3 path convention.

## Progress Data

Progress is stored in `localStorage` under:

```text
englishVocabularyPracticeProgress:v1
```

The key name is kept for backward compatibility, while the stored payload now uses `schemaVersion: 2`.

Stored progress includes:

- `categories`: per-category mission progress.
- `words`: per-word mastery records keyed by stable `wordId`.

Each word mastery record stores:

- `knownCount`: total times marked as known.
- `unknownCount`: total times marked as unknown.
- `lastPracticedAt`: last practice timestamp.
- `lastResult`: last answer result, either `known` or `unknown`.
- `streakKnown`: current consecutive known streak.
- `masteryLevel`: simple `0-4` mastery level.
- `nextReviewAt`: suggested next review timestamp.

Existing v1 category progress is migrated automatically to schema v2. Category practice still moves category progress forward; review practice only updates word mastery and does not advance category progress.

## Review Mode

The home screen shows a minimal review entry when words need attention.

A word enters review when:

- `lastResult` is `unknown`, or
- `nextReviewAt` is due.

Review behavior:

- A review round uses the same word card and answer buttons as category practice.
- A review round is capped at 10 words.
- Recently missed words are prioritized first.
- Review answers update word mastery records.
- Review does not change category `nextStartIndex` or `completedCount`.

## Verification

Run syntax checks:

```powershell
node --check scripts/generate-vocabulary-js.js
node --check scripts/generate-audio-samples.js
node --check js/app.js
node --check js/vocabulary.js
```

Run the main smoke test:

```powershell
node scripts/smoke-test.js
```

Run the full release verification:

```powershell
node scripts/verify-release.js
```

Regenerate the front-end vocabulary file:

```powershell
node scripts/generate-vocabulary-js.js
```

Check generated data completeness:

```powershell
node -e "const fs=require('fs'); const vm=require('vm'); const js=fs.readFileSync('js/vocabulary.js','utf8'); const sandbox={window:{}}; vm.runInNewContext(js,sandbox); const rows=sandbox.window.VOCABULARY_DATA; const missing=rows.filter(e=>!e.englishDefinition||!e.exampleSentence||!e.phrase||!e.phonicsHint); const short=rows.filter(e=>e.exampleSentence.split(/[^A-Za-z']+/).filter(Boolean).length<7); console.log({total:rows.length, missing:missing.length, shortExamples:short.length});"
```

Expected baseline:

```text
{ total: 230, missing: 0, shortExamples: 0 }
```

## Release Checklist

Before tagging a release:

- Run `node scripts/verify-release.js`.
- If `css/style.css`, `js/app.js`, or `js/vocabulary.js` changed, update cache-busting query strings in `index.html`.
- Update `README.md` if the public workflow changed.
- Update `CHANGELOG.md` with the release date and verification notes.
- Commit changes, tag the release, push `main`, push the tag, and create a GitHub release.

## Deployment

GitHub Pages is served from the `main` branch:

```text
https://jamesyyl.github.io/english-vocabulary-practice/
```

Basic release flow:

```powershell
git status
git add <changed-files>
git commit -m "Describe the update"
git push origin main
```

GitHub Pages may take a few seconds to a few minutes to deploy after pushing.

To check whether the deployed HTML has refreshed:

```powershell
Invoke-WebRequest -Uri "https://jamesyyl.github.io/english-vocabulary-practice/" -UseBasicParsing -Headers @{ "Cache-Control" = "no-cache" }
```

When changing `css/style.css`, `js/app.js`, or `js/vocabulary.js`, update the version query string in `index.html` to avoid mixed browser/CDN cache:

```html
<link rel="stylesheet" href="css/style.css?v=20260703-review-mode">
<script src="js/vocabulary.js?v=20260703-mastery-model"></script>
<script src="js/app.js?v=20260703-review-mode"></script>
```

## Roadmap

Near-term work is tracked in `TODO.md`.

Planned direction:

- `0.3.1`: complete committed MP3 coverage for the current 230-word vocabulary set.
- `0.4.0`: design multi-vocabulary-set support.

## Current Limitations

- No account system.
- No cloud sync.
- No admin dashboard.
- Progress is stored only on the same device and browser.
- Missing MP3 audio falls back to the browser Web Speech API.
- Quiz mode is not implemented yet.

## Changelog

See `CHANGELOG.md`.
