# Life Reroll 前端素材包交接

交接基準：2026-10-16。目前正式遊戲入口為 `/full`（根路徑亦顯示同一遊戲）。

## 交付內容與責任邊界

本包包含 React／TypeScript 前端原始碼、樣式、地圖、車輛、場景與事件圖片、前端 API 契約、已建置靜態檔案，以及素材對照文件。不包含 Python 後端、SQLite、玩家存檔、帳號資料、環境機密、node_modules 或伺服器部署設定。

| 項目 | 前端負責 | 後端負責 |
| --- | --- | --- |
| 畫面 | 地圖、移動動畫、擲骰動畫、彈窗、資產呈現 | 回傳權威狀態及可用操作 |
| 擲骰與事件 | 送出操作、播放動畫、顯示結果、繼續 | 骰值、時間推進、事件觸發、金額與理賠結算 |
| 日常程序 | 依 daily_phase 與 allowed_actions 顯示按鈕 | 驗證只能在家擲骰、先上班、下班返家及目的地限制 |
| 金融 | 投資中心／銀行、人壽介面與輸入 | 商品、報價、期限、交易、保單與帳本 |
| 儲存 | 重新讀取狀態、安全重試 | 每次成功寫入自動保存；正式存檔不在前端 |
| 帳號 | 登入表單、session 顯示 | Cookie、驗證、CSRF、權限 |

單獨開啟完整前端不會產生完整遊戲後端。`/demo` 是既有離線原型，使用 localStorage，規則和正式流程不同；`/city` 與 `/place/work`、`/place/finance` 等為既有展示畫面，不能當作正式遊戲的操作規範。這些展示入口保留給美術預覽。

## 啟動與部署

1. 安裝 Node.js 22.13 以上與 pnpm，解壓縮後執行 `pnpm install`。
2. 執行 `pnpm dev`，開啟 `http://127.0.0.1:5173/full`。
3. 完整遊戲須另外啟動相容後端於 `http://127.0.0.1:8000`；本包不提供後端。
4. `pnpm build` 產生 `dist`；`pnpm preview` 於 4173 預覽。包內已附 `dist`，但不能以雙擊 HTML 的 file:// 方式使用。

開發及預覽代理都把 `/api` 轉送至 8000。正式部署須自行設定同網域 `/api` 反向代理，並為 `/full` 等路徑提供 SPA fallback 至 index.html。開發代理不會被編入靜態檔；請勿將 API 請求導回 index.html。保持 Cookie 同源，勿混用 localhost 與 127.0.0.1。正式環境的 Cookie／HTTPS 策略由後端部署人員確認。

## 基礎運作實際流程

1. `local/main.tsx` 依 URL 選擇完整遊戲或展示入口；`GameApp` 使用 `useGame` 讀取 bootstrap、session、目前 campaign 與 run。
2. 需要登入、驗證或建立人生時顯示帳號介面；新人生先完成初始配置確認，才進入正常回合。
3. 在家且 `daily_phase=HOME_READY`，可擲骰或主動前往金融大樓；目前不提供主動前往醫院或休閒區。
4. 擲骰送出 D01，前端播放動畫，依後端回應刷新狀態。`ADVANCING` 期間不顯示事件彈窗；依操作流程讀取推進結果。
5. 若有事件，按後端狀態處理 `EVENT_PENDING`／`FUNDING`／`EVENT_RESULT`。事件由系統結算，使用者只看圖片、描述、事件前後金額及「繼續」；資金不足時仍須依後端資金處理規則完成，不能只在前端略過。
6. 醫療事件被動觸發醫院場景，顯示費用與結果；查看畫面不重複收費。事件確認後由後端恢復原場景／繼續流程，不能以一般主動旅行取代。
7. 事件處理完成後進入 `TURN_REVIEW`，檢視資產變化並確認回合結算。接著 `WORK_REQUIRED`，必須去工作區。
8. 到工作區進入 `WORKING`；完成工作透過 C08（`complete_work:true`），進入 `RETURN_HOME`，前端接續返家移動。
9. 回家後恢復 `HOME_READY`，可以直接擲骰，或去金融大樓再回家。不能在外擲骰。
10. 人生結束 `ENDED` 顯示報告與可用的重生流程；操作是否可執行以後端 `allowed_actions` 為準。

上述 daily_phase 與 run.status 是不同維度：前者表示日常行程，後者表示事件／結算等遊戲狀態，不能僅以場景名稱推導允許的操作。移動動畫只呈現結果，不是交易提交點；後端狀態可能先於動畫更新，動畫未完成前須維持操作鎖。

## API 與狀態串接

- `lib/contracts/operations.json`：操作 ID、HTTP 方法、路徑及輸入輸出索引；`schema.json` 為資料契約，`lib/game-types.ts` 為前端型別。
- `lib/game-client.ts`：API 統一入口。讀取 `/api/v1/bootstrap` 與 `/api/v1/auth/session`，其餘路徑依操作索引產生。成功回應採 `{data: ...}` 包裝。
- 非 GET 操作使用 `Idempotency-Key`，有 session 時帶 `X-CSRF-Token`；使用 same-origin Cookie。寫入版本由 `use-game.ts` 封裝，請沿用 `game.write`，勿直接改畫面上的餘額當作完成交易。
- 網路中斷不代表寫入失敗。應先同步或沿用原請求識別安全重試，不能產生新識別重送同一筆交易。
- `useResource` 僅顯示符合當前請求 key 的資料，避免上一事件內容閃現。`lib/game-panels.ts` 同步推導目前彈窗，擲骰／移動／ADVANCING 時隱藏彈窗。請勿恢復以延後 effect 開啟舊面板的作法。
- 正式進度由後端被動記錄，沒有手動儲存按鈕。底部進程列已移除；必要錯誤使用浮層，避免改變地圖可用高度。

## 素材與版面維護

| 位置 | 用途 |
| --- | --- |
| public/life-reroll-city.png | 原始中心地圖 |
| public/life-reroll-city-panorama.png | 寬幅延伸地圖 |
| components/city-map-artwork.tsx、lib/map-artwork.ts | 底圖組合與鏡頭 |
| lib/map-data.ts、lib/travel.ts | 地點座標、車輛道路與行駛路徑 |
| public/car-*.png | 車輛方向素材 |
| public/scene-home.png、scene-*.webp | 房間與各機構場景 |
| public/events、public/event-media.json | 事件圖片與映射 |
| components/game/viewport.css | 固定視窗、地圖與浮層尺寸 |
| components/game/routine-scene.tsx | 在家、工作及旅行按鈕 |
| components/game/finance-reception.tsx | 金融大樓分區與對話呈現 |

地圖中心座標與原道路軌跡必須保留；適配橫幅時擴展周圍或等比縮放，不能只換圖卻不校對車輛路線。標示含生活區（家）、工作區、金融區、休閒區；地圖保留休閒區建築不代表允許主動旅行。

替換事件圖片：放入 `public/events/FA06.webp` 等事件編號檔名，再執行 `pnpm sync:event-images`。素材包的同步工具讀取 `content/events.json`（只供圖片對照，不參與遊戲結算），不依賴 backend 資料夾。支援 webp、avif、png、jpg、jpeg；辨識編號不分大小寫，manifest 保留真實檔名，部署時檔案路徑大小寫必須一致。`Mapped 0` 代表沒有辨識到對應圖片，並不表示已加入圖片。詳細對照見 `EVENT_IMAGE_INDEX.md`。

## 驗收與限制

交接前請測：登入恢復、在家擲骰、連續事件、醫院費用、結算後上班、下班返家、金融交易返家、重新整理恢復、斷線安全重試、窄螢幕與橫幅、彈窗置中及切換無舊內容閃現。完整流程需相容後端，純素材預覽不能替代驗收。

本包來源版本已完成 50 項後端測試、三輪隔離完整流程及前端建置；這不代表未來獨立部署的 API、Cookie 與反向代理已驗證。素材包另進行獨立前端建置，結果記錄於包內 BUILD_INFO.json。無附第三方素材授權證明；對外發布前由交接方確認素材及依賴使用權限。
