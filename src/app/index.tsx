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
        const canSetBet = this.state.canSetBet ? 'You can make bet! Bet 1 WAVES' : 'Can\'t make bet now! Wait for next round';
        return (
            <div className={'main'}>
                <div className={'row'}>
                    <div className={'col-2'}>
                        <RouletteHistory/>
                    </div>
                    <div className={'col-8'}>
                        <div>
                            Roulette spins every 5 minutes.<br/>
                            Place a bet on the next round. You can click<br/>
                            - on a number - winning x36 *<br/>
                            - on red or black - win x2 *<br/>
                            - on even or odd - win x2 *<br/>
                            - on the first or second half of the table-win x2 *<br/>
                            - on a number of numbers-win x3 *<br/>
                            - on one of the third table-win x3 *<br/>
                            <br/>
                            You need to sign 2 transactions: Transfer-transfer of money, Data Transaction-registration rate 
			    (the Commission will be deducted from the money).<br/>
                            <br/>
                            If your bet is played, the "payout" button will appear next to it.<br/>
                            You will need to sign the data Transaction - registration of withdrawal, 
		            and Transfer Transaction - withdrawal.<br/>
                            <br/>
                            * Commissions for transactions on behalf of the script will be deducted from the winnings 
			      (two date transactions and one transfer).
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
                        <div onClick={() => registerBet(4, 0)}>First 12</div>
                        <div onClick={() => registerBet(4, 1)}>Second 12</div>
                        <div onClick={() => registerBet(4, 2)}>Third 12</div>
                    </div>
                    <div className={'line'}>
                        <div onClick={() => registerBet(3, 1)}>1-18</div>
                        <div onClick={() => registerBet(2, 1)}>Even</div>
                        <div onClick={() => registerBet(1, 1)}>Red</div>
                        <div onClick={() => registerBet(1, 0)}>Black</div>
                        <div onClick={() => registerBet(2, 0)}>Odd</div>
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
