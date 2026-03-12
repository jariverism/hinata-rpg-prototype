# 日向坂RPG 依存ゼロ静的プロトタイプ

外部ライブラリなし・npm依存なしで動く、静的プロトタイプです。

## ファイル構成

- `index.html`
- `style.css`
- `script.js`

## 実装範囲

- タイトル画面
- 日向城ハブ（矢印移動 + Spaceインタラクト）
- 会話UI
- 宴シーン
- 宴の5択
  - 戦利品を調べる
  - レイと話す
  - コノカと話す
  - スズカと話す
  - 宴をもう少し見る
- LocalStorageセーブ（キー: `hinata-rpg-proto-save`）

## 起動方法

`index.html` をブラウザでそのまま開いて実行できます。

## セーブ仕様

保存対象:
- `location`
- `objective`
- `party`
- `facilities`
- `importantFlags`
- `topics`
- `dialogLog`

## 参照資料について

以下の資料を参照対象とします。
- `01_日向坂RPG_常時参照用まとめ_v7.docx`
- `02_日向坂RPG_現在の進行状況.docx`
- `03_日向坂RPG_ステート管理.docx`
- `原本_002_日向坂RPG_南の音楽家の村まで.docx`