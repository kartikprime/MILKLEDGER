import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCustomers, addCustomer, updateCustomer, deleteCustomer, getAllUsers, updateUser, recalcAllEntries } from '../db';
import { Plus, Search, Trash2, Edit2, Milk, LogOut, ChevronRight, Users, Settings, X, Eye, EyeOff, BarChart2 } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function Dashboard({ onLogout, role }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', rate: '', fixedFat: '' });
  const [saving, setSaving] = useState(false);

  // Settings / Change PIN
  const [showSettings, setShowSettings] = useState(false);
  const [pinForm, setPinForm] = useState({ current: '', newPin: '', confirm: '' });
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [showPins, setShowPins] = useState({ current: false, newPin: false, confirm: false });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      const all = await getCustomers();
      setCustomers(all);
    } catch (err) {
      console.error('Error loading customers:', err);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAdd = () => {
    setEditCustomer(null);
    setForm({ name: '', rate: '', fixedFat: '' });
    setShowModal(true);
  };

  const openEdit = (customer, e) => {
    e.preventDefault(); e.stopPropagation();
    setEditCustomer(customer);
    setForm({ name: customer.name, rate: String(customer.rate), fixedFat: String(customer.fixedFat) });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const data = {
      name: form.name.trim(),
      rate: parseFloat(form.rate),
      fixedFat: parseFloat(form.fixedFat),
    };
    try {
      if (editCustomer) {
        await updateCustomer(editCustomer.id, data);
        // Recalculate all entries if rate or fat changed
        if (data.rate !== editCustomer.rate || data.fixedFat !== editCustomer.fixedFat) {
          await recalcAllEntries(editCustomer.id, data.rate, data.fixedFat);
        }
      } else {
        await addCustomer(data);
      }
      setShowModal(false);
      loadCustomers();
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving customer: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (id, e) => {
    e.preventDefault(); e.stopPropagation();
    if (window.confirm('Delete this customer and all their data?')) {
      try {
        await deleteCustomer(id);
        loadCustomers();
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinError(''); setPinSuccess('');
    const userId = localStorage.getItem('milkledger_user_id');
    if (!userId) return setPinError('Session error. Please re-login.');
    if (pinForm.newPin.length < 4) return setPinError('New PIN must be at least 4 digits.');
    if (pinForm.newPin !== pinForm.confirm) return setPinError('New PINs do not match.');
    try {
      // Verify current PIN by checking all users
      const { loginWithPin } = await import('../db');
      const user = await loginWithPin(pinForm.current);
      if (!user || user.id !== userId) return setPinError('Current PIN is incorrect.');
      await updateUser(userId, { pin: pinForm.newPin });
      setPinSuccess('PIN changed successfully!');
      setPinForm({ current: '', newPin: '', confirm: '' });
    } catch (err) {
      setPinError(err.message || 'Error changing PIN.');
    }
  };

  const getInitials = (name) => name.trim().slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo"><Milk size={18} color="white" /></div>
          MILKLEDGER
        </div>
        <div className="flex items-center gap-2">
          <span className="badge"><Users size={12} style={{ marginRight: 4 }} />{customers.length} Customer{customers.length !== 1 ? 's' : ''}</span>
          <Link to="/summary" className="btn-icon" title="Monthly Summary">
            <BarChart2 size={16} />
          </Link>
          <button onClick={() => { setShowSettings(true); setPinError(''); setPinSuccess(''); }} className="btn-icon" title="Settings">
            <Settings size={16} />
          </button>
          <button onClick={onLogout} className="btn-icon" title="Logout"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: '1.5rem' }}>
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="font-black text-3xl" style={{ letterSpacing: '-0.01em' }}>Customers</h1>
            <p className="text-muted text-sm mt-1">Select a customer to enter milk data</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary"><Plus size={18} /> Add Customer</button>
        </div>

        <div className="relative mb-6" style={{ maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input type="text" placeholder="Search customers..." className="input" style={{ paddingLeft: '2.75rem' }}
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="customer-grid">
          {filteredCustomers.map(customer => (
            <Link to={`/customer/${customer.id}`} key={customer.id} className="customer-card">
              <div className="customer-card-actions">
                <button onClick={(e) => openEdit(customer, e)} className="btn-icon" title="Edit"><Edit2 size={14} /></button>
                <button onClick={(e) => handleDelete(customer.id, e)} className="btn-icon danger" title="Delete"><Trash2 size={14} /></button>
              </div>
              <div className="customer-avatar">{getInitials(customer.name)}</div>
              <h3 className="font-bold text-lg mb-3" style={{ paddingRight: '4rem' }}>{customer.name}</h3>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted">Rate / Litre</span>
                <span className="font-bold" style={{ color: 'var(--color-success)' }}>₹ {customer.rate}</span>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <span className="text-muted">Fixed Fat</span>
                <span className="font-bold">{customer.fixedFat}</span>
              </div>
              <div className="flex items-center justify-end text-sm text-primary font-bold gap-1">
                View Report <ChevronRight size={14} />
              </div>
            </Link>
          ))}
          {filteredCustomers.length === 0 && (
            <div className="card text-center" style={{ gridColumn: '1/-1', padding: '3rem' }}>
              <Milk size={40} style={{ color: 'var(--color-border)', margin: '0 auto 1rem' }} />
              <p className="font-bold text-lg mb-1">No customers yet</p>
              <p className="text-muted text-sm mb-4">Click "Add Customer" to get started</p>
              <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> Add First Customer</button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <h2 className="font-black text-2xl mb-1">{editCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
            <p className="text-muted text-sm mb-6">Fill in the customer details below</p>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>CUSTOMER NAME</label>
                <input type="text" required className="input" placeholder="e.g. Ramesh Kumar"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex gap-4 mb-6">
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>RATE (₹)</label>
                  <input type="number" step="0.01" min="0" required className="input" placeholder="45.00"
                    value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>FIXED FAT</label>
                  <input type="number" step="0.1" min="0" required className="input" placeholder="6.0"
                    value={form.fixedFat} onChange={e => setForm({ ...form, fixedFat: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Saving...' : editCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="modal-box">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-black text-2xl mb-0">Settings</h2>
                <p className="text-muted text-sm">Manage your account</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="btn-icon"><X size={16} /></button>
            </div>

            <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 className="font-bold mb-1">🔐 Change PIN</h3>
              <p className="text-muted text-sm mb-4">Update your login PIN</p>
              <form onSubmit={handleChangePin}>
                {[
                  { key: 'current', label: 'CURRENT PIN' },
                  { key: 'newPin', label: 'NEW PIN' },
                  { key: 'confirm', label: 'CONFIRM NEW PIN' },
                ].map(({ key, label }) => (
                  <div className="mb-3 relative" key={key}>
                    <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                    <div className="relative">
                      <input
                        type={showPins[key] ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={8}
                        required
                        className="input"
                        style={{ paddingRight: '2.75rem' }}
                        value={pinForm[key]}
                        onChange={e => setPinForm({ ...pinForm, [key]: e.target.value })}
                        placeholder="••••"
                      />
                      <button type="button" onClick={() => setShowPins(p => ({ ...p, [key]: !p[key] }))}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                        {showPins[key] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
                {pinError && <p className="text-sm mb-2" style={{ color: 'var(--color-danger)' }}>⚠ {pinError}</p>}
                {pinSuccess && <p className="text-sm mb-2" style={{ color: 'var(--color-success)' }}>✓ {pinSuccess}</p>}
                <button type="submit" className="btn btn-primary w-full mt-2">Update PIN</button>
              </form>
            </div>

            <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <h3 className="font-bold mb-1">📊 Quick Links</h3>
              <Link to="/summary" onClick={() => setShowSettings(false)} className="btn btn-ghost w-full mt-2" style={{ justifyContent: 'flex-start' }}>
                <BarChart2 size={16} /> Monthly Summary Report
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
