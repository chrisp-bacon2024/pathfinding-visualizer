
import { randomInt } from "./helpers.js";

const MIN_SIZE = 5;

const getCellKey = (row, col) => `${row},${col}`;

const divideRegion = (
    top,
    left,
    height,
    width,
    changes,
    protectedCells
) => {
    const canDivideVertically = width >= 2 * MIN_SIZE + 1;
    const canDivideHorizontally = height >= 2 * MIN_SIZE + 1;

    if (!canDivideVertically && !canDivideHorizontally) return;

    // Larger regions are less likely to stop dividing.
    const minArea = MIN_SIZE * MIN_SIZE;
    const currentArea = height * width;
    const stopChance = minArea / currentArea;

    if (Math.random() < stopChance) return;

    let orientation;

    if (!canDivideVertically) {
        orientation = "horizontal";
    } else if (!canDivideHorizontally) {
        orientation = "vertical";
    } else {
        orientation = Math.random() < 0.5
            ? "vertical"
            : "horizontal";
    }

    if (orientation === "horizontal") {
        const wallRow = randomInt(
            top + MIN_SIZE,
            top + height - MIN_SIZE - 1
        );

        const openingCol = randomInt(
            left + 1,
            left + width - 2
        );

        // Protect the opening and its access from both sides.
        protectedCells.add(getCellKey(wallRow, openingCol));
        protectedCells.add(getCellKey(wallRow - 1, openingCol));
        protectedCells.add(getCellKey(wallRow + 1, openingCol));

        for (let col = left; col < left + width; col++) {
            if (col === openingCol) continue;

            if (protectedCells.has(getCellKey(wallRow, col))) {
                continue;
            }

            changes.push({
                row: wallRow,
                col,
                type: "wall"
            });
        }

        const topHeight = wallRow - top;
        const bottomTop = wallRow + 1;
        const bottomHeight = top + height - bottomTop;

        divideRegion(
            top,
            left,
            topHeight,
            width,
            changes,
            protectedCells
        );

        divideRegion(
            bottomTop,
            left,
            bottomHeight,
            width,
            changes,
            protectedCells
        );

    } else {
        const wallCol = randomInt(
            left + MIN_SIZE,
            left + width - MIN_SIZE - 1
        );

        const openingRow = randomInt(
            top + 1,
            top + height - 2
        );

        // Protect the opening and its access from both sides.
        protectedCells.add(getCellKey(openingRow, wallCol));
        protectedCells.add(getCellKey(openingRow, wallCol - 1));
        protectedCells.add(getCellKey(openingRow, wallCol + 1));

        for (let row = top; row < top + height; row++) {
            if (row === openingRow) continue;

            if (protectedCells.has(getCellKey(row, wallCol))) {
                continue;
            }

            changes.push({
                row,
                col: wallCol,
                type: "wall"
            });
        }

        const leftWidth = wallCol - left;
        const rightLeft = wallCol + 1;
        const rightWidth = left + width - rightLeft;

        divideRegion(
            top,
            left,
            height,
            leftWidth,
            changes,
            protectedCells
        );

        divideRegion(
            top,
            rightLeft,
            height,
            rightWidth,
            changes,
            protectedCells
        );
    }
};

export function generateWalls(grid) {
    const changes = [];
    const protectedCells = new Set();

    divideRegion(
        0,
        0,
        grid.nRows,
        grid.nCols,
        changes,
        protectedCells
    );

    return changes.filter(({ row, col }) => {
        const cell = grid.rows[row][col];

        return cell !== grid.start && cell !== grid.end;
    });
}
