const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const FONT_REGULAR    = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
const FONT_BOLD       = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');

const STATUS_LABEL = {
  odenilib: 'Ödənilib',
  qismen:   'Qismən ödənilib',
  gozleyir: 'Gözləyir',
  borc:     'Borc qalır',
};
const METHOD_LABEL = {
  cash:     'Nağd',
  card:     'Kart',
  transfer: 'Bank köçürməsi',
  debt:     'Borc (ödənilməyib)',
  partial:  'Qismən ödəniş',
};

function getExportDir() {
  const dir = path.join(app.getPath('documents'), 'ServisExport');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fmt(n) {
  if (n === null || n === undefined) return '-';
  return `${Number(n).toFixed(2)} AZN`;
}

function makePdf(opts = {}) {
  return new PDFDocument({
    size: opts.size || 'A4',
    layout: opts.layout || 'portrait',
    margin: opts.margin !== undefined ? opts.margin : 40,
    autoFirstPage: true,
    info: { Title: opts.title || 'Servis Export' },
  });
}

function drawHLine(doc, y, color = '#cbd5e1') {
  doc.save().strokeColor(color).lineWidth(0.5)
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke().restore();
}

function saveDoc(doc, fpath) {
  return new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(fpath);
    doc.pipe(ws);
    doc.end();
    ws.on('finish', () => resolve({ success: true, path: fpath }));
    ws.on('error', (e) => resolve({ success: false, error: e.message }));
  });
}

// ─── RECORDS TABLE EXPORT ───────────────────────────────────────────────────
async function exportRecordsToPdf(records, options = {}) {
  const title       = options.title       || 'Servis Qeydləri';
  const companyName = options.companyName || 'SmartQeyd';
  const total = records.reduce((s, r) => s + (r.total_price  || 0), 0);
  const paid  = records.reduce((s, r) => s + (r.paid_amount  || 0), 0);
  const debt  = total - paid;

  const doc = makePdf({ layout: 'landscape', title });
  doc.registerFont('R',  FONT_REGULAR);
  doc.registerFont('RB', FONT_BOLD);

  const L = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  doc.font('RB').fontSize(16).fillColor('#1e293b').text(companyName, L, 40);
  doc.font('R').fontSize(9).fillColor('#64748b')
    .text(new Date().toLocaleDateString('az-AZ'), L, 40, { align: 'right' });
  doc.font('R').fontSize(11).fillColor('#475569').text(title, L, 62);
  drawHLine(doc, 82);

  // Summary row
  const sy = 90;
  doc.font('R').fontSize(9).fillColor('#475569');
  doc.text(`Qeyd: ${records.length}`, L, sy);
  doc.text(`Ümumi: ${fmt(total)}`, L + 90, sy);
  doc.text(`Ödənilib: ${fmt(paid)}`, L + 200, sy);
  doc.font('RB').fillColor('#dc2626').text(`Borc: ${fmt(debt)}`, L + 330, sy);
  drawHLine(doc, 108);

  // Table header
  const cols = [30, 65, 100, 90, '*', 70, 70, 75];
  const cw = cols.map(c => c === '*' ? W - cols.filter(x => x !== '*').reduce((a, b) => a + b, 0) : c);
  let ty = 116;

  function drawRow(cells, isHeader, isFooter) {
    const rowH = 16;
    if (isHeader) {
      doc.rect(L, ty, W, rowH).fill('#2563eb');
    } else if (isFooter) {
      doc.rect(L, ty, W, rowH).fill('#e2e8f0');
    }
    let cx = L;
    cells.forEach((cell, i) => {
      const align = [5, 6].includes(i) ? 'right' : 'left';
      doc.font(isHeader || isFooter ? 'RB' : 'R')
        .fontSize(8)
        .fillColor(isHeader ? '#ffffff' : '#1e293b')
        .text(String(cell), cx + 2, ty + 4, { width: cw[i] - 4, align, lineBreak: false });
      cx += cw[i];
    });
    ty += rowH;
  }

  drawRow(['#', 'Tarix', 'Maşın', 'Müştəri', 'Xidmət', 'Məbləğ', 'Ödənilib', 'Status'], true);
  records.forEach((r, i) => {
    if (ty > doc.page.height - 60) { doc.addPage({ layout: 'landscape' }); ty = 40; }
    drawRow([
      i + 1,
      r.date || '-',
      `${r.car_brand || ''} ${r.car_model || ''}`.trim() || '-',
      r.customer_name   || '-',
      r.service_type    || '-',
      fmt(r.total_price),
      fmt(r.paid_amount),
      STATUS_LABEL[r.payment_status] || r.payment_status || '-',
    ], false, false);
  });
  drawRow(['', '', '', '', 'CƏMİ:', fmt(total), fmt(paid), `${fmt(debt)} borc`], false, true);

  const dir = getExportDir();
  const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fpath = path.join(dir, options.filename || `qeydler-${ts}.pdf`);
  return saveDoc(doc, fpath);
}

// ─── DAILY REPORT EXPORT ────────────────────────────────────────────────────
async function exportDailyReportToPdf(records, date, options = {}) {
  const companyName = options.companyName || 'SmartQeyd';
  const total = records.reduce((s, r) => s + (r.total_price || 0), 0);
  const paid  = records.reduce((s, r) => s + (r.paid_amount || 0), 0);
  const debt  = total - paid;

  const doc = makePdf({ title: `Gündəlik Hesabat — ${date}` });
  doc.registerFont('R',  FONT_REGULAR);
  doc.registerFont('RB', FONT_BOLD);

  const L = doc.page.margins.left;
  const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('RB').fontSize(18).fillColor('#1e293b').text(companyName, L, 40);
  doc.font('R').fontSize(13).fillColor('#475569').text(`Gündəlik Hesabat — ${date}`, L, 66);
  drawHLine(doc, 86);

  doc.font('R').fontSize(10).fillColor('#475569').text(`Qeyd sayı: ${records.length}`, L, 95);
  doc.text(`Ümumi məbləğ: ${fmt(total)}`, L + 140, 95);
  doc.fillColor('#059669').text(`Ödənilib: ${fmt(paid)}`, L + 310, 95);
  doc.font('RB').fillColor('#dc2626').text(`Borc: ${fmt(debt)}`, L + 450, 95);
  drawHLine(doc, 114);

  const cols = [30, 50, 95, 95, '*', 65, 70];
  const cw   = cols.map(c => c === '*' ? W - cols.filter(x => x !== '*').reduce((a, b) => a + b, 0) : c);
  let ty = 122;

  function drawRow(cells, isHeader) {
    const rowH = 16;
    if (isHeader) doc.rect(L, ty, W, rowH).fill('#2563eb');
    let cx = L;
    cells.forEach((cell, i) => {
      doc.font(isHeader ? 'RB' : 'R').fontSize(8)
        .fillColor(isHeader ? '#ffffff' : '#1e293b')
        .text(String(cell), cx + 2, ty + 4, { width: cw[i] - 4, align: i === 5 ? 'right' : 'left', lineBreak: false });
      cx += cw[i];
    });
    ty += rowH;
  }

  drawRow(['#', 'Saat', 'Maşın', 'Müştəri', 'Xidmət', 'Məbləğ', 'Status'], true);
  records.forEach((r, i) => {
    if (ty > doc.page.height - 60) { doc.addPage(); ty = 40; }
    drawRow([
      i + 1,
      r.time || '-',
      `${r.car_brand || ''} ${r.car_model || ''}`.trim() || '-',
      r.customer_name || '-',
      r.service_type  || '-',
      fmt(r.total_price),
      STATUS_LABEL[r.payment_status] || r.payment_status || '-',
    ], false);
  });

  doc.font('R').fontSize(8).fillColor('#94a3b8')
    .text(`Hesabat tarixi: ${new Date().toLocaleDateString('az-AZ')}`, L, ty + 12);

  const dir   = getExportDir();
  const fpath = path.join(dir, `gundelik-${date.replace(/-/g, '')}.pdf`);
  return saveDoc(doc, fpath);
}

// ─── SALE RECEIPT (80mm thermal style) ──────────────────────────────────────
async function exportSaleReceiptPdf(sale, options = {}) {
  const companyName = options.companyName || 'Biznes İdarəetmə';
  const items = sale.items || [];

  const PAGE_W  = 226.77; // 80mm
  const MARGIN  = 12;
  const CW      = PAGE_W - MARGIN * 2;

  const doc = makePdf({ size: [PAGE_W, 800], margin: MARGIN, title: `Qebz #${sale.id}` });
  doc.registerFont('R',  FONT_REGULAR);
  doc.registerFont('RB', FONT_BOLD);

  let y = MARGIN;

  const line = (color = '#cbd5e1') => {
    doc.save().strokeColor(color).lineWidth(0.5)
      .moveTo(MARGIN, y).lineTo(MARGIN + CW, y).stroke().restore();
    y += 6;
  };

  const row2 = (left, right, bold = false, color = '#1e293b') => {
    doc.font(bold ? 'RB' : 'R').fontSize(9).fillColor(color);
    doc.text(left,  MARGIN, y, { width: CW * 0.6,  lineBreak: false });
    doc.text(right, MARGIN, y, { width: CW,         align: 'right', lineBreak: false });
    y += 14;
  };

  // Company + title
  doc.font('RB').fontSize(14).fillColor('#1e293b').text(companyName, MARGIN, y, { align: 'center', width: CW });
  y += 20;
  doc.font('R').fontSize(10).fillColor('#475569').text('SATIS QEBZI', MARGIN, y, { align: 'center', width: CW });
  y += 16;
  doc.font('R').fontSize(8).fillColor('#64748b')
    .text(`#${sale.id}  |  ${sale.date}${sale.time ? '  ' + sale.time : ''}`, MARGIN, y, { align: 'center', width: CW });
  y += 14;
  line();

  // Customer
  if (sale.customer_name) {
    doc.font('R').fontSize(9).fillColor('#475569').text('Mustari:', MARGIN, y, { continued: false });
    doc.font('RB').fontSize(9).fillColor('#1e293b').text(sale.customer_name, MARGIN + 45, y);
    y += 14;
  }

  // Payment method
  const method = METHOD_LABEL[sale.payment_method] || sale.payment_method || 'Nagd';
  doc.font('R').fontSize(9).fillColor('#475569').text('Odenis usulu:', MARGIN, y, { continued: false });
  doc.font('RB').fontSize(9).fillColor('#1e293b').text(method, MARGIN + 70, y);
  y += 16;
  line();

  // Items header
  doc.font('RB').fontSize(7).fillColor('#475569');
  doc.text('Mehsul', MARGIN, y, { width: CW * 0.42, lineBreak: false });
  doc.text('Miq', MARGIN + CW * 0.44, y, { width: CW * 0.12, align: 'center', lineBreak: false });
  doc.text('Qiym', MARGIN + CW * 0.58, y, { width: CW * 0.18, align: 'right', lineBreak: false });
  doc.text('Cem', MARGIN + CW * 0.78, y, { width: CW * 0.22, align: 'right', lineBreak: false });
  y += 11;
  line('#e2e8f0');

  items.forEach(item => {
    const lineTotal = (item.qty || 0) * (item.unit_price || 0);
    const name = (item.product_name || '-').substring(0, 18);
    doc.font('R').fontSize(7).fillColor('#1e293b');
    doc.text(name, MARGIN, y, { width: CW * 0.42, lineBreak: false });
    doc.text(String(item.qty || 0), MARGIN + CW * 0.44, y, { width: CW * 0.12, align: 'center', lineBreak: false });
    doc.text(fmt(item.unit_price), MARGIN + CW * 0.58, y, { width: CW * 0.18, align: 'right', lineBreak: false });
    doc.font('RB').fontSize(7).text(fmt(lineTotal), MARGIN + CW * 0.78, y, { width: CW * 0.22, align: 'right', lineBreak: false });
    y += 12;
  });

  line();

  // Subtotal / discount
  if ((sale.subtotal || 0) !== (sale.total || 0)) {
    row2('Ara cem:', fmt(sale.subtotal));
  }
  if ((sale.discount || 0) > 0) {
    row2('Endirim:', `-${fmt(sale.discount)}`, false, '#dc2626');
  }

  // Total
  y += 3;
  doc.font('RB').fontSize(13).fillColor('#1e293b');
  doc.text('YEKUN:', MARGIN, y, { lineBreak: false });
  doc.text(fmt(sale.total), MARGIN, y, { width: CW, align: 'right', lineBreak: false });
  y += 20;
  line();

  // Payment details
  row2('Odenilib:', fmt(sale.paid_amount), false, '#059669');
  const remaining = (sale.total || 0) - (sale.paid_amount || 0);
  if (remaining > 0.005) {
    row2('Qalan borc:', fmt(remaining), true, '#dc2626');
  }
  const change = Math.max(0, (sale.paid_amount || 0) - (sale.total || 0));
  if (change > 0.005) {
    row2('Qaytarilan:', fmt(change), true, '#059669');
  }
  row2('Status:', STATUS_LABEL[sale.payment_status] || sale.payment_status || '-');
  line();

  if (sale.notes) {
    doc.font('R').fontSize(8).fillColor('#64748b').text(sale.notes, MARGIN, y, { align: 'center', width: CW });
    y += 14;
  }

  doc.font('RB').fontSize(11).fillColor('#1e293b').text('Teshekkurler!', MARGIN, y + 4, { align: 'center', width: CW });

  const dir   = getExportDir();
  const fpath = path.join(dir, `qebz-${sale.id}-${Date.now()}.pdf`);
  return saveDoc(doc, fpath);
}

module.exports = { exportRecordsToPdf, exportDailyReportToPdf, exportSaleReceiptPdf };
