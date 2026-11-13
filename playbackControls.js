
export function setupPlaybackControls(animator) {
    const playPauseButton = document.getElementById("play-pause-btn");
    const speedSelect = document.getElementById("playback-speed");
    const slider = document.getElementById("playback-slider");

    // Pause as soon as the slider is grabbed, so playback doesn't
    // move the handle out from under the cursor before it's dragged.
    slider.addEventListener("pointerdown", () => {
        animator.pause();
    });

    // Fires continuously while dragging (and on arrow keys),
    // so the grid updates live.
    slider.addEventListener("input", () => {
        animator.seek(Number(slider.value));
    });

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

    const render = () => {
        const isPlaying = animator.state === "playing";

        playPauseButton.textContent = isPlaying ? "❚❚" : "▶";
        playPauseButton.setAttribute("aria-label",
            isPlaying ? "Pause" : animator.finished ? "Replay" : "Play");
        playPauseButton.setAttribute("aria-pressed", String(isPlaying));

        // Nothing to play when no playback is loaded. A finished
        // playback can be played again from the start.
        playPauseButton.disabled = animator.state === "idle" && !animator.finished;
    };

    playPauseButton.addEventListener("click", () => {
        if (animator.finished) animator.restart();
        else animator.togglePause();
    });

    animator.subscribe(render);
    // Loading, clearing and finishing change what the button can do.
    animator.subscribeProgress(render);
    render();
}
