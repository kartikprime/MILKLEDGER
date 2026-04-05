import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, addUser, updateUser, deleteUser, getCustomers } from '../db';
import { Milk, LogOut, Users, Plus, Edit2, Trash2, X, Eye, EyeOff, Shield, ChevronRight, BarChart2 } from 'lucide-react';

export default function AdminPanel({ onLogout }) {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', pin: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [tab, setTab] = useState('users'); // 'users' | 'customers'

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [u, c] = await Promise.all([getAllUsers(), getCustomers()]);
      setUsers(u);
      setCustomers(c);
    } catch (err) { console.error(err); }
  };

  const openAdd = () => {
    setEditUser(null);
    setForm({ name: '', pin: '' });
    setError('');
    setShowPin(false);
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, pin: user.pin });
    setError('');
    setShowPin(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.pin.length < 4) return setError('PIN must be at least 4 digits.');
    setSaving(true);
    try {
      if (editUser) {
        await updateUser(editUser.id, { name: form.name.trim(), pin: form.pin });
      } else {
        await addUser({ name: form.name.trim(), pin: form.pin, role: 'user' });
      }
      setShowModal(false);
      load();
    } catch (err) {
      setError(err.message || 'Error saving user.');
    }
    setSaving(false);
  };

  const handleDelete = async (user) => {
    if (user.role === 'admin') return alert('Cannot delete admin account.');
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await deleteUser(user.id);
      load();
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <Shield size={18} color="white" />
          </div>
          <span>ADMIN PANEL</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="btn btn-ghost" style={{ padding: '0.5rem 1rem' }}>
            <Milk size={16} /> Dashboard
          </Link>
          <button onClick={onLogout} className="btn-icon" title="Logout"><LogOut size={16} /></button>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: '1.5rem' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="font-black text-3xl" style={{ letterSpacing: '-0.01em' }}>Admin Panel</h1>
            <p className="text-muted text-sm mt-1">Manage users and view all data</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="stat-row mb-6">
          <div className="stat-chip">
            <span className="stat-chip__label">Total Users</span>
            <span className="stat-chip__value">{users.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Total Customers</span>
            <span className="stat-chip__value">{customers.length}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-chip__label">Admin</span>
            <span className="stat-chip__value" style={{ color: 'var(--color-warning)' }}>{users.filter(u => u.role === 'admin').length}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="cycle-tabs mb-6">
          <button onClick={() => setTab('users')} className={`cycle-tab ${tab === 'users' ? 'active' : ''}`}>
            <Users size={15} /> Users ({users.length})
          </button>
          <button onClick={() => setTab('customers')} className={`cycle-tab ${tab === 'customers' ? 'active' : ''}`}>
            <Milk size={15} /> Customers ({customers.length})
          </button>
        </div>

        {/* Users Tab */}
        {tab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">All Users</h2>
              <button onClick={openAdd} className="btn btn-primary"><Plus size={16} /> Add User</button>
            </div>
            <div className="table-wrap overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: '50px' }}>#</th>
                    <th style={{ minWidth: '160px' }}>Name</th>
                    <th style={{ minWidth: '100px' }}>PIN</th>
                    <th style={{ minWidth: '80px' }}>Role</th>
                    <th style={{ minWidth: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id}>
                      <td className="font-bold">{idx + 1}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: user.role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'var(--color-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '0.75rem', fontWeight: 800
                          }}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold">{user.name}</span>
                        </div>
                      </td>
                      <td>
                        <code style={{
                          background: 'var(--color-bg)', padding: '0.25rem 0.6rem',
                          borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem',
                          letterSpacing: '0.1em'
                        }}>{user.pin}</code>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700,
                          background: user.role === 'admin' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.1)',
                          color: user.role === 'admin' ? '#f59e0b' : 'var(--color-primary)',
                          textTransform: 'uppercase'
                        }}>{user.role}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(user)} className="btn-icon" title="Edit"><Edit2 size={14} /></button>
                          {user.role !== 'admin' && (
                            <button onClick={() => handleDelete(user)} className="btn-icon danger" title="Delete"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Customers Tab */}
        {tab === 'customers' && (
          <>
            <h2 className="font-bold text-xl mb-4">All Customers</h2>
            {customers.length === 0 ? (
              <div className="card text-center" style={{ padding: '3rem' }}>
                <Milk size={40} style={{ color: 'var(--color-border)', margin: '0 auto 1rem' }} />
                <p className="font-bold text-lg mb-1">No customers yet</p>
                <p className="text-muted text-sm">Customers are added from the Dashboard</p>
              </div>
            ) : (
              <div className="customer-grid">
                {customers.map(c => (
                  <Link to={`/customer/${c.id}`} key={c.id} className="customer-card">
                    <div className="customer-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                    <h3 className="font-bold text-lg mb-3">{c.name}</h3>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted">Rate</span>
                      <span className="font-bold" style={{ color: 'var(--color-success)' }}>₹ {c.rate}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-4">
                      <span className="text-muted">Fixed Fat</span>
                      <span className="font-bold">{c.fixedFat}</span>
                    </div>
                    <div className="flex items-center justify-end text-sm text-primary font-bold gap-1">
                      View <ChevronRight size={14} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-2xl">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>USER NAME</label>
                <input type="text" required className="input" placeholder="e.g. Ramesh"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-muted)' }}>UNIQUE PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    required
                    className="input"
                    style={{ paddingRight: '2.75rem' }}
                    maxLength={8}
                    placeholder="e.g. 5678"
                    value={form.pin}
                    onChange={e => setForm({ ...form, pin: e.target.value })}
                  />
                  <button type="button" onClick={() => setShowPin(v => !v)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm mb-3" style={{ color: 'var(--color-danger)' }}>⚠ {error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
