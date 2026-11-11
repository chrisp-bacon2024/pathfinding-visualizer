// Tooltip for the algorithm buttons: full name, a short description,
// what the algorithm guarantees, and a comparison table of every
// algorithm run on the current grid.

const SHOW_DELAY_MS = 250;
const GAP = 8;

// options:
//   buttons: the algorithm buttons (each has data-algorithm)
//   info: algorithmInfo (name, description, guarantee per algorithm)
//   colors: path colour per algorithm
//   getStats: () => Map(name -> stats from computeRunStats), in run order
//   isImplemented: name => boolean
// Returns { refresh } to call when the stats change.
export function setupAlgorithmTooltip({ buttons, info, colors, getStats, isImplemented }) {
    const tooltip = document.createElement("div");
    tooltip.id = "algorithm-tooltip";
    tooltip.className = "algorithm-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);

    // Button order (and short labels) for the comparison table.
    const order = [...buttons].map(button => ({
        name: button.dataset.algorithm,
        label: button.textContent.trim()
    }));

    let activeButton = null;
    let showTimer = null;

    function show(button, delay) {
        clearTimeout(showTimer);
        showTimer = setTimeout(() => {
            activeButton = button;
            render();
            tooltip.hidden = false;
            button.setAttribute("aria-describedby", tooltip.id);
            position();
        }, delay);
    }

    function hide() {
        clearTimeout(showTimer);
        activeButton?.removeAttribute("aria-describedby");
        activeButton = null;
        tooltip.hidden = true;
    }

    function render() {
        const name = activeButton.dataset.algorithm;
        const { name: fullName, description, guarantee } = info[name] ?? {
            name: activeButton.textContent.trim(), description: "", guarantee: null
        };

        tooltip.replaceChildren();

        const header = el("div", "tooltip-header");
        header.append(swatch(colors[name]), el("strong", "tooltip-title", fullName));
        tooltip.append(header);

        if (guarantee) {
            tooltip.append(el("span", `tooltip-badge tooltip-badge-${guarantee.kind}`, guarantee.label));
        }

        if (description) tooltip.append(el("p", "tooltip-description", description));

        if (!isImplemented(name)) {
            tooltip.append(el("p", "tooltip-note", "Not implemented yet."));
        }

        const stats = getStats();
        if (stats.size === 0) return;

        if (!stats.has(name) && isImplemented(name)) {
            tooltip.append(el("p", "tooltip-note", "Run it to add it to the comparison."));
        }

        tooltip.append(comparisonTable(stats, name));
    }

    function comparisonTable(stats, currentName) {
        const rows = order.filter(({ name }) => stats.has(name));

        const columns = [
            { key: "cost", heading: "Cost", hint: "Terrain cost of the path (lower is better)", format: n => n.toFixed(1) },
            { key: "moves", heading: "Moves", hint: "Steps along the path", format: n => String(n) },
            { key: "explored", heading: "Explored", hint: "Cells the search examined", format: n => String(n) },
            { key: "timeMs", heading: "Time", hint: "Time to compute the path", format: formatTime }
        ];

        // Best (lowest) value per column, among runs that found a path.
        const best = {};
        for (const { key } of columns) {
            const values = rows
                .map(({ name }) => stats.get(name))
                .filter(s => s.found)
                .map(s => s[key]);
            best[key] = values.length ? Math.min(...values) : null;
        }

        const table = el("table", "tooltip-table");
        const headRow = el("tr");
        headRow.append(el("th", "", ""));
        for (const { heading, hint } of columns) {
            const th = el("th", "", heading);
            th.title = hint;
            headRow.append(th);
        }
        table.append(el("thead"), el("tbody"));
        table.tHead.append(headRow);

        for (const { name, label } of rows) {
            const s = stats.get(name);
            const tr = el("tr", name === currentName ? "current" : "");

            const nameCell = el("td", "tooltip-row-name");
            nameCell.append(swatch(colors[name]), document.createTextNode(label));
            tr.append(nameCell);

            for (const { key, format } of columns) {
                // Explored and time mean something even without a path.
                const showsWithoutPath = key === "explored" || key === "timeMs";

                if (!s.found && !showsWithoutPath) {
                    tr.append(el("td", "tooltip-muted", "no path"));
                    continue;
                }

                const isBest = s.found && rows.length > 1 && nearlyEqual(s[key], best[key]);
                tr.append(el("td", isBest ? "best" : "", format(s[key])));
            }

            table.tBodies[0].append(tr);
        }

        return table;
    }

    function position() {
        const rect = activeButton.getBoundingClientRect();
        const width = tooltip.offsetWidth;
        const height = tooltip.offsetHeight;
        const inMenu = activeButton.closest(".dropdown.open .dropdown-menu");

        let left;
        let top;

        if (inMenu) {
            // Beside the open dropdown menu, so it doesn't cover the items.
            const menuRect = inMenu.getBoundingClientRect();
            left = menuRect.right + GAP;
            top = rect.top;
            if (left + width > innerWidth - GAP) left = menuRect.left - width - GAP;
        } else {
            left = rect.left;
            top = rect.bottom + GAP;
            if (top + height > innerHeight - GAP) top = rect.top - height - GAP;
        }

        tooltip.style.left = `${clamp(left, GAP, innerWidth - width - GAP)}px`;
        tooltip.style.top = `${clamp(top, GAP, innerHeight - height - GAP)}px`;
    }

    buttons.forEach(button => {
        button.addEventListener("mouseenter", () => show(button, SHOW_DELAY_MS));
        button.addEventListener("mouseleave", hide);

        // Keyboard users get it on focus; mouse clicks don't re-open it.
        button.addEventListener("focus", () => {
            if (button.matches(":focus-visible")) show(button, 0);
        });
        button.addEventListener("blur", hide);

        // Running an algorithm: get out of the way of the grid.
        button.addEventListener("click", hide);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") hide();
    });
    addEventListener("scroll", hide, true);
    addEventListener("resize", hide);

    return {
        refresh() {
            if (!activeButton || tooltip.hidden) return;
            render();
            position();
        }
    };
}

function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function swatch(color) {
    const dot = el("span", "tooltip-swatch");
    if (color) dot.style.background = color;
    return dot;
}

function formatTime(ms) {
    if (ms < 0.01) return "<0.01 ms";
    return `${ms < 10 ? ms.toFixed(2) : ms.toFixed(1)} ms`;
}

const nearlyEqual = (a, b) => Math.abs(a - b) < 1e-9;
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
