# Life Reroll 純前端素材包

請先閱讀 [交接文件](docs/FRONTEND_HANDOFF.md)，內含責任邊界、實際程序與素材位置。

- 安裝：`pnpm install`（Node.js >=22.13）
- 開發：`pnpm dev` → http://127.0.0.1:5173/full
- 建置：`pnpm build`
- 預覽：`pnpm preview`
- 型別檢查：`pnpm typecheck`
- 圖片對照：`pnpm sync:event-images`

完整遊戲需要另行提供 8000 後端。本包不含後端及玩家存檔。`/demo` 為獨立離線原型，與正式流程不同。`dist/` 是已建置檔案，須透過 HTTP 伺服器開啟。依賴版本已固定於 package.json，未附獨立 lockfile；首次安裝需要套件網路來源。
