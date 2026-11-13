// Turns a group of existing buttons into a dropdown on small screens.
//
// Markup:
//   <div class="dropdown" data-dropdown>
//       <button class="dropdown-trigger" data-placeholder="…">
//           <span class="dropdown-trigger-text"></span>
//           <span class="dropdown-dots"></span>   (optional)
//       </button>
//       <div class="dropdown-menu"> …the real buttons… </div>
//   </div>
//
// CSS decides when it's a dropdown: on wide screens the trigger is hidden
// and the menu's buttons are laid out normally. The buttons keep their own
// click handlers; this only opens and closes the menu and keeps the
// trigger showing the current choice (the button with .selected), its
// path sliver, and a dot for every button that has a path.

export function setupDropdown(dropdown) {
    const trigger = dropdown.querySelector(".dropdown-trigger");
    const menu = dropdown.querySelector(".dropdown-menu");
    const text = trigger.querySelector(".dropdown-trigger-text");
    const dots = trigger.querySelector(".dropdown-dots");
    const items = [...menu.querySelectorAll("button")];
    const placeholder = trigger.dataset.placeholder ?? "";

    const isOpen = () => dropdown.classList.contains("open");

    function setOpen(open) {
        dropdown.classList.toggle("open", open);
        trigger.setAttribute("aria-expanded", String(open));
    }

    function open() {
        setOpen(true);

        // Start on the current choice, so Enter re-runs or re-selects it.
        (items.find(item => item.classList.contains("selected")) ?? items[0])?.focus();
    }

    function close({ focusTrigger = false } = {}) {
        if (!isOpen()) return;

        setOpen(false);
        if (focusTrigger) trigger.focus();
    }

    // Mirror the current choice onto the trigger.
    function render() {
        const current = items.find(item => item.classList.contains("selected"));

        text.textContent = current?.textContent.trim() ?? placeholder;
        trigger.classList.toggle("selected", Boolean(current));

        const hasPath = current?.classList.contains("has-path") ?? false;
        trigger.classList.toggle("has-path", hasPath);
        trigger.classList.toggle("path-hidden", hasPath && current.classList.contains("path-hidden"));
        trigger.style.setProperty("--path-color", hasPath
            ? current.style.getPropertyValue("--path-color")
            : "transparent");

        if (dots) {
            dots.replaceChildren(...items
                .filter(item => item.classList.contains("has-path"))
                .map(item => {
                    const dot = document.createElement("span");
                    dot.className = item.classList.contains("path-hidden")
                        ? "dropdown-dot path-hidden"
                        : "dropdown-dot";
                    dot.style.background = item.style.getPropertyValue("--path-color");
                    return dot;
                }));
        }
    }

    trigger.addEventListener("click", () => {
        if (isOpen()) close();
        else open();
    });

    // Picking an item runs its own click handler; then close the menu.
    menu.addEventListener("click", event => {
        if (event.target.closest("button")) close({ focusTrigger: true });
    });

    // Clicking anywhere else closes it.
    document.addEventListener("pointerdown", event => {
        if (!dropdown.contains(event.target)) close();
    });

    dropdown.addEventListener("keydown", event => {
        if (event.key === "Escape" && isOpen()) {
            event.preventDefault();
            close({ focusTrigger: true });
            return;
        }

        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

        if (!isOpen()) {
            // Only the trigger opens it; on wide screens it's hidden.
            if (event.target === trigger) {
                event.preventDefault();
                open();
            }
            return;
        }

        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        const index = items.indexOf(document.activeElement);
        const next = index === -1
            ? 0
            : (index + step + items.length) % items.length;
        items[next].focus();
    });

    // Re-render whenever a button's state changes (last run, brush
    // selection, paths added or cleared).
    new MutationObserver(render).observe(menu, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"]
    });

    render();
}
