/** QR codes via the tiny `qrcode-generator` library, loaded on demand. */
export async function qrSvg(text: string, opts: { dark?: string; light?: string } = {}): Promise<string> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = 2; // quiet zone (modules)
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + m} ${r + m}h1v1h-1z`;
  const size = n + m * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${opts.light ?? '#fff'}"/><path d="${d}" fill="${opts.dark ?? '#16122A'}"/></svg>`;
}

export async function qrPngDataUrl(text: string, px = 1024): Promise<string> {
  const svg = await qrSvg(text);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = px; c.height = px;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, px, px);
  return c.toDataURL('image/png');
}
