import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, loadEntries } from '../db';
import { ArrowLeft, Download, SlidersHorizontal, Milk, X, ChevronLeft, ChevronRight } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function calcRow(weightStr, fatStr, fixedFat, rate) {
  const weight = parseFloat(weightStr);
  const fat = parseFloat(fatStr);
  if (!weight || isNaN(weight) || !fat || isNaN(fat)) return { inOutWeight: null, finalWeight: null, amount: null };
  const inOutWeight = (fat - fixedFat) * 0.015 * weight;
  return { inOutWeight, finalWeight: weight + inOutWeight, amount: (weight + inOutWeight) * rate };
}

const fmt = (val) => (val === null || val === undefined || isNaN(val)) ? '—' : Number(val).toFixed(2);
const fmtAmt = (val) => (val === null || val === undefined || isNaN(val)) ? '—' : `₹ ${Number(val).toFixed(2)}`;
const fmtSign = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return (val >= 0 ? '+' : '') + Number(val).toFixed(2);
};

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = parseInt(id);
  const [customer, setCustomer] = useState(null);
  const [cycleId, setCycleId] = useState(1);
  const [entries, setEntries] = useState({});
  const [columns, setColumns] = useState({ inOutWeight: true, finalWeight: true, amount: true });
  const [showColMenu, setShowColMenu] = useState(false);

  // Month / Year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const reportRef = useRef();

  useEffect(() => { loadData(); }, [customerId, cycleId, selectedMonth, selectedYear]);

  const loadData = async () => {
    const cust = await db.customers.get(customerId);
    setCustomer(cust);
    if (cust) {
      const dbEntries = await loadEntries(cust.id, cycleId, selectedMonth, selectedYear);
      const map = {};
      dbEntries.forEach(e => { map[`${e.date}-${e.period}`] = e; });
      setEntries(map);
    }
  };

  const currentDays = useMemo(() => {
    if (cycleId === 1) return Array.from({ length: 10 }, (_, i) => i + 1);
    if (cycleId === 2) return Array.from({ length: 10 }, (_, i) => i + 11);
    // Cycle 3: days 21 to end of selected month
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    return Array.from({ length: daysInMonth - 20 }, (_, i) => i + 21);
  }, [cycleId, selectedMonth, selectedYear]);

  const handleChange = useCallback(async (date, period, field, value) => {
    if (!customer) return;
    const key = `${date}-${period}`;
    setEntries(prev => {
      const current = prev[key] || {};
      const updated = { ...current, [field]: value };
      const calcs = calcRow(updated.weight, updated.fat, customer.fixedFat, customer.rate);
      const finalEntry = { ...updated, ...calcs, customerId, cycleId, date, period, month: selectedMonth, year: selectedYear };

      (async () => {
        if (current.id) {
          await db.milkEntries.put({ ...finalEntry, id: current.id });
        } else {
          const newId = await db.milkEntries.add(finalEntry);
          setEntries(p => ({ ...p, [key]: { ...finalEntry, id: newId } }));
        }
      })();

      return { ...prev, [key]: finalEntry };
    });
  }, [customer, customerId, cycleId, selectedMonth, selectedYear]);

  const handleDownloadPdf = () => {
    if (!customer) return;
    const element = reportRef.current;
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `${customer.name}_${MONTHS[selectedMonth-1]}_${selectedYear}_Cycle${cycleId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  if (!customer) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Milk size={32} style={{ color: 'var(--color-border)' }} />
    </div>
  );

  // Totals
  let totalWeight = 0, totalInOut = 0, totalFinal = 0, totalAmount = 0;
  currentDays.forEach(day => {
    ['AM', 'PM'].forEach(period => {
      const e = entries[`${day}-${period}`] || {};
      totalWeight += parseFloat(e.weight) || 0;
      totalInOut += e.inOutWeight || 0;
      totalFinal += e.finalWeight || 0;
      totalAmount += e.amount || 0;
    });
  });

  const colLabels = { inOutWeight: 'In/Out Wt', finalWeight: 'Final Wt', amount: 'Amount (₹)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav className="navbar">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-icon"><ArrowLeft size={16} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <Milk size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="font-black" style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>{customer.name}</span>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span>Rate: <b style={{ color: 'var(--color-text)' }}>₹{customer.rate}</b></span>
              <span>Fixed Fat: <b style={{ color: 'var(--color-text)' }}>{customer.fixedFat}</b></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowColMenu(v => !v)} className="btn btn-ghost" style={{ padding: '0.6rem 1rem' }}>
              <SlidersHorizontal size={15} /> Columns
            </button>
            {showColMenu && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-float)', padding: '1rem', width: '200px', zIndex: 30, border: '1px solid var(--color-border)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-sm">Columns</span>
                  <button onClick={() => setShowColMenu(false)} className="btn-icon" style={{ width: 24, height: 24 }}><X size={12} /></button>
                </div>
                <p className="text-sm text-muted mb-3" style={{ fontSize: '0.75rem' }}>Weight & Fat are always visible</p>
                {Object.keys(columns).map(col => (
                  <label key={col} className="flex items-center gap-2 mb-2" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={columns[col]} onChange={() => setColumns(p => ({ ...p, [col]: !p[col] }))} />
                    {colLabels[col]}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleDownloadPdf} className="btn btn-primary" style={{ padding: '0.6rem 1rem' }}>
            <Download size={15} /> Export PDF
          </button>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: '1.5rem' }}>
        {/* Month/Year Selector */}
        <div className="flex items-center gap-4 mb-5" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.75rem', boxShadow: 'var(--shadow-neu-sm)' }}>
            <button onClick={prevMonth} className="btn-icon" style={{ width: 30, height: 30 }}><ChevronLeft size={15} /></button>
            <span className="font-bold" style={{ minWidth: '130px', textAlign: 'center' }}>{MONTHS[selectedMonth - 1]} {selectedYear}</span>
            <button onClick={nextMonth} className="btn-icon" style={{ width: 30, height: 30 }}><ChevronRight size={15} /></button>
          </div>

          {/* Cycle Tabs */}
          <div className="cycle-tabs">
            {[{ id: 1, label: 'Cycle 1 (1–10)' }, { id: 2, label: 'Cycle 2 (11–20)' }, { id: 3, label: 'Cycle 3 (21–End)' }].map(cy => (
              <button key={cy.id} onClick={() => setCycleId(cy.id)} className={`cycle-tab ${cycleId === cy.id ? 'active' : ''}`}>
                {cy.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Totals */}
        <div className="stat-row mb-4">
          <div className="stat-chip">
            <span className="stat-chip__label">Total Weight</span>
            <span className="stat-chip__value">{totalWeight.toFixed(2)}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">In/Out Wt</span>
            <span className="stat-chip__value" style={{ color: totalInOut >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {totalInOut >= 0 ? '+' : ''}{totalInOut.toFixed(2)}
            </span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Final Weight</span>
            <span className="stat-chip__value">{totalFinal.toFixed(2)}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Total Amount</span>
            <span className="stat-chip__value">₹ {totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Report Table */}
        <div ref={reportRef}>
          <div className="mb-4" style={{ textAlign: 'center' }}>
            <h2 className="font-black text-2xl">MILK REPORT — {customer.name}</h2>
            <p className="text-muted text-sm">
              {MONTHS[selectedMonth - 1]} {selectedYear} &nbsp;|&nbsp;
              Cycle {cycleId} ({cycleId === 1 ? '1–10' : cycleId === 2 ? '11–20' : '21–End'}) &nbsp;|&nbsp;
              Rate: ₹{customer.rate} &nbsp;|&nbsp; Fixed Fat: {customer.fixedFat}
            </p>
          </div>

          <div className="table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th className="sticky-col-1" style={{ minWidth: '44px' }}>Day</th>
                  <th className="sticky-col-2" style={{ minWidth: '60px' }}>Shift</th>
                  <th style={{ minWidth: '120px' }}>Weight</th>
                  <th style={{ minWidth: '120px' }}>Fat</th>
                  {columns.inOutWeight && <th style={{ minWidth: '100px' }}>In/Out Wt</th>}
                  {columns.finalWeight && <th style={{ minWidth: '100px' }}>Final Wt</th>}
                  {columns.amount && <th style={{ minWidth: '110px' }}>Amount (₹)</th>}
                </tr>
              </thead>
              <tbody>
                {currentDays.flatMap(day =>
                  ['AM', 'PM'].map(period => {
                    const key = `${day}-${period}`;
                    const entry = entries[key] || {};
                    return (
                      <tr key={key} className={period === 'AM' ? 'row-am' : 'row-pm'}>
                        <td className="sticky-col-1 font-bold">{day}</td>
                        <td className="sticky-col-2">
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '999px', background: period === 'AM' ? 'rgba(14,165,233,0.1)' : 'rgba(245,158,11,0.1)', color: period === 'AM' ? 'var(--color-accent)' : 'var(--color-warning)' }}>
                            {period}
                          </span>
                        </td>
                        <td>
                          <input type="number" className="input-inline" value={entry.weight || ''} step="0.01" min="0" placeholder="—"
                            onChange={e => handleChange(day, period, 'weight', e.target.value)} />
                        </td>
                        <td>
                          <input type="number" className="input-inline" value={entry.fat || ''} step="0.1" min="0" placeholder="—"
                            onChange={e => handleChange(day, period, 'fat', e.target.value)} />
                        </td>
                        {columns.inOutWeight && (
                          <td style={{ color: entry.inOutWeight > 0 ? 'var(--color-success)' : entry.inOutWeight < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                            {entry.inOutWeight != null && !isNaN(entry.inOutWeight) ? fmtSign(entry.inOutWeight) : '—'}
                          </td>
                        )}
                        {columns.finalWeight && (
                          <td className="font-bold" style={{ color: 'var(--color-primary)' }}>
                            {entry.finalWeight != null && !isNaN(entry.finalWeight) ? fmt(entry.finalWeight) : '—'}
                          </td>
                        )}
                        {columns.amount && (
                          <td className="font-bold" style={{ color: 'var(--color-success)' }}>
                            {entry.amount != null && !isNaN(entry.amount) ? fmtAmt(entry.amount) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
                <tr className="row-total">
                  <td className="sticky-col-1" style={{ background: 'var(--color-primary)' }}>TOTAL</td>
                  <td className="sticky-col-2" style={{ background: 'var(--color-primary)' }}>—</td>
                  <td>{totalWeight.toFixed(2)}</td>
                  <td>—</td>
                  {columns.inOutWeight && <td>{totalInOut >= 0 ? '+' : ''}{totalInOut.toFixed(2)}</td>}
                  {columns.finalWeight && <td>{totalFinal.toFixed(2)}</td>}
                  {columns.amount && <td>₹ {totalAmount.toFixed(2)}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .navbar, .cycle-tabs, .stat-row { display: none !important; }
          body { background: white !important; }
          .table-wrap { box-shadow: none !important; page-break-inside: avoid; }
          .input-inline { border: none; background: transparent; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
