///<reference path="../../less.d.ts"/>


import * as React from 'react';
import { storage } from '../storage/Storage';
import { api } from '@waves/ts-types';
import './balances.less'


export class Balances extends React.Component<Balances.IProps, Balances.IState> {

    public state: Balances.IState = {
        balance: []
    };

    constructor(props: Balances.IProps) {
        super(props);

        storage.on('balance', balance => {
            this.setState({ balance });
        });
    }

    public render() {
        return (
            <div className={'user-balance'}>
                Заведённые деньги:
                <div className={'content'}>
                    {this.state.balance.map(item => {
                        return (
                            <div className={'row'}>
                                <div className={'col-4 item'}>{item.amount / Math.pow(10, 8)}</div>
                                <div className={'col-4'}>WAVES</div>
                                <div className={'col-4'}>
                                    {/*<button type="button" className="btn btn-sm btn-primary">Забрать</button>*/}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}

export namespace Balances {

    export interface IProps {
    }

    export interface IState {
        balance: Array<api.TTransferTransaction<number>>;
    }

}
