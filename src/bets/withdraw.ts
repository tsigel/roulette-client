import {
    broadcast,
    getCurrentFees,
    getKeeperParamsFromTransfer,
    getUserAddress,
    IBetResult,
    waitTransaction,
    WavesKeeper
} from '../utils';
import { ROULETTE_PUBLIC_KEY } from '../constants';
import { transfer } from '@waves/waves-transactions';


export function withdraw(betResult: IBetResult): Promise<void> {
    return Promise.all([
        getCurrentFees(betResult.tx.id),
        getUserAddress()
    ]).then(([fee, address]) => {

        const tx = transfer({
            assetId: undefined,
            timestamp: Date.now(),
            recipient: address,
            senderPublicKey: ROULETTE_PUBLIC_KEY,
            amount: betResult.canGetBack * Math.pow(10, 8),
            fee: 0.005 * Math.pow(10, 8)
        });
        tx.proofs.push(betResult.tx.id);

        return WavesKeeper.signTransactionPackage([
            getKeeperParamsFromTransfer(tx as any),
            {
                type: 12,
                data: {
                    data: [
                        { key: `${betResult.tx.id}_withdraw`, type: 'string', value: tx.id },
                        {
                            key: `${betResult.tx.id}_withdraw_fees`,
                            type: 'integer',
                            value: fee + 0.005 * Math.pow(10, 8)
                        }
                    ],
                    fee: {
                        tokens: 0.005,
                        assetId: 'WAVES'
                    },
                    senderPublicKey: ROULETTE_PUBLIC_KEY
                }
            }
        ]).then(([transfer, data]) => {
            return broadcast(data)
                .then(waitTransaction)
                .then(() => broadcast(reverseProofs(transfer)))
                .then(() => undefined);
        });
    });
}

export function reverseProofs(tx: string): string {
    const tmp = JSON.parse(tx);
    tmp.proofs = tmp.proofs.reverse();
    return JSON.stringify(tmp);
}
