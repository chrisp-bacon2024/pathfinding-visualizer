
export function setupPlaybackControls(animator) {
    const playPauseButton = document.getElementById("play-pause-btn");
    const speedSelect = document.getElementById("playback-speed");
    const slider = document.getElementById("playback-slider");

    // Display-only for now: block dragging/clicking until
    // scrubbing is implemented. Remove this line to re-enable input.
    slider.inert = true;

    const renderProgress = (current, total) => {
        // Use one slider unit per step so scrubbing can map
        // slider values straight to step indexes later.
        slider.max = String(Math.max(total, 1));
        slider.value = String(current);
    };

    animator.subscribeProgress(renderProgress);
    renderProgress(animator.currentStep, animator.steps.length);

    const applySpeed = () => {
        animator.setSpeedMultiplier(Number(speedSelect.value));
    };

    speedSelect.addEventListener("change", applySpeed);

    // Browsers can restore a previous selection on reload,
    // so sync the animator with whatever the dropdown shows.
    applySpeed();

    const render = state => {
        const isPlaying = state === "playing";

        playPauseButton.textContent = isPlaying ? "❚❚" : "▶";
        playPauseButton.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
        playPauseButton.setAttribute("aria-pressed", String(isPlaying));

        // Nothing to play or pause when no playback is loaded.
        playPauseButton.disabled = state === "idle";
    };

    playPauseButton.addEventListener("click", () => {
        animator.togglePause();
    });

    animator.subscribe(render);
    render(animator.state);
}
