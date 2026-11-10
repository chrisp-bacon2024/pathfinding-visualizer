import { hoverInteractions } from "./cellStyles.js"

export function setupGridInteractions(canvas, getGrid, animator, ctx){
    let selectedBrush = "wall";

    const brushShortcuts = {
        w: "wall",
        g: "grass",
        m: "mud",
        r: "road"
    };

    const brushButtons = document.querySelectorAll(".terrain-btn");

    const selectBrush = (brush) => {
        selectedBrush = brush;

        brushButtons.forEach(button => {
            const isSelected = button.dataset.brush === selectedBrush;

            button.classList.toggle("selected", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
        })
    };

    brushButtons.forEach(button => {
        button.addEventListener("click", () => {
            selectBrush(button.dataset.brush);
        });
    });

    window.addEventListener("keydown", event => {
        if (event.repeat || event.ctrlKey || event.metaKey || event.altKey){
            return;
        }

        const brush = brushShortcuts[event.key.toLowerCase()];

        if (brush){
            selectBrush(brush);
        }
    })

    
    // Start painting or dragging.
    canvas.addEventListener("mousedown", event => {
        if (event.button !== 0 || animator.running) return;

        // Editing the grid ends a paused playback, since the
        // remaining steps would no longer match the grid.
        if (animator.paused) animator.stop();

        const grid = getGrid();
        const cell = grid.getCellAt(event.offsetX, event.offsetY);
        if (!cell) return;

        if (cell.type === "start") {
            grid.interactionMode = "draggingStart";
            grid.activePaintType = null;
        } else if (cell.type === "end") {
            grid.interactionMode = "draggingEnd";
            grid.activePaintType = null;
        } else {
            grid.interactionMode = "paintingTerrain";
            grid.activePaintType = selectedBrush;
        }

        grid.lastDrawnCell = cell;

        // Paint the cell initially clicked.
        if (grid.activePaintType) {
            grid.paintLine(cell, cell, grid.activePaintType, ctx);
        }

        cell.draw(ctx, hoverInteractions[cell.type] ?? "idle");
    });

    // Continue painting or dragging while moving the mouse.
    canvas.addEventListener("mousemove", event => {
        const grid = getGrid();
        const cell = grid.getCellAt(event.offsetX, event.offsetY);

        // Remove hover styling from the previous cell.
        if (cell !== grid.hoveredCell) {
            if (grid.hoveredCell) {
                grid.hoveredCell.draw(ctx, "idle");
            }

            grid.hoveredCell = cell;
        }

        if (!animator.running && cell) {
            if (
                grid.interactionMode === "draggingStart" ||
                grid.interactionMode === "draggingEnd"
            ) {
                const endpoint =
                    grid.interactionMode === "draggingStart"
                        ? "start"
                        : "end";

                grid.moveEndpoint(endpoint, cell, ctx);

            } else if (grid.lastDrawnCell && grid.activePaintType) {
                grid.paintLine(
                    grid.lastDrawnCell,
                    cell,
                    grid.activePaintType,
                    ctx
                );

                grid.lastDrawnCell = cell;
            }
        }

        // Apply hover styling.
        if (cell) {
            cell.draw(ctx, hoverInteractions[cell.type] ?? "idle");
        }
    });

    // Remove hover styling when leaving the canvas.
    canvas.addEventListener("mouseleave", () => {
        const grid = getGrid();

        if (grid.hoveredCell) {
            grid.hoveredCell.draw(ctx, "idle");
            grid.hoveredCell = null;
        }
    });

    // Stop painting or dragging.
    const resetInteraction = () => {
        const grid = getGrid();

        grid.interactionMode = "idle";
        grid.activePaintType = null;
        grid.lastDrawnCell = null;
    };

    window.addEventListener("mouseup", resetInteraction);

    // Cancel interactions if the browser loses focus.
    window.addEventListener("blur", resetInteraction);

}