import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ClipboardList, Save, Loader2, ChevronLeft } from 'lucide-react';
import UniversalSmartInput from '../components/UniversalSmartInput';
import { useApp } from '../App';
import { apiRequest } from '../api/http';

const PAYMENT_STATUS_OPTIONS = [
  { value: 'gozleyir', label: 'Gözləyir' },
  { value: 'odenilib', label: 'Ödənilib' },
  { value: 'qismen', label: 'Qismən ödənilib' },
  { value: 'borc', label: 'Borc qalır' },
];

const EMPTY_FORM = {
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' }),
  customer_name: '', customer_phone: '',
  car_brand: '', car_model: '', car_plate: '',
  service_type: '', extra_services: '',
  quantity: 1, unit_price: '', total_price: '',
  payment_status: 'gozleyir', paid_amount: '',
  notes: '',
};

export default function NewRecord() {
  const navigate = useNavigate();
  const { showNotification, currentUser } = useApp();
  const [tab, setTab] = useState('smart');
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  function setField(k, v) {
    setForm(f => {
      const updated = { ...f, [k]: v };
      if (k === 'unit_price' || k === 'quantity') {
        const u = parseFloat(k === 'unit_price' ? v : f.unit_price) || 0;
        const q = parseFloat(k === 'quantity' ? v : f.quantity) || 1;
        updated.total_price = (u * q).toFixed(2);
      }
      if (k === 'payment_status' && v === 'odenilib') {
        updated.paid_amount = updated.total_price;
      }
      return updated;
    });
    if (errors[k]) setErrors(e => { const n = { ...e }; delete n[k]; return n; });
  }

  function validate() {
    const errs = {};
    if (!form.date) errs.date = 'Tarix tələb olunur';
    if (!form.service_type) errs.service_type = 'Xidmət / Əməliyyat növü daxil edin';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const totalPrice = parseFloat(form.total_price) || (parseFloat(form.unit_price) || null);
      const paidAmount = form.payment_status === 'odenilib' ? totalPrice : (parseFloat(form.paid_amount) || 0);
      const remainingAmount = totalPrice !== null ? Math.max(0, totalPrice - paidAmount) : null;

      const payload = {
        ...form,
        unit_price: parseFloat(form.unit_price) || null,
        total_price: totalPrice,
        quantity: parseFloat(form.quantity) || 1,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        created_by: currentUser?.id || null,
      };

      const result = window.api?.createRecord
        ? await window.api.createRecord(payload)
        : await apiRequest('/records', {
          method: 'POST',
          token: localStorage.getItem('auth_token') || '',
          body: payload,
        });
      if (result.success) {
        showNotification('Qeyd uğurla əlavə edildi!', 'success');
        setForm({ ...EMPTY_FORM });
        navigate('/records');
      } else {
        showNotification(result.error || 'Xəta baş verdi', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-icon">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="page-title">Yeni Qeyd</h1>
            <p className="text-sm text-dark-400 mt-0.5">Əməliyyat qeydi əlavə edin</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-dark-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('smart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${tab === 'smart' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}
        >
          <Sparkles size={15} />
          Ağıllı giriş
        </button>
        <button
          onClick={() => setTab('form')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${tab === 'form' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white'}`}
        >
          <ClipboardList size={15} />
          Form ilə giriş
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'smart' ? (
          <div className="max-w-3xl">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-dark-300 mb-4">
                Cümləni yazın, sistem avtomatik analiz etsin
              </h3>
              <UniversalSmartInput onDone={(page) => navigate(page ? `/${page}` : '/records')} />
              <div className="mt-6 pt-4 border-t border-dark-700">
                <p className="text-xs text-dark-500 mb-2">Nümunə cümlələr:</p>
                <div className="flex flex-col gap-1.5">
                  {[
                    'Elvin telefon ekran dəyişməsi 45 manat',
                    'Samir komputer təmiri bu gün 80 azn',
                    'Günel ayaqqabı tikmə sabah 15 manat',
                    'Rənan çanta təmiri 12 mart 20 azn',
                    'Nahid ucun kondisioner qaz doldurmaq 70 azn',
                  ].map((ex, i) => (
                    <code key={i} className="text-xs text-primary-400 bg-dark-800 px-3 py-1.5 rounded-lg block font-mono cursor-pointer hover:bg-dark-700 transition-colors"
                      onClick={() => {
                        const input = document.querySelector('input[placeholder*="yazın"]');
                        if (input) {
                          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                          nativeInputValueSetter.call(input, ex);
                          input.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }}
                    >
                      {ex}
                    </code>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <div className="card p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tarix *</label>
                  <input type="date" className={`input-field ${errors.date ? 'border-red-500' : ''}`}
                    value={form.date} onChange={e => setField('date', e.target.value)} />
                  {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
                </div>
                <div>
                  <label className="label">Saat</label>
                  <input type="time" className="input-field" value={form.time} onChange={e => setField('time', e.target.value)} />
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Müştəri</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Müştəri adı</label>
                    <input className="input-field" placeholder="Elvin Məmmədov" value={form.customer_name} onChange={e => setField('customer_name', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Telefon</label>
                    <input className="input-field" placeholder="050-123-4567" value={form.customer_phone} onChange={e => setField('customer_phone', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Əşya / Aktiv</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Kateqoriya / Növ</label>
                    <input className="input-field" placeholder="Telefon, Masin, Paltar..." value={form.car_brand} onChange={e => setField('car_brand', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Marka / Model</label>
                    <input className="input-field" placeholder="Samsung, Toyota..." value={form.car_model} onChange={e => setField('car_model', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Kod / Seriya</label>
                    <input className="input-field" placeholder="SN-12345" value={form.car_plate} onChange={e => setField('car_plate', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Xidmət</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Xidmət növü *</label>
                    <input className={`input-field ${errors.service_type ? 'border-red-500' : ''}`}
                      placeholder="Ekran dəyişmə, Təmir..." value={form.service_type} onChange={e => setField('service_type', e.target.value)} />
                    {errors.service_type && <p className="text-xs text-red-400 mt-1">{errors.service_type}</p>}
                  </div>
                  <div>
                    <label className="label">Əlavə xidmətlər</label>
                    <input className="input-field" placeholder="Əlavə xidmət..." value={form.extra_services} onChange={e => setField('extra_services', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Qiymət</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Miqdar</label>
                    <input type="number" min="1" className="input-field" value={form.quantity} onChange={e => setField('quantity', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Vahid qiymət (AZN)</label>
                    <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={form.unit_price} onChange={e => setField('unit_price', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Yekun qiymət (AZN)</label>
                    <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={form.total_price} onChange={e => setField('total_price', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-3">Ödəniş</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Ödəniş statusu</label>
                    <select className="select-field" value={form.payment_status} onChange={e => setField('payment_status', e.target.value)}>
                      {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {form.payment_status === 'qismen' && (
                    <div>
                      <label className="label">Ödənilən məbləğ (AZN)</label>
                      <input type="number" min="0" step="0.01" className="input-field" placeholder="0.00" value={form.paid_amount} onChange={e => setField('paid_amount', e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-dark-700 pt-4">
                <label className="label">Qeyd</label>
                <textarea className="input-field resize-none h-20" placeholder="Əlavə qeydlər..." value={form.notes} onChange={e => setField('notes', e.target.value)} />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => { setForm({ ...EMPTY_FORM }); setErrors({}); }} className="btn-secondary">
                  Sıfırla
                </button>
                <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Yadda saxla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
