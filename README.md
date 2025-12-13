
# SymbolTransactionFetcher

**SymbolTransactionFetcher** is a JavaScript utility class that efficiently retrieves transaction histories from multiple Symbol blockchain nodes in parallel.  
It is suitable for both server-side and client-side environments (Node.js recommended).

---

## 🇯🇵 概要（Japanese Summary）

SymbolTransactionFetcher は、Symbolブロックチェーン上のトランザクション履歴をアドレスを指定して複数のノードから並列取得するユーティリティクラスです。

### 主な特徴

- 複数ノードに対する並列リクエストによる高速取得
- 通常・アグリゲートトランザクションの取得対応
- トランザクションハッシュ配列からの個別取得
- NFTDriveのメタデータおよびbase64データ復元機能を搭載
- Node.js / ブラウザ両対応（Webpackでバンドル可能）

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

Include the bundled file:

```html
<script src="./dist/bundle.min.js"></script>
<script>
  const nodes = [
    "https://symbol-node1.example.com:3001",
    "https://symbol-node2.example.com:3001",
    "https://symbol-node3.example.com:3001"
  ];

  const fetcher = new SymbolTransactionFetcher(nodes);
  fetcher.getAllTransactions("YOUR-ADDRESS-HERE")
         .then(txs => console.log(txs));
</script>
```

---

## 🖥️ Node.js Usage

```js
const SymbolTransactionFetcher = require('./symbol-transaction-fetcher.js');

const nodes = [
  "https://symbol-node1.example.com:3001",
  "https://symbol-node2.example.com:3001",
  "https://symbol-node3.example.com:3001"
];

const fetcher = new SymbolTransactionFetcher(nodes);

fetcher.getAllTransactions("YOUR-ADDRESS-HERE")
  .then(txs => console.log(txs));
```

---

## 🔍 Function Overview

- `getAllTransactions(address: string): Promise<Array>`

Retrieve all confirmed transactions for the given address.

- `getAllTransactionsAggregate(address: string): Promise<Array>`

Retrieve all aggregate transactions, including inner transactions.

- `fetchTransactionsByHashes(hashes: Array): Promise<Array>`

Fetch transaction details from a list of confirmed transaction hashes.

- `getNFTDriveData(txs: Array): Promise<{ header: object, data: string }>`

- `getNFTDriveData(txdata:array)`  
  NFTDriveデータの復元
  デフォルトのRESTを引数に入れます。
  詳しくは
  
  - sample/sample-get-nftdriveData.html
　- sample/README.md

  ヘッダー付きbase64データを返します。

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
  "data": "base64/encoded/file/contents/..."
}
```

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
