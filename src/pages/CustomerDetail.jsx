import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../db';
import { ArrowLeft, Download, SlidersHorizontal, Milk, X } from 'lucide-react';
import html2pdf from 'html2pdf.js';

function calcRow(weightStr, fatStr, fixedFat, rate) {
  const weight = parseFloat(weightStr);
  const fat = parseFloat(fatStr);
  if (!weight || isNaN(weight) || !fat || isNaN(fat)) {
    return { inOutWeight: null, finalWeight: null, amount: null };
  }
  const inOutWeight = (fat - fixedFat) * 0.015 * weight;
  const finalWeight = weight + inOutWeight;
  const amount = finalWeight * rate;
  return { inOutWeight, finalWeight, amount };
}

const fmt = (val, decimals = 2) =>
  val === null || val === undefined || isNaN(val) ? '' : Number(val).toFixed(decimals);

const fmtAmt = (val) =>
  val === null || val === undefined || isNaN(val) ? '' : `₹ ${Number(val).toFixed(2)}`;

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = parseInt(id);
  const [customer, setCustomer] = useState(null);
  const [cycleId, setCycleId] = useState(1);
  const [entries, setEntries] = useState({});
  const [columns, setColumns] = useState({ inOutWeight: true, finalWeight: true, amount: true });
  const [showColMenu, setShowColMenu] = useState(false);
  const reportRef = useRef();

  useEffect(() => { loadData(); }, [customerId, cycleId]);

  const loadData = async () => {
    const cust = await db.customers.get(customerId);
    setCustomer(cust);
    if (cust) {
      const dbEntries = await db.milkEntries.where({ customerId: cust.id, cycleId }).toArray();
      const map = {};
      dbEntries.forEach(e => { map[`${e.date}-${e.period}`] = e; });
      setEntries(map);
    }
  };

  const currentDays = useMemo(() => {
    if (cycleId === 1) return Array.from({ length: 10 }, (_, i) => i + 1);
    if (cycleId === 2) return Array.from({ length: 10 }, (_, i) => i + 11);
    return Array.from({ length: 11 }, (_, i) => i + 21);
  }, [cycleId]);

  const handleChange = useCallback(async (date, period, field, value) => {
    const key = `${date}-${period}`;
    setEntries(prev => {
      const current = prev[key] || {};
      const updated = { ...current, [field]: value };
      const calcs = calcRow(updated.weight, updated.fat, customer.fixedFat, customer.rate);
      const finalEntry = { ...updated, ...calcs, customerId, cycleId, date, period };

      // Async DB save
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
  }, [customer, customerId, cycleId]);

  const handleDownloadPdf = () => {
    if (!customer) return;
    const element = reportRef.current;
    const opt = {
      margin: [0.4, 0.4, 0.4, 0.4],
      filename: `${customer.name}_Cycle${cycleId}_Report.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (!customer) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Milk size={32} style={{ color: 'var(--color-border)', animation: 'pulse 1s infinite' }} />
    </div>
  );

  // Totals
  let totalWeight = 0, totalInOut = 0, totalFinal = 0, totalAmount = 0;
  currentDays.flatMap(day => ['AM', 'PM']).forEach((_, i) => {
    const day = currentDays[Math.floor(i / 2)];
    const period = i % 2 === 0 ? 'AM' : 'PM';
    const e = entries[`${day}-${period}`] || {};
    totalWeight += parseFloat(e.weight) || 0;
    totalInOut += e.inOutWeight || 0;
    totalFinal += e.finalWeight || 0;
    totalAmount += e.amount || 0;
  });

  const colLabels = { inOutWeight: 'In/Out Wt', finalWeight: 'Final Wt', amount: 'Amount (₹)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-icon">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Milk size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="font-black" style={{ fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {customer.name}
              </span>
            </div>
            <div className="flex gap-4 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              <span>Rate: <b style={{ color: 'var(--color-text)' }}>₹{customer.rate}</b></span>
              <span>Fixed Fat: <b style={{ color: 'var(--color-text)' }}>{customer.fixedFat}</b></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Toggle */}
          <div className="relative">
            <button onClick={() => setShowColMenu(v => !v)} className="btn btn-ghost" style={{ padding: '0.6rem 1rem' }}>
              <SlidersHorizontal size={15} /> Columns
            </button>
            {showColMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-float)', padding: '1rem', width: '200px', zIndex: 30,
                border: '1px solid var(--color-border)'
              }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-sm">Columns</span>
                  <button onClick={() => setShowColMenu(false)} className="btn-icon" style={{ width: 24, height: 24 }}>
                    <X size={12} />
                  </button>
                </div>
                <p className="text-sm text-muted mb-3" style={{ fontSize: '0.75rem' }}>Weight & Fat are always shown</p>
                {Object.keys(columns).map(col => (
                  <label key={col} className="flex items-center gap-2 mb-2" style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={columns[col]}
                      onChange={() => setColumns(p => ({ ...p, [col]: !p[col] }))} />
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
        {/* Cycle Selector */}
        <div className="flex items-center gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
          <div className="cycle-tabs">
            {[
              { id: 1, label: 'Cycle 1 (1–10)' },
              { id: 2, label: 'Cycle 2 (11–20)' },
              { id: 3, label: 'Cycle 3 (21–31)' },
            ].map(cy => (
              <button key={cy.id} onClick={() => setCycleId(cy.id)}
                className={`cycle-tab ${cycleId === cy.id ? 'active' : ''}`}>
                {cy.label}
              </button>
            ))}
          </div>
        </div>

        {/* Totals */}
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
          {/* PDF Header (visible in PDF) */}
          <div className="mb-4" style={{ textAlign: 'center' }}>
            <h2 className="font-black text-2xl">MILK REPORT — {customer.name}</h2>
            <p className="text-muted text-sm">
              Cycle {cycleId} ({cycleId === 1 ? '1–10' : cycleId === 2 ? '11–20' : '21–31'}) &nbsp;|&nbsp;
              Rate: ₹{customer.rate} &nbsp;|&nbsp; Fixed Fat: {customer.fixedFat}
            </p>
          </div>

          <div className="table-wrap overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '90px' }}>Date</th>
                  <th style={{ minWidth: '50px' }}>Shift</th>
                  <th style={{ minWidth: '110px' }}>Weight</th>
                  <th style={{ minWidth: '110px' }}>Fat</th>
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
                        <td className="font-bold">{day}</td>
                        <td>
                          <span style={{
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            background: period === 'AM' ? 'rgba(14,165,233,0.1)' : 'rgba(245,158,11,0.1)',
                            color: period === 'AM' ? 'var(--color-accent)' : 'var(--color-warning)',
                          }}>{period}</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input-inline"
                            value={entry.weight || ''}
                            onChange={e => handleChange(day, period, 'weight', e.target.value)}
                            placeholder="—"
                            step="0.01"
                            min="0"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input-inline"
                            value={entry.fat || ''}
                            onChange={e => handleChange(day, period, 'fat', e.target.value)}
                            placeholder="—"
                            step="0.1"
                            min="0"
                          />
                        </td>
                        {columns.inOutWeight && (
                          <td style={{ color: entry.inOutWeight > 0 ? 'var(--color-success)' : entry.inOutWeight < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                            {entry.inOutWeight !== null && entry.inOutWeight !== undefined && !isNaN(entry.inOutWeight)
                              ? (entry.inOutWeight >= 0 ? '+' : '') + fmt(entry.inOutWeight)
                              : '—'}
                          </td>
                        )}
                        {columns.finalWeight && (
                          <td className="font-bold" style={{ color: 'var(--color-primary)' }}>
                            {fmt(entry.finalWeight) || '—'}
                          </td>
                        )}
                        {columns.amount && (
                          <td className="font-bold" style={{ color: 'var(--color-success)' }}>
                            {entry.amount !== null && entry.amount !== undefined && !isNaN(entry.amount)
                              ? `₹ ${Number(entry.amount).toFixed(2)}` : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
                {/* Total Row */}
                <tr className="row-total">
                  <td colSpan={2}>TOTAL</td>
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
    </div>
  );
}
