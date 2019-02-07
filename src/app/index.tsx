import * as React from 'react';


const WavesKeeper: {
    signAndPublishTransaction(data: { type: number; data: any }): Promise<void>
    signTransaction(data: { type: number; data: any }): Promise<void>
} = (window as any).WavesKeeper;

export function App() {

    const onClick = () => WavesKeeper.signAndPublishTransaction({
        type: 4,
        data: {
            recipient: '3NCzaYTNDGtR8zf9yfcqePFjCqFx9S5zhs4',
            amount: { tokens: 0.001, assetId: 'WAVES' },
            fee: { tokens: 0.001, assetId: 'WAVES' }
        }
    });

    return (
        <button type="button" onClick={onClick} className="btn btn-primary">Поставить</button>
    );
}
