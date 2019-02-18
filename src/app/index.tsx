import * as React from 'react';
import { splitEvery } from 'ramda';
import { canSetBet } from '../utils';
import { CELLS } from '../cell';
import { History } from '../history';
import { registerBet } from '../bets/registerBet';
import { RouletteHistory } from '../history/RouletteHistory';
import { Balances } from '../balances/Balances';
import './app.less';


export class App extends React.Component<App.IProps, App.IState> {

    constructor(props: App.IProps) {
        super(props);

        this.state = {
            time: Date.now(),
            canSetBet: canSetBet()
        };

        const loop = () => {

            this.setState({
                time: Date.now(),
                canSetBet: canSetBet()
            });
            setTimeout(loop, 1000);
        };

        setTimeout(loop, 1000);
    }

    public render() {
        const cells = Object.entries(CELLS).sort(([a], [b]) => Number(a) - Number(b));
        const canSetBet = this.state.canSetBet ? 'Можно ставить! Ставка 1 WAVES' : 'Нельзя ставить, ставки сделаны!';
        return (
            <div className={'main'}>
                <div className={'row'}>
                    <div className={'col-2'}>
                        <RouletteHistory/>
                    </div>
                    <div className={'col-8'}>
                        <div>
                            Рулетка крутится раз в 5 минут.<br/>
                            Сделайте ставку на ближайший раунд. Можно кликнуть<br/>
                            - на номер - выигрыш x36<br/>
                            - на красное или черное - выигрыш x2<br/>
                            - на чётное или нечётное - выигрыш x2<br/>
                            - на первую или вторую половину стола - выигрыш x2<br/>
                            - на ряд номеров - выигрыш x3<br/>
                            - на одну из третей стола - выигрыш x3<br/>
                            <br/>

                            Если ваша ставка сыграла, то рядом с ней появится кнопка "Забрать".<br/>
                            Из выигрыша будут вычтены комиссии за транзакции от имени скрипта (одна дата-транзакция и
                            один
                            трансфер)<br/>
                            <br/>
                            авторы: @tsigel @igor<br/>
                        </div>
                    </div>
                    <div className={'col-2'}>
                        <Balances/>
                    </div>
                </div>


                {canSetBet}
                <div className={'roulette-play-box'}>
                    <div className='flex-container'>
                        {splitEvery(3, cells.slice(1)).map(column => {
                            return (
                                <div className='column'>
                                    {column.slice().reverse().map(([bet, options]) => {
                                        const className = options.isRed ? 'red bet' : 'bet';
                                        return <div onClick={() => registerBet(0, Number(bet))}
                                                    className={className}>{bet}</div>;
                                    })}
                                </div>
                            );
                        })}
                    </div>
                    <div className={'line'}>
                        <div onClick={() => registerBet(4, 0)}>Первая 12</div>
                        <div onClick={() => registerBet(4, 1)}>Вторая 12</div>
                        <div onClick={() => registerBet(4, 2)}>Третья 12</div>
                    </div>
                    <div className={'line'}>
                        <div onClick={() => registerBet(3, 1)}>1-18</div>
                        <div onClick={() => registerBet(2, 1)}>Чёт</div>
                        <div onClick={() => registerBet(1, 1)}>Красное</div>
                        <div onClick={() => registerBet(1, 0)}>Чёрное</div>
                        <div onClick={() => registerBet(2, 0)}>Нечёт</div>
                        <div onClick={() => registerBet(3, 0)}>19-36</div>
                    </div>
                </div>
                <div>
                    <History/>
                </div>
            </div>
        );
    }

}

export namespace App {

    export interface IProps {

    }

    export interface IState {
        time: number;
        canSetBet: boolean;
    }

}
