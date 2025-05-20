# SymbolTransactionFetcher

SymbolTransactionFetcherは、Symbolブロックチェーンのトランザクション履歴を複数ノードから効率的に取得できるjs用ユーティリティクラスです。

## 特徴

- 複数のSymbolノードを利用した分散・並列リクエストによる高速なトランザクション取得
- アドレス単位で全トランザクションやアグリゲートトランザクションの取得が可能
- トランザクションハッシュ配列からの詳細取得もサポート
- NFTDriveデータの復元メソッドも搭載
- サーバー・クライアント両対応（Node.js推奨）
  

## インストール

リポジトリをクローンしてご利用ください。




### ブラウザ版

バンドル版を読み込みます。

dist/bundle.main.js

## 設定例

```html
<script src="bundle.min.js"></script>
<script>
const NODELIST = [
  "https://symbol-node1.example.com:3001",
  "https://symbol-node2.example.com:3001",
  "https://symbol-node3.example.com:3001"

  ];
    
const fetcher = new SymbolTransactionFetcher(NODELIST);
    fetcher.getAllTransactions("あなたのアドレス")
       .then(txs => console.log(txs));

</script>
```


### nodejs版


node/inde.js or src/sybmol-transaction-fetcher.js

## 設定例

```javascript

const SymbolTransactionFetcher = require('./symbol-transaction-fetcher.js');
const nodes = [
  "https://symbol-node1.example.com:3001",
  "https://symbol-node1.example.com:3001",
  "https://symbol-node3.example.com:3001"
];
const fetcher = new SymbolTransactionFetcher(nodes);

fetcher.getAllTransactions("あなたのアドレス")
  .then(txs => console.log(txs));
```

### 共通

Symbolノードを設定する。




## 主な機能

- `getAllTransactions(address::string)`  
  指定アドレスの全トランザクション履歴を取得
  出力はデフォルトRESTのまま全てを返します。

- `getAllTransactionsAggregate(address::string)`  
  指定アドレスのアグリゲートトランザクション履歴を取得
  アグリゲートインナートランザクションを含む全てをデフォルトのRESTを返します。

- `fetchTransactionsByHashes(hashes::array)`  
  トランザクションハッシュ配列から取得
  デフォルトRESTを返します。

- `getNFTDriveData(txdata:array)`  
  NFTDriveデータの復元
  デフォルトのRESTを引数に入れます。
  詳しくは
  
  - sample/sample-get-nftdriveData.html


  ヘッダー付きbase64データを返します。

```json

{"header":
    {
    "mimeType": "MIMETYPE",
    "id": "Mosaic or Id",
    "serial": "Serial",
    "owner": "ownerAddress",
    "message": "Message",
    "extension_1": "",
    "extension_2": "",
    "extension_3": "",
    "extension_4": "",
    "extension_5": "",
    "extension_6": "",
    "extension_7": "",
    "extension_8": "",
    "extension_9": "",
    "extension_10": ""
     }
,"data":"base64/.................."
}


```


## ライセンス

このプロジェクトは [MIT ライセンス](./LICENSE.txt) のもとで公開されています。


## 作者

Copyright (c) 2025 NFTDrive & bootarou
