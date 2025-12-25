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

        // ★ プログレス管理
        this.progress = {
            phase: 'idle', // idle, fetching-list, fetching-details, processing, complete
            currentStep: 0,
            totalSteps: 0,
            percentage: 0,
            message: '',
            details: {
                fetched: 0,
                total: 0
            }
        };
    }

    /**
     * アグリゲートトランザクション履歴を高速取得（複数ノード並列、重複排除付き）
     * @param {string} address - 取得したいSymbolアドレス
     * @returns {Promise<Array>} アグリゲートトランザクション配列
     * @deprecated このメソッドは非推奨です。代わりにfetchAllAggregatesStableを使用してください。
     */
    async getAllTransactionsAggregate(address) {
        const pageSize = 100;
        const transactions = [];
        let pageNumber = 1;
        let hasMoreData = true;
        let lastTxHash = null;
        let actualDataAdded = false;

        // ハッシュベースの重複排除
        const seenHashes = new Set();

        // ページング処理
        while (hasMoreData) {
            const fetchPromises = [];

            // 複数ノードから並列取得
            for (let nodeIndex = 0; nodeIndex < this.nodeCount; nodeIndex++) {
                const nodeUrl = this.nodes[nodeIndex];
                let requestUrl = `${nodeUrl}/transactions/confirmed?address=${address}&type=16705&pageSize=${pageSize}&pageNumber=${pageNumber}&order=desc`;

                fetchPromises.push(
                    fetch(requestUrl, { timeout: 5000 })
                        .then(response => response.ok ? response.json() : null)
                        .catch(() => null) // エラーは静かに無視
                );
                pageNumber++;
            }

            if (fetchPromises.length === 0) {
                throw new Error("利用可能なノードがありません");
            }

            const results = await Promise.all(fetchPromises);
            actualDataAdded = false;

            // 結果を処理
            for (const result of results) {
                if (result && Array.isArray(result.data) && result.data.length > 0) {
                    for (const tx of result.data) {
                        const txHash = tx.meta?.hash;

                        if (!txHash) {
                            continue; // ハッシュがない場合はスキップ
                        }

                        // 重複チェック
                        if (!seenHashes.has(txHash)) {
                            transactions.push(tx);
                            seenHashes.add(txHash);
                            actualDataAdded = true;
                        }
                    }
                    lastTxHash = result.data[result.data.length - 1].meta.hash;
                }
            }

            if (!actualDataAdded) {
                hasMoreData = false;
            }
        }

        return transactions;
    }

    /**
     * トランザクション内のメッセージの連続性を解析する
     * @param {Array} aggTxes - アグリゲートトランザクション配列  
     * @returns {Object} 解析結果（欠損メッセージ、完全性など）
     */
    async analyzeLostTransactions(aggTxes) {

        const fetched = await Promise.all(promises);

        // 取得できたものだけ返す
        for (const tx of fetched) {
            if (tx) results.push(tx);
        }

        // 取得失敗したハッシュ数をログ
        const failedCount = fetched.filter(tx => tx === null).length;
        if (failedCount > 0) {
            console.warn(`⚠ ${failedCount}/${hashArray.length} ハッシュの取得に失敗しました`);
        }

        // ★ プログレス更新
        this.progress.percentage = 66;

        return results;
    }

    /**
 * トランザクション番号の連続性をチェックする関数
 * @param {Array} aggTxes - ソート済みのアグリゲートトランザクション配列
 * @returns {Object} {dataCount: 数, notfoundNumber: [抜けた番号の配列]}
 */

    async checkTransactionNumberContinuity(aggTxes) {
        const messageData = [];



        // 各トランザクション配列インデックスとそのメッセージ内容を対応付け
        for (let txIndex = 0; txIndex < aggTxes.length; txIndex++) {
            const aggTx = aggTxes[txIndex];
            if (aggTx[0] && aggTx[0].transaction && aggTx[0].transaction.message) {
                const rawMessage = aggTx[0].transaction.message;
                const decoded = rawMessage;
                const msgNum = Number(decoded);

                if (!isNaN(msgNum)) {

                    // ★ some() を使用して重複チェック
                    if (messageData.some(d => d.messageNumber === msgNum)) {

                        // すでにあるハッシュを表示
                        const existingEntry = messageData.find(d => d.messageNumber === msgNum);
                        console.warn(`重複検知: messageNumber ${msgNum} が既に存在します。Tx配列[${txIndex}]のデータをスキップします。既存のデータ:`, existingEntry.hashed, "新規データ:", aggTx[0]);

                    } else {
                        messageData.push({
                            txArrayIndex: txIndex,
                            messageNumber: msgNum,
                            decoded: decoded,
                            hashed: aggTx[0]

                        });
                    }

                    // console.log(`[Tx配列[${txIndex}]] ✓ messageNumber: ${msgNum}`);
                } else {
                    // console.warn(`[Tx配列[${txIndex}]] ✗ 数値変換失敗: decoded="${decoded}"`);
                }
            }
        }

        // メッセージ番号でソート
        const sorted = messageData.sort((a, b) => a.messageNumber - b.messageNumber);
        const existingNumbers = new Set(messageData.map(d => d.messageNumber));

        if (messageData.length === 0) {
            console.log("メッセージが取得できていません");
            return {
                transactionArrayCount: aggTxes.length,
                messageNumbers: [],
                missingMessages: [],
                messageRange: { min: 0, max: 0 },
                isComplete: false,
                completenessPercentage: "0.00",
                extractedData: []
            };
        }

        // 最小・最大を直接計算
        const allNums = messageData.map(d => d.messageNumber);
        const minMsg = Math.min(...allNums);
        const maxMsg = Math.max(...allNums);
        const expectedRange = maxMsg - minMsg + 1;

        // 欠損メッセージを検出
        const missingMessages = [];
        for (let i = minMsg; i <= maxMsg; i++) {
            if (!existingNumbers.has(i)) {
                missingMessages.push(i);
            }
        }

        const completenessPercentage = ((messageData.length / expectedRange) * 100).toFixed(2);

        return {
            transactionArrayCount: aggTxes.length,
            messageNumbers: allNums,
            missingMessages: missingMessages,
            messageRange: { min: minMsg, max: maxMsg },
            isComplete: missingMessages.length === 0,
            completenessPercentage: completenessPercentage,
            extractedData: sorted
        };
    }
    /**
     * トランザクション配列からNFTDriveデータを組み立てる
     * @param {Array} transactions - トランザクション配列
     * @param {Object} options - オプション設定
     * @param {boolean} options.debugger - デバッグモードの有効化
     * @returns {Promise<Object>} ヘッダーとデータを含むオブジェクト
     */
    async getNFTDriveData(transactions, options = { debugger: false }) {
        const filteredTxs = transactions;

        if (filteredTxs.length === 0) {
            throw new Error("有効なアグリゲートトランザクションが見つかりません");
        }

        // アグリゲートトランザクションからインナートランザクションを抽出
        const aggTxes = [];
        for (let idx = 0; idx < filteredTxs.length; idx++) {
            aggTxes.push(filteredTxs[idx].transaction.transactions);
        }
        // ★ 先頭メッセージでソート＆重複排除
        const messageNumMap = new Map(); // messageNumber → aggTx（最初に見つけたもの保持）
        const duplicateTracking = {
            found: [],
            discarded: []
        };
        for (let i = 0; i < aggTxes.length; i++) {
            const aggTx = aggTxes[i];
            if (!aggTx[0].transaction.message) {
                aggTx[0].transaction.message = "";
            }
            const msgHex = aggTx[0].transaction.message;
            const msgDecoded = this.decodeHexMessage(msgHex);
            const msgNum = Number(msgDecoded);
            if (!isNaN(msgNum)) {
                if (messageNumMap.has(msgNum)) {
                    // ★ 重複検出
                    const existingIdx = -1;
                    for (let [idx, m] of messageNumMap.entries()) {
                        if (m === aggTx) existingIdx = idx;
                    }
                    duplicateTracking.found.push({
                        messageNumber: msgNum,
                        currentIndex: i,
                        existingIndex: -1,
                        currentMsg: msgDecoded.substring(0, 50),
                        decodedHex: msgHex.substring(0, 32)
                    });
                    console.warn(`⚠ 重複検出: messageNumber ${msgNum} [Tx${i}] は既に存在します`);
                    duplicateTracking.discarded.push(msgNum);
                } else {
                    // ★ 初めて見つけたナンバーを記録
                    messageNumMap.set(msgNum, aggTx);
                }
            } else {
                console.warn(`⚠ messageNumber 数値変換失敗 [Tx${i}]: "${msgDecoded.substring(0, 50)}..."`);
            }
        }

        // ★ messageNumMap をソート
        const sortedEntries = Array.from(messageNumMap.entries()).sort((a, b) => a[0] - b[0]);
        const sortedAggTxes = sortedEntries.map(entry => entry[1]);

        if (duplicateTracking.found.length > 0) {
            console.warn(`\n📊 重複検出詳細:`, duplicateTracking.found.slice(0, 5));
            if (duplicateTracking.found.length > 5) {
                console.warn(`  ... 他 ${duplicateTracking.found.length - 5}個`);
            }
        }

        const uniqueAggTxes = sortedAggTxes;

        if (uniqueAggTxes.length === 0) {
            console.error("有効なアグリゲートトランザクションがありません");
            return null;
        }
        // メッセージをデコード
        for (let i = 0; i < uniqueAggTxes.length; i++) {
            for (let j = 0; j < uniqueAggTxes[i].length; j++) {
                if (uniqueAggTxes[i][j].transaction && uniqueAggTxes[i][j].transaction.message) {
                    uniqueAggTxes[i][j].transaction.message = this.decodeHexMessage(uniqueAggTxes[i][j].transaction.message);
                }
            }
        }
        let lostAnalysis;
        if (options.debugger) {
            lostAnalysis = this.analyzeLostTransactions(uniqueAggTxes);
            if (lostAnalysis.missingMessages.length > 0) {
                console.warn(`⚠ 警告: ${lostAnalysis.missingMessages.length}個のトランザクションが欠損しています！`);
                console.warn(`  完全性: ${lostAnalysis.completenessPercentage}%`);
                console.warn(`  欠損トランザクション番号: [${lostAnalysis.missingMessages.join(', ')}]`);
            }
        } else {
            lostAnalysis = {
                missingMessages: [],
                completenessPercentage: 100
            };
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
                extension_10: null
            },
            data: "",
            debugInfo: {
                size: null,
                duplicateTracking: duplicateTracking,
                lostTransactionAnalysis: lostAnalysis
            }
        };

        // MIMEデータ取得（複数のパターンに対応）
        let isMimeFormat = false;
        // パターン1: インデックス15がdata:...;base64,...形式
        if (uniqueAggTxes[0][15] && uniqueAggTxes[0][15].transaction.message) {
            const match = uniqueAggTxes[0][15].transaction.message.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
                isMimeFormat = true;
                mergedMessageObj.header.mimeType = match[1];
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
                console.log(`✓ ヘッダー情報を抽出（MIME: ${match[1]}）`);
            }
        }

        // データ部の結合
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
        // パターン2: インデックス15が暗号化されたBase64データの場合
        if (!isMimeFormat) {
            console.log("インデックス15がMIME形式ではありません。暗号化データとして処理します。");
            mergedMessageObj.header.mimeType = "text/plain";
        }
        // データサイズ（UTF-8バイト長）を計算
        mergedMessageObj.debugInfo.size = await this.getUtf8ByteLength(mergedMessageObj.data);
        // ★ プログレス完了
        this.progress.phase = 'complete';
        this.progress.percentage = 100;
        this.progress.message = '完了';
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
        if (!hex || hex.length < 2) {
            console.warn(`⚠ decodeHexMessage: 入力が空または短すぎます: "${hex}"`);
            return '';
        }

        try {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));

            const decoder = new TextDecoder('utf-8');
            // ★ 入力のサイズをチェック
            if (bytes.length < 2) {
                // console.warn(`⚠ decodeHexMessage: バイト長が短すぎます (${bytes.length})`,hex);
                return '';
            }


            // 先頭1バイト（メッセージタイプ）を除外
            let decoded = decoder.decode(bytes.subarray(1));

            // ★ null文字のみ除外（trim()は使わない）
            decoded = decoded.replace(/\0+$/, '');

            // console.log(`✓ decodeHexMessage: hex="${hex.substring(0, 10)}..." → decoded="${decoded.substring(0, 30)}..."`);
            return decoded;
        } catch (error) {
            console.error(`✗ decodeHexMessage エラー:`, error.message, `入力: "${hex}"`);
            return '';
        }
    }

    /**
 * NFTDriveデータの詳細解析ツール
 * @param {Array} txs - トランザクション配列
 * @returns {Object} 解析結果
 */
    analyzNFTDriveData(txs) {
        const analysis = {
            totalTxs: txs.length,
            aggregates: []
        };

        for (let txIdx = 0; txIdx < txs.length; txIdx++) {
            const tx = txs[txIdx];
            const innerTxCount = tx.transaction?.transactions?.length || 0;

            if (innerTxCount < 16) continue;

            const innerTxes = tx.transaction.transactions;
            const aggAnalysis = {
                index: txIdx,
                innerTxCount,
                payloads: []
            };

            // 各インナートランザクションのペイロード解析
            for (let i = 0; i < innerTxCount; i++) {
                const payload = innerTxes[i].transaction?.message?.payload || '';

                aggAnalysis.payloads.push({
                    index: i,
                    hexLength: payload.length,
                    hexFirstChars: payload.substring(0, 20),
                    hexLastChars: payload.substring(Math.max(0, payload.length - 20)),
                    decodedLength: payload.length / 2 - 1, // 16進→バイナリ、先頭1バイト除外
                    decodedValue: this.decodeHexMessage(payload).substring(0, 50)
                });
            }

            // ペイロード16以降の結合シミュレーション
            if (innerTxCount > 15) {
                const mimeHex = innerTxes[15].transaction?.message?.payload || '';
                const mimeData = this.decodeHexMessage(mimeHex);

                let combinedHex = '';
                let combinedLength = 0;
                for (let i = 16; i < innerTxCount; i++) {
                    const payload = innerTxes[i].transaction?.message?.payload || '';
                    combinedHex += payload;
                    combinedLength += payload.length;
                }

                // 16進数をBase64に変換した場合のサイズ計算
                const base64Length = Math.ceil(combinedLength / 2 * 4 / 3);
                const expectedBase64Length = Math.ceil((mimeData.length + combinedLength / 2) * 4 / 3);

                aggAnalysis.dataAnalysis = {
                    mimeHexLength: mimeHex.length,
                    mimeDecodedLength: mimeHex.length / 2 - 1,
                    mimeData: mimeData,
                    payloadHexLength: combinedLength,
                    payloadBinaryLength: combinedLength / 2,
                    combinedBase64Length: expectedBase64Length,
                    base64Modulo4: expectedBase64Length % 4,
                    isValid4Modulo: expectedBase64Length % 4 === 0
                };
            }

            analysis.aggregates.push(aggAnalysis);
        }

        return analysis;
    }

    /**
     * 欠損トランザクションの詳細分析
     * @param {Object} continuityCheck - checkTransactionNumberContinuity()の戻り値
     * @returns {Object} 詳細分析結果
     */
    analyzeLostTransactions(aggTxes) {
        const messageData = [];

        // 各トランザクション配列インデックスとそのメッセージ内容を対応付け
        for (let txIndex = 0; txIndex < aggTxes.length; txIndex++) {
            const aggTx = aggTxes[txIndex];
            if (aggTx[0] && aggTx[0].transaction && aggTx[0].transaction.message) {
                const rawMessage = aggTx[0].transaction.message;
                const msgNum = Number(rawMessage);

                if (!isNaN(msgNum)) {
                    messageData.push({
                        txArrayIndex: txIndex,
                        messageNumber: msgNum
                    });
                }
            }
        }

        console.log("\n=== 抽出結果 ===");
        console.log(`取得Tx数: ${messageData.length}個`);
        const extractedNums = messageData.map(d => d.messageNumber).sort((a, b) => a - b);
        console.log("抽出されたmessageNumber:", extractedNums);

        // メッセージ番号でソート
        const sorted = messageData.sort((a, b) => a.messageNumber - b.messageNumber);

        // **実際に存在するメッセージ番号のセット**
        const existingNumbers = new Set(messageData.map(d => d.messageNumber));

        if (messageData.length === 0) {
            return {
                transactionArrayCount: aggTxes.length,
                messageNumbers: [],
                missingMessages: [],
                messageRange: { min: 0, max: 0 },
                isComplete: false,
                completenessPercentage: "0.00",
                extractedData: []
            };
        }

        // 最小・最大を直接計算
        const allNums = messageData.map(d => d.messageNumber);
        const minMsg = Math.min(...allNums);
        const maxMsg = Math.max(...allNums);
        const expectedRange = maxMsg - minMsg + 1;

        console.log(`取得メッセージ番号範囲: ${minMsg} ～ ${maxMsg}`);
        console.log(`実取得メッセージ数: ${messageData.length}個`);
        console.log(`期待メッセージ数: ${expectedRange}個`);
        console.log(`取得Tx配列数: ${aggTxes.length}個`);

        // **期待される範囲内で、実際に存在しないメッセージ番号を検出**
        const missingMessages = [];

        for (let i = minMsg; i <= maxMsg; i++) {
            if (!existingNumbers.has(i)) {
                missingMessages.push(i);
                if (missingMessages.length <= 10) {
                    console.log(`  ✗ messageNumber ${i}: 欠損`);
                }
            }
        }
        if (missingMessages.length > 10) {
            console.log(`  ... 他 ${missingMessages.length - 10}個欠損`);
        }

        // ★ 修正：実取得 ÷ 期待 で計算（欠損を反映）
        const completenessPercentage = (((messageData.length - missingMessages.length) / expectedRange) * 100).toFixed(2);

        console.log("\n=== 最終結果 ===");
        console.log(`期待messageNumber範囲: ${minMsg} ～ ${maxMsg} (合計${expectedRange}個)`);
        console.log(`実取得: ${messageData.length}個`);
        console.log(`欠損: ${missingMessages.length}個`);
        console.log(`欠損メッセージ: [${missingMessages.join(', ')}]`);
        console.log(`完全性: ${completenessPercentage}%`);
        console.log(`✓ 欠損分析完了: トランザクションメモリプール溢れによる欠損の可能性あり`);

        return {
            transactionArrayCount: aggTxes.length,
            isComplete: missingMessages.length === 0,
            completenessPercentage: completenessPercentage,
            missingMessages: missingMessages,
            messageRange: {
                min: minMsg,
                max: maxMsg
            },
            expectedCount: expectedRange,
            actualCount: messageData.length
            // extractedData: sorted,
            // messageNumbers: allNums
        };
    }

    /**
      * 欠損分析の検証用ツール
      * @param {Object} continuityCheck - checkTransactionNumberContinuity()の戻り値
      * @returns {Object} 検証結果
   */
    verifyLostTransactions(continuityCheck) {
        const { numbers, notfoundNumber, extractedData } = continuityCheck;

        const verification = {
            isValid: true,
            errors: [],
            details: {
                totalExtracted: numbers.length,
                expectedRange: {
                    min: Math.min(...numbers),
                    max: Math.max(...numbers),
                    count: Math.max(...numbers) - Math.min(...numbers) + 1
                },
                lostCount: notfoundNumber.length,
                samplingCheck: []
            }
        };

        // 抽出データのサンプリング検証
        if (extractedData && extractedData.length > 0) {
            // 最初、中央、最後をチェック
            const checkIndices = [0, Math.floor(extractedData.length / 2), extractedData.length - 1];

            checkIndices.forEach(idx => {
                if (idx < extractedData.length) {
                    const data = extractedData[idx];
                    verification.details.samplingCheck.push({
                        index: idx,
                        extracted: data,
                        isValid: typeof data.number === 'number' && !isNaN(data.number)
                    });
                }
            });
        }

        // 欠損番号が範囲内か確認
        if (notfoundNumber.length > 0) {
            const minNum = Math.min(...numbers);
            const maxNum = Math.max(...numbers);

            notfoundNumber.forEach(lostNum => {
                if (lostNum < minNum || lostNum > maxNum) {
                    verification.isValid = false;
                    verification.errors.push(`欠損番号${lostNum}が範囲外（${minNum}-${maxNum}）`);
                }
            });
        }

        console.log("=== 欠損検出の検証 ===");
        console.log("検証結果:", verification.isValid ? "✓ 正常" : "✗ 異常");
        console.log("詳細:", verification.details);

        return verification;
    }

    //新しいアグリゲートトランザクション取得関数
    /**
     * 1ノード固定で confirmed tx を安定取得（offsetカーソル）
     * - pageNumberは常に1
     * - offsetに「最後のentry id」を入れて次ページへ進める
     * @param {string} address
     * @param {object} opts
     * @param {number} opts.nodeIndex
     * @param {number} opts.pageSize (10..100)
     * @param {number[]} opts.types
     * @param {string} opts.order ("asc"|"desc")
     * @returns {Promise<Array<{hash:string, entryId:string, height:number, timestamp:string}>>}
     */
    async fetchAggregateHashesOneNodeOffset(address, opts = {}) {
        const {
            nodeIndex = 0,
            pageSize = 100,
            // Aggregate Complete(16705) だけで良いなら [16705]
            // 必要なら [16705, 16961] など
            types = [16705],
            // 多くの運用では desc が扱いやすい
            order = "desc"
        } = opts;

        const node = this.nodes[nodeIndex];
        if (!node) throw new Error(`nodeIndex ${nodeIndex} is invalid`);

        const results = [];
        let offset = undefined;

        while (true) {
            const typeParams = types.map(t => `type=${encodeURIComponent(t)}`).join("&");

            // ★ pageNumberは固定（1）でOK、offsetでページングする
            let url =
                `${node}/transactions/confirmed?address=${encodeURIComponent(address)}` +
                `&${typeParams}` +
                `&pageSize=${pageSize}` +
                `&pageNumber=1` +
                `&order=${encodeURIComponent(order)}`;

            if (offset) url += `&offset=${encodeURIComponent(offset)}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status} at ${url}`);
            const json = await res.json();

            const data = Array.isArray(json.data) ? json.data : [];
            if (data.length === 0) break;

            for (const item of data) {
                const hash = item?.meta?.hash;
                const entryId = item?.id; // ← レスポンス要素の「entry id」
                const height = Number(item?.meta?.height ?? 0);
                const timestamp = item?.meta?.timestamp ?? "";

                if (hash && entryId) results.push({ hash, entryId, height, timestamp });
            }

            // ★ 次のoffsetは「このページの最後のentry id」
            offset = data[data.length - 1]?.id;
            if (!offset) break;
        }

        return results;
    }

    /**
     * ノード分散で /transactions/confirmed/{hash} を並列取得する
     * - concurrency制限
     * - 失敗時は別ノード含めてリトライ
     *
     * @param {string[]} hashes
     * @param {object} opts
     * @param {number} opts.concurrency - 同時実行数（目安：nodeCount*2～*4）
     * @param {number} opts.retries - リトライ回数
     * @param {number} opts.baseDelayMs - リトライ待ち（指数バックオフの基準）
     * @returns {Promise<Array<{hash:string, tx:any}>>}
     */
    async fetchAggregatesByHashParallel(hashes, opts = {}) {
        const {
            concurrency = Math.max(4, (this.nodeCount || this.nodes.length) * 2),
            retries = 4,
            baseDelayMs = 250
        } = opts;

        const nodes = this.nodes.filter(Boolean);
        if (nodes.length === 0) throw new Error("No nodes available");

        // 簡易 sleep
        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // あるhashを1回試す（nodeIndex指定）
        const tryFetchOnce = async (hash, nodeIndex) => {
            const node = nodes[nodeIndex % nodes.length];
            const url = `${node}/transactions/confirmed/${encodeURIComponent(hash)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            return json;
        };

        // hashをリトライ込みで取る（ノードをローテーション）
        const fetchWithRetry = async (hash, startNodeIndex) => {
            let lastErr = null;

            for (let attempt = 0; attempt <= retries; attempt++) {
                const nodeIndex = (startNodeIndex + attempt) % nodes.length;
                try {
                    const tx = await tryFetchOnce(hash, nodeIndex);
                    return { hash, tx };
                } catch (e) {
                    lastErr = e;
                    // backoff（軽め）
                    const wait = baseDelayMs * Math.pow(2, attempt);
                    await sleep(wait);
                }
            }

            // 最後まで失敗
            throw new Error(`Failed to fetch hash=${hash}: ${lastErr?.message || lastErr}`);
        };

        // concurrency制限付きワーカー
        const out = new Array(hashes.length);
        let idx = 0;
        let completed = 0;

        // プログレス初期化
        this.progress.phase = 'fetching-details';
        this.progress.totalSteps = hashes.length;
        this.progress.currentStep = 0;
        this.progress.percentage = 0;
        this.progress.message = `トランザクション詳細を取得中... (0/${hashes.length})`;
        this.progress.details.total = hashes.length;
        this.progress.details.fetched = 0;

        const worker = async (workerId) => {
            while (true) {
                const myIndex = idx++;
                if (myIndex >= hashes.length) break;

                const hash = hashes[myIndex];
                try {
                    // workerId を起点にノードをばらけさせる
                    out[myIndex] = await fetchWithRetry(hash, workerId);
                } catch (e) {
                    out[myIndex] = { hash, tx: null, error: String(e?.message || e) };
                }

                // プログレス更新
                completed++;
                this.progress.currentStep = completed;
                this.progress.percentage = Math.floor((completed / hashes.length) * 100);
                this.progress.message = `トランザクション詳細を取得中... (${completed}/${hashes.length})`;
                this.progress.details.fetched = completed;
            }
        };

        const workers = Array.from({ length: Math.min(concurrency, hashes.length) }, (_, w) => worker(w));
        await Promise.all(workers);

        // 完了
        this.progress.phase = 'complete';
        this.progress.percentage = 100;
        this.progress.message = '完了';

        return out;
    }

    /**
     * 安定取得（索引は1ノード固定、実体は並列）
     */
    async fetchAllAggregatesStable(address, opts = {}) {
        const {
            indexNodeIndex = 0,
            indexPageSize = 100,
            indexTypes = [16705], // 必要なら [16705, 16961]
            concurrency,
            retries
        } = opts;

        // プログレス初期化
        this.progress.phase = 'fetching-list';
        this.progress.currentStep = 0;
        this.progress.totalSteps = 0;
        this.progress.percentage = 0;
        this.progress.message = 'トランザクションリストを取得中...';
        this.progress.details.fetched = 0;
        this.progress.details.total = 0;

        // 1) 索引（hash一覧）
        const index = await this.fetchAggregateHashesOneNodeOffset.call(this, address, {
            nodeIndex: indexNodeIndex,
            pageSize: indexPageSize,
            types: indexTypes,
            order: "desc",
        });

        // dedupe（念のため）
        const seen = new Set();
        const hashes = [];
        for (const it of index) {
            if (!seen.has(it.hash)) {
                seen.add(it.hash);
                hashes.push(it.hash);
            }
        }

        // 2) 実体（hash直指定で並列）
        const items = await this.fetchAggregatesByHashParallel.call(this, hashes, {
            concurrency,
            retries
        });

        // 失敗だけ抽出したい場合
        const failed = items.filter(x => !x?.tx);
        if (failed.length) {
            console.warn(`Failed hashes: ${failed.length}`, failed.slice(0, 5));
        }

        // txだけ返す（必要に応じて整形）
        return items.map(item => item.tx);
    }

    /**
     * 現在のプログレス状態を取得
     * @returns {Object} プログレス情報
     */
    getProgress() {
        return { ...this.progress };
    }


    /**
     * プログレスをリセット
     */
    resetProgress() {
        this.progress = {
            phase: 'idle',
            currentStep: 0,
            totalSteps: 0,
            percentage: 0,
            message: '',
            details: {
                fetched: 0,
                total: 0
            }
        };
    }



}

export default SymbolTransactionFetcher;