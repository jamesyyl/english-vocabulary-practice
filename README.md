# 英語單字練習

這是一個給 7 到 12 歲小學生使用的英語單字練習小工具。第一版是純前端靜態網頁，不需要登入帳號，也不需要後端服務。

目前版本：`0.1.0`

## 快速開始

直接用瀏覽器打開：

```text
index.html
```

第一版設計成可以用 `file://` 直接開啟，因此目前不需要啟動 dev server。

## 目前功能

- 顯示英文單字、詞性、中文意思。
- 顯示簡短英文解釋。
- 顯示常用片語或常見搭配。
- 顯示使用該片語的例句。
- 顯示自然發音拆字提示。
- 使用瀏覽器 Web Speech API / `speechSynthesis` 播放單字發音。
- 提供「學會了」與「還不會」兩個操作。
- 首頁依 `categoryEn` 顯示分類與已完成數 / 分類總數。
- 選擇分類後，可以選本次練習 `10`、`20`、`30` 或該分類剩餘全部單字；分類不足 10 字時允許直接練習全部。
- 完成後顯示本輪統計。
- 可以在同分類繼續下一輪，也可以重複本輪。
- 使用 `localStorage` 保存各分類的本機續學進度。
- 首頁可以重設本機進度。

## 專案結構

```text
index.html
css/
  style.css
js/
  app.js
  vocabulary.js
data/
  G6_vocabulary_p1-p2.original.json
  vocabulary.enriched.json
scripts/
  generate-vocabulary-js.js
README.md
```

## 資料來源

專案內保留的原始複本：

```text
data/G6_vocabulary_p1-p2.original.json
```

這份原始 JSON 包含 230 筆 G6 p1-p2 單字，並保留分類、詞性與中文意思。

## 資料維護方式

目前資料流是：

```text
data/G6_vocabulary_p1-p2.original.json
→ data/vocabulary.enriched.json
→ js/vocabulary.js
→ index.html
```

各檔案用途：

- `data/G6_vocabulary_p1-p2.original.json`: 原始資料複本，不手動改單字、詞性、中文意思。
- `data/vocabulary.enriched.json`: 可維護的補充資料來源，包含英文解釋、例句、片語、自然發音拆字。
- `scripts/generate-vocabulary-js.js`: 從 enriched JSON 驗證並產生前端資料檔。
- `js/vocabulary.js`: 目前前端實際讀取的資料檔，透過 `window.VOCABULARY_DATA` 提供資料。

目前因為第一版要支援直接用 `file://` 開啟，所以前端讀 `js/vocabulary.js`，而不是直接 `fetch()` JSON。維護資料時先修改 `data/vocabulary.enriched.json`，再執行：

```powershell
node scripts/generate-vocabulary-js.js
```

腳本會檢查總筆數、分類筆數、必填補充欄位、重複單字，以及例句是否至少 7 個英文單字；通過後才重新產生 `js/vocabulary.js`。

## 資料品質規則

每筆單字需要保留原始欄位：

- `word`
- `partOfSpeech`
- `chineseMeaning`
- `categoryZh`
- `categoryEn`

每筆單字也需要補齊：

- `englishDefinition`
- `exampleSentence`
- `phrase`
- `phonicsHint`

目前 230 筆皆已補齊，並已驗證：

- 例句至少 7 個英文單字。
- 原始欄位與 `data/G6_vocabulary_p1-p2.original.json` 一致。
- `js/vocabulary.js` 可以正常載入 230 筆資料。

## 驗證指令

語法檢查：

```powershell
node --check scripts/generate-vocabulary-js.js
node --check js/app.js
node --check js/vocabulary.js
```

重新產生前端字庫：

```powershell
node scripts/generate-vocabulary-js.js
```

檢查資料筆數與補充欄位：

```powershell
node -e "const fs=require('fs'); const vm=require('vm'); const js=fs.readFileSync('js/vocabulary.js','utf8'); const sandbox={window:{}}; vm.runInNewContext(js,sandbox); const rows=sandbox.window.VOCABULARY_DATA; const missing=rows.filter(e=>!e.englishDefinition||!e.exampleSentence||!e.phrase||!e.phonicsHint); const short=rows.filter(e=>e.exampleSentence.split(/[^A-Za-z']+/).filter(Boolean).length<7); console.log({total:rows.length, missing:missing.length, shortExamples:short.length});"
```

## GitHub Pages 部署

目前公開頁面：

```text
https://jamesyyl.github.io/english-vocabulary-practice/
```

部署來源是 GitHub repo 的 `main` 分支。一般更新流程：

```powershell
git status
git add <changed-files>
git commit -m "Describe the update"
git push origin main
```

推送成功後，GitHub Pages 通常需要幾十秒到數分鐘重新部署。若要確認線上 HTML 是否已更新，可以用：

```powershell
Invoke-WebRequest -Uri "https://jamesyyl.github.io/english-vocabulary-practice/" -UseBasicParsing -Headers @{ "Cache-Control" = "no-cache" }
```

如果本次更新改到 `js/app.js`、`js/vocabulary.js` 或 `css/style.css`，建議同步更新 `index.html` 裡引用檔案的版本參數，避免瀏覽器或 GitHub Pages CDN 混用新舊檔案。例如：

```html
<link rel="stylesheet" href="css/style.css?v=20260702-category-mission">
<script src="js/vocabulary.js?v=20260702-category-mission"></script>
<script src="js/app.js?v=20260702-category-mission"></script>
```

版本參數只需要在檔案內容有變動時更新，命名可用日期加功能名。若線上畫面仍像舊版，先硬重新整理瀏覽器；再用無快取方式讀取線上 HTML，確認 `index.html` 已部署到最新版本。

## 版本紀錄

目前穩定基線是 `0.1.0`。詳細內容見：

```text
CHANGELOG.md
```

## 第一版限制

- 不做登入、帳號、會員或多人資料。
- 不做雲端同步，進度只保存在同一台設備、同一個瀏覽器。
- 不做後台管理系統。
- 不做預錄真人音檔，目前使用瀏覽器內建發音。
- 不保證不同瀏覽器的發音聲音完全一致。
- 目前不記錄單字級錯題，只保存各分類下一輪起點。

## 後續迭代候選

- 設計單字級錯題 / 複習紀錄。

更完整的小版本計畫、架構檢視與發佈檢查清單記錄在：

```text
TODO.md
```
