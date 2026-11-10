export function randomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function weightedRandomChoice(weights) {
    const totalWeight = [...weights.values()]
        .reduce((sum, weight) => sum + weight, 0)
    
    let random = Math.random() * totalWeight;

    for (const [direction, weight] of weights) {
        random -= weight;

        if (random < 0) {
            return direction
        }
    }

    return null;
}

export function getDirection(fromCell, toCell) {
    const dr = Math.sign(toCell.row - fromCell.row);
    const dc = Math.sign(toCell.col - fromCell.col);

    return [dr, dc];
}

export function resolveDirection(direction, directions){
    const [dr, dc] = direction;

    const isAllowed = ([r, c]) =>
        directions.some(([ar, ac]) => ar === r && ac === c)

    if (isAllowed(direction)) {
        return direction;
    }

    const alternatives = [
        [dr, 0],
        [0, dc]
    ].filter(isAllowed);

    if (alternatives.length === 0) {
        return null;
    }

    return alternatives[
        Math.floor(Math.random() * alternatives.length)
    ];
}

export function wouldCreateRoadBlock(cell, roadCells) {
    const { row, col } = cell;

    const isRoad = (r, c) => roadCells.has(`${r},${c}`);

    // Check all four possible 2x2 squares containing this cell
    for (const dr of [-1, 0]) {
        for (const dc of [-1, 0]) {
            const top = row + dr;
            const left = col + dc;

            const square = [
                [top, left],
                [top, left + 1],
                [top + 1, left],
                [top + 1, left + 1]
            ];

            if (square.every(([r, c]) =>
                (r === row && c === col) || isRoad(r, c)
            )) {
                return true;
            }
        }
    }

    return false;
}