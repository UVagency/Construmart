import QRCode from 'qrcode';

const LOGO_URL = '/logo-construmart.png';
const W = 1080;
const H = 1500;

const NAVY = '#041E42';
const YELLOW = '#FFB81C';
const YELLOW_B = '#FFD500';
const BLUE = '#2A5DB9';

let logoPromise = null;
function loadLogo() {
  if (logoPromise) return logoPromise;
  logoPromise = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = LOGO_URL;
  });
  return logoPromise;
}

async function drawCouponCanvas(code) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fondo navy
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  // Franja stripes arriba
  drawStripes(ctx, 0, 0, W, 40);

  // Logo en blanco
  const logo = await loadLogo();
  const logoW = 520;
  const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW;
  drawImageWhite(ctx, logo, (W - logoW) / 2, 80, logoW, logoH);

  // Claim de campaña
  ctx.fillStyle = YELLOW;
  ctx.font = '700 26px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TU PRIMERA VEZ EN LA NUEVA TIENDA CONSTRUMART ARICA', W / 2, 255);

  // Card blanca (ticket)
  const cardX = 60;
  const cardY = 330;
  const cardW = W - 120;
  const cardH = 950;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, cardX, cardY, cardW, cardH, 32);
  ctx.fill();

  // Stripes top del ticket
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, cardX, cardY, cardW, 30, 32);
  ctx.clip();
  drawStripes(ctx, cardX, cardY, cardW, 30);
  ctx.restore();

  // Label "TU CÓDIGO"
  ctx.fillStyle = BLUE;
  ctx.font = '700 28px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('TU  CÓDIGO', W / 2, cardY + 110);

  // Código (mono, grande) — auto-fit al ancho del card
  ctx.fillStyle = NAVY;
  ctx.textAlign = 'center';
  const maxCodeW = cardW - 80;
  let codeFontSize = 92;
  do {
    ctx.font = `800 ${codeFontSize}px "Courier New", ui-monospace, monospace`;
    if (ctx.measureText(code).width <= maxCodeW) break;
    codeFontSize -= 4;
  } while (codeFontSize > 40);
  ctx.fillText(code, W / 2, cardY + 210);

  // Línea punteada
  ctx.strokeStyle = 'rgba(4,30,66,0.2)';
  ctx.setLineDash([8, 10]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 40, cardY + 280);
  ctx.lineTo(cardX + cardW - 40, cardY + 280);
  ctx.stroke();
  ctx.setLineDash([]);

  // QR del código
  const qrSize = 480;
  const qrDataUrl = await QRCode.toDataURL(code, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: qrSize,
    color: { dark: NAVY, light: '#FFFFFF' }
  });
  const qrImg = await loadDataUrl(qrDataUrl);
  ctx.drawImage(qrImg, (W - qrSize) / 2, cardY + 320, qrSize, qrSize);

  // Texto instrucción abajo del QR
  ctx.fillStyle = NAVY;
  ctx.font = '600 28px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Muestra este código en caja', W / 2, cardY + 880);

  // Footer navy debajo del ticket
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '600 22px "Inter", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Válido hasta el fin de la campaña · No acumulable', W / 2, cardY + cardH + 60);

  // Stripes inferiores
  drawStripes(ctx, 0, H - 40, W, 40);

  return canvas;
}

function drawStripes(ctx, x, y, w, h) {
  const stripe = 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  for (let i = -h; i < w + h; i += stripe * 2) {
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + stripe, y);
    ctx.lineTo(x + i + stripe - h, y + h);
    ctx.lineTo(x + i - h, y + h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = YELLOW_B;
    ctx.beginPath();
    ctx.moveTo(x + i + stripe, y);
    ctx.lineTo(x + i + stripe * 2, y);
    ctx.lineTo(x + i + stripe * 2 - h, y + h);
    ctx.lineTo(x + i + stripe - h, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawImageWhite(ctx, img, x, y, w, h) {
  // Tint logo a blanco: dibujamos el logo, luego source-in con blanco
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.drawImage(img, 0, 0, w, h);
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = '#FFFFFF';
  octx.fillRect(0, 0, w, h);
  ctx.drawImage(off, x, y);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadDataUrl(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

export async function generateCouponBlob(code) {
  const canvas = await drawCouponCanvas(code);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export async function generateQrDataUrl(code) {
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: 720,
    color: { dark: NAVY, light: '#FFFFFF' }
  });
}
