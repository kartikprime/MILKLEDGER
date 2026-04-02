import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { db, loadAllCycleEntries } from '../db';
import { ArrowLeft, Milk, ChevronLeft, ChevronRight, Download, BarChart2 } from 'lucide-react';
import html2pdf from 'html2pdf.js';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Summary() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [customers, setCustomers] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  useEffect(() => { fetchSummary(); }, [selectedMonth, selectedYear]);

  const fetchSummary = async () => {
    setLoading(true);
    const allCustomers = await db.customers.orderBy('createdAt').toArray();
    setCustomers(allCustomers);

    const data = {};
    for (const cust of allCustomers) {
      const entries = await loadAllCycleEntries(cust.id, selectedMonth, selectedYear);

      const cycles = { 1: { weight: 0, inOut: 0, final: 0, amount: 0 }, 2: { weight: 0, inOut: 0, final: 0, amount: 0 }, 3: { weight: 0, inOut: 0, final: 0, amount: 0 } };

      entries.forEach(e => {
        const cy = e.cycleId;
        if (!cycles[cy]) return;
        cycles[cy].weight += parseFloat(e.weight) || 0;
        cycles[cy].inOut += e.inOutWeight || 0;
        cycles[cy].final += e.finalWeight || 0;
        cycles[cy].amount += e.amount || 0;
      });

      const totalWeight = cycles[1].weight + cycles[2].weight + cycles[3].weight;
      const totalAmount = cycles[1].amount + cycles[2].amount + cycles[3].amount;

      data[cust.id] = { cycles, totalWeight, totalAmount };
    }

    setSummaryData(data);
    setLoading(false);
  };

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };

  const handleExportPdf = () => {
    const opt = {
      margin: [0.5, 0.4, 0.5, 0.4],
      filename: `MILKLEDGER_Summary_${MONTHS[selectedMonth-1]}_${selectedYear}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().set(opt).from(reportRef.current).save();
  };

  const grandTotal = customers.reduce((acc, c) => {
    const d = summaryData[c.id];
    if (!d) return acc;
    return { weight: acc.weight + d.totalWeight, amount: acc.amount + d.totalAmount };
  }, { weight: 0, amount: 0 });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="flex items-center gap-3">
          <Link to="/" className="btn-icon"><ArrowLeft size={16} /></Link>
          <div className="navbar-brand" style={{ gap: '0.5rem' }}>
            <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} />
            Monthly Summary
          </div>
        </div>
        <button onClick={handleExportPdf} className="btn btn-primary" style={{ padding: '0.6rem 1rem' }}>
          <Download size={15} /> Export PDF
        </button>
      </nav>

      <div className="page-wrap" style={{ paddingTop: '1.5rem' }}>
        {/* Month Navigator */}
        <div className="flex items-center gap-4 mb-6" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '0.5rem 0.75rem', boxShadow: 'var(--shadow-neu-sm)' }}>
            <button onClick={prevMonth} className="btn-icon" style={{ width: 30, height: 30 }}><ChevronLeft size={15} /></button>
            <span className="font-black" style={{ minWidth: '150px', textAlign: 'center', fontSize: '1rem' }}>
              {MONTHS[selectedMonth - 1]} {selectedYear}
            </span>
            <button onClick={nextMonth} className="btn-icon" style={{ width: 30, height: 30 }}><ChevronRight size={15} /></button>
          </div>
          <p className="text-muted text-sm">Showing totals for all customers this month</p>
        </div>

        {/* Grand Total Chips */}
        <div className="stat-row mb-6">
          <div className="stat-chip">
            <span className="stat-chip__label">Total Customers</span>
            <span className="stat-chip__value">{customers.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Total Weight (Month)</span>
            <span className="stat-chip__value">{grandTotal.weight.toFixed(2)}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Grand Total Amount</span>
            <span className="stat-chip__value" style={{ color: 'var(--color-success)' }}>₹ {grandTotal.amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Summary Table */}
        <div ref={reportRef}>
          <div className="mb-4 text-center">
            <h2 className="font-black text-2xl">MONTHLY SUMMARY — {MONTHS[selectedMonth - 1]} {selectedYear}</h2>
            <p className="text-muted text-sm">All customers — all cycles combined</p>
          </div>

          {loading ? (
            <div className="text-center" style={{ padding: '3rem', color: 'var(--color-text-muted)' }}>
              <div style={{ width: 36, height: 36, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
              Loading data...
            </div>
          ) : customers.length === 0 ? (
            <div className="card text-center" style={{ padding: '3rem' }}>
              <Milk size={40} style={{ color: 'var(--color-border)', margin: '0 auto 1rem' }} />
              <p className="font-bold text-lg mb-1">No customers found</p>
              <p className="text-muted text-sm mb-4">Add customers from the dashboard</p>
              <Link to="/" className="btn btn-primary">Go to Dashboard</Link>
            </div>
          ) : (
            <div className="table-wrap overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', minWidth: '130px' }}>Customer</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>Rate</th>
                    <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center' }}>Fixed Fat</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderLeft: '2px solid var(--color-border)', borderRight: '1px solid var(--color-border)', background: 'rgba(59,130,246,0.06)' }}>Cycle 1 (1–10)</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '1px solid var(--color-border)', background: 'rgba(14,165,233,0.06)' }}>Cycle 2 (11–20)</th>
                    <th colSpan={2} style={{ textAlign: 'center', borderRight: '2px solid var(--color-border)', background: 'rgba(5,150,105,0.06)' }}>Cycle 3 (21–End)</th>
                    <th colSpan={2} style={{ textAlign: 'center', background: 'rgba(37,99,235,0.08)' }}>Month Total</th>
                  </tr>
                  <tr>
                    {['Cycle 1', 'Cycle 2', 'Cycle 3'].map((_, i) => (
                      <>
                        <th key={`w${i}`} style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem 0.75rem', borderLeft: i === 0 ? '2px solid var(--color-border)' : undefined }}>Final Wt</th>
                        <th key={`a${i}`} style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem 0.75rem', borderRight: i === 2 ? '2px solid var(--color-border)' : undefined }}>Amount</th>
                      </>
                    ))}
                    <th style={{ textAlign: 'right', fontWeight: 700 }}>Final Wt</th>
                    <th style={{ textAlign: 'right', fontWeight: 700 }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust, idx) => {
                    const d = summaryData[cust.id];
                    if (!d) return null;
                    return (
                      <tr key={cust.id} style={{ background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-raised)' }}>
                        <td>
                          <Link to={`/customer/${cust.id}`} style={{ textDecoration: 'none', color: 'var(--color-primary)', fontWeight: 700 }}>
                            {cust.name}
                          </Link>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>₹{cust.rate}</td>
                        <td style={{ textAlign: 'center' }}>{cust.fixedFat}</td>

                        {/* Cycle 1 */}
                        <td style={{ textAlign: 'right', borderLeft: '2px solid var(--color-border)', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {d.cycles[1].final > 0 ? d.cycles[1].final.toFixed(2) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {d.cycles[1].amount > 0 ? `₹ ${d.cycles[1].amount.toFixed(2)}` : '—'}
                        </td>

                        {/* Cycle 2 */}
                        <td style={{ textAlign: 'right', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {d.cycles[2].final > 0 ? d.cycles[2].final.toFixed(2) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {d.cycles[2].amount > 0 ? `₹ ${d.cycles[2].amount.toFixed(2)}` : '—'}
                        </td>

                        {/* Cycle 3 */}
                        <td style={{ textAlign: 'right', borderRight: '2px solid var(--color-border)', color: 'var(--color-primary)', fontWeight: 600 }}>
                          {d.cycles[3].final > 0 ? d.cycles[3].final.toFixed(2) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', borderRight: '2px solid var(--color-border)', fontWeight: 600 }}>
                          {d.cycles[3].amount > 0 ? `₹ ${d.cycles[3].amount.toFixed(2)}` : '—'}
                        </td>

                        {/* Month Totals */}
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                          {d.totalWeight > 0 ? d.totalWeight.toFixed(2) : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                          {d.totalAmount > 0 ? `₹ ${d.totalAmount.toFixed(2)}` : '—'}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Grand Total Row */}
                  <tr className="row-total">
                    <td colSpan={3}>GRAND TOTAL</td>
                    <td colSpan={6} style={{ textAlign: 'right' }}></td>
                    <td style={{ textAlign: 'right' }}>{grandTotal.weight.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>₹ {grandTotal.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
