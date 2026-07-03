# Changelog

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
