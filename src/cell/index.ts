export interface ICell {
    readonly result: number;
    readonly isEven: boolean;
    readonly isOdd: boolean;
    readonly isRed: boolean;
    readonly isBlack: boolean;
    readonly isFirstHalf: boolean;
    readonly isLastHalf: boolean;
    readonly isFirstLine: boolean;
    readonly isMiddleLine: boolean;
    readonly isLastLine: boolean;
    readonly isFirstThird: boolean;
    readonly isMiddleThird: boolean;
    readonly isLastThird: boolean;
}

const RED_CELL_LIST = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

export const CELLS: Record<number, ICell> = Object.create(null);

for (let i = 0; i < 37; i++) {
    CELLS[i] = createCell(i);
}

function createCell(num: number): ICell {
    if (num === 0) {
        return getZeroCell();
    }
    const isEven = num % 2 === 0;
    const isOdd = !isEven;
    const isRed = RED_CELL_LIST.includes(num);
    const isBlack = !isRed;
    const isFirstHalf = num <= 18;
    const isLastHalf = !isFirstHalf;
    const isFirstLine = num % 3 === 0;
    const isMiddleLine = !isFirstLine && (num + 1) % 3 === 0;
    const isLastLine = !isMiddleLine && (num + 2) % 3 === 0;
    const isFirstThird = num <= 12;
    const isMiddleThird = !isFirstThird && num <= 24;
    const isLastThird = !isFirstThird && !isMiddleThird;

    return {
        isEven, isOdd, isRed, isBlack, isFirstHalf,
        isLastHalf, isFirstLine, isMiddleLine, isLastLine,
        isFirstThird, isMiddleThird, isLastThird, result: num
    };
}


function getZeroCell(): ICell {
    return {
        isEven: false,
        isOdd: false,
        isRed: false,
        isBlack: false,
        isFirstHalf: false,
        isLastHalf: false,
        isFirstLine: false,
        isMiddleLine: false,
        isLastLine: false,
        isFirstThird: false,
        isMiddleThird: false,
        isLastThird: false,
        result: 0
    };
};

