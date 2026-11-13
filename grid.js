
import { Cell } from './cell.js';
import { hoverInteractions } from './cellStyles.js';

const defaultStart = { row: 0, col: 0 };
const defaultEnd = { row: -1, col: -1 };

const paintableTypes = new Set(["grass", "mud", "road", "wall"]);

export class Grid {
    constructor(nRows, nCols, cellSize) {
        this.nRows = nRows;
        this.nCols = nCols;
        this.cellSize = cellSize;

        this.interactionMode = "idle";
        this.hoveredCell = null;
        this.lastDrawnCell = null;
        this.activePaintType = null;

        this.rows = [];

        this.start = null;
        this.end = null;

        this.createGrid();
    }

    createGrid() {
        for (let row = 0; row < this.nRows; row++) {
            const rowArray = [];

            for (let col = 0; col < this.nCols; col++) {
                let type = "grass";

                if (
                    row === defaultStart.row &&
                    col === defaultStart.col
                ) {
                    type = "start";
                } else if (
                    row === this.nRows + defaultEnd.row &&
                    col === this.nCols + defaultEnd.col
                ) {
                    type = "end";
                }

                const cell = new Cell(row, col, type, this.cellSize);

                if (type === "start") {
                    this.start = cell;
                } else if (type === "end") {
                    this.end = cell;
                }

                rowArray.push(cell);
            }

            this.rows.push(rowArray);
        }
    }

    draw(ctx) {
        this.rows.forEach(row => {
            row.forEach(cell => {
                const interaction = cell === this.hoveredCell
                    ? hoverInteractions[cell.type] ?? "idle"
                    : "idle";

                cell.draw(ctx, interaction);
            });
        });
    }

    getCellAt(x, y, margin = 3) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        if (
            row < 0 || row >= this.nRows ||
            col < 0 || col >= this.nCols
        ) {
            return null;
        }

        const localX = x % this.cellSize;
        const localY = y % this.cellSize;

        if (
            localX < margin ||
            localX >= this.cellSize - margin ||
            localY < margin ||
            localY >= this.cellSize - margin
        ) {
            return null;
        }

        return this.rows[row][col];
    }

    getCellsAlongLine(from, to) {
        const cells = [];

        const dX = to.col - from.col;
        const dY = to.row - from.row;

        const stepX = Math.sign(dX);
        const stepY = Math.sign(dY);

        const absDX = Math.abs(dX);
        const absDY = Math.abs(dY);

        let crossedX = 0;
        let crossedY = 0;

        let row = from.row;
        let col = from.col;

        cells.push(this.rows[row][col])

        while (row !== to.row || col !== to.col){
            const nextX = (2 * crossedX + 1) * absDY;
            const nextY = (2 * crossedY + 1) * absDX;

            if (nextX < nextY) {
                col += stepX;
                crossedX++;
            } else if (nextY < nextX) {
                row += stepY;
                crossedY++;
            } else {
                // The line touches a grid corner.
                // Include both adjacent side cells.
                cells.push(this.rows[row][col + stepX]);
                cells.push(this.rows[row + stepY][col]);

                row += stepY;
                col += stepX;

                crossedX++;
                crossedY++;
            }
            cells.push(this.rows[row][col]);
        }
        return cells;
    }

    
    lineOfSight(from, to) {
        const cells = this.getCellsAlongLine(from, to);

        // Reject invalid endpoints.
        if (cells.length === 0) return false;

        // Check every cell touched by the line, including
        // adjacent cells at corners to prevent corner cutting.
        for (const cell of cells) {
            if (!cell || cell.type === "wall") {
                return false;
            }
        }

        return true;
    }


    paintLine(startCell, endCell, type, ctx) {
        if (!startCell || !endCell) return;
        if (!paintableTypes.has(type)) return;

        let x0 = startCell.col;
        let y0 = startCell.row;

        const x1 = endCell.col;
        const y1 = endCell.row;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);

        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;

        let error = dx - dy;

        while (true) {
            const cell = this.rows[y0][x0];

            // Never paint over the start or end.
            if (
                cell.type !== "start" &&
                cell.type !== "end"
            ) {
                cell.setType(type, ctx);

                // Remove previous search visualization
                // when the terrain is changed.
                if (cell.searchState !== "idle") {
                    cell.setSearchState("idle", ctx);
                }
            }

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * error;

            if (e2 > -dy) {
                error -= dy;
                x0 += sx;
            }

            if (e2 < dx) {
                error += dx;
                y0 += sy;
            }
        }
    }

    resetTerrain(base, ctx){
        console.log("resetting terrain");
        for (const row of this.rows){
            for (const cell of row){
                if (cell.type === "start" || cell.type === "end") continue;

                cell.setType(base, ctx);

                if (cell.searchState !== "idle") {
                    cell.setSearchState("idle", ctx);
                }
            }
        }
    };

    applyTerrainChanges(changes, ctx) {
        for (const { row, col, type } of changes) {
            const cell = this.rows[row]?.[col];
    
            if (!cell || cell === this.start || cell === this.end) {
                continue;
            }
    
            cell.setType(type, ctx);
            cell.setSearchState("idle", ctx);
        }
    }

    // Optional compatibility wrapper for older callers.
    drawWallLine(startCell, endCell, ctx) {
        const type =
            this.interactionMode === "drawingWall" ? "wall" :
            this.interactionMode === "erasingWall" ? "grass" :
            null;

        if (type) {
            this.paintLine(startCell, endCell, type, ctx);
        }
    }

    moveEndpoint(endpoint, targetCell, ctx) {
        if (!targetCell) return;
        if (endpoint !== "start" && endpoint !== "end") return;

        // Allow endpoints to move onto traversable terrain.
        if (
            !["grass", "mud", "road"].includes(targetCell.type)
        ) {
            return;
        }

        const currentCell = this[endpoint];

        if (!currentCell || currentCell === targetCell) return;

        currentCell.setType("grass", ctx);
        targetCell.setType(endpoint, ctx);

        currentCell.setSearchState("idle", ctx);
        targetCell.setSearchState("idle", ctx);

        this[endpoint] = targetCell;
    }

    clearVisualization(ctx){
        for (const row of this.rows){
            for (const cell of row){
                if (cell.searchState !== "idle"){
                    cell.setSearchState("idle", ctx)
                }
            }
        }
    }
}
