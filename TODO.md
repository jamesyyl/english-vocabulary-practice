# TODO

本文件記錄英語單字練習接下來的小版本迭代計畫。原則是先保護日常可用性，再逐步加功能；任何版本都應維持 `index.html` 可直接用瀏覽器打開，並維持 GitHub Pages 可部署。

## 目前基線

- 目前線上與本地架構是純前端靜態頁：`index.html`、`css/style.css`、`js/app.js`、`js/vocabulary.js`。
- 字庫來源維護在 `data/vocabulary.enriched.json`，再由 `scripts/generate-vocabulary-js.js` 產生 `js/vocabulary.js`。
- 目前進度存在 `localStorage` 的 `englishVocabularyPracticeProgress:v1`，粒度是每個分類的 `nextStartIndex` / `completedCount`。
- README 目前只有一個後續候選：設計單字級錯題 / 複習紀錄。

## 架構檢視

### 建議保留

- 保留純前端、無後端、無登入的架構，符合小學生日常練習與 GitHub Pages 部署需求。
- 保留產生式字庫流程，避免手動改 `js/vocabulary.js` 造成資料不同步。
- 保留 `file://` 可開啟能力；短期不要引入必須由 dev server 或 build step 才能運作的框架。

### 需要先補強

- 狀態模型需要版本化。下一步若加入單字熟練度，應新增 `schemaVersion` 與遷移函式，讀得懂現有 v1 分類進度。
- 單字需要穩定 ID。現在 `sourceNo` 會在不同分類重複，未來多字庫時應使用 `vocabularySetId + categoryEn + sourceNo + word` 或資料產生腳本輸出的 `wordId`。
- `js/app.js` 已經同時負責 DOM、練習流程、儲存、發音與結果統計。下一輪功能前建議先拆出小型模組，但仍用 classic script，避免破壞 `file://`。
- 測試需要從語法檢查升級到流程 smoke test。至少要覆蓋載入字庫、選分類、完成一輪、保存進度、重開後續練、重設進度。
- 發音邏輯應抽象成 `playPronunciation(word)`，之後才能加靜態 MP3 優先、Web Speech API fallback。

## 小版本計畫

### 0.1.0 發佈目前分類 Mission 基線

- [x] 確認目前 `main` 分支功能可以作為 `0.1.0`：分類、10/20/30/全部、分類進度、資料產生腳本、README 部署說明。
- [x] 首頁加入 GitHub Pages 常見的 footer metadata：`© 2026 James.L` 與 `v0.1.0`。
- [x] 執行語法與資料驗證。
- [x] 更新版本參數或 release notes。
- [x] 打 tag / GitHub release，作為後續小版本的穩定回滾點。

驗收：

- [x] `node --check scripts/generate-vocabulary-js.js`
- [x] `node --check js/app.js`
- [x] `node --check js/vocabulary.js`
- [x] `node scripts/generate-vocabulary-js.js`
- [x] 本地打開 `index.html` 可以完成一輪練習。

### 0.1.1 補測試與版本流程

- [x] 改寫 README，使其符合常見 GitHub repo 結構：簡介、Demo、Features、Quick Start、Project Structure、Data Workflow、Verification、Deployment、Roadmap、Changelog。
- [x] 新增無瀏覽器依賴的 Node smoke test，模擬 DOM 與 `localStorage`，覆蓋目前主流程。
- [x] 新增 `scripts/verify-release.js` 或 README 指令區塊，集中執行語法檢查、資料檢查與 smoke test。
- [x] 在 README 補上「小版本發布檢查清單」。

驗收：

- [x] 一條命令可完成主要驗證。
- [x] 不改使用者可見流程。

### 0.2.0 單字級熟練度資料模型

- [ ] 在儲存資料中加入 `schemaVersion`。
- [ ] 新增 per-word mastery record，建議欄位：`knownCount`、`unknownCount`、`lastPracticedAt`、`lastResult`、`streakKnown`、`masteryLevel`、`nextReviewAt`。
- [ ] 實作 v1 到 v2 遷移：保留分類 `nextStartIndex`，新增空的單字紀錄。
- [ ] 完成一輪時同步更新單字級紀錄，但 UI 仍維持目前結算頁。

驗收：

- [ ] 舊版 v1 進度不會消失。
- [ ] 使用者完成一輪後仍能照原方式繼續下一輪。
- [ ] reset progress 能清除 v2 狀態。

### 0.2.1 複習入口最小版

- [ ] 首頁新增「今日複習」或「需要複習」入口，只列出 `nextReviewAt <= today` 或 `lastResult=unknown` 的字。
- [ ] 複習模式仍使用現有單字卡與「學會了 / 還不會」按鈕。
- [ ] 結算頁顯示本輪複習統計，不改分類 mission 流程。

驗收：

- [ ] 沒有複習字時，原分類練習仍是主入口。
- [ ] 有複習字時，能完成複習並更新熟練度。

### 0.3.0 發音資源架構

- [ ] 定義靜態音檔命名規則，例如 `audio/<vocabularySetId>/<wordId>.mp3`。
- [ ] 抽出發音播放層：優先播放 MP3，失敗時 fallback 到 `speechSynthesis`。
- [ ] 先加入少量試點音檔，確認跨瀏覽器播放與 fallback。

驗收：

- [ ] 沒有音檔的字仍可用 Web Speech API 發音。
- [ ] 音檔載入失敗不阻塞練習流程。

### 0.4.0 多字庫資料模型設計

- [ ] 定義 `vocabularySetId`、字庫 metadata、匯入格式與資料驗證規則。
- [ ] 儲存狀態按 `vocabularySetId` 分區，避免不同字庫進度混淆。
- [ ] 先做內建多字庫選擇，不急著做線上匯入 UI。

驗收：

- [ ] 現有 G6 字庫的進度可以保留。
- [ ] 新字庫不會讀到舊字庫進度。

## 發佈原則

- 每個版本只交付一個主題，不把資料模型、UI 大改和音檔系統混在同一版。
- 每次改 `js/app.js`、`js/vocabulary.js` 或 `css/style.css`，同步更新 `index.html` 的版本參數。
- 先本地驗證，再推 GitHub Pages。
- 若涉及 `localStorage` schema，必須先寫遷移與回歸測試，再改 UI。
- 對日常使用有風險的功能先藏在新增入口，不改掉既有分類練習主流程。
