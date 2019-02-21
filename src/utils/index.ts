import { head, __, last, lt } from 'ramda';
import { GAME_INTERVAL, LIMIT, ROULETTE_ADDRESS, ROULETTE_ORACLE_ADDRESS } from '../constants';
import { libs } from '@waves/signature-generator';
import { api } from '@waves/ts-types';
import { BigNumber } from '@waves/data-entities/dist/libs/bignumber';
import { date as createDateFactory } from 'ts-utils';
import { transfer } from '@waves/waves-transactions';


export const getState = (() => {
    const promise = getKeeperApi()
        .then(api => api.publicState());
    return () => promise;
})();

export const getUserData = (() => {
    const promise = getState()
        .then(() => new Promise<{ address: string, publicKey: string }>(resolve => {
            const handler = (state: WavesKeeper.IState) => {
                if (state.account) {
                    resolve({ address: state.account.address, publicKey: state.account.publicKey });
                }
            };

            WavesKeeper.publicState().then(state => {
                if (!state.account) {
                    WavesKeeper.on('update', handler);
                } else {
                    resolve({ address: state.account.address, publicKey: state.account.publicKey });
                }
            });
        }));
    return () => promise;
})();

export const getUserAddress = () => getUserData()
    .then(data => data.address);

export function getCurrentFees(id: string): Promise<number> {
    return getRouletteDataValue<number>(`${id}_withdraw_fees`)
        .catch(() => 0);
}

export function getUserPayments(): Promise<Array<api.TTransferTransaction<number>>> {
    return getUserAddress()
        .then(getUserTransactions(15))
        .then(list => list.filter(isTransfer));
}

export function getUserTransactions(count: number = 500) {
    return (address: string): Promise<Array<api.TTransaction<string | number>>> => getState()
        .then(state => fetch(`${state.network.server}transactions/address/${address}/limit/${count}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(head as any) as Promise<Array<api.TTransaction<string | number>>>;
}

export function getRouletteHistory(gameList: Array<number>): Promise<Array<number>> {
    return Promise.all(gameList.map(getOracleDataValue)) as any;
}

export function isTransfer(tx: api.TTransaction<string | number>): tx is api.TTransferTransaction<number> {
    return tx.type === 4 && tx.recipient === ROULETTE_ADDRESS;
}

export function getUserBetByTransfer(tx: api.TTransferTransaction<number>): Promise<ITransferWithBet | api.TTransferTransaction<number>> {

    return getState().then(state =>
        Promise.all([
            getRouletteDataValue<any>(tx.id),
            getRouletteDataValue<any>(`${tx.id}_round`)
        ]).then(([bets, round]) => {
            const bytes = libs.base64.toByteArray(bets.replace('base64:', ''));
            const gameId = Number(fromBase58(round));
            const [betType, bet] = bytes;
            const key = round;
            const amount = Number(tx.amount) / Math.pow(10, 8);

            return { gameId, betType, bet, amount, key, tx, pending: true };
        })).catch(() => tx);
}

export function isPayment(item: ITransferWithBet | api.TTransferTransaction<number>): item is api.TTransferTransaction<number> {
    return !('gameId' in item);
}

export function getBetResult(list: Array<ITransferWithBet>): Promise<Array<IBetResult>> {
    return getState()
        .then(state => Promise.all(list.map(getResultByBet(state))));
}

export function getResultByBet(state: WavesKeeper.IState) {
    return (bet: ITransferWithBet): Promise<IBetResult> =>
        Promise.all([
            getOracleDataValue<any>(bet.key),
            getRouletteDataValue(`${bet.tx.id}_withdraw`)
                .catch(() => null)
                .then(data => data ?
                    fetch(`${state.network.server}transactions/info/${data}`)
                        .then(r => r.ok ? Promise.resolve(true) : Promise.resolve(false)) :
                    Promise.resolve(false))
        ])
            .then(([data, status]) => {
                return getCurrentFees(bet.tx.id).then(fee => {
                    const bytes = Array.from(libs.base64.toByteArray((data).replace('base64:', ''))).slice(1);
                    const success = bytes[bet.betType] === bet.bet;
                    const assigned = status;
                    const canGetBack = success ? new BigNumber(getBackAmount(bet.betType, bet.amount))
                        .minus(fee / Math.pow(10, 8))
                        .minus(0.005)
                        .minus(assigned ? 0 : 0.005)
                        .toNumber() : 0;

                    return { ...bet, pending: false, success, canGetBack, assigned };
                });
            })
            .catch(e => {
                const success = false;
                const canGetBack = 0;
                return { ...bet, pending: true, success, canGetBack, assigned: false };
            });
}

export function getBackAmount(betType: number, amount: number): number {
    switch (betType) {
        case 0:
            return (amount - 0.005) * 36;
        case 1:
        case 2:
        case 3:
            return (amount - 0.005) * 2;
        default:
            return (amount - 0.005) * 3;
    }
}

export function broadcast(body: string): Promise<api.TTransaction<string | number>> {
    return getState()
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
    return getTxById(tx.id)
        .catch(() => wait(1000)
            .then(() => waitTransaction(tx)));
}

export function getTxById(id: string): Promise<api.TTransaction<number>> {
    return getState()
        .then(state => fetch(`${state.network.server}transactions/info/${id}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)));
}

export function wait(timeout: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(resolve, timeout);
    });
}

export interface ITransferWithBet {
    readonly pending: boolean;
    readonly betType: number;
    readonly bet: number;
    readonly gameId: number;
    readonly amount: number;
    readonly key: string;
    readonly tx: Readonly<api.TTransferTransaction<number>>;
}

export interface IBetResult extends ITransferWithBet {
    readonly success: boolean;
    readonly canGetBack: number;
    readonly assigned: boolean;
}

export function getStartOfDay(time?: number): number {
    const date = new Date(time || Date.now());
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
}

export function isTheSameDay(time?: number, compareDate?: number): boolean {
    return getStartOfDay(time) === getStartOfDay(compareDate);
}

export function generateGameList(): Array<number> {
    const now = getStartOfDay();
    let time = now + GAME_INTERVAL;
    const dateList = [];

    do {
        dateList.push(time);
        time = time + GAME_INTERVAL;
    } while (isTheSameDay(time, now));

    return dateList;
}

export function getAttachment(time: number, bet: [number, number]): string {
    const bytes = Uint8Array.from([...libs.converters.stringToByteArray(String(time)), ...bet]);
    return libs.converters.byteArrayToString(bytes);
}

export function toBase58(data: string | number): string {
    const bytes = Uint8Array.from(libs.converters.stringToByteArray(String(data)));
    return libs.base58.encode(bytes);
}

export function fromBase58(data: string): string {
    const bytes = libs.base58.decode(data);
    return libs.converters.byteArrayToString(bytes);
}

export function getLastGame(list: Array<number> = generateGameList()): number {
    const beforeNowList = getTodayGamesBeforeNow(list);
    return beforeNowList.length ? last(beforeNowList) as number : getStartOfDay() - GAME_INTERVAL;
}

export function getNextGame(list: Array<number> = generateGameList()): number {
    return getLastGame(list) + GAME_INTERVAL;
}

export function getTodayGamesBeforeNow(list: Array<number> = generateGameList()): Array<number> {
    return list.filter(lt(__, Date.now()));
}

export function getLastGameIdList(count: number = 10): Array<number> {
    let last = getLastGame();
    const result: Array<number> = [];

    for (let i = 0; i < count; i++) {
        result.push(last);
        last = last - GAME_INTERVAL;
    }

    return result;
}

export function canSetBet() {
    const time = Date.now();
    const lastGame = getLastGame();
    const nextGame = getNextGame();

    const brokenLeft = lastGame && time - lastGame < LIMIT;
    const brokenRight = !nextGame || nextGame - time < LIMIT * 2;

    return !brokenLeft && !brokenRight;
}

export function getKeeperApi(): Promise<WavesKeeper.API> {
    return new Promise(resolve => {
        const loop = () => {
            if ('WavesKeeper' in window) {
                resolve((window as any).WavesKeeper);
            } else {
                setTimeout(loop, 20);
            }
        };
        loop();
    });
}

export const WavesKeeper: {
    signTransactionPackage(data: Array<{ type: number; data: any }>): Promise<Array<string>>;
    signAndPublishTransaction(data: { type: number; data: any }): Promise<string>;
    signTransaction(data: { type: number; data: any }): Promise<string>;
    publicState(): Promise<WavesKeeper.IState>;
    on(event: 'update', cb: (data: WavesKeeper.IState) => any): void;
} = (window as any).WavesKeeper;

export namespace WavesKeeper {

    export interface API {
        signAndPublishTransaction(data: { type: number; data: any }): Promise<string>

        signTransaction(data: { type: number; data: any }): Promise<string>

        publicState(): Promise<WavesKeeper.IState>;

        on(event: 'update', cb: (data: WavesKeeper.IState) => any): void;
    }

    export interface IState {
        network: { server: string },
        account: { address: string, publicKey: string } | null,
        locked: boolean;
    }
}

export function getDataValue(key: string | number, address: string) {
    const dataKey = encodeURIComponent(String(key));
    return getState().then(state =>
        fetch(`${state.network.server}addresses/data/${address}/${dataKey}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(data => data.value);
}

export function getRouletteDataValue<T>(key: string | number): Promise<T> {
    return getDataValue(key, ROULETTE_ADDRESS);
}

export function getOracleDataValue<T>(key: string | number): Promise<T> {
    return getDataValue(key, ROULETTE_ORACLE_ADDRESS);
}

export function getTransferWithId(tokens: number, senderPublicKey: string): api.TTransferTransaction<number> {
    const timestamp = Date.now();
    return transfer({
        timestamp,
        recipient: ROULETTE_ADDRESS,
        amount: tokens * Math.pow(10, 8),
        assetId: undefined,
        senderPublicKey,
        fee: 0.001 * Math.pow(10, 8)
    }) as any;
}

export function getKeeperParamsFromTransfer(tx: api.TTransferTransaction<number>) {
    return {
        type: 4,
        data: {
            ...tx,
            amount: {
                coins: tx.amount,
                assetId: tx.assetId || 'WAVES'
            },
            fee: {
                coins: tx.fee,
                assetId: tx.feeAssetId || 'WAVES'
            }
        }
    };
}

export const date = createDateFactory('hh:mm DD.MM');
