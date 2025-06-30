const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');

let cameraOffset = { x: 0, y: 0 };
let scale = 1;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;

let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let draggingBubble = null;
let lastTapTime = 0;

const BUBBLE_RADIUS = 60;

const bubbles = [
    { id: 1, label: 'My Big Idea', position: { x: 0, y: 0 }, color: '#00AAEF', radius: BUBBLE_RADIUS },
    { id: 2, label: 'Market Research', position: { x: -150, y: 150 }, color: '#00ffcc', radius: BUBBLE_RADIUS },
    { id: 3, label: 'UI/UX Design', position: { x: 150, y: 150 }, color: '#00ffcc', radius: BUBBLE_RADIUS },
    { id: 4, label: 'Monetization', position: { x: 0, y: -180 }, color: '#00ffcc', radius: BUBBLE_RADIUS },
];

const connections = [
    { from: 1, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (bubbles[0].position.x === 0 && bubbles[0].position.y === 0) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        for (let b of bubbles) {
            b.position.x += centerX;
            b.position.y += centerY;
        }
    }
    draw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function screenToWorld(screen) {
    return {
        x: (screen.x - cameraOffset.x) / scale,
        y: (screen.y - cameraOffset.y) / scale
    };
}

function getBubbleAt(pos) {
    return bubbles.find(b => {
        const dx = pos.x - b.position.x;
        const dy = pos.y - b.position.y;
        return Math.sqrt(dx * dx + dy * dy) <= b.radius;
    });
}

function colorWithAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 🖱️ Mouse controls
canvas.addEventListener('mousedown', (e) => {
    const mouse = screenToWorld(getMousePos(e));
    draggingBubble = getBubbleAt(mouse);
    if (draggingBubble) {
        dragOffset.x = mouse.x - draggingBubble.position.x;
        dragOffset.y = mouse.y - draggingBubble.position.y;
    } else {
        dragOffset.x = e.clientX - cameraOffset.x;
        dragOffset.y = e.clientY - cameraOffset.y;
    }
    isDragging = true;
    canvas.style.cursor = 'grabbing';
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const mouse = getMousePos(e);
    if (draggingBubble) {
        const world = screenToWorld(mouse);
        draggingBubble.position.x = world.x - dragOffset.x;
        draggingBubble.position.y = world.y - dragOffset.y;
    } else {
        cameraOffset.x = e.clientX - dragOffset.x;
        cameraOffset.y = e.clientY - dragOffset.y;
    }
    draw();
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggingBubble = null;
    canvas.style.cursor = 'grab';
});

canvas.addEventListener('dblclick', (e) => {
    const mouse = screenToWorld(getMousePos(e));
    const bubble = getBubbleAt(mouse);
    if (bubble) {
        const newLabel = prompt('Edit label:', bubble.label);
        if (newLabel && newLabel.trim() !== '') {
            bubble.label = newLabel.trim();
            draw();
        }
    }
});

// 🔍 Mouse zoom
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    const mouse = getMousePos(e);
    const worldPosBefore = screenToWorld(mouse);
    scale *= e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    const worldPosAfter = screenToWorld(mouse);
    cameraOffset.x += (worldPosAfter.x - worldPosBefore.x) * scale;
    cameraOffset.y += (worldPosAfter.y - worldPosBefore.y) * scale;
    draw();
}, { passive: false });

// 📱 Touch events
let lastTouchDistance = null;

canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const world = screenToWorld({ x: touch.clientX, y: touch.clientY });
        draggingBubble = getBubbleAt(world);
        if (draggingBubble) {
            dragOffset.x = world.x - draggingBubble.position.x;
            dragOffset.y = world.y - draggingBubble.position.y;
        } else {
            dragOffset.x = touch.clientX - cameraOffset.x;
            dragOffset.y = touch.clientY - cameraOffset.y;
        }

        // Check for double-tap
        const now = Date.now();
        if (now - lastTapTime < 300 && draggingBubble) {
            const newLabel = prompt('Edit label:', draggingBubble.label);
            if (newLabel && newLabel.trim() !== '') {
                draggingBubble.label = newLabel.trim();
                draw();
            }
        }
        lastTapTime = now;
        isDragging = true;
    } else if (e.touches.length === 2) {
        lastTouchDistance = getTouchDistance(e);
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
        const touch = e.touches[0];
        const screen = { x: touch.clientX, y: touch.clientY };
        if (draggingBubble) {
            const world = screenToWorld(screen);
            draggingBubble.position.x = world.x - dragOffset.x;
            draggingBubble.position.y = world.y - dragOffset.y;
        } else {
            cameraOffset.x = touch.clientX - dragOffset.x;
            cameraOffset.y = touch.clientY - dragOffset.y;
        }
        draw();
    } else if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e);
        if (lastTouchDistance) {
            const delta = currentDistance / lastTouchDistance;
            const midpoint = getTouchMidpoint(e);
            const worldBefore = screenToWorld(midpoint);
            scale *= delta;
            scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
            const worldAfter = screenToWorld(midpoint);
            cameraOffset.x += (worldAfter.x - worldBefore.x) * scale;
            cameraOffset.y += (worldAfter.y - worldBefore.y) * scale;
            draw();
        }
        lastTouchDistance = currentDistance;
    }
}, { passive: false });

canvas.addEventListener('touchend', () => {
    isDragging = false;
    draggingBubble = null;
    lastTouchDistance = null;
});

// 📏 Touch helpers
function getTouchDistance(e) {
    const [a, b] = e.touches;
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(e) {
    const [a, b] = e.touches;
    return {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2
    };
}

// 🧠 Draw logic
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(scale, scale);
    for (const link of connections) {
        const from = bubbles.find(b => b.id === link.from);
        const to = bubbles.find(b => b.id === link.to);
        drawConnection(ctx, from, to);
    }
    for (const bubble of bubbles) drawBubble(ctx, bubble);
    ctx.restore();
}

function drawBubble(ctx, bubble) {
    const { x, y } = bubble.position;
    const r = bubble.radius;
    ctx.save();
    ctx.shadowColor = bubble.color;
    ctx.shadowBlur = 30; // bigger blur for larger glow
    ctx.fillStyle = colorWithAlpha(bubble.color, 1);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = colorWithAlpha(bubble.color, 0.5);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubble.label, x, y);
}

function drawConnection(ctx, from, to) {
    ctx.save();
    const grad = ctx.createLinearGradient(from.position.x, from.position.y, to.position.x, to.position.y);
    grad.addColorStop(0, colorWithAlpha(from.color, 0.6));
    grad.addColorStop(1, colorWithAlpha(to.color, 0.6));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.position.x, from.position.y);
    ctx.lineTo(to.position.x, to.position.y);
    ctx.stroke();
    ctx.restore();
}