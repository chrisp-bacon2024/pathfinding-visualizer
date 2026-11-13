// Draws algorithm paths as coloured "transit-map" lines on a transparent
// canvas stacked above the grid. Paths from earlier runs are kept so they
// can be compared; where paths share cells they run in parallel lanes.

const OUTLINE_COLOR = "rgba(15, 23, 42, 0.75)";

// Shifts a polyline sideways by `offset` pixels (positive = left of the
// direction of travel), keeping each segment parallel to the original.
// Corners are mitred so lanes stay evenly spaced through turns.
export function offsetPolyline(points, offset) {
    // Drop repeated points: they have no direction.
    const pts = points.filter((p, i) =>
        i === 0 || p.x !== points[i - 1].x || p.y !== points[i - 1].y
    );

    if (offset === 0 || pts.length < 2) {
        return pts.map(({ x, y }) => ({ x, y }));
    }

    // Unit normal (pointing left) of each segment.
    const normals = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const dx = pts[i + 1].x - pts[i].x;
        const dy = pts[i + 1].y - pts[i].y;
        const length = Math.hypot(dx, dy);
        normals.push({ x: dy / length, y: -dx / length });
    }

    return pts.map((p, i) => {
        const before = normals[i - 1];
        const after = normals[i];

        // Ends of the line: shift along the only segment's normal.
        if (!before || !after) {
            const n = before ?? after;
            return { x: p.x + n.x * offset, y: p.y + n.y * offset };
        }

        const dot = before.x * after.x + before.y * after.y;

        // A U-turn has no sensible mitre; shift along the incoming normal.
        if (dot < -0.99) {
            return { x: p.x + before.x * offset, y: p.y + before.y * offset };
        }

        // Mitre point: on the bisector, far enough out that both
        // neighbouring segments end up exactly `offset` away.
        const scale = offset / (1 + dot);
        return {
            x: p.x + (before.x + after.x) * scale,
            y: p.y + (before.y + after.y) * scale
        };
    });
}

export class PathOverlay {
    // order: algorithm names in button order (fixes lane order).
    // colors: { name: cssColor }.
    // onChange(names): called with the algorithms in the comparison.
    constructor(canvas, { cellSize, order, colors, onChange = () => {} }) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext("2d") ?? null;
        this.cellSize = cellSize;
        this.order = order;
        this.colors = colors;
        this.onChange = onChange;

        // name -> full path { cells, start, end } from earlier runs.
        this.kept = new Map();

        // The run being played back:
        // { name, start, end, cells, pathStepIndices }.
        this.current = null;
        this.currentStep = 0;

        // Algorithms whose path is still in the comparison but not drawn.
        this.hidden = new Set();
    }

    // Shows or hides an algorithm's path without removing it from the
    // comparison. Returns whether it's now shown.
    toggleHidden(name) {
        if (!this.names().includes(name)) return false;

        if (this.hidden.has(name)) this.hidden.delete(name);
        else this.hidden.add(name);

        this.changed();
        return !this.hidden.has(name);
    }

    isHidden(name) {
        return this.hidden.has(name);
    }

    resize(width, height) {
        if (!this.canvas) return;

        this.canvas.width = width;
        this.canvas.height = height;
        this.draw();
    }

    // Call after an algorithm's steps are computed, before playback starts.
    startRun(name, steps, start, end) {
        // Keep the previous run's whole path, even if it was paused part-way.
        if (this.current) this.kept.set(this.current.name, this.current);

        // Re-running an algorithm replaces its old path, shown.
        this.kept.delete(name);
        this.hidden.delete(name);

        const pathStepIndices = [];
        const cells = [];
        const pathSteps = [];

        steps.forEach((step, index) => {
            if (step.state === "path") {
                pathStepIndices.push(index);
                cells.push(step.cell);
                pathSteps.push(step);
            }
        });

        this.current = {
            name, steps, start, end, cells, pathStepIndices,
            anyAngle: anyAngleRoute(pathSteps, start, end)
        };
        this.currentStep = 0;

        this.changed();
    }

    // Makes an earlier run the one being played back again, without
    // re-running it: its whole path is shown as finished. Returns its
    // steps (to load into the animator), or null if it isn't in the
    // comparison.
    select(name) {
        if (this.current?.name !== name) {
            const run = this.kept.get(name);
            if (!run) return null;

            this.kept.delete(name);
            if (this.current) this.kept.set(this.current.name, this.current);
            this.current = run;
        }

        this.currentStep = this.current.steps.length;
        this.changed();
        return this.current.steps;
    }

    // stepIndex: how many of the current run's steps have been applied.
    setProgress(stepIndex) {
        if (stepIndex === this.currentStep) return;

        this.currentStep = stepIndex;
        this.draw();
    }

    clear() {
        this.kept.clear();
        this.hidden.clear();
        this.current = null;
        this.currentStep = 0;

        this.changed();
    }

    // Algorithms in the comparison, in button order. Includes runs
    // that found no path.
    names() {
        const names = new Set(this.kept.keys());
        if (this.current) names.add(this.current.name);

        return this.order.filter(name => names.has(name));
    }

    // Cells to draw for each algorithm, in button order. The current
    // run only shows the path steps applied so far, and reaches the
    // end cell once its whole path is shown.
    visiblePaths() {
        const paths = [];

        for (const name of this.names()) {
            // Hidden paths take no lane.
            if (this.hidden.has(name)) continue;

            const isCurrent = this.current?.name === name;
            const { start, end, cells: pathCells, anyAngle } = isCurrent
                ? this.current
                : this.kept.get(name);

            // No path found. (Start next to end also has no path cells;
            // there's nothing worth comparing there either.)
            if (pathCells.length === 0) continue;

            const shown = isCurrent
                ? this.current.pathStepIndices.filter(i => i < this.currentStep).length
                : pathCells.length;

            // Nothing of the current path is shown yet.
            if (shown === 0) continue;

            if (anyAngle) {
                paths.push({ name, cells: anyAngle.pointsUpTo(shown) });
                continue;
            }

            const cells = [start, ...pathCells.slice(0, shown)];
            if (shown === pathCells.length) cells.push(end);

            paths.push({ name, cells });
        }

        return paths;
    }

    changed() {
        this.draw();
        this.onChange(this.names());
    }

    draw() {
        const { ctx, canvas, cellSize } = this;
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const paths = this.visiblePaths();
        const n = paths.length;
        if (n === 0) return;

        // Lanes share most of a cell's width; fewer paths get wider lanes.
        const spacing = Math.min(cellSize * 0.8 / n, cellSize * 0.24);
        const lineWidth = Math.max(1.5, Math.min(cellSize * 0.16, spacing * 0.7));

        const lines = paths.map(({ name, cells }, rank) => {
            const centres = cells.map(cell => ({
                x: (cell.col + 0.5) * cellSize,
                y: (cell.row + 0.5) * cellSize
            }));

            return {
                color: this.colors[name] ?? "#ffffff",
                points: offsetPolyline(centres, (rank - (n - 1) / 2) * spacing)
            };
        });

        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // All outlines first, so no outline covers another path's colour.
        ctx.strokeStyle = OUTLINE_COLOR;
        ctx.lineWidth = lineWidth + 2;
        lines.forEach(({ points }) => strokePolyline(ctx, points));

        ctx.lineWidth = lineWidth;
        lines.forEach(({ color, points }) => {
            ctx.strokeStyle = color;
            strokePolyline(ctx, points);
        });

        ctx.restore();
    }
}

// Any-angle paths (Theta*): each path step names the segment it lies on
// (`from` -> `to` waypoints) and how far along it it is (`t`). The line
// is drawn straight between waypoint centres rather than through every
// touched cell, and grows along the current segment during playback.
// Returns null for ordinary paths (no segment info on their steps).
function anyAngleRoute(pathSteps, start, end) {
    if (pathSteps.length === 0 || !pathSteps.every(step => step.to)) return null;

    const waypoints = [start];
    const positions = pathSteps.map(step => {
        if (step.to !== waypoints.at(-1)) waypoints.push(step.to);
        return { segment: waypoints.length - 2, t: step.t ?? 1 };
    });
    if (waypoints.at(-1) !== end) waypoints.push(end);

    return {
        waypoints,

        // Line points (in cell coordinates) once `shown` path steps
        // have been applied.
        pointsUpTo(shown) {
            if (shown >= positions.length) return waypoints;

            const { segment, t } = positions[shown - 1];
            const a = waypoints[segment];
            const b = waypoints[segment + 1];

            return [
                ...waypoints.slice(0, segment + 1),
                { row: a.row + (b.row - a.row) * t, col: a.col + (b.col - a.col) * t }
            ];
        }
    };
}

function strokePolyline(ctx, points) {
    ctx.beginPath();
    points.forEach(({ x, y }, i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}
