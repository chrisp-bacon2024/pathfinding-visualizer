export const terrainCosts = {
    "grass": 2,
    "road": 1,
    "mud": 5,
    "end": 0
}

// Orthogonal moves. Also used by the terrain generators, which must stay
// 4-directional, so don't add diagonals here.
export const directions = [
    [0, -1], // Left
    [1, 0], // Down
    [0, 1], // Right
    [-1, 0], // Up
]

// Diagonal moves, checked after the orthogonal ones in 8-way mode.
export const diagonalDirections = [
    [1, -1], // Down-Left
    [1, 1], // Down-Right
    [-1, 1], // Up-Right
    [-1, -1], // Up-Left
]

export const MOVEMENT_MODES = Object.freeze({
    FOUR: "4",
    EIGHT: "8"
});

// Cheapest cost of entering any cell other than the destination
// (the destination costs 0). Used to keep the A* heuristic admissible.
export const MIN_ENTRY_COST = Math.min(
    ...Object.entries(terrainCosts)
        .filter(([type]) => type !== "end")
        .map(([, cost]) => cost)
);

export function isTraversable(cell) {
    return cell.type !== "wall";
}

function getCell(grid, row, col) {
    if (row < 0 || row >= grid.nRows || col < 0 || col >= grid.nCols) {
        return null;
    }

    return grid.rows[row][col];
}

// Traversable neighbours of a cell, as [{ cell, moveCost }], where moveCost
// is 1 for orthogonal moves and √2 for diagonal moves.
// Orthogonal neighbours always come first, in `directions` order, so
// 4-way results match the original per-algorithm loops exactly.
// A diagonal is only allowed when both orthogonal cells it passes between
// are traversable (no corner cutting).
export function getNeighbors(grid, cell, mode = MOVEMENT_MODES.FOUR) {
    const neighbors = [];

    for (const [dr, dc] of directions) {
        const neighbor = getCell(grid, cell.row + dr, cell.col + dc);

        if (neighbor && isTraversable(neighbor)) {
            neighbors.push({ cell: neighbor, moveCost: 1 });
        }
    }

    if (mode !== MOVEMENT_MODES.EIGHT) return neighbors;

    for (const [dr, dc] of diagonalDirections) {
        const neighbor = getCell(grid, cell.row + dr, cell.col + dc);
        if (!neighbor || !isTraversable(neighbor)) continue;

        // Both are in bounds whenever the diagonal is.
        const vertical = grid.rows[cell.row + dr][cell.col];
        const horizontal = grid.rows[cell.row][cell.col + dc];

        if (isTraversable(vertical) && isTraversable(horizontal)) {
            neighbors.push({ cell: neighbor, moveCost: Math.SQRT2 });
        }
    }

    return neighbors;
}

// Distance on an open grid where every move costs its unit cost:
// Manhattan for 4-way, octile for 8-way.
export function movementDistance(cell, destination, mode = MOVEMENT_MODES.FOUR) {
    const dr = Math.abs(cell.row - destination.row);
    const dc = Math.abs(cell.col - destination.col);

    if (mode !== MOVEMENT_MODES.EIGHT) return dr + dc;

    return Math.max(dr, dc) + (Math.SQRT2 - 1) * Math.min(dr, dc);
}

// A* heuristic: a lower bound on the cost from `cell` to `destination`.
//
// Every move costs at least MIN_ENTRY_COST × its unit cost, except the final
// move into the destination, which is free. So the cheapest possible route
// costs MIN_ENTRY_COST × (unit distance to the nearest cell next to the
// destination). That cell is one unit step closer: √2 closer when the
// destination is diagonally away in 8-way mode, otherwise 1 closer.
//
// This is a distance to a fixed set of cells, so it is consistent as well
// as admissible: it never drops by more than one move's real cost.
export function aStarHeuristic(cell, destination, mode = MOVEMENT_MODES.FOUR) {
    const dr = Math.abs(cell.row - destination.row);
    const dc = Math.abs(cell.col - destination.col);

    if (dr === 0 && dc === 0) return 0;

    const finalMove =
        mode === MOVEMENT_MODES.EIGHT && dr > 0 && dc > 0
            ? Math.SQRT2
            : 1;

    // max() guards against tiny negative floating-point results.
    return MIN_ENTRY_COST * Math.max(
        0,
        movementDistance(cell, destination, mode) - finalMove
    );
}

export function reconstructPath(cameFrom, start, end, steps){
    let path = [];
    let node = cameFrom.get(end);
    while (node !== start){
        path.push(node);
        node = cameFrom.get(node);
    }

    path.reverse().forEach(node => {
        steps.push({cell: node, state: "path"});
    });
};

export function destinationDistance(cell, destination){
    return Math.abs(cell.row - destination.row) + Math.abs(cell.col - destination.col);
};

export class MinHeap{
    constructor(){
        this.heap = []
    }
    isEmpty(){
        return this.heap.length === 0;
    }
    push(priority, cell){
        this.heap.push({priority: priority, cell: cell})
        let childIndex = this.heap.length - 1;
        let parentIndex = Math.floor((childIndex - 1)/2);
        while (parentIndex >= 0){
            if (this.heap[childIndex].priority < this.heap[parentIndex].priority){
                [this.heap[parentIndex], this.heap[childIndex]] = [this.heap[childIndex], this.heap[parentIndex]]
                childIndex = parentIndex;
                parentIndex = Math.floor((childIndex - 1)/2);
            } else {
                break
            }
        }
    }
    pop(){
        if (this.heap.length <= 1){
            return this.heap.pop()
        } 
        const minVal = this.heap[0]
        this.heap[0] = this.heap.pop()

        let parentInd = 0;
        let parent;
        let leftInd, rightInd;
        let leftChild, rightChild;
        while (parentInd < this.heap.length){
            parent = this.heap[parentInd];
            leftInd = parentInd * 2 + 1;
            if (leftInd < this.heap.length){
                leftChild = this.heap[leftInd]
            } else {
                leftChild = {priority: Infinity, cell:null}
            }
            rightInd = parentInd * 2 + 2
            if (rightInd < this.heap.length){
                rightChild = this.heap[rightInd]
            } else {
                rightChild = {priority: Infinity, cell:null}
            }

            if (parent.priority > leftChild.priority || parent.priority > rightChild.priority){
                if (leftChild.priority < rightChild.priority){
                    this.heap[leftInd] = parent;
                    this.heap[parentInd] = leftChild;
                    parentInd = leftInd;
                } else {
                    this.heap[rightInd] = parent;
                    this.heap[parentInd] = rightChild;
                    parentInd = rightInd;
                }
            } else {
                break
            }
        }
        return minVal
    }
}