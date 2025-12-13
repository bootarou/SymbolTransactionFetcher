// SPDX-License-Identifier: MIT
// Copyright (c) 2025 NFTDrive

/**
 * Symbolブロックチェーンのトランザクション履歴取得クラス（ノード数に応じた並列取得対応）
 */
class SymbolTransactionFetcher {
    /**
     * @param {string[]} nodes - SymbolノードのURL配列
     */
    constructor(nodes) {
        this.nodes = nodes;
        this.nodeCount = nodes.length;
    }

    /**
     * 指定したアドレスの全トランザクション履歴を高速に取得します（ノード数に応じて並列取得）
     * @param {string} address - 取得したいアドレス
     * @returns {Promise<Array>} トランザクション配列
     */
    async getAllTransactions(address) {
        const pageSize = 100;
        let allTxs = [];
        let currentPage = 1;
        let keepFetching = true;
        let lastId = undefined;

        // まず最初のページを取得
        let url = `${this.nodes[0]}/transactions/confirmed?recipientAddress=${address}&embedded=true&pageSize=${pageSize}&pageNumber=1`;
        const firstRes = await fetch(url);
        if (!firstRes.ok) throw new Error(`HTTPエラー: ${firstRes.status}`);
        const firstData = await firstRes.json();

        if (!Array.isArray(firstData.data) || firstData.data.length === 0) {
            return [];
        }

        allTxs = allTxs.concat(firstData.data);
        currentPage = 2;
        lastId = firstData.data[firstData.data.length - 1]?.id;

        // 2ページ目以降をノード数に応じて並列取得
        while (keepFetching) {
            let promises = [];
            for (let i = 0; i < this.nodeCount; i++) {
                const node = this.nodes[i];
                let pageUrl = `${node}/transactions/confirmed?recipientAddress=${address}&embedded=true&pageSize=${pageSize}&pageNumber=${currentPage}`;
                if (lastId) {
                    pageUrl += `&id=${lastId}`;
                }
                promises.push(fetch(pageUrl).then(res => res.ok ? res.json() : null));
                currentPage++;
            }

            const results = await Promise.all(promises);

            let gotData = false;
            for (const data of results) {
                if (data && Array.isArray(data.data) && data.data.length > 0) {
                    allTxs = allTxs.concat(data.data);
                    lastId = data.data[data.data.length - 1]?.id;
                    gotData = true;
                }
            }
            if (!gotData) {
                keepFetching = false;
            }
        }

        return allTxs;
    }

    /**
     * 指定アドレスのアグリゲートトランザクション履歴を高速取得
     * @param {string} address - 取得したいアドレス
     * @returns {Promise<Array>} アグリゲートトランザクション配列
     */
    async getAllTransactionsAggregate(address) {
        const pageSize = 100;
        let allTxs = [];
        let currentPage = 1;
        let keepFetching = true;
        let lastId = undefined;

        // まず最初のページを取得
        let url = `${this.nodes[0]}/transactions/confirmed?address=${address}&type=16961&type=16705&pageSize=${pageSize}&pageNumber=1`;
        const firstRes = await fetch(url);
        if (!firstRes.ok) throw new Error(`HTTPエラー: ${firstRes.status}`);
        const firstData = await firstRes.json();

        if (!Array.isArray(firstData.data) || firstData.data.length === 0) {
            return [];
        }

        allTxs = allTxs.concat(firstData.data);
        currentPage = 2;
        lastId = firstData.data[firstData.data.length - 1]?.id;

        // 2ページ目以降をノード数に応じて並列取得
        while (keepFetching) {
            let promises = [];
            for (let i = 0; i < this.nodeCount; i++) {
                const node = this.nodes[i];
                let pageUrl = `${node}/transactions/confirmed?address=${address}&type=16961&type=16705&pageSize=${pageSize}&pageNumber=${currentPage}`;
                if (lastId) {
                    pageUrl += `&id=${lastId}`;
                }
                promises.push(fetch(pageUrl).then(res => res.ok ? res.json() : null));
                currentPage++;
            }

            const results = await Promise.all(promises);

            let gotData = false;
            for (const data of results) {
                if (data && Array.isArray(data.data) && data.data.length > 0) {
                    allTxs = allTxs.concat(data.data);
                    lastId = data.data[data.data.length - 1]?.id;
                    gotData = true;
                }
            }
            if (!gotData) {
                keepFetching = false;
            }
        }

        return allTxs;
    }

    /**
     * 複数ノードでトランザクションハッシュ配列を高速取得する関数
     * @param {Array} hashes - 取得したいトランザクションハッシュの配列（複数可）
     * @param {Array} nodes - SymbolノードのURL配列
     * @returns {Promise<Array>} 取得できたトランザクション情報の配列
     */
    async fetchTransactionsByHashes(hashes) {
        const hashArray = hashes.map(tx => tx.meta && tx.meta.hash ? tx.meta.hash : null).filter(hash => hash !== null);
        if (hashArray.length === 0) {
            throw new Error("ハッシュの配列が空です");
        }

        const results = [];
        const nodeCount = this.nodes.length;
        // ハッシュごとにノードをラウンドロビンで割り当てて並列リクエスト
        const promises = hashArray.map((hash, idx) => {
            const node = this.nodes[idx % nodeCount];
            const url = `${node}/transactions/confirmed/${hash}`;
            return fetch(url)
                .then(res => res.ok ? res.json() : null)
                .catch(() => null);
        });

        const fetched = await Promise.all(promises);
        // 取得できたものだけ返す
        for (const tx of fetched) {
            if (tx) results.push(tx);
        }
        return results;
    }


    /**
     * トランザクションのメッセージをデコードし、NFTDrive用データを組み立てる
     * @param {Array} txs - トランザクション配列
     * @returns {Promise<object>} header/data分離済みオブジェクト
     */
    async getNFTDriveData(txs) {
        // 転送トランザクション（タイプ16724）を含むアグリゲートトランザクションのみフィルタリング
        const filteredTxs = txs.filter(tx => {
            const hasTransfer = tx.transaction.transactions.some(
                t => t.transaction.type === 16724  // 転送トランザクション（type: 16724）を含む
            );
            return hasTransfer;  // 転送トランザクションを含むものだけ
        });

        if (filteredTxs.length === 0) {
            console.error("転送トランザクションを含むアグリゲートトランザクションが見つかりません");
            return null;
        }

        // アグリゲートトランザクションのみ抽出
        const aggTxes = [];
        for (let idx = 0; idx < filteredTxs.length; idx++) {
            aggTxes.push(filteredTxs[idx].transaction.transactions);
        }

        // 先頭メッセージでソート
        const sortedAggTxes = aggTxes.sort((a, b) => {
            if (!a[0].transaction.message) a[0].transaction.message = "";
            if (!b[0].transaction.message) b[0].transaction.message = "";
            const aNum = Number(this.decodeHexMessage(a[0].transaction.message));
            const bNum = Number(this.decodeHexMessage(b[0].transaction.message));
            if (aNum > bNum) {
                return 1;
            } else if (aNum < bNum) {
                return -1;
            } else {
                return 0;
            }
        });

        // 重複番号を除外（同じ番号の場合は最初のものだけを保持）
        const uniqueAggTxes = [];
        const seenNumbers = new Set();
        for (const aggTx of sortedAggTxes) {
            const num = Number(this.decodeHexMessage(aggTx[0].transaction.message));
            if (!seenNumbers.has(num)) {
                uniqueAggTxes.push(aggTx);
                seenNumbers.add(num);
            }
        }

        if (uniqueAggTxes.length === 0) {
            console.error("有効なアグリゲートトランザクションがありません");
            return null;
        }

        // メッセージフィールドをデコード
        for (let i = 0; i < uniqueAggTxes.length; i++) {
            for (let j = 0; j < uniqueAggTxes[i].length; j++) {
                if (uniqueAggTxes[i][j].transaction && uniqueAggTxes[i][j].transaction.message) {
                    uniqueAggTxes[i][j].transaction.message = this.decodeHexMessage(uniqueAggTxes[i][j].transaction.message);
                }
            }
        }

        // ヘッダー・データ結合用オブジェクト
        let mergedMessageObj = {
            header: {
                mimeType: null,
                id: null,
                serial: null,
                owner: null,
                message: null,
                extension_1: null,
                extension_2: null,
                extension_3: null,
                extension_4: null,
                extension_5: null,
                extension_6: null,
                extension_7: null,
                extension_8: null,
                extension_9: null,
                extension_10: null,
                size: null
            },
            data: ""
        };

        // MIMEデータ取得（複数のパターンに対応）
        let isMimeFormat = false;

        // パターン1: インデックス15がdata:...;base64,...形式
        if (uniqueAggTxes[0][15] && uniqueAggTxes[0][15].transaction.message) {
            const match = uniqueAggTxes[0][15].transaction.message.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
                isMimeFormat = true;
                mergedMessageObj.header.mimeType = match[1];

                // ヘッダー情報を設定
                mergedMessageObj.header.id = uniqueAggTxes[0][2]?.transaction?.message || "";
                mergedMessageObj.header.serial = uniqueAggTxes[0][3]?.transaction?.message || "";
                mergedMessageObj.header.owner = uniqueAggTxes[0][1]?.transaction?.message || "";
                mergedMessageObj.header.message = uniqueAggTxes[0][4]?.transaction?.message || "";
                mergedMessageObj.header.extension_1 = uniqueAggTxes[0][5]?.transaction?.message || "";
                mergedMessageObj.header.extension_2 = uniqueAggTxes[0][6]?.transaction?.message || "";
                mergedMessageObj.header.extension_3 = uniqueAggTxes[0][7]?.transaction?.message || "";
                mergedMessageObj.header.extension_4 = uniqueAggTxes[0][8]?.transaction?.message || "";
                mergedMessageObj.header.extension_5 = uniqueAggTxes[0][9]?.transaction?.message || "";
                mergedMessageObj.header.extension_6 = uniqueAggTxes[0][10]?.transaction?.message || "";
                mergedMessageObj.header.extension_7 = uniqueAggTxes[0][11]?.transaction?.message || "";
                mergedMessageObj.header.extension_8 = uniqueAggTxes[0][12]?.transaction?.message || "";
                mergedMessageObj.header.extension_9 = uniqueAggTxes[0][13]?.transaction?.message || "";
                mergedMessageObj.header.extension_10 = uniqueAggTxes[0][14]?.transaction?.message || "";

                // データ部の結合（インデックス15以降）
                for (let i = 0; i < uniqueAggTxes.length; i++) {
                    for (let j = 0; j < uniqueAggTxes[i].length; j++) {
                        if (uniqueAggTxes[i][j].transaction) {
                            if (typeof uniqueAggTxes[i][j].transaction.message !== "string") {
                                uniqueAggTxes[i][j].transaction.message = "";
                            }
                            const message = uniqueAggTxes[i][j].transaction.message;

                            if (i === 0) {
                                if (j >= 15) {
                                    mergedMessageObj.data += message;
                                }
                            } else {
                                if (j >= 1) {
                                    mergedMessageObj.data += message;
                                }
                            }
                        }
                    }
                }
            }
        }

        // パターン2: インデックス15が暗号化されたBase64データの場合
        if (!isMimeFormat) {
            console.log("インデックス15がMIME形式ではありません。暗号化データとして処理します。");

            // MIMEタイプをテキストに設定
            mergedMessageObj.header.mimeType = "text/plain";

            // インデックス15以降のデータのみを結合（ヘッダーは含めない）
            for (let i = 0; i < uniqueAggTxes.length; i++) {
                for (let j = 0; j < uniqueAggTxes[i].length; j++) {
                    if (uniqueAggTxes[i][j].transaction) {
                        if (typeof uniqueAggTxes[i][j].transaction.message !== "string") {
                            uniqueAggTxes[i][j].transaction.message = "";
                        }
                        const message = uniqueAggTxes[i][j].transaction.message;

                        // i === 0 の場合はインデックス15以降、その他は1以降
                        if (i === 0) {
                            if (j >= 15) {
                                mergedMessageObj.data += message;
                            }
                        } else {
                            if (j >= 1) {
                                mergedMessageObj.data += message;
                            }
                        }
                    }
                }
            }
        }

        // データサイズ（UTF-8バイト長）を計算
        mergedMessageObj.header.size = await this.getUtf8ByteLength(mergedMessageObj.data);

        return mergedMessageObj;
    }
    /**
     * 文字列のUTF-8バイト長を取得
     * @param {string} str
     * @returns {Promise<number>} バイト長
     */
    async getUtf8ByteLength(str) {
        return new TextEncoder().encode(str).length;
    }

    /**
     * メッセージをデコードする関数
     * @param {string} hex - 16進数文字列
     * @returns {string} デコードされたメッセージ
     */
    decodeHexMessage(hex) {
        if (!hex || hex.length < 2) return '';
        const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const decoder = new TextDecoder('utf-8');
        // 先頭1バイトはメッセージタイプなので除外
        let decoded = decoder.decode(bytes.subarray(1));
        // 文字列の最初と最後の空白を削除
        return decoded.trim();
    }



}


export default SymbolTransactionFetcher;