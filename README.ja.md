# LazyVim Key-Dojo

English README: [README.md](README.md)

LazyVim Key-Dojoは、LazyVimのキーバインドを反復練習で身につけるためのタイピングゲームです。
シンプルなルールで筋肉記憶の定着を目指します。

## 機能

- 稽古/早駆けの2モード
- カテゴリ別の出題フィルタ
- トークン単位の入力判定と可視化
- 連続正解ボーナスと正確率倍率
- 効果音のON/OFF
- ハイスコアのローカル保存
- 日本語/英語UI
- ファイル/ウィンドウ/バッファ/LSP/ターミナル/Git/検索/UI/診断を中心に90件以上の出題

## モード

- **稽古:** 時間制限なし。ミス時は同トークンを再入力。
- **早駆け:** 制限時間内にできるだけ多く正解。ミス時は即次へ。

## 操作

- `Space` は `<leader>`
- `Escape` は現在のお題リセット

## データ

出題データは [src/data/questions.ts](src/data/questions.ts) にあります。
UI文言は [src/data/i18n.ts](src/data/i18n.ts) で管理しています。

## セットアップ

```bash
npm install
npm run dev
```

## スクリプト

```bash
npm run lint
npm run build
npm run test
npm run test:run
npm run test:ui
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:ui
```

## テスト

- ユニット/統合: Vitest + React Testing Library
- E2E: Playwright (Chromium)

一括実行:

```bash
npm run test:run
npm run test:e2e:install
npm run test:e2e
```

## 仕様書

- 日本語: [lazyvim_key_dojo_spec.md](../lazyvim_key_dojo_spec.md)
- English: [lazyvim_key_dojo_spec.en.md](../lazyvim_key_dojo_spec.en.md)
