# English Vocabulary Practice

A lightweight English vocabulary practice app for elementary school learners. It is a static front-end project: no login, no backend, no build step, and no dev server required.

- Current version: `0.1.1`
- Live demo: <https://jamesyyl.github.io/english-vocabulary-practice/>
- Vocabulary set: G6 vocabulary p1-p2, 230 words
- Runtime: browser only

## Features

- Practice words by category.
- Choose a mission size: 10, 20, 30, or all remaining words in the selected category.
- View word details: English word, part of speech, Chinese meaning, English definition, phrase, example sentence, and phonics hint.
- Play pronunciation through the browser Web Speech API.
- Mark each card as `學會了` or `還不會`.
- See round results after each mission.
- Continue the next mission, repeat the current mission, or return home.
- Save per-category progress in `localStorage`.
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

## Verification

Run syntax checks:

```powershell
node --check scripts/generate-vocabulary-js.js
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
<link rel="stylesheet" href="css/style.css?v=20260703-home-meta">
<script src="js/vocabulary.js?v=20260702-category-mission"></script>
<script src="js/app.js?v=20260702-category-mission"></script>
```

## Roadmap

Near-term work is tracked in `TODO.md`.

Planned direction:

- `0.1.1`: add smoke tests, release verification, and a cleaner release checklist.
- `0.2.0`: add word-level mastery records while preserving the current user flow.
- `0.2.1`: add a minimal review mode.
- `0.3.0`: add static audio fallback architecture.
- `0.4.0`: design multi-vocabulary-set support.

## Current Limitations

- No account system.
- No cloud sync.
- No admin dashboard.
- Progress is stored only on the same device and browser.
- Pronunciation currently depends on the browser Web Speech API.
- Word-level review history is not implemented yet.

## Changelog

See `CHANGELOG.md`.
