import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useApp } from '../App';

const PAYMENT_STATUS_OPTIONS = [
  { value: 'odenilib', label: 'Ödənilib' },
  { value: 'gozleyir', label: 'Gözləyir' },
  { value: 'qismen', label: 'Qismən ödənilib' },
  { value: 'borc', label: 'Borc qalır' },
];

export default function SmartInput({ onRecordCreated }) {
  const { showNotification } = useApp();
  const [input, setInput] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedParsed, setEditedParsed] = useState(null);
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (parsed) setParsed(null);
    if (parseError) setParseError(null);
  };

  const handleParse = useCallback(async () => {
    if (!input.trim()) return;
    setParsing(true);
    setParseError(null);
    setParsed(null);
    try {
      const result = await window.api.parseInput(input.trim());
      if (result.success && result.parsed) {
        setParsed(result.parsed);
        setEditedParsed({ ...result.parsed });
        setEditMode(false);
      } else {
        setParseError(result.error || 'Analiz uğursuz oldu');
      }
    } catch (e) {
      setParseError('Xəta baş verdi: ' + e.message);
    } finally {
      setParsing(false);
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (parsed && showPreview) {
        handleSubmit();
      } else {
        handleParse();
      }
    }
    if (e.key === 'Escape') {
      setParsed(null);
      setParseError(null);
    }
  };

  const handleSubmit = async () => {
    if (!parsed && !editedParsed) return;
    setSubmitting(true);
    try {
      const dataToSubmit = editMode ? editedParsed : parsed;
      const result = await window.api.createFromParsed(dataToSubmit, {});
      if (result.success) {
        showNotification('Qeyd uğurla əlavə edildi!', 'success');
        setInput('');
        setParsed(null);
        setEditedParsed(null);
        setParseError(null);
        setEditMode(false);
        if (onRecordCreated) onRecordCreated(result.data);
        inputRef.current?.focus();
      } else {
        showNotification(result.error || 'Əlavə etmək mümkün olmadı', 'error');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSubmit = async () => {
    if (!input.trim()) return;
    setParsing(true);
    try {
      const result = await window.api.parseInput(input.trim());
      if (result.success && result.parsed) {
        setSubmitting(true);
        const createResult = await window.api.createFromParsed(result.parsed, {});
        if (createResult.success) {
          showNotification('Qeyd sürətlə əlavə edildi!', 'success');
          setInput('');
          setParsed(null);
          if (onRecordCreated) onRecordCreated(createResult.data);
          inputRef.current?.focus();
        } else {
          showNotification(createResult.error || 'Əlavə etmək mümkün olmadı', 'error');
        }
      } else {
        setParseError(result.error || 'Analiz uğursuz');
      }
    } catch (e) {
      showNotification('Xəta: ' + e.message, 'error');
    } finally {
      setParsing(false);
      setSubmitting(false);
    }
  };

  const updateEditField = (field, value) => {
    setEditedParsed(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-400">
            <Sparkles size={16} />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder='Məs: "ekran dəyişmə 50 manat" — yazın, Enter basın'
            className="w-full pl-9 pr-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 text-sm
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
          />
        </div>
        <button
          onClick={handleParse}
          disabled={!input.trim() || parsing || submitting}
          className="btn-primary px-5 py-3 shrink-0"
        >
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Analiz et
        </button>
        <button
          onClick={handleQuickSubmit}
          disabled={!input.trim() || parsing || submitting}
          className="btn-secondary px-5 py-3 shrink-0"
          title="Analiz etmədən birbaşa əlavə et"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Sürətli
        </button>
      </div>

      {parseError && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-800/40 rounded-lg text-red-400 text-sm">
          <AlertCircle size={15} />
          {parseError}
        </div>
      )}

      {parsed && showPreview && (
        <div className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <CheckCircle size={15} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Analiz Nəticəsi</span>
              {parsed.usedAI && (
                <span className="text-xs px-2 py-0.5 bg-purple-900/40 text-purple-400 border border-purple-700/40 rounded-full">AI</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="text-xs text-dark-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-dark-700"
              >
                {editMode ? 'Bax' : 'Düzəlt'}
              </button>
              <button onClick={() => { setParsed(null); setParseError(null); }} className="text-dark-500 hover:text-white">
                <X size={15} />
              </button>
            </div>
          </div>

          {!editMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              <PreviewField label="Kateqoriya" value={parsed.car_brand} />
              <PreviewField label="Marka / Model" value={parsed.car_model} />
              <PreviewField label="Kod / Seriya" value={parsed.car_plate} />
              <PreviewField label="Müştəri" value={parsed.customer_name} />
              <PreviewField label="Xidmət" value={parsed.service_type} className="col-span-2" />
              <PreviewField label="Qiymət" value={parsed.price ? `${parsed.price} AZN` : null} />
              <PreviewField label="Tarix" value={parsed.date} />
              {parsed.notes && <PreviewField label="Qeyd" value={parsed.notes} className="col-span-2" />}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label className="label">Kateqoriya</label>
                <input className="input-field" value={editedParsed?.car_brand || ''} onChange={e => updateEditField('car_brand', e.target.value)} />
              </div>
              <div>
                <label className="label">Marka / Model</label>
                <input className="input-field" value={editedParsed?.car_model || ''} onChange={e => updateEditField('car_model', e.target.value)} />
              </div>
              <div>
                <label className="label">Kod / Seriya</label>
                <input className="input-field" value={editedParsed?.car_plate || ''} onChange={e => updateEditField('car_plate', e.target.value)} />
              </div>
              <div>
                <label className="label">Müştəri adı</label>
                <input className="input-field" value={editedParsed?.customer_name || ''} onChange={e => updateEditField('customer_name', e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="label">Xidmət növü</label>
                <input className="input-field" value={editedParsed?.service_type || ''} onChange={e => updateEditField('service_type', e.target.value)} />
              </div>
              <div>
                <label className="label">Qiymət (AZN)</label>
                <input type="number" className="input-field" value={editedParsed?.price || ''} onChange={e => updateEditField('price', e.target.value ? parseFloat(e.target.value) : null)} />
              </div>
              <div>
                <label className="label">Tarix</label>
                <input type="date" className="input-field" value={editedParsed?.date || ''} onChange={e => updateEditField('date', e.target.value)} />
              </div>
              <div>
                <label className="label">Ödəniş statusu</label>
                <select className="select-field" value={editedParsed?.payment_status || 'gozleyir'} onChange={e => updateEditField('payment_status', e.target.value)}>
                  {PAYMENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Qeyd</label>
                <input className="input-field" value={editedParsed?.notes || ''} onChange={e => updateEditField('notes', e.target.value)} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-dark-700">
            <button onClick={() => { setParsed(null); setParseError(null); setInput(''); }} className="btn-secondary text-xs py-1.5">
              Ləğv et
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary text-xs py-1.5">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Cədvələ əlavə et
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewField({ label, value, className = '' }) {
  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-xs text-dark-400">{label}</span>
      <span className={`text-sm font-medium ${value ? 'text-white' : 'text-dark-600'}`}>
        {value || '—'}
      </span>
    </div>
  );
}
