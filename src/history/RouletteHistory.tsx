///<reference path="../../less.d.ts"/>


import * as React from 'react';
import { getLastGame, getLastGameIdList, getRouletteHistory, date } from '../utils';
import { propEq, head } from 'ramda';
import { CELLS } from '../cell';
import './roulette-history.less';


export class RouletteHistory extends React.Component<RouletteHistory.IProps, RouletteHistory.IState> {

    public state: RouletteHistory.IState = {
        history: []
    };

    constructor(props: RouletteHistory.IProps) {
        super(props);

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

                        setTimeout(gameResultHistoryLoop, 1000 * 5);
                    })
                    .catch(() => setTimeout(gameResultHistoryLoop, 1000 * 5));
                return null;
            }

            const last = getLastGame();
            const has = history.find(propEq('id', last));

            if (has) {
                setTimeout(gameResultHistoryLoop, 1000 * 5);
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

                    setTimeout(gameResultHistoryLoop, 1000 * 5);
                })
                .catch(() => setTimeout(gameResultHistoryLoop, 1000 * 5));

        };

        gameResultHistoryLoop();
    }

    public render() {
        return (
            <div className={'roulette-history'}>
                Last results:
                <div className={'content'}>
                    {this.state.history.map(item => {
                        const cell = CELLS[item.result];
                        const red = cell.isRed ? 'red' : '';
                        const black = cell.isBlack ? 'black' : '';

                        return (
                            <div className={'row'}>
                                <div className={'col-6 item ' + red + black}>{item.result}</div>
                                <div className={'col-6'}>{date(item.id)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
}

export namespace RouletteHistory {

    export interface IProps {
    }

    export interface IState {
        history: Array<{ id: number, result: number }>;
    }

}
