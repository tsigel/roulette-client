import { WavesKeeper } from '../utils';
import { ROULETTE_ADDRESS } from '../constants';
import { api } from '@waves/ts-types';
import TTransferTransaction = api.TTransferTransaction;

export function pay(tokens: number): Promise<TTransferTransaction<number>> {
    return WavesKeeper.signAndPublishTransaction({
        type: 4,
        data: {
            recipient: ROULETTE_ADDRESS,
            amount: { tokens: tokens, assetId: 'WAVES' },
            fee: { tokens: 0.001, assetId: 'WAVES' }
        }
    }).then(json => JSON.parse(json));
}