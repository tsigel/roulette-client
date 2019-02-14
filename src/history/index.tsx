import * as React from 'react';
import {
    getBetResult,
    getUserAddress,
    getUserBetByTransfer,
    getUserPayments,
    IBetResult,
    isPayment,
    ITransferWithBet
} from '../utils';
import { api } from '@waves/ts-types';
import { pathEq, pipe, map, uniqBy, path } from 'ramda';
import { withdraw } from '../bets';


export class History extends React.Component<History.IProps, History.IState> {

    public state: History.IState = {
        balance: [],
        unconfirmed: [],
        other: []
    };

    constructor(props: History.IProps) {
        super(props);

        const loop = () => {
            getUserPayments()
                .then(this.filterResolvedPayments)
                .then(list => {
                    return this.getUnregistred(list)
                        .then((items: Array<api.TTransferTransaction<number> | ITransferWithBet>) => {
                            const balance: Array<api.TTransferTransaction<number>> = items.filter(isPayment);
                            const withBet = items.filter(item => !isPayment(item)) as Array<ITransferWithBet>;
                            return getBetResult(withBet)
                                .then(list => {

                                    const unconfirmed = uniqBy(path(['tx', 'id']), [
                                        ...list.filter(item => item.pending === true),
                                        ...this.state.unconfirmed
                                    ]);

                                    const other = uniqBy(path(['tx', 'id']), [
                                        ...list.filter((item: ITransferWithBet) => item.pending === false),
                                        ...this.state.other
                                    ]);

                                    this.setState({ other, unconfirmed, balance });
                                    setTimeout(loop, 1000);
                                });
                        });
                });
        };

        getUserAddress()
            .then(loop);
    }

    private filterResolvedPayments = (list: Array<api.TTransferTransaction<number>>) =>
        list.filter(tx => !this.state.other.find(pathEq(['tx', 'id'], tx.id)));

    private filterRegistredPayments = (list: Array<api.TTransferTransaction<number>>) =>
        list.filter(tx => !this.state.other.find(pathEq(['tx', 'id'], tx.id)));

    private getUnregistred = pipe(
        this.filterRegistredPayments,
        map(getUserBetByTransfer),
        list => Promise.all(list)
    );

    public render() {
        return (
            <div className='history'>
                {this.state.balance.map(item => {
                    return (
                        <div className='bet-line' key={item.id}>
                            <span className='item'>Заведено денег: {item.amount / Math.pow(10, 8)} WAVES</span>
                        </div>
                    );
                })}
                <hr/>
                {this.state.unconfirmed.map(item => {
                    const date = new Date(item.gameId);
                    const template = `${date.getHours()}:${date.getMinutes()} ${date.getDay()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                    const button = '<span>In progress</span>';

                    return (
                        <div className='bet-line' key={item.tx.id}>
                            <span className='item'>Поле {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Выигрыш: --</span>
                            <span className='item'>Игра: {template}</span>
                            {button}
                        </div>
                    );
                })}
                {this.state.other.map(item => {
                    const date = new Date(item.gameId);
                    const getBack = () => withdraw(item);
                    const template = `${date.getHours()}:${date.getMinutes()} ${date.getDay()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                    const button = item.success ? item.assigned ? <span>Уже забрал</span> :
                        <button type="button" onClick={() => getBack()} className="btn btn-primary">Забрать</button> :
                        <span>Проиграл</span>;

                    return (
                        <div className='bet-line' key={item.tx.id}>
                            <span className='item'>Поле {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Выигрыш: --</span>
                            <span className='item'>Игра: {template}</span>
                            {button}
                        </div>
                    );
                })}
            </div>
        );
    }
}

// @ts-ignore
function getBetText(betType: number, bet: number): string | unknown {
    switch (betType) {
        case 0:
            return `Число ${bet}`;
        case 1:
            return bet ? 'Красное' : 'Чёрное';
        case 2:
            return bet ? 'Чётное' : 'Нечётное';
        case 3:
            return bet ? '1-18' : '19-36';
        case 4:
            switch (bet) {
                case 0:
                    return '1-12';
                case 1:
                    return '12-24';
                case 2:
                    return '24-36';
            }
        // case 5:
        //     switch (bet) {
        //         case 1:
        //             return '';
        //         case 2:
        //             return '';
        //         case 3:
        //             return '';
        //     }
    }
}

export namespace History {

    export interface IProps {
    }

    export interface IState {
        balance: Array<api.TTransferTransaction<number>>;
        unconfirmed: Array<ITransferWithBet>;
        other: Array<IBetResult>;
    }

}
