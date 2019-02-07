import * as React from 'react';
import { WavesKeeper } from '../utils';
import { head, whereEq, filter, last, map } from 'ramda';
import { libs } from '@waves/signature-generator';


const getUserAddress = () => new Promise<string>(resolve => {
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

const parseTx = (tx: any) => {
    if (!tx.attachment) {
        return null;
    }
    const bytes = libs.base58.decode(tx.attachment);
    if (bytes.length !== 15) {
        return null;
    }
    return {
        id: tx.id,
        timestamp: Number(libs.converters.byteArrayToString(bytes.slice(0, -2))),
        key: libs.base58.encode(bytes.slice(0, -2)),
        bet: last(Array.from(bytes)),
        amount: tx.amount / Math.pow(10, 8)
    };
};

export class History extends React.Component<History.IProps, Partial<History.IState>> {

    public state: Partial<History.IState> = Object.create(null);

    constructor(props: History.IProps) {
        super(props);
        Promise.all([
            getUserAddress(),
            WavesKeeper.publicState()
        ])
            .then(([address, state]) => {
                return fetch(`${state.network.server}transactions/address/${address}/limit/10`)
                    .then(r => r.json())
                    .then(head)
                    .then(filter(whereEq({ type: 4 })) as any)
                    .then(map(parseTx) as any)
                    .then(filter(Boolean) as any)
                    .then(map((item: any) =>
                        fetch(`${state.network.server}addresses/data/${props.rouletteAddress}/${item.key}`)
                            .then(r => r.json())
                            .catch(() => null)
                            .then((result: any) => {
                                const bytes = libs.base64.toByteArray(result.value.replace('base64:', ''));
                                const target = bytes[1];
                                const gainings = target === item.bet ? item.amount * 35 : 0;

                                return {
                                    bet: item.bet,
                                    gainings,
                                    game: item.timestamp
                                };
                            }) as any) as any)
                    .then((list) => Promise.all(list))
                    .then((list: any) => {
                        console.log(list);
                        this.setState({ userBetList: list });
                    });
            });
    }

    public render() {
        return (
            <div className='history'>
                {this.state.userBetList && this.state.userBetList.map(item => {
                    const date = new Date(item.game);
                    const template = `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()} ${date.getDay()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                    const button = item.gainings && item.gainings > 0 ?
                        <button type='button' className={'primary'}>Get my Gainings</button> : null;
                    return (
                        <div key={item.game}>
                            <span>Bet: {item.bet}</span>
                            <span>Gainings: {item.gainings}</span>
                            <span>Game: {template}</span>
                            {button}
                        </div>
                    );
                }) || null}
            </div>
        );
    }
}

export namespace History {

    export interface IProps {
        rouletteAddress: string;
    }

    export interface IState {
        userBetList: Array<{ gainings?: number; bet: number, game: string }>;
    }

}
