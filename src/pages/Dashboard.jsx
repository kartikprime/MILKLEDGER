import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { Plus, Search, Trash2, Edit2, Milk, LogOut, ChevronRight, Users } from 'lucide-react';

export default function Dashboard({ onLogout }) {
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState({ name: '', rate: '', fixedFat: '' });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const all = await db.customers.orderBy('createdAt').reverse().toArray();
    setCustomers(all);
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
    e.preventDefault();
    e.stopPropagation();
    setEditCustomer(customer);
    setForm({ name: customer.name, rate: String(customer.rate), fixedFat: String(customer.fixedFat) });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.trim(),
      rate: parseFloat(form.rate),
      fixedFat: parseFloat(form.fixedFat),
    };
    if (editCustomer) {
      await db.customers.update(editCustomer.id, data);
    } else {
      await db.customers.add({ ...data, createdAt: Date.now() });
    }
    setShowModal(false);
    loadCustomers();
  };

  const handleDelete = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this customer and all their entries?')) {
      await db.customers.delete(id);
      await db.milkEntries.where({ customerId: id }).delete();
      loadCustomers();
    }
  };

  const getInitials = (name) => name.trim().slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Milk size={18} color="white" />
          </div>
          MILKLEDGER
        </div>
        <div className="flex items-center gap-3">
          <span className="badge">
            <Users size={12} className="mr-1" />
            {customers.length} Customer{customers.length !== 1 ? 's' : ''}
          </span>
          <button onClick={onLogout} className="btn-icon" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </nav>

      <div className="page-wrap" style={{ paddingTop: '1.5rem' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 className="font-black text-3xl" style={{ letterSpacing: '-0.01em' }}>Customers</h1>
            <p className="text-muted text-sm mt-1">Select a customer to enter milk data</p>
          </div>
          <button onClick={openAdd} className="btn btn-primary">
            <Plus size={18} /> Add Customer
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6" style={{ maxWidth: '420px' }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Search customers..."
            className="input"
            style={{ paddingLeft: '2.75rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Customer Grid */}
        <div className="customer-grid">
          {filteredCustomers.map(customer => (
            <Link to={`/customer/${customer.id}`} key={customer.id} className="customer-card">
              <div className="customer-card-actions">
                <button onClick={(e) => openEdit(customer, e)} className="btn-icon" title="Edit">
                  <Edit2 size={14} />
                </button>
                <button onClick={(e) => handleDelete(customer.id, e)} className="btn-icon danger" title="Delete">
                  <Trash2 size={14} />
                </button>
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
              <button onClick={openAdd} className="btn btn-primary">
                <Plus size={16} /> Add First Customer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
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
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editCustomer ? 'Save Changes' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
