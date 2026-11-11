import { hoverInteractions } from "./cellStyles.js"

// onGridEdit runs when the user starts editing the grid, so anything
// computed for the old grid (playback, kept paths) can be cleared.
export function setupGridInteractions(canvas, getGrid, animator, terrainAnimator, ctx, onGridEdit = () => animator.clear()){
    let selectedBrush = "wall";

    // Block grid edits while an algorithm or map generation is animating.
    const isAnimating = () => animator.running || terrainAnimator.running;

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

    
    // Pointer events cover mouse, touch and pen. Only one pointer paints
    // at a time; a second finger is ignored.
    let activePointerId = null;

    // Start painting or dragging.
    canvas.addEventListener("pointerdown", event => {
        if (!event.isPrimary || event.button !== 0 || isAnimating()) return;

        // Keep receiving this pointer's moves until it's released, even
        // if a finger slides off the canvas.
        activePointerId = event.pointerId;
        canvas.setPointerCapture(event.pointerId);

        // Editing the grid discards any loaded playback (paused or
        // finished) and kept paths, since they no longer match the grid.
        onGridEdit();

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

        // Touch has no hover, so only a mouse gets hover styling.
        const isMouse = event.pointerType === "mouse";
        cell.draw(ctx, isMouse ? hoverInteractions[cell.type] ?? "idle" : "idle");
    });

    // Continue painting or dragging while moving the pointer.
    canvas.addEventListener("pointermove", event => {
        // Ignore a second finger, and other pointers mid-drag.
        if (activePointerId !== null && event.pointerId !== activePointerId) return;

        const grid = getGrid();
        const cell = grid.getCellAt(event.offsetX, event.offsetY);
        const isMouse = event.pointerType === "mouse";

        // Remove hover styling from the previous cell.
        if (isMouse && cell !== grid.hoveredCell) {
            if (grid.hoveredCell) {
                grid.hoveredCell.draw(ctx, "idle");
            }

            grid.hoveredCell = cell;
        }

        if (!isAnimating() && cell) {
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
        if (isMouse && cell) {
            cell.draw(ctx, hoverInteractions[cell.type] ?? "idle");
        }
    });

    // Remove hover styling when leaving the canvas.
    canvas.addEventListener("pointerleave", () => {
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
        activePointerId = null;
    };

    window.addEventListener("pointerup", resetInteraction);
    // E.g. the browser takes over the touch, or a call comes in.
    window.addEventListener("pointercancel", resetInteraction);

    // Cancel interactions if the browser loses focus.
    window.addEventListener("blur", resetInteraction);

}