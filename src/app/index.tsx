import * as React from 'react';
import { splitEvery } from 'ramda';
import { getAttachment, getNextGame, WavesKeeper } from '../utils';
import { CELLS } from '../cell';
import { History } from '../history';


export function App() {

    const onClick = (bet: number) => WavesKeeper.signAndPublishTransaction({
        type: 4,
        data: {
            recipient: '3NCzaYTNDGtR8zf9yfcqePFjCqFx9S5zhs4',
            amount: { tokens: 0.001, assetId: 'WAVES' },
            fee: { tokens: 0.001, assetId: 'WAVES' },
            attachment: getAttachment(getNextGame(), [0, bet])
        }
    });

    const cells = Object.entries(CELLS).sort(([a], [b]) => Number(a) - Number(b));

    return (
        <div>
            <div className='flex-container'>
                {splitEvery(3, cells.slice(1)).map(column => {
                    return (
                        <div className='column'>
                            {column.slice().reverse().map(([bet, options]) => {
                                const className = options.isRed ? 'red bet' : 'bet';
                                return <div onClick={() => onClick(Number(bet))} className={className}>{bet}</div>;
                            })}
                        </div>
                    );
                })}
            </div>
            <div>
                <History rouletteAddress={'3NCzaYTNDGtR8zf9yfcqePFjCqFx9S5zhs4'}/>
            </div>
        </div>
    );
}
