type PosterOptions = {
  qrDataUrl: string;
  businessName: string;
  caption?: string;
  footer?: string;
  width?: number;
  background?: string;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export async function generateQrPoster({
  qrDataUrl,
  businessName,
  caption = 'Scan to check in',
  footer = 'Powered by SalonFlow',
  width = 800,
  background = '#ffffff',
}: PosterOptions): Promise<string> {
  const qrImg = await loadImage(qrDataUrl);

  const padding = 48;
  const qrSize = Math.min(width - padding * 2, 480);
  const height = padding * 2 + 60 + qrSize + 80 + 40; // title + qr + caption + footer

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 32px "Inter", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(businessName, width / 2, padding);

  const qrX = (width - qrSize) / 2;
  const qrY = padding + 48;
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#334155';
  ctx.font = '20px "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillText(caption, width / 2, qrY + qrSize + 24);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px "Inter", system-ui, -apple-system, sans-serif';
  ctx.fillText(footer, width / 2, height - padding);

  return canvas.toDataURL('image/png');
}
