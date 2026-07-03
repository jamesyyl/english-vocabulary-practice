# Changelog

## 0.3.1 - 2026-07-03

### Added

- Added complete committed MP3 coverage for the current 230-word vocabulary set.
- Added word MP3 files and example sentence MP3 files for every vocabulary entry.

### Changed

- Improved `scripts/generate-audio-samples.js` with full-library generation, resumable skips, retry handling, configurable delay, and failure reporting.
- Updated release verification to require all 460 MP3 files.
- Updated home screen version metadata.

### Verification

- `node scripts/verify-release.js`

## 0.3.0 - 2026-07-03

### Added

- Added deterministic audio file names through generated `audioBaseName`.
- Added local MP3 playback before Web Speech fallback for word pronunciation.
- Added automatic word pronunciation when a word card opens.
- Added an example sentence speaker button on each word card.
- Added `scripts/generate-audio-samples.js` for small Google Translate TTS sample generation.
- Added committed MP3 samples for the first 5 words and their example sentences.

### Changed

- Updated release verification to check the audio sample files.
- Updated smoke tests to cover the example sentence audio button.
- Updated home screen version metadata and CSS / JS cache-busting query strings.

### Verification

- `node scripts/verify-release.js`

## 0.2.1 - 2026-07-03

### Added

- Added a minimal home-screen review entry for due or recently missed words.
- Added review mode using the existing word card and answer buttons.
- Added review prioritization for `lastResult = unknown`, then earliest `nextReviewAt`.
- Expanded smoke tests to confirm review mode updates mastery without advancing category progress.

### Changed

- Updated home screen version metadata and CSS / JS cache-busting query strings.

### Verification

- `node scripts/verify-release.js`

## 0.2.0 - 2026-07-03

### Added

- Added stable `vocabularySetId` and `wordId` fields to generated vocabulary entries.
- Added schema v2 progress data with per-word mastery records.
- Added automatic migration from existing v1 category progress to schema v2.
- Added word mastery updates after each completed round.
- Expanded smoke tests to cover schema v2 mastery, v1 migration, resume, and reset.

### Changed

- Updated release verification to require unique word IDs.
- Updated home screen version metadata and script cache-busting query strings.

### Verification

- `node scripts/verify-release.js`

## 0.1.1 - 2026-07-03

### Added

- Added `scripts/smoke-test.js` for a browser-free Node smoke test of the main practice flow.
- Added `scripts/verify-release.js` as the single release verification command.
- Added a release checklist to `README.md`.

### Changed

- Rewrote `README.md` into a more standard GitHub repository format.

### Verification

- `node scripts/verify-release.js`

## 0.1.0 - 2026-07-03

### Added

- Added category-based mission mode with per-category progress.
- Added practice size choices for 10, 20, 30, or all remaining words in the selected category.
- Added local progress reset from the home screen.
- Added footer metadata on the home screen: `© 2026 James.L` and `v0.1.0`.
- Added `TODO.md` with the small-version roadmap and architecture notes.

### Changed

- Documented GitHub Pages deployment and cache-busting rules in `README.md`.
- Confirmed the 230-word enriched vocabulary generation workflow as the 0.1.0 baseline.

### Verification

- `node --check scripts/generate-vocabulary-js.js`
- `node --check js/app.js`
- `node --check js/vocabulary.js`
- `node scripts/generate-vocabulary-js.js`
- Chrome headless smoke test for selecting a category and completing one round.
