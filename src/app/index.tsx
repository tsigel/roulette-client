import * as React from 'react';
import { splitEvery } from 'ramda';
import { canSetBet } from '../utils';
import { CELLS } from '../cell';
import { History } from '../history';
import { setBet } from '../bets/setBet';


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

    private onClick = (bet: number) => setBet(0, bet);

    public render() {
        const cells = Object.entries(CELLS).sort(([a], [b]) => Number(a) - Number(b));
        const canSetBet = this.state.canSetBet ? 'Можно ставить! Ставка 1 WAVES' : 'Нельзя ставить, ставки сделаны!';
        return (
            <div className={'content'}>
                <div>
Рулетка крутится раз в 5 минут.<br/>
Сделайте ставку на ближайший раунд. Можно кликнуть<br/>
- на номер - выигрыш x36<br/>
- на красное или черное - выигрыш x2<br/>
- на чётное или нечётное - выигрыш x2<br/>
- на первую или вторую половину стола - выигрыш x2<br/>
- на ряд номеров - выигрыш x3<br/>
- на одну из третей стола - выигрыш x3<br/>
                    <br/><br/>

Если ваша ставка сыграла, то рядом с ней появится кнопка "Забрать".<br/>
Из выигрыша будут вычтены комиссии за транзакции от имени скрипта (одна дата-транзакция и один трансфер)<br/>
                    <br/>
авторы: @tsigel @igor<br/>
                </div>

                {canSetBet}
                <div className='flex-container'>
                    {splitEvery(3, cells.slice(1)).map(column => {
                        return (
                            <div className='column'>
                                {column.slice().reverse().map(([bet, options]) => {
                                    const className = options.isRed ? 'red bet' : 'bet';
                                    return <div onClick={() => this.onClick(Number(bet))}
                                                className={className}>{bet}</div>;
                                })}
                            </div>
                        );
                    })}
                </div>
                <div className={'line'}>
                    <div onClick={() => setBet(4, 0)}>Первая 12</div>
                    <div onClick={() => setBet(4, 1)}>Вторая 12</div>
                    <div onClick={() => setBet(4, 2)}>Третья 12</div>
                </div>
                <div className={'line'}>
                    <div onClick={() => setBet(3, 1)}>1-18</div>
                    <div onClick={() => setBet(2, 1)}>Чёт</div>
                    <div onClick={() => setBet(1, 1)}>Красное</div>
                    <div onClick={() => setBet(1, 0)}>Чёрное</div>
                    <div onClick={() => setBet(2, 0)}>Нечёт</div>
                    <div onClick={() => setBet(3, 0)}>19-36</div>
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
