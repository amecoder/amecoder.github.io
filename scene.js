// Stateless scene drawing: tiled stage ground and the title-screen background.
window.SCENE = (function () {
  const { STAGE_COLORS, GROUNDS } = window.GAME_CONFIG;
  const demo = [];

  // view: { w, h } in world units; camX/camY: top-left corner of the view in world units.
  function drawGround(ctx, camX, camY, stageIdx, view) {
    const [g1, g2, deco] = GROUNDS[stageIdx % GROUNDS.length], T = 16;
    const x0 = Math.floor(camX / T) - 1, y0 = Math.floor(camY / T) - 1;
    for (let ty = y0; ty < y0 + view.h / T + 3; ty++) {
      for (let tx = x0; tx < x0 + view.w / T + 3; tx++) {
        ctx.fillStyle = (tx + ty) & 1 ? g1 : g2;
        ctx.fillRect(tx * T, ty * T, T, T);
        const h = ((tx * 73856093) ^ (ty * 19349663)) >>> 0;
        if (h % 5 === 0) { ctx.fillStyle = deco; ctx.fillRect(tx * T + (h % 11), ty * T + (h % 13), 2, 1); ctx.fillRect(tx * T + (h % 11) + 1, ty * T + (h % 13) - 1, 1, 1); }
        if (h % 29 === 0) { ctx.fillStyle = deco; ctx.fillRect(tx * T + 4, ty * T + 6, 6, 3); ctx.fillStyle = '#0003'; ctx.fillRect(tx * T + 4, ty * T + 9, 6, 1); }
      }
    }
  }

  // Title screen background: a slow pan over the ground with wandering errors.
  function drawTitle(ctx, k, view) {
    if (!demo.length) {
      for (let i = 0; i < 46; i++) {
        demo.push({ x: Math.random() * 600 - 300, y: Math.random() * 400 - 200, a: Math.random() * 6.28,
          kind: ['bug', 'fast', 'tank'][i % 3], c: STAGE_COLORS[i % STAGE_COLORS.length] });
      }
    }
    const t = performance.now() / 1000, camX = t * 12 - view.w / 2, camY = Math.sin(t * 0.2) * 30 - view.h / 2;
    ctx.setTransform(k, 0, 0, k, -camX * k, -camY * k);
    drawGround(ctx, camX, camY, Math.floor(t / 6) % GROUNDS.length, view);
    for (const m of demo) {
      m.a += (Math.random() - 0.5) * 0.2; m.x += Math.cos(m.a) * 0.3; m.y += Math.sin(m.a) * 0.3;
      const wx = ((m.x - camX) % view.w + view.w) % view.w + camX, wy = ((m.y - camY) % view.h + view.h) % view.h + camY;
      const img = window.SPRITES.mob(m.kind, m.c, false);
      ctx.drawImage(img, Math.round(wx), Math.round(wy), img.width, img.height);
    }
  }

  return { drawGround, drawTitle };
})();
