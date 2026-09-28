# NFTDriveData ビューア

Symbol ブロックチェーン上の NFTDrive レコードを取得し、復元・復号してブラウザで表示する単体ページ。
BEYOND 本体が無くても、データアドレスさえ分かればファイルを見られる。

- **読める**: BEYOND が書く保存形式すべて（Base64 / バイナリ、平文 / 暗号化）
- **開けない**: `password` スロットを持たない暗号化ファイル（記録アドレスの鍵でしか開けない）
- **扱わない**: 復旧フレーズ・Address Master Key。入力欄も無い

このページは、NFTDrive レコードを読むデコーダーの参照実装でもある。
形式の詳細な仕様（封筒・Key Slot・AAD）は BEYOND のリポジトリにある
`docs/decoder-migration-guide.md` と `docs/file-envelope-spec.md` が正。

---

## 目次

1. [クイックスタート](#1-クイックスタート)
2. [ファイル構成とビルド](#2-ファイル構成とビルド)
3. [使い方](#3-使い方)
4. [対応範囲](#4-対応範囲)
5. [処理の流れ](#5-処理の流れ)
6. [主な関数](#6-主な関数)
7. [SymbolTransactionFetcher の API](#7-symboltransactionfetcher-の-api)
8. [改修のしかた](#8-改修のしかた)
9. [変更するときの決まりごと](#9-変更するときの決まりごと)
10. [動作確認](#10-動作確認)
11. [制約と既知の制限](#11-制約と既知の制限)
12. [トラブルシューティング](#12-トラブルシューティング)
13. [操作ガイド（利用者向け）](#13-操作ガイド利用者向け)
14. [ライセンス](#14-ライセンス)

---

## 1. クイックスタート

このディレクトリをそのまま **HTTP で配信**する。ビューア自体にビルドは要らない。

```bash
# 例: リポジトリのルートで
npx http-server sample -p 5501
# → http://127.0.0.1:5501/sample-get-nftdriveData.html?address=<データアドレス>
```

VS Code の Live Server でもよい。

> **`file://` で直接開かないこと。** 復号に使う `crypto.subtle` は
> 安全なコンテキスト（`https://` または `http://localhost` / `127.0.0.1`）でしか
> 使えないブラウザがある。使えないと、暗号化ファイルだけが開けない。

公開する場合は HTTPS で配信する。ノードへはブラウザから直接接続する（プロキシ不要）。

---

## 2. ファイル構成とビルド

| ファイル | 役割 |
|---|---|
| `sample-get-nftdriveData.html` | ビューア本体。HTML・CSS・JS がすべてこの1ファイルに入っている |
| `bundle.min.js` | `SymbolTransactionFetcher`。ノードからの取得と Base64 保存モードの復元（§7） |
| `aes.js` | CryptoJS v3.1.2。**旧 crypto-js 形式の復号にだけ**使う |
| `bundle.min.js.LICENSE.txt` | bundle に含まれるライブラリのライセンス表記 |
| `sample.html` | `SymbolTransactionFetcher` の最小の呼び出し例（コンソール出力のみ） |

### bundle.min.js を作り直す

`bundle.min.js` はリポジトリの `browser/symbolFetcher.js` を webpack でまとめたもの。
ソースを直したら、ビルドして `sample/` へコピーする。

```bash
npm install
npm run build                           # → dist/bundle.min.js
cp dist/bundle.min.js sample/bundle.min.js
```

**`dist/` と `sample/` の bundle は同じものにしておくこと。**
食い違うと、どのソースから作ったものか追えなくなる。

---

## 3. 使い方

### データアドレスを渡す

```
https://<配信先>/sample-get-nftdriveData.html?address=NBLTM72ULZH52YKJSV2VFZH44OKL2XFXXJ3MDZQ
```

- `address` はレコードの**データアドレス**（記録者アドレスではない）
- 付けずに開くと、アドレスを尋ねるダイアログが出る
- ネットワークはアドレスの1文字目で決まる。`N` なら mainnet、それ以外は testnet

### 画面の構成

| 領域 | 内容 |
|---|---|
| `#preview` | プレビュー。暗号化されていればここにパスワード欄が出る |
| `#accordion-container` | `header` / `data` / `Node` / `debugInfo` の折りたたみ表 |
| `#debugInfo` | トランザクション構造分析（欠けの有無・完全性） |

### 暗号化ファイル

1. プレビュー欄にパスワード欄が出る
2. 共有パスワードを入れて「復号する」
3. 違っていても欄は残る。そのまま打ち直せる

共有パスワードは1ファイルに最大5本。どれでも開く。
外れのスロット1本の確認に約0.4秒（PBKDF2 600,000回）かかるので、
確認中は「（2 / 5）」のように進みを出す。

---

## 4. 対応範囲

### 保存形式

判別はすべて**ブロック0スロット15**で決まる。

| スロット15の先頭 | 保存モード | 暗号化 | 表示 |
|---|---|---|---|
| `data:` | Base64 | なし | そのまま |
| `U2FsdGVkX1` | Base64 | 旧 crypto-js | パスワード |
| `BYNDE1.` | Base64 | 封筒 | 共有パスワード |
| `nftdrive;binary/<MIME>` | バイナリ | なし | そのまま |
| `nftdrive;binary/encrypted;<MIME>` | バイナリ | 封筒 | 共有パスワード |
| 上記以外 | — | — | 「この保存形式に対応していません」 |

- 暗号化バイナリの封筒は、データ先頭6バイトが `BYNDB1` なら新しい封筒、
  `BYNDE1.` なら古い記録の封筒として読む
- 暗号化バイナリの MIME は、復号前にスロット15から分かる
- `password` スロットが無い封筒は「BEYOND 本体で開いてください」と案内する
- 判別できないものを推測で復元しない。壊れた中身を「読めた」ように見せてしまうため

### レコードの構造

1レコード＝1データアドレス宛の複数のアグリゲート。各アグリゲートは最大100スロット、
1スロット最大1023バイト。取得順はブロック番号と一致しないので、必ず並べ替えてから読む。

| ブロック0のスロット | 内容 |
|---|---|
| 0 | ブロック番号 `"0"` |
| 1 | 作者アドレス（`owner`） |
| 2 | ID（`id`） |
| 3 | シリアル番号（`serial`） |
| 4 | メッセージ（`message`） |
| 5〜14 | 拡張フィールド `extension_1`〜`extension_10`（暗号化されない） |
| 15 | 形式判別スロット（上の表） |
| 16〜99 | データ（Base64 保存モードではスロット15からがデータ） |

ブロック1以降はスロット0がブロック番号、1〜99がデータ。

### MIME

| 種類 | MIME | 表示 |
|---|---|---|
| 画像 | `image/png` `jpeg` `gif` `webp` `avif` `svg+xml` | `<img>`。ホイールで最大5倍ズーム・ドラッグ・ピンチ |
| 動画 | `video/mp4` `webm` `ogg` | `<video controls>` |
| 音声 | `audio/mpeg` `mp3` `wav` `ogg` | `<audio controls>` |
| PDF | `application/pdf` | `<iframe>`（ブラウザ内蔵のビューア） |
| テキスト | `text/plain` `application/json` | 整形済みテキスト。JSON として読めれば整形 |
| CSV | `text/csv` | 整形済みテキスト（表にはしない） |
| HTML | `text/html` | `<iframe>`（§11 の注意を参照） |
| その他 | — | 「対応していないMIMEタイプ」 |

docx / xlsx / CAD / 3D モデル、拡張フィールドの意味付け（改訂リンク・公開レベル・
CC ライセンスなど）は BEYOND 本体だけが扱う。

### 特殊ヘッダー

`OpenSeaAudioWithThumbnail`（音声＋サムネイル）だけ扱う。
`extension_5` のデータアドレスからサムネイルを取得し、プレビューの先頭に置く。
判定は `analyzeSpecialNFTDriveHeader()`（§7）。

---

## 5. 処理の流れ

```
DOMContentLoaded
  └─ fetchAndDisplayNFTDriveData(address)
       ├─ initializeFetcher(address)          ノード一覧を選んでシャッフル
       ├─ fetcher.fetchAllAggregatesStable()  データアドレス宛のアグリゲートを全部取る
       └─ restoreRecord(txResults)            ── スロット15で分岐 ──
            │
            ├─ バイナリ保存モード
            │    ndSortBlocks → ndInspectBlocks → ndRestoreBinary
            │    → { kind:'binary', rec:{ header, bytes, format, debugInfo } }
            │
            └─ それ以外
                 fetcher.getNFTDriveData()  （bundle）
                 → { kind:'base64', nft:{ header, data, debugInfo } }

       renderAccordionFromObject(record.view)
       previewRecord(record, #preview)
            ├─ binaryPreview
            │    ├─ 平文   → renderPreviewBytes
            │    └─ 暗号化 → handleEncryptedBinary → showPasswordForm
            │                  → byndDecryptEnvelope → renderPreviewBytes
            └─ base64Preview
                 ├─ 暗号化 → handleEncryptedData → showPasswordForm
                 │            → 復号 → renderDecryptedData → renderPreview
                 ├─ data:   → renderPreview（base64 → バイト列）→ renderPreviewBytes
                 └─ それ以外 → showUnsupportedFormat
       displayLostTransactionAnalysis(debugInfo)
```

要点は2つ。

- **描画の入口は `renderPreviewBytes(mime, bytes, el)` の1つだけ。**
  Base64 の経路も最後はバイト列にしてここへ来る
- **バイナリ保存モードは文字列を経由しない。** HEX → バイト列 → Blob。
  dataURL にすると V8 の文字列上限（約512MB）に当たる

---

## 6. 主な関数

### 復元（`nd*`）

| 関数 | 役割 |
|---|---|
| `ndHexToBytes(hex)` | Symbol メッセージ（HEX）→ `Uint8Array`。先頭の `0x00` を落とす |
| `ndHexToText(hex)` | 同上 → UTF-8 文字列。メタデータとスロット15にだけ使う |
| `ndSortBlocks(txResults)` | ブロック番号で並べ、重複を落とし、欠けを数える → `{ blocks, nums, missing }` |
| `ndDetectFormat(slot15)` | スロット15の文字列 → `{ mode, encrypted, mimeType, dataStart }` |
| `ndInspectBlocks(sorted)` | ブロック0から形式を判別。ブロック0が16スロット未満なら `null` |
| `ndReadHeader(block0, mime)` | スロット1〜14 → `header`（owner / id / serial / message / extension_1〜10） |
| `ndRestoreBinary(sorted, format)` | バイナリを連結 → `{ header, bytes, format, debugInfo }` |
| `restoreRecord(txResults)` | 上をまとめて呼ぶ入口。Base64 なら bundle へ任せる |
| `previewRecord(record, el)` | `restoreRecord` の結果を描く |

### 封筒（`bynd*`）

| 関数 | 役割 |
|---|---|
| `byndParseEnvelope(text)` | BYNDE1（テキスト）→ 封筒オブジェクト |
| `byndIsBinaryEnvelope(bytes)` | 先頭6バイトが `BYNDB1` か |
| `byndParseBinaryEnvelope(bytes)` | BYNDB1（バイト列）→ 封筒オブジェクト |
| `byndHasPasswordSlot(env)` | `password` スロットがあるか |
| `byndDecryptEnvelope(env, pw, onProgress?)` | 封筒を開いて平文の `Uint8Array` を返す。全スロットを順に試す |
| `byndDecryptWithPassword(text, pw)` | BYNDE1 を開いて平文を**文字列**で返す（互換 API） |
| `byndEncodeFields(...)` / `byndCanonicalJson(v)` | AAD の正規エンコード。BEYOND 本体と1バイトでも違うと開かない |

封筒オブジェクトは `{ format, fileId, keySlots, iv, payload }`。
`format`（`'BYNDE1'` / `'BYNDB1'`）が AAD に入るので、BYNDE1 の中身を BYNDB1 の器へ
移しても開かない（設計どおり）。

### 表示

| 関数 | 役割 |
|---|---|
| `renderPreviewBytes(mime, bytes, el)` | MIME ごとの描画。**新しい型はここに足す** |
| `renderPreview(mime, base64, el)` | base64 をバイト列にして上へ渡す |
| `renderTextBlock(text, tryJson)` | 整形済みテキストの入れ物 |
| `showPasswordForm(el, note, onSubmit)` | パスワード欄。`onSubmit` が例外を投げたら欄を残してメッセージを出す |
| `showUnsupportedFormat(el, head)` / `showPreviewError(el, msg)` | 未対応・エラーの表示。**中身は `textContent` で入れる** |
| `renderObjectAsTable(obj)` | アコーディオンの表。値はエスケープして入れる |

---

## 7. SymbolTransactionFetcher の API

ビューアが使うのは次のメソッドだけ。ソースは `browser/symbolFetcher.js`。

```js
const fetcher = new SymbolTransactionFetcher(['https://node:3001', ...]);

// データアドレス宛のアグリゲートを全部取る
const txResults = await fetcher.fetchAllAggregatesStable(address, {
  indexNodeIndex: 0,
  indexPageSize: 100,
  indexTypes: [16705],   // AGGREGATE_COMPLETE
  concurrency: 2,
  retries: 3
});

// Base64 保存モードの復元（バイナリ保存モードは扱えない）
const { header, data, debugInfo } = await fetcher.getNFTDriveData(txResults, { debugger: true });

// OpenSea サムネイルなどの特殊ヘッダー判定
const { isNomal, type } = await fetcher.analyzeSpecialNFTDriveHeader(header);  // isNomal は原文ママ

// 進み（プログレスバー用）
fetcher.getProgress();   // { percentage, message, details:{fetched,total}, startTime, estimatedTimeRemaining }
fetcher.resetProgress();
```

`txResults` の各要素は `tx.transaction.transactions[i].transaction.message`（HEX 文字列）を持つ。
バイナリ保存モードはこの `message` をビューア側で直接読む。

`getNFTDriveData` はチャンクを UTF-8 テキストとして連結するので、
**バイナリ保存モードのレコードを渡すと中身が壊れる。** 必ず `restoreRecord` を通すこと。

---

## 8. 改修のしかた

### MIME を足す

`renderPreviewBytes` の `switch` に `case` を足す。`mimeType` は小文字化し、
`; charset=…` を落とした状態で届く。

```js
case "image/bmp":          // 既存の画像の case に並べれば、ズームも付く
```

外部ライブラリが要る型（docx など）は、ページの読み込みが重くなるので慎重に。

### ノードを変える

`NODELIST.mainnet` / `NODELIST.testnet`。ホスト名だけを書けば `https://` と `:3001` が付く。
完全な URL（`https://host:3000` など）を書けばそのまま使う。起動のたびにシャッフルする。

### 画面の文言

すべて日本語で、HTML の中に直接書いている。多言語化の仕組みは無い。

### 新しい鍵スロット・封筒の版

**このページだけで決めないこと。** 形式は BEYOND 本体が正で、ビューアはそれに従う。
知らない `type` のスロットは読み飛ばし、自分より新しい `version` は「未対応」として断る。

---

## 9. 変更するときの決まりごと

| 決まり | 理由 |
|---|---|
| 復旧フレーズ・Address Master Key の入力欄を作らない | 利用者の資産と記録をすべて預かることになる |
| チェーン由来の文字列は `textContent` か `kvEscape()` を通して入れる | メッセージや拡張フィールドは誰でも書ける |
| バイナリのチャンクを `TextDecoder` に通さない | 0x80〜0xFF が化け、サイズは合うのに中身だけ壊れる |
| `password` スロットを1本目で打ち切らない | 2本目以降を渡された相手が開けなくなる |
| 判別できない形式を推測で復元しない | 「未対応」と言う方が利用者に親切 |
| 大きなバイト列を dataURL にしない | V8 の文字列上限に当たる。`Blob` を使う |
| `byndDecryptWithPassword(text, pw)` の形を変えない | BEYOND 側の相互運用テストがこの形で呼んでいる |

---

## 10. 動作確認

自動テストは BEYOND のリポジトリにある（ビューアの HTML を抜き出して Node.js で実行し、
BEYOND 本体の暗号化実装で作った封筒と突き合わせている）。
このリポジトリで直したら、BEYOND 側へ取り込んでテストを通すこと。

ブラウザでは、少なくとも次の3種類を1件ずつ開くこと。

- バイナリ平文の画像か PDF
- 共有パスワード付きの暗号化レコード（2本目のパスワードでも開くか）
- 共有パスワード無しの暗号化レコード（案内が出るか）

---

## 11. 制約と既知の制限

| 項目 | 内容 |
|---|---|
| Base64 保存モードの大きさ | 全体を1本の文字列にするので、元ファイルで平文 約383MB、暗号化 約287MB が上限 |
| バイナリ保存モードの大きさ | 文字列の上限は無い。ただし全体をメモリに持つので端末の RAM に依存する |
| 復号の待ち時間 | 外れのスロット1本あたり約0.4秒。5本で約2秒 |
| **HTML レコード** | `<iframe>` に Blob URL で出すため、**レコード内のスクリプトはこのページと同じオリジンで動く**。公開するなら、ほかのサービスと共有しない専用のオリジンで配信すること |
| 配布済みの古いビューア | 2026-09-28 より前のものはバイナリ保存モードを読めない。更新できないので、新しいものを配り直す |
| ノード一覧 | ページに固定で書いてある。ノードが消えたら手で直す |
| 取得のタイムアウト・再試行 | `SymbolTransactionFetcher` の内部で決まる。ビューアから変えられるのは `retries` などの引数だけ |

---

## 12. トラブルシューティング

| 症状 | 原因と対処 |
|---|---|
| 暗号化ファイルだけ開けず、コンソールに `crypto.subtle` のエラー | 安全なコンテキストで開いていない。`https://` か `localhost` で配信する（§1） |
| 「トランザクション取得エラーが発生しました」 | ノードに届いていない。ネットワークと、`NODELIST` のノードが生きているかを確認 |
| 「この保存形式に対応していません」 | スロット15が既知の形式でない。壊れているとは限らない。BEYOND 本体で開く |
| 「このデータは BEYOND 本体で開いてください」 | `password` スロットの無い暗号化ファイル。このページでは開けない |
| 「パスワードが正しくないか、データが壊れています」 | パスワード違い。欄が残っているので打ち直す |
| 「この暗号化形式には対応していません。BEYOND を更新してください。」 | 封筒の版がこのビューアより新しい。ビューアを更新する |
| 表示はされるが中身が壊れている | 欠けたブロックがある。`#debugInfo` の欠損メッセージ数を見る |
| `analyzeSpecialNFTDriveHeader is not a function` | `bundle.min.js` が古い。§2 の手順で作り直す |
| 画像がぼやけて見える | ホイールで拡大する。フルオンチェーンの元データがそのまま出ている |

---

## 13. 操作ガイド（利用者向け）

| 操作 | PC | モバイル |
|---|---|---|
| 拡大・縮小 | マウスホイール（最大5倍） | ピンチ |
| 移動 | 拡大中にドラッグ | — |
| 元に戻す | ダブルクリック | — |

---

## 14. ライセンス

| 対象 | 表記 |
|---|---|
| ビューア・`SymbolTransactionFetcher` | リポジトリの [`LICENSE.txt`](../LICENSE.txt)（MIT） |
| `aes.js` | CryptoJS v3.1.2（© 2009-2013 Jeff Mott）。ファイル先頭の表記を参照 |
| `bundle.min.js` | 同梱ライブラリの表記は `bundle.min.js.LICENSE.txt` |
