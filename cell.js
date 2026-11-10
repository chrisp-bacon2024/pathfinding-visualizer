import { cellStyles } from './cellStyles.js';
import { getTerrainColor } from "./terrain/terrainNoise.js";

export class Cell {
    constructor(row, col, type, size) {
        this.row = row;
        this.col = col;
        this.size = size;
        this.setType(type);
        this.searchState = "idle";
    }

    
    
    
    draw(ctx, interaction = "idle") {
        const terrainStyle = {
            ...cellStyles.default,
            ...cellStyles.types[this.type]
        };

        const searchStyle =
            cellStyles.searchStates[this.searchState] ?? {};

        const interactionStyle =
            cellStyles.interactions[interaction] ?? {};

        const x = this.col * this.size;
        const y = this.row * this.size;

        const showSearchState =
            this.type !== "wall" &&
            this.type !== "start" &&
            this.type !== "end";

        // Get position-dependent terrain color
        const terrainFill = getTerrainColor(
            this.type,
            this.row,
            this.col
        ) ?? terrainStyle.fill;

        // Layer 1: Draw underlying terrain
        ctx.fillStyle = terrainFill;
        ctx.fillRect(x, y, this.size, this.size);

        // Layer 2: Draw subtle road markings
        if (this.type === "road") {
            ctx.save();

            ctx.fillStyle = "rgba(235, 235, 235, 0.45)";

            const centerX = x + this.size / 2;
            const centerY = y + this.size / 2;

            const dashWidth = 2;
            const dashLength = 6;

            ctx.fillRect(
                centerX - dashWidth / 2,
                centerY - dashLength / 2,
                dashWidth,
                dashLength
            );

            ctx.restore();
        }

        // Layer 3: Draw search-state overlay
        if (showSearchState && searchStyle.fill) {
            ctx.save();

            ctx.globalAlpha = searchStyle.opacity ?? 1;
            ctx.fillStyle = searchStyle.fill;
            ctx.fillRect(x, y, this.size, this.size);

            ctx.restore();
        }

        // Layer 4: Draw hover styling
        if (interactionStyle.fill) {
            ctx.fillStyle = interactionStyle.fill;
            ctx.fillRect(x, y, this.size, this.size);
        }

        // Layer 5: Determine border styling
        const hasSpecialBorder =
            interactionStyle.border !== undefined ||
            (showSearchState && searchStyle.border !== undefined);

        const border = hasSpecialBorder
            ? (
                interactionStyle.border ??
                searchStyle.border
            )
            : terrainFill;

        const borderWidth =
            interactionStyle.borderWidth ??
            (showSearchState ? searchStyle.borderWidth : undefined) ??
            terrainStyle.borderWidth;

        // Layer 6: Draw border, if enabled
        if (borderWidth > 0) {
            ctx.strokeStyle = border;
            ctx.lineWidth = borderWidth;

            const inset = borderWidth / 2;

            ctx.strokeRect(
                x + inset,
                y + inset,
                this.size - borderWidth,
                this.size - borderWidth
            );
        }
    }




    setType(type, ctx, interaction = "idle") {
        if (!Object.hasOwn(cellStyles.types, type)) {
            throw new Error("Invalid cell type");
        }
    
        if (this.type === type) return;
    
        this.type = type;
    
        if (ctx) {
            this.draw(ctx, interaction);
        }
    }

    setSearchState(state, ctx, interaction = "idle"){
        if (!Object.hasOwn(cellStyles.searchStates, state)) {
            throw new Error("Invalid cell type");
        }

        if (this.searchState === state) return;

        this.searchState = state;

        if (ctx) {
            this.draw(ctx, interaction);
        }
    }
}