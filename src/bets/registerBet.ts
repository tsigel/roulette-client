import { broadcast, canSetBet, getNextGame, getState, toBase58, waitTransaction, WavesKeeper } from '../utils';
import { ROULETTE_ADDRESS, ROULETTE_ORACLE_ADDRESS, ROULETTE_PUBLIC_KEY } from '../constants';
import { libs } from '@waves/signature-generator';


export function registerBet(betType: number, bet: number): Promise<any> {
    if (!canSetBet()) {
        return Promise.reject('Can\'t set bet!');
    }

    const nextGame: number = getNextGame() as number;
    const key = toBase58(nextGame);

    return WavesKeeper.signAndPublishTransaction({
        type: 4,
        data: {
            recipient: ROULETTE_ADDRESS,
            amount: { tokens: 1, assetId: 'WAVES' },
            fee: { tokens: 0.001, assetId: 'WAVES' }
        }
    })
        .then(json => JSON.parse(json))
        .then(waitTransaction)
        .then(tx => getState().then(state =>
            fetch(`${state.network.server}addresses/data/${ROULETTE_ORACLE_ADDRESS}/${key}`))
            .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
            .catch(() => ({ value: 0 }))
            .then(data => [tx, data.value]))
        .then(([tx, betSum]) => {
            debugger;
            return WavesKeeper.signTransaction({
                type: 12,
                data: {
                    data: [
                        {
                            key: tx.id,
                            type: 'binary',
                            value: 'base64:' + libs.base64.fromByteArray(Uint8Array.from([betType, bet]))
                        },
                        { key: `${tx.id}_round`, type: 'string', value: key },
                        { key: `${key}_betsSum`, type: 'integer', value: tx.amount + betSum - 0.005 * Math.pow(10, 8) }
                    ],
                    fee: {
                        tokens: 0.005,
                        assetId: 'WAVES'
                    },
                    senderPublicKey: ROULETTE_PUBLIC_KEY
                }
            });
        })
        .then(broadcast)
        .catch((e) => {
            debugger;
            console.error(e);
        });
}
