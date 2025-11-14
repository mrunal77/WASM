// JavaScript for C#-based calculator drag functionality
let isDragging = false;
let currentCalculator = null;
let dotNetHelper = null;

export function enableCSDrag(element, dotNetRef) {
    currentCalculator = element;
    dotNetHelper = dotNetRef;
    
    // Add event listeners for mouse and touch move
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleTouchEnd);
}

export function disableCSDrag() {
    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('touchend', handleTouchEnd);
    
    currentCalculator = null;
    dotNetHelper = null;
}

function handleMouseMove(e) {
    if (!isDragging || !dotNetHelper) return;
    
    e.preventDefault();
    dotNetHelper.invokeMethodAsync('HandleMouseMove', e.clientX, e.clientY);
}

function handleTouchMove(e) {
    if (!isDragging || !dotNetHelper || e.touches.length !== 1) return;
    
    e.preventDefault();
    dotNetHelper.invokeMethodAsync('HandleTouchMove', e.touches[0].clientX, e.touches[0].clientY);
}

function handleMouseUp() {
    isDragging = false;
    if (dotNetHelper) {
        dotNetHelper.invokeMethodAsync('StopDrag');
    }
}

function handleTouchEnd() {
    isDragging = false;
    if (dotNetHelper) {
        dotNetHelper.invokeMethodAsync('StopDrag');
    }
}

export function setDragging(dragging) {
    isDragging = dragging;
}

export function updateCalculatorPosition(element, left, top) {
    element.style.left = left + 'px';
    element.style.top = top + 'px';
}

export function getElementRect(element) {
    const rect = element.getBoundingClientRect();
    return {
        Left: rect.left + window.scrollX,
        Top: rect.top + window.scrollY,
        Width: rect.width,
        Height: rect.height
    };
}