/**
 * Procedurally generates a mock scan-simulation image containing a white sheet of paper
 * resting inside a dark walnut wood table background, complete with printed contents.
 * This simulates a smartphone scanner photo perfectly, enabling instant testing of
 * edge-detection, cropping, and compression.
 */
export function createSampleDocument(type: 'invoice' | 'receipt'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Draw walnut wood table background
  ctx.fillStyle = '#221204'; // Walnut base
  ctx.fillRect(0, 0, 1000, 1200);

  // Simple wood grain plank stripes
  ctx.fillStyle = '#180c03';
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(i * 120 + 10, 0, 18, 1200);
  }

  // 2. Define slightly rotated quadrilateral corner points for the "white paper sheet"
  // This simulates a casual photo snapped from an angle
  let tl, tr, br, bl;
  if (type === 'invoice') {
    // Slanted clockwise
    tl = { x: 180, y: 150 };
    tr = { x: 820, y: 220 };
    br = { x: 740, y: 1050 };
    bl = { x: 100, y: 980 };
  } else {
    // Rotated counter-clockwise and narrower (receipt-style)
    tl = { x: 260, y: 120 };
    tr = { x: 740, y: 80 };
    br = { x: 790, y: 1100 };
    bl = { x: 310, y: 1140 };
  }

  // 3. Draw paper sheet shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 10;
  ctx.shadowOffsetY = 15;

  ctx.fillStyle = '#ffffff'; // White paper
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.lineTo(br.x, br.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.closePath();
  ctx.fill();

  // Reset shadow for content drawing
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // 4. Draw printed text items (mapped inside the page local coordinates)
  // We can draw slanted relative text or easily rotate the context to draw, but since we are simulating
  // printed text, we can use 2D shear/rotation matrix or simulate blocks
  ctx.save();

  // Calculate midpoints and approximate angle for local content transform mapping
  const angle = type === 'invoice' ? 0.09 : -0.084; // Radians
  const textX = type === 'invoice' ? 440 : 500;
  const textY = type === 'invoice' ? 580 : 590;

  ctx.translate(textX, textY);
  ctx.rotate(angle);

  // Coordinates local to page center (-300, -400)
  if (type === 'invoice') {
    // Title/Logo
    ctx.fillStyle = '#2563eb'; // Corporate blue
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('ACME DIGITAL CORP', -240, -320);

    ctx.fillStyle = '#4b5563';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('INVOICE / BILL OF LADING', -240, -280);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'normal 15px sans-serif';
    ctx.fillText('Bill To: Johnathan Doe', -240, -210);
    ctx.fillText('Date: June 09, 2026', -240, -185);
    ctx.fillText('Invoice #: INV-2026-8941', -240, -160);

    // Table Headers
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-240, -110, 480, 26);
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DESCRIPTION', -230, -92);
    ctx.fillText('QTY', 120, -92);
    ctx.fillText('PRICE', 180, -92);

    // Table Lines
    ctx.fillStyle = '#4b5563';
    ctx.font = 'normal 13px sans-serif';
    
    ctx.fillText('Full-stack Web Dev Consultation - Phase 1', -230, -50);
    ctx.fillText('50', 125, -50);
    ctx.fillText('$150.00', 180, -50);

    ctx.fillText('Optimized Database Scaling & Clustering', -230, -10);
    ctx.fillText('12', 125, -10);
    ctx.fillText('$240.00', 180, -10);

    ctx.fillText('Automated PDF Rendering Microservices', -230, 30);
    ctx.fillText('1', 125, 30);
    ctx.fillText('$950.00', 180, 30);

    // Divider
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(-240, 70, 480, 1.5);

    // Totals
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('SUBTOTAL: $11,330.00', 60, 110);
    ctx.fillText('TAX (8.5%):  $963.05', 60, 135);
    ctx.fillStyle = '#10b981'; // Green accent
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('TOTAL DUE: $12,293.05', 52, 175);

    // Small barcode simulation
    ctx.fillStyle = '#111827';
    for (let x = -240; x < -40; x += Math.floor(Math.random() * 8) + 3) {
      ctx.fillRect(x, 240, Math.floor(Math.random() * 4) + 1, 45);
    }
    ctx.font = '9px monospace';
    ctx.fillText('*X0094B18D*', -160, 300);

  } else {
    // Receipt Style (narrower, repetitive receipts text)
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 38px monospace';
    ctx.fillText('SUPERMART #425', -160, -380);

    ctx.font = 'normal 14px monospace';
    ctx.fillText('202 CANAL STREET, NEW YORK, NY', -160, -345);
    ctx.fillText('TEL: 212-555-0199', -160, -325);
    ctx.fillText('REG 03  OP 902    06/09/2026 09:12', -160, -305);
    ctx.fillText('-----------------------------------', -160, -285);

    // Items list
    let startY = -255;
    const receiptItems = [
      { name: 'ORGANIC MILK GAL', price: '4.89' },
      { name: 'WHOLE WHEAT BREAD 2X', price: '6.40' },
      { name: 'FRESH SALMON FILLET', price: '18.94' },
      { name: 'HASS AVOCADO BAG', price: '5.99' },
      { name: 'GREEK YOGURT TUB x4', price: '7.16' },
      { name: 'ROASTED CASHEWS 1LB', price: '11.50' },
      { name: 'PAPER TOWELS 6-ROLL', price: '8.99' },
    ];

    receiptItems.forEach((item) => {
      ctx.fillText(item.name, -160, startY);
      ctx.fillText(item.price, 110, startY);
      startY += 30;
    });

    ctx.fillText('-----------------------------------', -160, startY);
    startY += 30;

    ctx.font = 'bold 16px monospace';
    ctx.fillText('SUBTOTAL', -160, startY);
    ctx.fillText('$63.87', 95, startY);
    startY += 25;

    ctx.fillText('TAX (8.25%)', -160, startY);
    ctx.fillText('$5.27', 103, startY);
    startY += 30;

    ctx.font = 'bold 20px monospace';
    ctx.fillText('TOTAL PAID', -160, startY);
    ctx.fillText('$69.14', 80, startY);
    startY += 40;

    ctx.font = 'normal 12px monospace';
    ctx.fillText('THANK YOU FOR SHOPPING WITH US!', -150, startY);
  }

  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.9);
}
