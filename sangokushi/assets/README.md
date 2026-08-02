# Portrait Assets

このディレクトリは『日向三國志』の正式肖像資産を管理する。

## 構成

```text
assets/
  portraits/
    <member_id>.webp
    mini/
      <member_id>.webp
    icons/
      <member_id>.webp
  data/
    portraits.json
```

## 推奨仕様

### 正式肖像
- WebP
- 768×960 または 1024×1280
- 胸から上
- 文字・UIなし
- 品質 82〜90

### ミニ肖像
- WebP
- 320×320
- 首から上
- 正方形
- 命令結果、軍師助言、戦場ユニットに使用

### アイコン
- WebP
- 128×128
- 円形表示を前提とする正方形画像

## ステータス

- `pending`: 未制作
- `review`: ユーザー確認中
- `approved_pending_export`: 顔デザイン承認済み、ファイル書出し待ち
- `completed`: 3種類の画像とJSON登録が完了

## 実装上の注意

- 軍師助言だけ別の旧画像を使わない。
- すべての画面で `portraits.json` の同一IDを参照する。
- 大型肖像は武将詳細画面に限定する。
- 読み込み失敗時は古いSVGへ自動退避せず、欠損が分かる共通プレースホルダーを表示する。
