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
        // アグリゲートトランザクションのみ抽出
        const aggTxes = [];
        for (let idx = 0; idx < txs.length; idx++) {
            if (txs[idx].transaction.transactions.find(t => t.transaction.type === 16724)) {
                aggTxes.push(txs[idx].transaction.transactions);
            }
        } 

        // 先頭メッセージでソート
        const sortedAggTxes = aggTxes.sort(function (a, b) {
            if (!a[0].transaction.message) a[0].transaction.message = "";
            if (!b[0].transaction.message) b[0].transaction.message = "";
            if (Number(decodeHexMessage(a[0].transaction.message)) > Number(decodeHexMessage(b[0].transaction.message))) {
                return 1;
            } else {
                return -1;
            }
        });

        // メッセージフィールドをデコード
        for (let i = 0; i < sortedAggTxes.length; i++) {
            for (let j = 0; j < sortedAggTxes[i].length; j++) {
                if (sortedAggTxes[i][j].transaction && sortedAggTxes[i][j].transaction.message) {
                    sortedAggTxes[i][j].transaction.message = decodeHexMessage(sortedAggTxes[i][j].transaction.message);
                }
            }
        }

        // ヘッダー・データ結合用オブジェクト
        let mergedMessageObj = {
            header: {
                MIME: null,
                serial: null,
                id: null,
                message: null,
                owner: null,
                extension_1: null,
                extension_2: null,
                extension_3: null,
                extension_4: null,
                extension_5: null,
                extension_6: null,
                extension_7: null,
                extension_8: null,
                extension_9: null,
                extension_10: null
            },
            data: "" // ← 初期値は空文字列
        };

        // MIMEタイプとbase64データを取得
        const match = sortedAggTxes[0][15].transaction.message.match(/^data:([^;]+);base64,(.*)$/);
        if (!match) {
            console.error("MIMEとBase64の分離に失敗しました");
            return;
        }
        mergedMessageObj.header = {
            mimeType: match[1],
            id: sortedAggTxes[0][2].transaction.message,
            serial: sortedAggTxes[0][3].transaction.message,
            owner: sortedAggTxes[0][1].transaction.message,
            message: sortedAggTxes[0][4].transaction.message,
            extension_1: sortedAggTxes[0][5].transaction.message ?? "",
            extension_2: sortedAggTxes[0][6].transaction.message ?? "",
            extension_3: sortedAggTxes[0][7].transaction.message ?? "",
            extension_4: sortedAggTxes[0][8].transaction.message ?? "",
            extension_5: sortedAggTxes[0][9].transaction.message ?? "",
            extension_6: sortedAggTxes[0][10].transaction.message ?? "",
            extension_7: sortedAggTxes[0][11].transaction.message ?? "",
            extension_8: sortedAggTxes[0][12].transaction.message ?? "",
            extension_9: sortedAggTxes[0][13].transaction.message ?? "",
            extension_10: sortedAggTxes[0][14].transaction.message ?? ""
        };

        // データ部の結合
        for (let i = 0; i < sortedAggTxes.length; i++) {
            for (let j = 0; j < sortedAggTxes[i].length; j++) {
                if (sortedAggTxes[i][j].transaction) {
                    // messageがない場合は空文字をセット
                    if (typeof sortedAggTxes[i][j].transaction.message !== "string") {
                        sortedAggTxes[i][j].transaction.message = "";
                    }
                    const message = sortedAggTxes[i][j].transaction.message;

                    if (i === 0) {
                        // i=0の時はj<15はheader、j>=15はdata
                        if (j >= 15) {
                            mergedMessageObj.data += message;
                        }
                    } else {
                        // i>0の時はj=0をスキップし、j>=1から結合
                        if (j >= 1) {
                            mergedMessageObj.data += message;
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
     * @returns {Promise<string>} デコードされたメッセージ
     */
    async decodeHexMessage(hex) {
    if (!hex || hex.length < 2) return '';
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const decoder = new TextDecoderClass('utf-8');
    // 先頭1バイトはメッセージタイプなので除外
    let decoded = decoder.decode(bytes.subarray(1))
    // 文字列の最初と最後の空白を削除
    return decoded;
}




}


export default SymbolTransactionFetcher;