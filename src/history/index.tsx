import * as React from 'react';
import {
    getBetResult, getLastGame, getLastGameIdList, getRouletteHistory,
    getUserAddress,
    getUserBetByTransfer,
    getUserPayments,
    IBetResult,
    isPayment,
    ITransferWithBet
} from '../utils';
import { api } from '@waves/ts-types';
import { pathEq, pipe, map, uniqBy, path, propEq, head } from 'ramda';
import { withdraw } from '../bets';
import { CELLS } from '../cell';


export class History extends React.Component<History.IProps, History.IState> {

    public state: History.IState = {
        balance: [],
        unconfirmed: [],
        other: [],
        history: []
    };

    constructor(props: History.IProps) {
        super(props);

        const userBetsHistoryLoop = () => {
            getUserPayments()
                .then(this.filterResolvedPayments)
                .then(list => {
                    return this.getUnregistred(list)
                        .then((items: Array<api.TTransferTransaction<number> | ITransferWithBet>) => {
                            const balance: Array<api.TTransferTransaction<number>> = items.filter(isPayment);
                            const withBet = items.filter(item => !isPayment(item)) as Array<ITransferWithBet>;
                            return getBetResult(withBet)
                                .then(list => {

                                    const other = uniqBy(path(['tx', 'id']), [
                                        ...list.filter((item: ITransferWithBet) => item.pending === false),
                                        ...this.state.other
                                    ]);

                                    const unconfirmed = uniqBy(path(['tx', 'id']), [
                                        ...list.filter(item => item.pending === true),
                                        ...this.state.unconfirmed.filter(item => !other.find(pathEq(['tx', 'id'], item)))
                                    ]);

                                    this.setState({ other, unconfirmed, balance });
                                    setTimeout(userBetsHistoryLoop, 1000);
                                });
                        });
                });
        };

        const gameResultHistoryLoop = () => {
            const history = this.state.history;

            if (!history.length) {
                const list = getLastGameIdList(12);
                getRouletteHistory(list)
                    .then(resultList => {
                        const history = resultList.map((result, i) => {
                            const id = list[i];
                            return { id, result };
                        });
                        this.setState({ history });

                        setTimeout(gameResultHistoryLoop, 1000 * 30);
                    });
                return null;
            }

            const last = getLastGame();
            const has = history.find(propEq('id', last));

            if (has) {
                setTimeout(gameResultHistoryLoop, 1000 * 30);
                return null;
            }

            getRouletteHistory([last])
                .then(head as any)
                .then((result: any) => {
                    this.setState({
                        history: [
                            { id: last, result: result as number },
                            ...history.slice(0, 11)
                        ]
                    });

                    setTimeout(gameResultHistoryLoop, 1000 * 30);
                });

        };

        gameResultHistoryLoop();

        getUserAddress()
            .then(userBetsHistoryLoop);
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
                {this.state.history.map(item => {
                    const cell = CELLS[item.result];
                    const red = cell.isRed ? 'red' : '';
                    const black = cell.isBlack ? 'black' : '';

                    return <div className={'history-item ' + red + black}>{item.result}</div>;
                })}
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
                    const button = <span>In progress</span>;

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
                    const getBackText = item.success ? item.canGetBack : '---';
                    const button = item.success ? item.assigned ? <span>Уже забрал</span> :
                        <button type="button" onClick={() => getBack()} className="btn btn-primary">Забрать</button> :
                        <span>Проиграл</span>;

                    return (
                        <div className='bet-line' key={item.tx.id}>
                            <span className='item'>Поле {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Выигрыш: {getBackText}</span>
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
        history: Array<{ id: number, result: number }>;
    }

}
