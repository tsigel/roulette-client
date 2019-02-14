import { broadcast, getCurrentFees, getUserAddress, IBetResult, waitTransaction, WavesKeeper } from '../utils';
import { ROULETTE_PUBLIC_KEY } from '../constants';
import { api } from '@waves/ts-types';
import { transfer } from 'waves-transactions';


export function withdraw(betResult: IBetResult): Promise<void> {
    return Promise.all([
        getCurrentFees(betResult.tx.id),
        getUserAddress()
    ]).then(([fee, address]) => {
        return WavesKeeper.signTransaction({
            type: 4,
            data: {
                recipient: address,
                amount: {
                    tokens: betResult.canGetBack,
                    assetId: 'WAVES'
                },
                fee: {
                    tokens: 0.005,
                    assetId: 'WAVES'
                },
                senderPublicKey: ROULETTE_PUBLIC_KEY
            }
        })
            .then((json: string) => JSON.parse(json))
            .then((tx: api.TTransferTransaction<string | number>) => {
                if (!('version' in tx)) {
                    return Promise.reject('Wrong tx version!');
                }
                tx.proofs.push(betResult.tx.id);
                tx = transfer(tx, undefined) as any;
                return WavesKeeper.signTransaction({
                    type: 12,
                    data: {
                        data: [
                            { key: betResult.tx.id, type: 'string', value: tx.id },
                            { key: `${betResult.tx.id}_fees`, type: 'integer', value: fee + 0.005 * Math.pow(10, 8) }
                        ],
                        fee: {
                            tokens: 0.005,
                            assetId: 'WAVES'
                        },
                        senderPublicKey: ROULETTE_PUBLIC_KEY
                    }
                })
                    .then(broadcast)
                    .then(waitTransaction)
                    .then(() => broadcast(JSON.stringify(tx)))
                    .then(() => undefined);
            });
    });
}