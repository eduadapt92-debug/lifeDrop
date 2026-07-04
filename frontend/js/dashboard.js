// LifeDrop Dashboard shared utilities
// This file is included on all dashboard pages

// Shared UI components
function buildSidebar(type, user) {
  // Handled per-page inline
}

// Chart mini sparklines
function renderMiniSpark(canvasId, data, color = '#C41E3A') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const max = Math.max(...data);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((val, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (val / max) * h;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();
}
