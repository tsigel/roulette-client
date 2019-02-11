import { api } from '@waves/ts-types';
import { canSetBet, getAttachment, getNextGame, WavesKeeper } from '../utils';
import { ROULETTE_ADDRESS, ROULETTE_ORACLE_ADDRESS, ROULETTE_PUBLIC_KEY } from '../constants';
import { head } from 'ramda';
import { libs } from '@waves/signature-generator';
import { BigNumber } from '@waves/data-entities';
import { transfer } from 'waves-transactions';


export function setBet(betType: number, bet: number): Promise<any> {
    if (!canSetBet()) {
        return Promise.reject('Can\'t set bet!');
    }

    return WavesKeeper.signAndPublishTransaction({
        type: 4,
        data: {
            recipient: ROULETTE_ADDRESS,
            amount: { tokens: 1, assetId: 'WAVES' },
            fee: { tokens: 0.001, assetId: 'WAVES' },
            attachment: getAttachment(getNextGame() as number, [betType, bet])
        }
    });
}

export function getResult(betResult: IBetResult): Promise<void> {
    return Promise.all([getCurrentFees(betResult.tx.id), getUserAddress()]).then(([fee, address]) => {
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

export function getUserAddress(): Promise<string> {
    return new Promise<string>(resolve => {
        const handler = (state: WavesKeeper.IState) => {
            if (state.account) {
                resolve(state.account.address);
            }
        };

        WavesKeeper.publicState().then(state => {
            if (!state.account) {
                WavesKeeper.on('update', handler);
            } else {
                resolve(state.account.address);
            }
        });
    });
}

export function getCurrentFees(id: string): Promise<number> {
    return WavesKeeper.publicState()
        .then(state => fetch(`${state.network.server}addresses/data/${ROULETTE_ADDRESS}/${id}_fees`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(data => data.value)
        .catch(() => 0);
}

export function getUserBets(): Promise<Array<ITransferWithBet>> {
    return getUserAddress()
        .then(getUserTransactions(20))
        .then(list => list.filter(isTransfer))
        .then(list => list.filter(isBet))
        .then(list => list.map(getUserBetByTransfer));
}

export function getUserTransactions(count: number = 500) {
    return (address: string): Promise<Array<api.TTransaction<string | number>>> => WavesKeeper.publicState()
        .then(state => fetch(`${state.network.server}transactions/address/${address}/limit/${count}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(head as any) as Promise<Array<api.TTransaction<string | number>>>;
}

export function isBet(tx: api.TTransferTransaction<number | string>): boolean {
    return tx.recipient === ROULETTE_ADDRESS &&
        tx.attachment &&
        libs.base58.decode(tx.attachment).length === 15 ||
        false;
}

export function isTransfer(tx: api.TTransaction<string | number>): tx is api.TTransferTransaction<string | number> {
    return tx.type === 4;
}

export function getUserBetByTransfer(tx: api.TTransferTransaction<string | number>): ITransferWithBet {
    const bytes = libs.base58.decode(tx.attachment);
    const gameId = Number(libs.converters.byteArrayToString(bytes.slice(0, -2)));
    const betType = bytes[bytes.length - 2];
    const bet = bytes[bytes.length - 1];
    const key = libs.base58.encode(bytes.slice(0, -2));
    const amount = Number(tx.amount) / Math.pow(10, 8);

    return { gameId, betType, bet, amount, key, tx };
}

export function getBetResult(filterList: Array<string>) {
    return (list: Array<ITransferWithBet>): Promise<Array<IBetResult>> =>
        WavesKeeper.publicState()
            .then(state => Promise.all(
                list
                    .filter(item => !filterList.includes(item.tx.id))
                    .map(getResultByBet(state)))
            );
}

export function getResultByBet(state: WavesKeeper.IState) {
    return (bet: ITransferWithBet): Promise<IBetResult> =>
        Promise.all([
            fetch(`${state.network.server}addresses/data/${ROULETTE_ORACLE_ADDRESS}/${bet.key}`)
                .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
            fetch(`${state.network.server}addresses/data/${ROULETTE_ADDRESS}/${bet.tx.id}`)
                .then(r => r.ok ? r.json() : Promise.resolve(null))
                .then(data => data ? data.value : null)
                .then(data => data ?
                    fetch(`${state.network.server}transactions/info/${data}`)
                        .then(r => r.ok ? Promise.resolve(true) : Promise.resolve(false)) :
                    Promise.resolve(false))
        ])
            .then(([data, status]) => {
                return getCurrentFees(bet.tx.id).then(fee => {
                    const bytes = Array.from(libs.base64.toByteArray((data.value as any).replace('base64:', ''))).slice(1);
                    const success = bytes[bet.betType] === bet.bet;
                    const assigned = status;
                    const canGetBack = success ? new BigNumber(getBackAmount(bet.betType, bet.amount))
                        .minus(fee / Math.pow(10, 8))
                        .minus(0.01).toNumber() : 0;

                    return { ...bet, success, canGetBack, assigned };
                });
            })
            .catch(e => {
                const success = false;
                const canGetBack = 0;
                return { ...bet, success, canGetBack, assigned: false };
            });
}

export function getBackAmount(betType: number, amount: number): number {
    switch (betType) {
        case 0:
            return amount * 36;
        case 1:
        case 2:
        case 3:
            return amount * 2;
        default:
            return amount * 3;
    }
}

export function broadcast(body: string): Promise<api.TTransaction<string | number>> {
    return WavesKeeper.publicState()
        .then(state => fetch(`${state.network.server}transactions/broadcast`, {
            body,
            method: 'POST',
            headers: {
                'Content-type': 'application/json'
            }
        }))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
}

export function waitTransaction(tx: api.TTransaction<string | number>): Promise<api.TTransaction<string | number>> {
    return WavesKeeper.publicState()
        .then(state => fetch(`${state.network.server}transactions/info/${tx.id}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .catch(() => wait(1000)
            .then(() => waitTransaction(tx)));
}

export function wait(timeout: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, timeout);
    });
}

export interface ITransferWithBet {
    readonly betType: number;
    readonly bet: number;
    readonly gameId: number;
    readonly amount: number;
    readonly key: string;
    readonly tx: Readonly<api.TTransferTransaction<string | number>>;
}

export interface IBetResult extends ITransferWithBet {
    readonly success: boolean;
    readonly canGetBack: number;
    readonly assigned: boolean;
}
