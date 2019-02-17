import { EventEmitter } from 'typed-ts-events';
import { api } from '@waves/ts-types';
import { getBetResult, getUserBetByTransfer, getUserPayments, IBetResult, isPayment, ITransferWithBet } from '../utils';
import { map, path, pathEq, pipe, uniqBy } from 'ramda';

export class Storage extends EventEmitter<Storage.IEvents> {

    private state: Storage.IEvents = {
        balance: [],
        unconfirmed: [],
        other: []
    };

    constructor() {
        super();
        this._loop();
    }

    private _loop() {
        getUserPayments()
            .then(this._filterResolvedPayments)
            .then(list => {
                return this._getUnregistred(list)
                    .then((items: Array<api.TTransferTransaction<number> | ITransferWithBet>) => {
                        const balance: Array<api.TTransferTransaction<number>> = items.filter(isPayment);
                        const withBet = items.filter(item => !isPayment(item)) as Array<ITransferWithBet>;

                        return getBetResult(withBet)
                            .then(list => {

                                const other = uniqBy(path(['tx', 'id']), [
                                    ...list.filter((item: IBetResult) => item.pending === false && item.assigned === false),
                                    ...this.state.other
                                ]);

                                const unconfirmed = uniqBy(path(['tx', 'id']), [
                                    ...list.filter(item => item.assigned === true),
                                    ...this.state.unconfirmed.filter(item => !other.find(pathEq(['tx', 'id'], item)))
                                ]);

                                this.setState({ other, unconfirmed, balance });
                                setTimeout(this._loop.bind(this), 1000);
                            });
                    });
            });
    }


    private _filterResolvedPayments = (list: Array<api.TTransferTransaction<number>>) =>
        list.filter(tx => !this.state.other.find(pathEq(['tx', 'id'], tx.id)));

    private _filterRegistredPayments = (list: Array<api.TTransferTransaction<number>>) =>
        list.filter(tx => !this.state.other.find(pathEq(['tx', 'id'], tx.id)));

    private _getUnregistred = pipe(
        this._filterRegistredPayments,
        map(getUserBetByTransfer),
        list => Promise.all(list)
    );

    private setState(state: Partial<Storage.IEvents>) {
        this.state = { ...this.state, ...state };
        Object.entries(state).forEach(([key, value]) => {
            this.trigger(key as keyof Storage.IEvents, value as Storage.IEvents[keyof Storage.IEvents]);
        });
    }
}

export const storage = new Storage();

export namespace Storage {

    export interface IEvents {
        balance: Array<api.TTransferTransaction<number>>;
        unconfirmed: Array<ITransferWithBet>;
        other: Array<IBetResult>;
    }

}
