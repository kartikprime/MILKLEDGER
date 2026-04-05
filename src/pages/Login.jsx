import { useState } from 'react';
import { loginWithPin } from '../db';
import { Milk } from 'lucide-react';

export default function Login({ setAuth }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await loginWithPin(pin);
      if (user) {
        localStorage.setItem('milkledger_auth', 'true');
        localStorage.setItem('milkledger_role', user.role);
        localStorage.setItem('milkledger_user_id', user.id);
        localStorage.setItem('milkledger_user_name', user.name);
        setAuth({ authenticated: true, role: user.role, userId: user.id, userName: user.name });
      } else {
        setError('Incorrect PIN. Try again.');
        setPin('');
      }
    } catch (err) {
      setError('Connection error. Check your internet.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-logo">
          <Milk size={32} color="white" />
        </div>
        <div className="text-center mb-8">
          <h1 className="font-black text-2xl" style={{ color: 'var(--color-primary)', letterSpacing: '-0.02em' }}>MILKLEDGER</h1>
          <p className="text-muted text-sm mt-1">Dairy Accounting System</p>
        </div>

        <form onSubmit={handleLogin}>
          <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>ENTER YOUR PIN</label>
          <input
            type="password"
            inputMode="numeric"
            className="pin-input"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            maxLength={6}
            placeholder="••••"
            required
            autoFocus
          />
          {error && (
            <p className="text-sm mt-2 text-center" style={{ color: 'var(--color-danger)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full mt-6"
            style={{ padding: '1rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' }}
          >
            {loading ? 'Verifying...' : 'Login →'}
          </button>
        </form>
      </div>
    </div>
  );
}
