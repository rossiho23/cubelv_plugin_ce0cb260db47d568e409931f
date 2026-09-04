# GitHub 上傳助手

選擇本機檔案或資料夾，輸入 GitHub 帳號、PAT、倉庫名稱，一鍵自動建立並上傳到 GitHub 私人倉庫。

## 功能

- **拖拽 / 選擇檔案或資料夾**：支援檔案多選與整個資料夾選擇（保留子目錄結構）
- **一鍵建立並上傳**：填寫 GitHub 帳號、PAT、倉庫名稱，按鈕送出即可
- **模式切換**：建立新倉庫 / 推到既有倉庫（自動偵測 repo 是否存在）
- **私人 / 公開切換**：預設建立私人倉庫
- **客製 commit 訊息**：每個檔案 commit 都帶你的訊息
- **進度條**：每個檔案上傳狀態即時顯示
- **失敗容錯**：部分檔案失敗不影響其他檔案上傳，最後彙整成功 / 失敗清單
- **上傳紀錄**：每次操作寫入 item，可在側邊欄「上傳紀錄」資料夾查看歷史
- **PAT 安全**：PAT 只存在瀏覽器記憶體、不寫入 item / localStorage

## 使用方式

1. 在 App 側邊欄點開 **GitHub 上傳** → **GitHub 上傳助手**
2. 點「**如何取得 PAT？**」申請 GitHub Personal Access Token（需要 Contents: Read and write 權限）
3. 拖拽檔案 / 資料夾或點擊選擇
4. 填寫：
   - GitHub 帳號
   - GitHub PAT
   - 倉庫名稱（英文 / 數字 / `.` / `_` / `-`）
   - 上傳模式（建立新 / 推到既有）
   - Commit 訊息
   - 是否私人
5. 按「**建立並上傳**」或「**上傳到既有倉庫**」
6. 等待進度條跑完，會顯示 repo URL 與失敗清單（若有）

## 技術架構

- **前端框架**：React + TypeScript
- **SDK**：`@cubelv/sdk`（Plugin / View / useItemsByType / fetchExternal）
- **GitHub API**：
  - `GET /user` 取得登入用戶
  - `POST /user/repos` 建立倉庫（帶 `auto_init`）
  - `GET /repos/{owner}/{repo}/contents/{path}` 取得既有檔案 SHA（更新需要）
  - `PUT /repos/{owner}/{repo}/contents/{path}` 上傳或更新檔案
- **資料型別**：GITHUB_UPLOAD_RECORD_FOLDER / GITHUB_UPLOAD_RECORD
- **UI 元件**：shadcn/ui（Input / Button / Dialog / Switch / ToggleGroup / PluginTopbar / CustomScrollbar）

### 檔案結構

```
frontend/
├── GithubUploadPlugin.tsx           # 插件入口：register virtual folder + folder
├── schemas/uploadRecordSchema.ts    # 資料型別定義
├── views/UploadView.tsx             # 主畫面：拖拽、表單、上傳、結果
├── views/HistoryView.tsx            # 歷史畫面：列出所有上傳紀錄
├── components/FileDropzone.tsx      # 拖拽 / 選擇檔案元件
├── components/PatGuideDialog.tsx    # PAT 申請教學 Dialog
├── components/GithubUploadRecordItem.tsx  # 單筆紀錄元件（嵌卡用）
├── lib/githubApi.ts                 # GitHub API 封裝
└── bundle.js                        # esbuild 打包產物
```

### GITHUB_UPLOAD_RECORD 欄位

| 欄位 | 型別 | 說明 |
|------|------|------|
| repoOwner | string | GitHub 帳號 |
| repoName | string | 倉庫名稱 |
| repoUrl | string | 倉庫 URL |
| isPrivate | boolean | 是否私人 |
| commitSha | string | 最後一個 commit SHA |
| commitMessage | string | commit 訊息 |
| fileCount | number | 成功上傳檔案數 |
| failedFiles | string | 失敗檔案清單（JSON 陣列字串） |
| status | string | success / partial / failed |
| errorMessage | string | 失敗時的錯誤訊息 |

## 開發指引

### 本地修改後發布

```bash
# 1. 編譯 bundle
node /app/config/esbuild-plugin-bundle.mjs \
  frontend/GithubUploadPlugin.tsx \
  frontend/bundle.js

# 2. 驗證
bash /app/config/plugin-validator.sh .

# 3. 提交
git add -A && git commit -m "描述修改內容"

# 4. 發布（透過 MCP tool plugin_publish）
```

### 注意事項

- GitHub PAT 使用 fine-grained token，需要 `Contents: Read and write` 權限
- 單檔限制 100 MB（GitHub Contents API 上限）
- 大量檔案建議分批上傳（每次 ≤ 50 檔體驗較佳）
- PAT 不寫入 item、不寫入 localStorage，只在當下 React state 中
