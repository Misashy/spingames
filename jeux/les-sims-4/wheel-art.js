/* SimSpin : présentation décorative des choix, indépendante des tirages et sauvegardes. */
(() => {
  'use strict';
  const normalize = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
  const hash = name => {
    let value = 2166136261;
    for (const char of name) value = Math.imul(value ^ char.codePointAt(0), 16777619);
    return value >>> 0;
  };
  const images = new Map();
  const compactScreen = window.matchMedia('(max-width:650px)');
  let assignments, currentImage, redraw;
  compactScreen.addEventListener('change', () => redraw?.());
  function artworkIndex(category, defaults) {
    if (!assignments) {
      // Un mélange déterministe des 13 noms d'origine, puis une distribution 5/4/4.
      // Aucun Math.random(), identifiant de session ou stockage de données joueur.
      const names = defaults.map(category => normalize(category.name));
      names.sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : a > b ? 1 : 0));
      assignments = new Map(names.map((name, index) => [name, index % 3]));
    }
    const name = normalize(category.name);
    return assignments.get(name) ?? hash(name) % 3;
  }
  function artwork(index) {
    if (!images.has(index)) {
      const image = new Image();
      images.set(index, image);
      image.decoding = 'async';
      image.onload = () => { if (currentImage === index) redraw(); };
      // Si le chargement échoue, la couleur de la catégorie reste visible.
      image.src = `../../assets/game-art/sims-wheel-0${index + 1}.webp`;
    }
    return images.get(index);
  }
  function textLines(ctx, value, width, limit) {
    const lines = [];
    let line = '';
    for (const word of String(value).trim().split(/\s+/)) {
      if (ctx.measureText(line ? `${line} ${word}` : word).width <= width) {
        line = line ? `${line} ${word}` : word;
        continue;
      }
      if (line) { lines.push(line); line = ''; }
      if (ctx.measureText(word).width <= width) { line = word; continue; }
      for (const char of Array.from(word)) {
        if (ctx.measureText(line + char).width > width && line) { lines.push(line); line = ''; }
        line += char;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= limit) return lines;
    const visible = lines.slice(0, limit);
    let last = Array.from(visible[limit - 1]);
    while (last.length && ctx.measureText(last.join('') + '…').width > width) last.pop();
    visible[limit - 1] = last.join('') + '…';
    return visible;
  }
  function label(ctx, text, count, radius, angle, index) {
    const numbered = count > 44;
    const compact = compactScreen.matches;
    const targetSize = count <= 5 ? (compact ? 42 : 36) : count <= 10 ? (compact ? 38 : 32) : count <= 15 ? (compact ? 32 : 27) : count <= 20 ? 24 : count <= 30 ? 20 : 17;
    const minimum = Math.max(17, Math.ceil(targetSize * .85));
    const distance = radius * (numbered ? .78 : count <= 6 ? .60 : .70);
    const width = radius * (count <= 6 ? .64 : count <= 20 ? .50 : .45);
    const padding = 7;
    const available = count <= 2 ? radius * 2 : 2 * (distance - width / 2 - padding) * Math.tan(Math.PI / count);
    const maxLines = count <= 10 ? 3 : count <= 26 ? 2 : 1;
    let size = targetSize, lines, lineHeight;
    do {
      ctx.font = `800 ${size}px "Fredoka","Trebuchet MS",sans-serif`;
      lineHeight = size * 1.12;
      const limit = Math.max(1, Math.min(maxLines, Math.floor((available - padding * 2) / lineHeight)));
      lines = numbered ? [String(index + 1)] : textLines(ctx, text, width, limit);
      if (!lines.some(line => line.endsWith('…')) || size <= minimum) break;
      size--;
    } while (size >= minimum);
    ctx.translate(radius, radius);
    ctx.rotate(angle);
    ctx.translate(distance, 0);
    if (Math.cos(angle) < -.025) ctx.rotate(Math.PI);
    const boxWidth = Math.max(...lines.map(line => ctx.measureText(line).width)) + padding * 2;
    const boxHeight = lines.length * lineHeight + padding * 2;
    ctx.fillStyle = 'rgba(13,9,28,.86)';
    ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight));
  }
  window.SimSpinWheelArt = {
    draw(ctx, { categories, selectedId, defaults, onReady }) {
      redraw = onReady;
      const canvas = ctx.canvas, width = canvas.width, radius = width / 2;
      const category = categories.find(category => category.id === selectedId) || categories[0];
      const items = category?.items || [];
      const title = document.getElementById('simspinWheelLabel');
      const list = document.getElementById('simspinWheelChoices');
      const caption = category ? `Choix de « ${category.name} » · ${items.length} possibilités${items.length > 44 ? ' · numéros sur la roue' : ''}` : 'Coche une catégorie contenant des choix.';
      title.textContent = caption;
      canvas.setAttribute('aria-label', caption);
      // Éviter de reconstruire la liste au simple chargement d'une image.
      const signature = JSON.stringify([category?.name, items]);
      if (list.dataset.signature !== signature) {
        list.replaceChildren(...items.map(item => {
          const li = document.createElement('li'); li.textContent = item; return li;
        }));
        list.dataset.signature = signature;
      }
      ctx.clearRect(0, 0, width, width);
      document.getElementById('emptyWheel').classList.toggle('hidden', !!items.length);
      if (!items.length) {
        currentImage = null;
        ctx.beginPath(); ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#4a325e'; ctx.fill();
        return;
      }
      currentImage = artworkIndex(category, defaults);
      const image = artwork(currentImage), slice = Math.PI * 2 / items.length;
      items.forEach((item, index) => {
        const start = -Math.PI / 2 - slice / 2 + index * slice;
        ctx.beginPath(); ctx.moveTo(radius, radius);
        ctx.arc(radius, radius, radius, start, start + slice); ctx.closePath();
        ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(category.color) ? category.color : '#58e1a1'; ctx.fill();
        ctx.save(); ctx.clip();
        if (image.complete && image.naturalWidth) {
          // Un cadrage cover continu, découpé séparément dans chacune des N parts.
          const scale = Math.max(width / image.naturalWidth, width / image.naturalHeight);
          const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
          ctx.drawImage(image, (width - w) / 2, (width - h) / 2, w, h);
        }
        ctx.fillStyle = index % 2 ? 'rgba(10,5,22,.28)' : 'rgba(10,5,22,.20)';
        ctx.fillRect(0, 0, width, width);
        ctx.restore();
        ctx.lineWidth = items.length > 80 ? 1 : 2;
        ctx.strokeStyle = 'rgba(255,255,255,.70)'; ctx.stroke();
        ctx.save(); ctx.clip();
        label(ctx, item, items.length, radius, start + slice / 2, index);
        ctx.restore();
      });
      ctx.beginPath(); ctx.arc(radius, radius, radius - 2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.65)'; ctx.lineWidth = 4; ctx.stroke();
    }
  };
})();
