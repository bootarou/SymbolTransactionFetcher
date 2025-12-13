# SymbolTransactionFetcher

SymbolTransactionFetcherは、Symbolブロックチェーンのトランザクション履歴を複数ノードから効率的に取得できるjs用ユーティリティクラスです。

## 特徴

- 複数のSymbolノードを利用した分散・並列リクエストによる高速なトランザクション取得
- アドレス単位で全トランザクションやアグリゲートトランザクションの取得が可能
- トランザクションハッシュ配列からの詳細取得もサポート
- NFTDriveデータの復元メソッドも搭載
- サーバー・クライアント両対応（Node.js推奨）

### 信頼性の強化

複数ノードのフェイルオーバー＋リトライ機構により、以下の点で信頼性が大幅に向上しました：

- **ノード障害の自動検出と隔離**: 1つのノードが落ちても自動で別ノードに切り替え
- **段階的リトライ機構**: 通信障害時は最大3回まで段階的にリトライ（500ms → 1000ms → 1500ms）
- **タイムアウト制御**: 応答のない無駄な待機を5秒で強制終了、次のノードに移行
- **失敗ノード隔離**: 既に失敗したノードを記録し、スキップして効率化
- **詳細なログ出力**: 各ノードの接続状況や再試行状況をコンソールで追跡可能
- **部分的成功対応**: 複数ハッシュ取得時にいくつか失敗しても処理を継続

**実際の効果**:
- ネットワーク一時的な遅延でも動作
- ノードメンテナンス中でも他のノードで自動復帰
- トランザクション取得の成功率が大幅向上
- ユーザーのストレス軽減とより良いUX体験
  

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
　- sample/README.md

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
