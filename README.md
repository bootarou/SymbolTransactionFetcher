
# SymbolTransactionFetcher

**SymbolTransactionFetcher** は、Symbolブロックチェーンから高速かつ安定的にトランザクション履歴を取得するJavaScriptユーティリティクラスです。  
複数ノードからの並列取得、プログレストラッキング、NFTDriveデータの復元機能を搭載しています。

---

## 🇯🇵 概要（Japanese Summary）

SymbolTransactionFetcher は、Symbolブロックチェーン上のトランザクション履歴をアドレスを指定して複数のノードから並列取得するユーティリティクラスです。

### 主な特徴

- **安定版API**: 単一ノードでインデックス取得、複数ノードで並列実体取得
- **プログレストラッキング**: リアルタイムで進捗状況を監視
- **重複排除**: ハッシュベースの自動重複排除機能
- **NFTDriveデータ復元**: メタデータおよびbase64データの完全復元
- **欠損検出**: トランザクション欠損の自動検出と完全性レポート
- **Node.js / ブラウザ両対応**: Webpackでバンドル可能

---

## 🔧 Installation

Clone this repository:

```bash
git clone https://github.com/bootarou/SymbolTransactionFetcher.git
```

You can use it either in:

- Browser (via bundled script)
- Node.js (via `require()` or `import`)

---

## 🌐 Browser Usage

ブラウザで使用する場合は、バンドルされたファイルを読み込みます：

```html
<script src="./sample/bundle.min.js"></script>
<script>
  const nodes = [
    "https://sn1.msus-symbol.com:3001",
    "https://ichigo-node.xyz:3001",
    "https://0-0-0-0.symbol-nodes.jp:3001"
  ];

  const fetcher = new SymbolTransactionFetcher(nodes);
  
  // 推奨: 安定版APIを使用
  fetcher.fetchAllAggregatesStable("YOUR-ADDRESS-HERE", {
    indexNodeIndex: 0,
    indexPageSize: 100,
    indexTypes: [16705], // Aggregate Complete
    concurrency: 2,
    retries: 3
  }).then(txs => {
    console.log("取得したトランザクション:", txs);
  });
  
  // プログレス監視
  const timer = setInterval(() => {
    const progress = fetcher.getProgress();
    console.log(`進捗: ${progress.percentage}% - ${progress.message}`);
    if (progress.phase === 'complete') {
      clearInterval(timer);
    }
  }, 100);
</script>
```

---

## 🖥️ Node.js Usage

```js
const SymbolTransactionFetcher = require('./node/index.js');

const nodes = [
  "https://sn1.msus-symbol.com:3001",
  "https://ichigo-node.xyz:3001",
  "https://0-0-0-0.symbol-nodes.jp:3001"
];

const fetcher = new SymbolTransactionFetcher(nodes);

// 安定版APIで取得
fetcher.fetchAllAggregatesStable("YOUR-ADDRESS-HERE", {
  indexNodeIndex: 0,
  indexPageSize: 100,
  indexTypes: [16705],
  concurrency: 2,
  retries: 3
}).then(txs => {
  console.log("取得したトランザクション:", txs.length, "件");
});
```

---

## 🔍 API Reference

### `fetchAllAggregatesStable(address, options)` ⭐️ 推奨

**安定版トランザクション取得API** - 単一ノードでインデックス取得、複数ノードで並列実体取得

```js
fetcher.fetchAllAggregatesStable(address, {
  indexNodeIndex: 0,        // インデックス取得に使用するノード番号
  indexPageSize: 100,       // 1ページあたりの取得件数
  indexTypes: [16705],      // トランザクションタイプ (16705: Aggregate Complete)
  concurrency: 2,           // 並列実行数
  retries: 3                // リトライ回数
})
```

**戻り値**: `Promise<Array>` - トランザクション配列

---

### `getAllTransactionsAggregate(address)` ⚠️ 非推奨

複数ノードから並列でアグリゲートトランザクションを取得します。

> **注意**: このメソッドは非推奨です。代わりに `fetchAllAggregatesStable()` を使用してください。

**戻り値**: `Promise<Array>` - アグリゲートトランザクション配列

---

### `getNFTDriveData(transactions, options)`

NFTDriveデータを復元します。

```js
fetcher.getNFTDriveData(transactions, { 
  debugger: true  // デバッグモードを有効化
}).then(result => {
  console.log("ヘッダー:", result.header);
  console.log("データ:", result.data);
  console.log("欠損情報:", result.debugInfo);
});
```

**パラメータ**:
- `transactions` (Array): トランザクション配列
- `options.debugger` (boolean): デバッグモード有効化

**戻り値**: `Promise<Object>`

```json
{
  "header": {
    "mimeType": "image/png",
    "id": "mosaicId",
    "serial": "serialNumber",
    "owner": "address",
    "message": "original message",
    "extension_1": "",
    ...
    "extension_10": ""
  },
  "data": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "debugInfo": {
    "lostCount": 3,
    "missingMessages": [10, 25, 42],
    "completenessPercentage": "97.50",
    "messageRange": {
      "min": 1,
      "max": 120
    }
  }
}
```

---

### `getProgress()`

現在のプログレス状態を取得します。

**戻り値**: `Object`

```js
{
  phase: 'fetching-details',    // idle, fetching-list, fetching-details, complete
  currentStep: 50,               // 現在のステップ
  totalSteps: 100,               // 総ステップ数
  percentage: 50,                // 進捗率 (0-100)
  message: 'トランザクション詳細を取得中... (50/100)',
  details: {
    fetched: 50,                 // 取得済み件数
    total: 100                   // 総件数
  }
}
```

---

### `resetProgress()`

プログレス状態をリセットします。

---

## 📊 プログレストラッキング

リアルタイムでデータ取得の進捗を監視できます：

```js
const fetcher = new SymbolTransactionFetcher(nodes);

// プログレス監視開始
const progressTimer = setInterval(() => {
  const progress = fetcher.getProgress();
  
  console.log(`${progress.percentage}% - ${progress.message}`);
  console.log(`取得済み: ${progress.details.fetched}/${progress.details.total}`);
  
  if (progress.phase === 'complete') {
    clearInterval(progressTimer);
    console.log('完了！');
  }
}, 100);

// データ取得開始
fetcher.fetchAllAggregatesStable(address, options)
  .then(txs => {
    console.log("取得完了:", txs.length, "件");
  });
```

---

## 🎯 使用例

完全な使用例は以下を参照してください：

- **NFTDriveデータ取得サンプル**: [`sample/sample-get-nftdriveData.html`](./sample/sample-get-nftdriveData.html)
- **基本的な使用方法**: [`sample/sample.html`](./sample/sample.html)
- **サンプルドキュメント**: [`sample/README.md`](./sample/README.md)

---

## 🔧 ビルド

```bash
npm install
npm run build
```

バンドルされたファイルは `sample/bundle.min.js` に出力されます。

See also: [`sample/sample-get-nftdriveData.html`](./sample/sample-get-nftdriveData.html)

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE.txt).

---

## 👤 Author

Created by [NFTDrive](https://nftdrive.net) & bootarou  
(c) 2025 NFTDrive

## 作者

Copyright (c) 2025 NFTDrive & bootarou
