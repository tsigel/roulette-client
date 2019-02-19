import {
    broadcast,
    canSetBet, getKeeperParamsFromTransfer,
    getNextGame, getRouletteDataValue,
    getTransferWithId,
    getTxById, getUserData,
    toBase58,
    waitTransaction,
    WavesKeeper
} from '../utils';
import { ROULETTE_PUBLIC_KEY } from '../constants';
import { libs } from '@waves/signature-generator';
import { storage } from '../storage/Storage';
import { head } from 'ramda';


export function registerBet(betType: number, bet: number): Promise<void> {
    if (!canSetBet()) {
        return Promise.reject('Can\'t set bet!');
    }

    return getUserData().then((data) => {

        const nextGame: number = getNextGame() as number;
        const key = toBase58(nextGame);
        const tx = head(storage.getBalanceForRegisterBet()) || getTransferWithId(1, data.publicKey);

        return Promise.all([
            getTxById(tx.id)
                .then(() => ({ status: true, tx }))
                .catch(() => ({ status: false, tx })),
            getBetSum(key)
        ])
            .then(([{ status, tx }, betSum]: any): any => {
                const dataTx = {
                    type: 12,
                    data: {
                        data: [
                            {
                                key: tx.id,
                                type: 'binary',
                                value: 'base64:' + libs.base64.fromByteArray(Uint8Array.from([betType, bet]))
                            },
                            { key: `${tx.id}_round`, type: 'string', value: key },
                            {
                                key: `${key}_betsSum`,
                                type: 'integer',
                                value: tx.amount + betSum - 0.005 * Math.pow(10, 8)
                            }
                        ],
                        fee: {
                            tokens: 0.005,
                            assetId: 'WAVES'
                        },
                        senderPublicKey: ROULETTE_PUBLIC_KEY
                    }
                };

                if (status) {
                    return WavesKeeper.signTransaction(dataTx)
                        .then(broadcast);
                } else {
                    return WavesKeeper.signTransactionPackage([
                        dataTx,
                        getKeeperParamsFromTransfer(tx)
                    ]).then(([data, transfer]) => {

                        const promise = broadcast(transfer)
                            .then(waitTransaction)
                            .then(() => broadcast(data));

                        promise.catch(() => registerBet(betType, bet));

                        const tx = JSON.parse(transfer);
                        storage.reserveBalance(tx.id, promise);
                    });
                }
            });
    });
}

export function getBetSum(key: string) {
    return getRouletteDataValue(`${key}_betsSum`)
        .catch(() => 0);
}
