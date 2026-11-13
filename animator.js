
export class Animator {
    constructor(ctx, speed = 30) {
        this.ctx = ctx;
        this.speed = speed;
        this.steps = [];
        this.currentStep = 0;

        // history[i] holds the state a cell had before steps[i]
        // was applied, so the step can be undone when scrubbing back.
        this.history = [];
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.accumulator = 0;
        this.onComplete = null;
        this.onCancel = null;
        this.runId = 0;
        this.listeners = new Set();
        this.progressListeners = new Set();

        // User-chosen speed multiplier (1 = normal). Kept across loads.
        this.speedMultiplier = 1;
    }

    setSpeedMultiplier(multiplier) {
        if (!Number.isFinite(multiplier) || multiplier <= 0) return;

        this.speedMultiplier = multiplier;
    }

    // "playing", "paused" or "idle".
    get state() {
        if (this.running) return "playing";
        if (this.paused) return "paused";
        return "idle";
    }

    // Register a callback that fires whenever the playback state changes.
    // Returns a function that removes the callback.
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify() {
        const state = this.state;
        this.listeners.forEach(listener => listener(state));
    }

    // Register a callback that fires whenever playback advances,
    // called with (currentStep, totalSteps).
    // Returns a function that removes the callback.
    subscribeProgress(listener) {
        this.progressListeners.add(listener);
        return () => this.progressListeners.delete(listener);
    }

    notifyProgress() {
        const current = this.currentStep;
        const total = this.steps.length;
        this.progressListeners.forEach(listener => listener(current, total));
    }

    load(steps, options = {}) {
        this.stop();

        this.steps = steps;
        this.history = [];
        this.currentStep = 0;
        this.accumulator = 0;

        this.playbackSpeed = options.duration
            ? steps.length / (options.duration / 1000)
            : this.speed;

        this.onComplete = options.onComplete ?? null;
        this.onCancel = options.onCancel ?? null;

        this.notifyProgress();
    }

    start() {
        if (this.running) return;

        this.running = true;
        this.paused = false;
        this.lastTime = 0;

        const runId = ++this.runId;

        requestAnimationFrame(time => this.animate(time, runId));
        this.notify();
    }

    // Freeze playback in place. Steps, progress and callbacks are kept.
    pause() {
        if (!this.running) return;

        this.running = false;
        this.paused = true;

        // Invalidate the pending animation frame.
        this.runId++;

        this.notify();
    }

    // Continue from the step where playback was paused.
    resume() {
        if (!this.paused) return;

        // start() resets lastTime, so the time spent paused
        // does not count towards the next frame.
        this.start();
    }

    // Loaded steps have all been played and playback has stopped.
    get finished() {
        return !this.running &&
            this.steps.length > 0 &&
            this.currentStep >= this.steps.length;
    }

    // Play the loaded steps again from the beginning.
    restart() {
        if (this.running || this.steps.length === 0) return;

        this.seek(0);
        this.start();
    }

    togglePause() {
        if (this.running) {
            this.pause();
        } else if (this.paused) {
            this.resume();
        }
    }

    animate(time, runId) {
        if (!this.running || runId !== this.runId) return;

        if (this.lastTime === 0) {
            this.lastTime = time;
        }

        const delta = time - this.lastTime;
        this.lastTime = time;
        this.accumulator += delta;

        // Read every frame so speed changes apply mid-playback.
        const interval =
            1000 / (this.playbackSpeed * this.speedMultiplier);

        const stepBefore = this.currentStep;

        while (
            this.accumulator >= interval &&
            this.currentStep < this.steps.length
        ) {
            this.applyStep(this.currentStep);

            this.currentStep++;
            this.accumulator -= interval;
        }

        if (this.currentStep !== stepBefore) {
            this.notifyProgress();
        }

        if (this.currentStep >= this.steps.length) {
            const onComplete = this.onComplete;

            this.running = false;
            this.onComplete = null;
            this.onCancel = null;

            this.notify();
            onComplete?.();
            return;
        }

        requestAnimationFrame(time => this.animate(time, runId));
    }

    applyStep(index) {
        const step = this.steps[index];
        const { cell } = step;

        this.history[index] = {
            type: cell.type,
            searchState: cell.searchState
        };

        if (step.type === "terrain") {
            cell.setType(step.terrainType, this.ctx);
            cell.setSearchState("idle", this.ctx);
        } else {
            cell.setSearchState(step.state, this.ctx);
        }
    }

    undoStep(index) {
        const { cell } = this.steps[index];
        const previous = this.history[index];

        if (!previous) return;

        cell.setType(previous.type, this.ctx);
        cell.setSearchState(previous.searchState, this.ctx);
    }

    // Jump to a step index, applying or undoing steps on the grid.
    // Auto-pauses a running playback. Seeking a finished playback
    // back from the end puts it into the paused state so it can be replayed.
    seek(targetStep) {
        if (this.steps.length === 0) return;

        const target = Math.max(
            0,
            Math.min(Math.round(targetStep), this.steps.length)
        );

        this.pause();

        while (this.currentStep < target) {
            this.applyStep(this.currentStep);
            this.currentStep++;
        }

        while (this.currentStep > target) {
            this.currentStep--;
            this.undoStep(this.currentStep);
        }

        // Don't let leftover frame time cause a burst on resume.
        this.accumulator = 0;

        if (!this.paused && this.currentStep < this.steps.length) {
            this.paused = true;
            this.notify();
        }

        this.notifyProgress();
    }

    // Stop and forget the loaded steps. Use when the grid changes
    // outside playback, since the recorded history no longer applies.
    clear() {
        this.stop();

        this.steps = [];
        this.history = [];
        this.currentStep = 0;
        this.accumulator = 0;

        this.notifyProgress();
    }

    stop() {
        const wasActive = this.running || this.paused;
        const onCancel = this.onCancel;

        this.running = false;
        this.paused = false;
        this.runId++;
        this.onComplete = null;
        this.onCancel = null;

        if (wasActive) {
            this.notify();
            onCancel?.();
        }
    }
}
