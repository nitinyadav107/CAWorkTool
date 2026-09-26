import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch {
      alert('Login failed');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>CA Work Tool</h2>
        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Mail style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} size={20} />
            <input 
              type="email" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="Email" 
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Lock style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} size={20} />
            <input 
              type="password" 
              className="input-field" 
              style={{ paddingLeft: '40px' }}
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Password" 
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }}>Sign In</button>
        </form>
      </div>
    </div>
  );
}
