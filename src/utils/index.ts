import { head, gt, __, last, lt } from 'ramda';
import { GAME_INTERVAL, LIMIT, ROULETTE_ADDRESS, ROULETTE_ORACLE_ADDRESS } from '../constants';
import { libs } from '@waves/signature-generator';
import { api } from '@waves/ts-types';
import { BigNumber } from '@waves/data-entities/dist/libs/bignumber';


export function getCurrentFees(id: string): Promise<number> {
    return getState()
        .then(state => fetch(`${state.network.server}addresses/data/${ROULETTE_ADDRESS}/${id}_fees`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(data => data.value)
        .catch(() => 0);
}

export function getUserPayments(): Promise<Array<api.TTransferTransaction<number>>> {
    return getUserAddress()
        .then(getUserTransactions(50))
        .then(list => list.filter(isTransfer));
}

export function getUserTransactions(count: number = 500) {
    return (address: string): Promise<Array<api.TTransaction<string | number>>> => getState()
        .then(state => fetch(`${state.network.server}transactions/address/${address}/limit/${count}`))
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(head as any) as Promise<Array<api.TTransaction<string | number>>>;
}

export function isTransfer(tx: api.TTransaction<string | number>): tx is api.TTransferTransaction<number> {
    return tx.type === 4;
}

export function getUserBetByTransfer(tx: api.TTransferTransaction<number>): Promise<ITransferWithBet | api.TTransferTransaction<number>> {

    return getState().then(state =>
        Promise.all([
            fetch(`${state.network.server}addresses/data/${ROULETTE_ORACLE_ADDRESS}/${tx.id}`)
                .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e))),
            fetch(`${state.network.server}addresses/data/${ROULETTE_ORACLE_ADDRESS}/${tx.id}_round`)
                .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        ]).then(([bets, round]) => {
            const bytes = libs.base58.decode(bets.value.replace('base64:', ''));
            const gameId = Number(fromBase58(round.value));
            const [betType, bet] = bytes;
            const key = round.value;
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
    return getState()
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

export function getLastGame(list: Array<number> = generateGameList()): number | null {
    return last(list.filter(lt(__, Date.now()))) || null;
}

export function getNextGame(list: Array<number> = generateGameList()): number | null {
    return head(list.filter(gt(__, Date.now()))) || null;
}

export function getNextGameOffset(nextGame: number | null = getNextGame()): number | null {
    return nextGame ? nextGame - Date.now() : null;
}

export function canSetBet() {
    const time = Date.now();
    const lastGame = getLastGame();
    const nextGame = getNextGame();

    const brokenLeft = lastGame && time - lastGame < LIMIT;
    const brokenRight = !nextGame || nextGame - time < LIMIT;

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

export const getState = (() => {
    const promise = getKeeperApi()
        .then(api => api.publicState());
    return () => promise;
})();

export const getUserAddress = (() => {
    const promise = getState()
        .then(() => new Promise<string>(resolve => {
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
        }));
    return () => promise;
})();

export const WavesKeeper: {
    signAndPublishTransaction(data: { type: number; data: any }): Promise<any>
    signTransaction(data: { type: number; data: any }): Promise<string>
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
        account: { address: string } | null,
        locked: boolean;
    }
}
