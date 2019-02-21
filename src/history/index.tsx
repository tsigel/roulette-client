import * as React from 'react';
import { date, IBetResult } from '../utils';
import { api } from '@waves/ts-types';
import { withdraw } from '../bets';
import { storage } from '../storage/Storage';


export class History extends React.Component<History.IProps, History.IState> {

    public state: History.IState = {
        balance: [],
        unconfirmed: [],
        other: []
    };

    constructor(props: History.IProps) {
        super(props);

        storage.on('other', other => {
            this.setState({ other });
        });
        storage.on('unconfirmed', unconfirmed => {
            this.setState({ unconfirmed });
        });
    }

    public render() {
        return (
            <div className='history'>
                {this.state.unconfirmed.map(item => {
                    const template = date(item.gameId);
                    const getBack = () => withdraw(item);
                    const getBackText = item.success ? item.canGetBack : '---';
                    const button = item.success ?
                        <button type="button" onClick={() => getBack()} className="btn btn-primary">Payout</button> :
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Loading...</span>
                        </div>;

                    return (
                        <div className='bet-line unconfirmed' key={item.tx.id}>
                            <span className='item'>Field {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Win amount: {getBackText}</span>
                            <span className='item'>Game: {template}</span>
                            {button}
                        </div>
                    );
                })}
                {this.state.other.map(item => {
                    const template = date(item.gameId);
                    const getBackText = item.success ? item.canGetBack : '---';
                    const button = item.success ? <span>Withdrawn</span> : <span>Loss</span>;

                    return (
                        <div className='bet-line other' key={item.tx.id}>
                            <span className='item'>Field {getBetText(item.betType, item.bet)}</span>
                            <span className='item'>Win amount: {getBackText}</span>
                            <span className='item'>Game: {template}</span>
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
            return `Number ${bet}`;
        case 1:
            return bet ? 'Red' : 'Black';
        case 2:
            return bet ? 'Even' : 'Odd';
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
        unconfirmed: Array<IBetResult>;
        other: Array<IBetResult>;
    }

}
