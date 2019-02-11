import * as React from 'react';
import { getBetResult, getResult, getUserAddress, getUserBets, IBetResult } from '../bets/setBet';


export class History extends React.Component<History.IProps, History.IState> {

    public state: History.IState = { list: [] };

    constructor(props: History.IProps) {
        super(props);

        const loop = () => {

            // const filter = this.state.list
            //     .filter(item => !item.success || item.assigned)
            //     .map(item => item.tx.id);

            getUserBets()
                .then(getBetResult(/*filter*/[]))
                .then(list => {
                    this.setState({ list });
                    setTimeout(loop, 1000);
                });
        };

        getUserAddress()
            .then(loop);
    }

    public render() {
        return (
            <div className='history'>
                {this.state.list && this.state.list.map(item => {
                    const date = new Date(item.gameId);
                    const template = `${date.getHours()}:${date.getMinutes()} ${date.getDay()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                    const getIncome = () => getResult(item);
                    const button = <button disabled={!item.success || item.assigned}
                                           onClick={getIncome} type='button'
                                           className={item.assigned || !item.success ? 'btn btn-secondary' : 'btn btn-primary'}>
                        {item.assigned ? 'Получено' : 'Забрать'}</button>;

                    return (
                        <div className='bet-line' key={item.tx.id}>
                            <span className='item'>Поле {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Выигрыш: {item.canGetBack}</span>
                            <span className='item'>Игра: {template}</span>
                            {button}
                        </div>
                    );
                }) || null}
            </div>
        );
    }
}

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
        list: Array<IBetResult>;
    }

}
