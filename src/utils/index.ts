import { head, gt, __, last, lt } from 'ramda';
import { GAME_INTERVAL, LIMIT } from '../constants';
import { libs } from '@waves/signature-generator';


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

export const WavesKeeper: {
    signAndPublishTransaction(data: { type: number; data: any }): Promise<any>
    signTransaction(data: { type: number; data: any }): Promise<string>
    publicState(): Promise<WavesKeeper.IState>;
    on(event: 'update', cb: (data: WavesKeeper.IState) => any): void;
} = (window as any).WavesKeeper;

export namespace WavesKeeper {
    export interface IState {
        network: { server: string },
        account: { address: string } | null,
        locked: boolean;
    }
}
