const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const PAYMENT_STATUS_MAP = {
  odenilib: 'Ödənilib',
  qismen: 'Qismən ödənilib',
  gozleyir: 'Gözləyir',
  borc: 'Borc qalır',
};

function getExportDir() {
  const dir = path.join(app.getPath('documents'), 'ServisExport');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function exportRecordsToExcel(records, filename) {
  const rows = records.map((r, i) => {
    const totalPrice = r.total_price || 0;
    const paidAmount = r.paid_amount || 0;
    const quantity = r.quantity || 1;
    const unitPrice = r.unit_price || (quantity > 0 ? totalPrice / quantity : totalPrice);
    const remainingAmount = r.remaining_amount || (totalPrice - paidAmount);
    
    return {
      '#': i + 1,
      'Tarix': r.date || '',
      'Saat': r.time || '',
      'Müştəri': r.customer_name || '',
      'Telefon': r.customer_phone || '',
      'Marka': r.car_brand || '',
      'Model': r.car_model || '',
      'Nömrə': r.car_plate || '',
      'Xidmət': r.service_type || '',
      'Əlavə xidmət': r.extra_services || '',
      'Miqdar': quantity,
      'Vahid qiymət': unitPrice,
      'Yekun qiymət': totalPrice,
      'Ödəniş': paidAmount,
      'Qalıq': remainingAmount,
      'Status': PAYMENT_STATUS_MAP[r.payment_status] || r.payment_status || '',
      'Qeyd': r.notes || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Qeydlər');

  const colWidths = [
    { wch: 4 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    { wch: 7 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
    { wch: 16 }, { wch: 20 },
  ];
  ws['!cols'] = colWidths;

  const dir = getExportDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fname = filename || `qeydler-${ts}.xlsx`;
  const fpath = path.join(dir, fname);
  XLSX.writeFile(wb, fpath);
  return { success: true, path: fpath };
}

function exportCustomersToExcel(customers) {
  const rows = customers.map((c, i) => ({
    '#': i + 1,
    'Ad': c.name || '',
    'Telefon': c.phone || '',
    'Ziyarət sayı': c.visit_count || 0,
    'Ümumi xərc': c.total_spent || 0,
    'Son gəliş': c.last_visit || '',
    'Qeyd': c.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Müştərilər');

  const dir = getExportDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fpath = path.join(dir, `musteriler-${ts}.xlsx`);
  XLSX.writeFile(wb, fpath);
  return { success: true, path: fpath };
}

function exportReportToExcel(reportData, title) {
  const wb = XLSX.utils.book_new();

  if (reportData.records) {
    const rows = reportData.records.map((r, i) => ({
      '#': i + 1, 'Tarix': r.date, 'Marka': r.car_brand || '',
      'Xidmət': r.service_type || '', 'Müştəri': r.customer_name || '',
      'Məbləğ': r.total_price || 0, 'Status': PAYMENT_STATUS_MAP[r.payment_status] || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Qeydlər');
  }

  const dir = getExportDir();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fpath = path.join(dir, `hesabat-${ts}.xlsx`);
  XLSX.writeFile(wb, fpath);
  return { success: true, path: fpath };
}

module.exports = { exportRecordsToExcel, exportCustomersToExcel, exportReportToExcel };
