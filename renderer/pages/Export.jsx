import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Users, Calendar, Loader2, FolderOpen, Package, ShoppingCart, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../App';
import { apiRequest } from '../api/http';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ExportCard({ icon: Icon, title, description, color, onExport, loading }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-dark-700 ${color}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-white text-sm">{title}</p>
          <p className="text-xs text-dark-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button onClick={onExport} disabled={loading} className="btn-primary w-full justify-center">
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        Export et
      </button>
    </div>
  );
}

export default function ExportPage() {
  const { showNotification, currentUser, isAdmin } = useApp();
  const { t } = useLanguage();
  const userId = isAdmin ? null : currentUser?.id;
  const [loadingStates, setLoadingStates] = useState({});
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  function setLoading(key, val) {
    setLoadingStates(s => ({ ...s, [key]: val }));
  }

  function getToken() {
    try { return localStorage.getItem('auth_token') || ''; } catch { return ''; }
  }

  function downloadExcel(rows, filename, sheetName = 'Data') {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadRecordsPdf(records, { title, companyName, filename }) {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12);
    doc.text(companyName || 'SmartQeyd', 14, 10);
    doc.setFontSize(11);
    doc.text(title || 'Hesabat', 14, 16);

    autoTable(doc, {
      startY: 20,
      head: [['Tarix', 'Aktiv', 'Müştəri', 'Xidmət', 'Məbləğ', 'Status']],
      body: (records || []).map(r => ([
        r.date || '',
        [r.car_brand, r.car_model].filter(Boolean).join(' ') || '—',
        r.customer_name || '—',
        r.service_type || '—',
        String(r.total_price ?? ''),
        r.payment_status || '',
      ])),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 58, 138] },
    });

    doc.save(filename || 'hesabat.pdf');
  }

  async function exportAllRecordsExcel() {
    setLoading('allExcel', true);
    try {
      if (window.api?.getRecords && window.api?.exportExcel) {
        const res = await window.api.getRecords({ userId });
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportExcel(res.data, 'butun-qeydler.xlsx');
        if (exp.success) {
          showNotification('Excel faylı hazır oldu', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/records?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      downloadExcel(res.data || [], 'butun-qeydler.xlsx', 'Qeydlər');
      showNotification('Excel faylı hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('allExcel', false); }
  }

  async function exportRangeExcel() {
    setLoading('rangeExcel', true);
    try {
      const fname = `qeydler-${dateRange.start}-${dateRange.end}.xlsx`;

      if (window.api?.getRecords && window.api?.exportExcel) {
        const res = await window.api.getRecords({ startDate: dateRange.start, endDate: dateRange.end, userId });
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportExcel(res.data, fname);
        if (exp.success) {
          showNotification(`${res.data.length} qeyd Excel-ə export edildi`, 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/records?${new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
        ...(userId ? { userId } : {}),
      }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      downloadExcel(res.data || [], fname, 'Qeydlər');
      showNotification(`${(res.data || []).length} qeyd Excel-ə export edildi`, 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('rangeExcel', false); }
  }

  async function exportAllRecordsPdf() {
    setLoading('allPdf', true);
    try {
      if (window.api?.getRecords && window.api?.getSettings && window.api?.exportPdf) {
        const [res, settings] = await Promise.all([
          window.api.getRecords({ userId }),
          window.api.getSettings(),
        ]);
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportPdf(res.data, {
          title: 'Bütün Qeydlər',
          companyName: settings.data?.company_name || 'SmartQeyd',
          filename: 'butun-qeydler.pdf',
        });
        if (exp.success) {
          showNotification('PDF faylı hazır oldu', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const [recs, settings] = await Promise.all([
        apiRequest(`/records?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() }),
        apiRequest('/settings', { token: getToken() }),
      ]);

      if (!recs.success) throw new Error(recs.error);
      downloadRecordsPdf(recs.data || [], {
        title: 'Bütün Qeydlər',
        companyName: settings?.data?.company_name || 'SmartQeyd',
        filename: 'butun-qeydler.pdf',
      });
      showNotification('PDF faylı hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('allPdf', false); }
  }

  async function exportDailyPdf() {
    setLoading('dailyPdf', true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (window.api?.getRecords && window.api?.getSettings && window.api?.exportDailyPdf) {
        const [res, settings] = await Promise.all([
          window.api.getRecords({ startDate: today, endDate: today, userId }),
          window.api.getSettings(),
        ]);
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportDailyPdf(res.data, today, {
          companyName: settings.data?.company_name || 'SmartQeyd',
        });
        if (exp.success) {
          showNotification('Gündəlik PDF hazır oldu', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const [recs, settings] = await Promise.all([
        apiRequest(`/records?${new URLSearchParams({
          startDate: today,
          endDate: today,
          ...(userId ? { userId } : {}),
        }).toString()}`, { token: getToken() }),
        apiRequest('/settings', { token: getToken() }),
      ]);
      if (!recs.success) throw new Error(recs.error);
      downloadRecordsPdf(recs.data || [], {
        title: `Gündəlik Hesabat (${today})`,
        companyName: settings?.data?.company_name || 'SmartQeyd',
        filename: `gunluk-hesabat-${today}.pdf`,
      });
      showNotification('Gündəlik PDF hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('dailyPdf', false); }
  }

  async function exportMonthlyPdf() {
    setLoading('monthlyPdf', true);
    try {
      const now = new Date();
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;

      if (window.api?.getRecords && window.api?.getSettings && window.api?.exportPdf) {
        const [res, settings] = await Promise.all([
          window.api.getRecords({ startDate: start, endDate: end, userId }),
          window.api.getSettings(),
        ]);
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportPdf(res.data, {
          title: `Aylıq Hesabat — ${now.toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}`,
          companyName: settings.data?.company_name || 'SmartQeyd',
          filename: `aylik-hesabat-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`,
        });
        if (exp.success) {
          showNotification('Aylıq PDF hazır oldu', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const [recs, settings] = await Promise.all([
        apiRequest(`/records?${new URLSearchParams({
          startDate: start,
          endDate: end,
          ...(userId ? { userId } : {}),
        }).toString()}`, { token: getToken() }),
        apiRequest('/settings', { token: getToken() }),
      ]);
      if (!recs.success) throw new Error(recs.error);
      const fname = `aylik-hesabat-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`;
      downloadRecordsPdf(recs.data || [], {
        title: `Aylıq Hesabat — ${now.toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' })}`,
        companyName: settings?.data?.company_name || 'SmartQeyd',
        filename: fname,
      });
      showNotification('Aylıq PDF hazır oldu', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('monthlyPdf', false); }
  }

  async function exportCustomersExcel() {
    setLoading('custExcel', true);
    try {
      if (window.api?.getCustomers && window.api?.exportCustomersExcel) {
        const res = await window.api.getCustomers('', userId);
        if (!res.success) throw new Error(res.error);
        const exp = await window.api.exportCustomersExcel(res.data);
        if (exp.success) {
          showNotification('Müştərilər Excel-ə export edildi', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/customers?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      const rows = (res.data || []).map(c => ({
        ID: c.id,
        Ad: c.name || '',
        Telefon: c.phone || '',
        Ziyarət: c.visit_count || 0,
        'Ümumi xərc': c.total_spent || 0,
        Borc: c.debt || 0,
        'Son gəliş': c.last_visit || '',
      }));
      downloadExcel(rows, 'musteriler.xlsx', 'Müştərilər');
      showNotification('Müştərilər Excel-ə export edildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('custExcel', false); }
  }

  async function exportProductsExcel() {
    setLoading('prodExcel', true);
    try {
      if (window.api?.getProducts && window.api?.exportExcel) {
        const res = await window.api.getProducts({ userId });
        if (!res.success) throw new Error(res.error);
        const rows = res.data.map(p => ({
          ID: p.id, Ad: p.name, Kateqoriya: p.category_name || '', SKU: p.sku || '',
          'Alış qiyməti': p.buy_price, 'Satış qiyməti': p.sell_price,
          Stok: p.stock_qty, 'Min stok': p.min_stock, Vahid: p.unit,
          Təchizatçı: p.supplier_name || '', Qeyd: p.notes || ''
        }));
        const exp = await window.api.exportExcel(rows, 'mehsullar.xlsx');
        if (exp.success) {
          showNotification('Məhsul siyahısı Excel-ə export edildi', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/products?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      const rows = (res.data || []).map(p => ({
        ID: p.id, Ad: p.name, Kateqoriya: p.category_name || '', SKU: p.sku || '',
        'Alış qiyməti': p.buy_price, 'Satış qiyməti': p.sell_price,
        Stok: p.stock_qty, 'Min stok': p.min_stock, Vahid: p.unit,
        Təchizatçı: p.supplier_name || '', Qeyd: p.notes || ''
      }));
      downloadExcel(rows, 'mehsullar.xlsx', 'Məhsullar');
      showNotification('Məhsul siyahısı Excel-ə export edildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('prodExcel', false); }
  }

  async function exportSalesExcel() {
    setLoading('salesExcel', true);
    try {
      if (window.api?.getSales && window.api?.exportExcel) {
        const res = await window.api.getSales({ userId });
        if (!res.success) throw new Error(res.error);
        const rows = res.data.map(s => ({
          ID: s.id, Tarix: s.date, Saat: s.time || '', Müştəri: s.customer_name || '',
          'Ümumi': s.total, 'Endirim': s.discount, 'Ödənilən': s.paid_amount,
          Status: s.payment_status, Qeyd: s.notes || ''
        }));
        const exp = await window.api.exportExcel(rows, 'satislar.xlsx');
        if (exp.success) {
          showNotification('Satışlar Excel-ə export edildi', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/sales?${new URLSearchParams({ ...(userId ? { userId } : {}) }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      const rows = (res.data || []).map(s => ({
        ID: s.id, Tarix: s.date, Saat: s.time || '', Müştəri: s.customer_name || '',
        'Ümumi': s.total, 'Endirim': s.discount, 'Ödənilən': s.paid_amount,
        Status: s.payment_status, Qeyd: s.notes || ''
      }));
      downloadExcel(rows, 'satislar.xlsx', 'Satışlar');
      showNotification('Satışlar Excel-ə export edildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('salesExcel', false); }
  }

  async function exportStockMovementsExcel() {
    setLoading('stockExcel', true);
    try {
      if (window.api?.getStockMovements && window.api?.exportExcel) {
        const res = await window.api.getStockMovements({ userId });
        if (!res.success) throw new Error(res.error);
        const rows = res.data.map(m => ({
          ID: m.id, Tarix: m.created_at, 'Əməliyyat növü': m.movement_type,
          Məhsul: m.product_name || '', Miqdar: m.qty,
          'Əvvəlki stok': m.qty_before, 'Yeni stok': m.qty_after, Qeyd: m.note || ''
        }));
        const exp = await window.api.exportExcel(rows, 'stok-hereketleri.xlsx');
        if (exp.success) {
          showNotification('Stok hərəkətləri Excel-ə export edildi', 'success');
          window.api.showItemInFolder(exp.path);
        } else throw new Error(exp.error);
        return;
      }

      const res = await apiRequest(`/stock/movements?${new URLSearchParams({ ...(userId ? { userId } : {}), limit: 2000 }).toString()}`, { token: getToken() });
      if (!res.success) throw new Error(res.error);
      const rows = (res.data || []).map(m => ({
        ID: m.id, Tarix: m.created_at, 'Əməliyyat növü': m.movement_type,
        Məhsul: m.product_name || '', Miqdar: m.qty,
        'Əvvəlki stok': m.qty_before, 'Yeni stok': m.qty_after, Qeyd: m.note || ''
      }));
      downloadExcel(rows, 'stok-hereketleri.xlsx', 'Stok');
      showNotification('Stok hərəkətləri Excel-ə export edildi', 'success');
    } catch (e) { showNotification('Xəta: ' + e.message, 'error'); }
    finally { setLoading('stockExcel', false); }
  }

  async function openExportFolder() {
    try {
      if (!window.api?.openPath) {
        showNotification('Brauzerdə export faylları birbaşa yüklənir', 'info');
        return;
      }
      await window.api.openPath('%USERPROFILE%\\Documents\\ServisExport');
    } catch (e) {
      showNotification('Qovluq açıla bilmədi', 'error');
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Export</h1>
          <p className="text-sm text-dark-400 mt-0.5">Məlumatları faylə çıxarın</p>
        </div>
        <button
          onClick={openExportFolder}
          className="btn-secondary text-xs py-1.5"
        >
          <FolderOpen size={13} /> Export qovluğu
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Tarix aralığı ilə Export</p>
          <div className="card p-4 mb-4">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <label className="label">Başlanğıc tarixi</label>
                <input type="date" className="input-field w-40 h-9 text-xs" value={dateRange.start}
                  onChange={e => setDateRange(d => ({ ...d, start: e.target.value }))} />
              </div>
              <div>
                <label className="label">Son tarix</label>
                <input type="date" className="input-field w-40 h-9 text-xs" value={dateRange.end}
                  onChange={e => setDateRange(d => ({ ...d, end: e.target.value }))} />
              </div>
              <button onClick={exportRangeExcel} disabled={loadingStates.rangeExcel} className="btn-primary h-9">
                {loadingStates.rangeExcel ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Excel Export
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Servis Qeydləri</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard icon={Calendar} title="Gündəlik Hesabat (PDF)" description="Bugünkü bütün qeydlər PDF formatında"
              color="text-red-400" onExport={exportDailyPdf} loading={loadingStates.dailyPdf} />
            <ExportCard icon={Calendar} title="Aylıq Hesabat (PDF)" description="Bu ayın bütün qeydləri PDF formatında"
              color="text-amber-400" onExport={exportMonthlyPdf} loading={loadingStates.monthlyPdf} />
            <ExportCard icon={FileSpreadsheet} title="Bütün Qeydlər (Excel)" description="Bütün tarixlər üzrə Excel faylı"
              color="text-emerald-400" onExport={exportAllRecordsExcel} loading={loadingStates.allExcel} />
            <ExportCard icon={FileText} title="Bütün Qeydlər (PDF)" description="Bütün qeydlər PDF formatında"
              color="text-primary-400" onExport={exportAllRecordsPdf} loading={loadingStates.allPdf} />
            <ExportCard icon={Users} title="Müştəri Siyahısı (Excel)" description="Bütün müştərilər Excel formatında"
              color="text-purple-400" onExport={exportCustomersExcel} loading={loadingStates.custExcel} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Anbar &amp; Satış</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <ExportCard icon={Package} title="Məhsul Siyahısı (Excel)" description="Bütün məhsullar, qiymət və stok məlumatları"
              color="text-emerald-400" onExport={exportProductsExcel} loading={loadingStates.prodExcel} />
            <ExportCard icon={ShoppingCart} title="Satış Tarixçəsi (Excel)" description="Bütün satış qeydləri Excel formatında"
              color="text-blue-400" onExport={exportSalesExcel} loading={loadingStates.salesExcel} />
            <ExportCard icon={ArrowLeftRight} title="Stok Hərəkətləri (Excel)" description="Bütün giriş/çıxış əməliyyatları"
              color="text-amber-400" onExport={exportStockMovementsExcel} loading={loadingStates.stockExcel} />
          </div>
        </div>

        <div className="card p-4 border border-dark-600">
          <p className="text-xs text-dark-400 flex items-center gap-2">
            <FolderOpen size={13} className="text-primary-400" />
            Export faylları <code className="text-primary-400 bg-dark-700 px-1.5 py-0.5 rounded text-xs">Sənədlər\ServisExport</code> qovluğuna saxlanılır.
          </p>
        </div>
      </div>
    </div>
  );
}
