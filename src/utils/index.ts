import { head, gt, __ } from 'ramda';
import { GAME_INTERVAL } from '../constants';
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
    let time = now;
    const dateList = [];

    do {
        dateList.push(time);
        time = time + GAME_INTERVAL;
    } while (isTheSameDay(time, now));

    return dateList;
}

export function getAttachment(time: number, bet: [number, number]): string {
    const bytes = Uint8Array.from([...libs.converters.stringToByteArray(String(time)), ...bet]);
    console.log(bytes);
    return libs.converters.byteArrayToString(bytes);
}

export function getNextGame(list: Array<number> = generateGameList()): number {
    return head(list.filter(gt(__, Date.now()))) as number;
}

export function getNextGameOffset(nextGame: number = getNextGame()): number {
    return nextGame - Date.now();
}

export const WavesKeeper: {
    signAndPublishTransaction(data: { type: number; data: any }): Promise<void>
    signTransaction(data: { type: number; data: any }): Promise<void>
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
