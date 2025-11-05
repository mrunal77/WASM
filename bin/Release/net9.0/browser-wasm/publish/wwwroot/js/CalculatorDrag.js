export function enableDrag(element) {
    let pos = { x: 0, y: 0, left: 0, top: 0 };
    let dragging = false;

    function onMouseDown(e) {
        dragging = true;
        pos.x = e.clientX;
        pos.y = e.clientY;
        const rect = element.getBoundingClientRect();
        pos.left = rect.left + window.scrollX;
        pos.top = rect.top + window.scrollY;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    }

    function onMouseMove(e) {
        if (!dragging) return;
        const dx = e.clientX - pos.x;
        const dy = e.clientY - pos.y;
        element.style.left = (pos.left + dx) + "px";
        element.style.top = (pos.top + dy) + "px";
    }

    function onMouseUp(e) {
        dragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // Touch support
    function onTouchStart(e) {
        if (e.touches.length !== 1) return;
        dragging = true;
        pos.x = e.touches[0].clientX;
        pos.y = e.touches[0].clientY;
        const rect = element.getBoundingClientRect();
        pos.left = rect.left + window.scrollX;
        pos.top = rect.top + window.scrollY;
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
        e.preventDefault();
    }

    function onTouchMove(e) {
        if (!dragging || e.touches.length !== 1) return;
        const dx = e.touches[0].clientX - pos.x;
        const dy = e.touches[0].clientY - pos.y;
        element.style.left = (pos.left + dx) + "px";
        element.style.top = (pos.top + dy) + "px";
    }

    function onTouchEnd(e) {
        dragging = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }

    // Attach to header for drag
    const header = element.querySelector('.calculator-header');
    if (header) {
        header.addEventListener('mousedown', onMouseDown);
        header.addEventListener('touchstart', onTouchStart, { passive: false });
    }
    // Store references for cleanup
    element._dragCleanup = () => {
        if (header) {
            header.removeEventListener('mousedown', onMouseDown);
            header.removeEventListener('touchstart', onTouchStart);
        }
    };
}

export function disableDrag(element) {
    if (element._dragCleanup) {
        element._dragCleanup();
        delete element._dragCleanup;
    }
}