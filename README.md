# 日向坂RPG プロトタイプ

Phaser 3 + TypeScript + Vite で作成した、ブラウザ実行の2Dドット調RPG最小プロトタイプです。

## 実装範囲

- タイトル画面（はじめる / つづきから / セーブ初期化）
- 日向城ハブ（トップダウン移動 + インタラクト）
- 会話UI（話者名 + 会話テキスト + ログ保存）
- 宴シーン
- 宴での5択
  - 戦利品を調べる
  - レイと話す
  - コノカと話す
  - スズカと話す
  - 宴をもう少し見る
- LocalStorage セーブ

## セットアップ

```bash
npm install
```

## 起動

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## ビルド

```bash
npm run build
```

## 操作

- 矢印キー: 移動
- Space: 調べる / 会話する
- Esc（宴）: 日向城ハブへ戻る

## セーブ仕様

- LocalStorage キー: `hinata-rpg-proto-save`
- 自動保存タイミング:
  - タイトル操作時
  - 会話発生時
  - 宴の選択時
- 保存データ:
  - 現在地
  - 目的
  - 加入仲間
  - 施設解放
  - 進行フラグ
  - 戦利品
  - 次回議題
  - 会話ログ（最新80件）

## データ構造

- `src/data/characters.ts`: キャラクター定義（ID / 名前 / 役割 / 宿星 / 色）
- `src/data/state.ts`: SaveData 型、初期値、施設・ロケーションID
- `src/data/content.ts`: 施設表示名、戦利品、次回議題
- `src/systems/storage.ts`: LocalStorage 保存 / 読込

## 主要ファイル

- `src/scenes/TitleScene.ts`: タイトル画面
- `src/scenes/HubScene.ts`: 日向城ハブ
- `src/scenes/BanquetScene.ts`: 宴5択シーン
- `src/main.ts`: Phaser 起動設定

## 備考

- 本リポジトリには依頼文で指定された `.docx` 資料（`01_...`, `02_...`, `03_...`, `原本_...`）が配置されていないため、ゲーム要件記述を基準に実装しています。
- 画像素材は未使用で、すべて単色矩形とテキストで仮表示しています。
