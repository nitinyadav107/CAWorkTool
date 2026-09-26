import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { LogOut, LayoutDashboard, CheckCircle, AlertCircle, Clock, Users } from 'lucide-react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/metrics');
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchMetrics();
  }, [fetchMetrics, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <LayoutDashboard /> Dashboard
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', gap: '20px', marginRight: '20px' }}>
            <Link to="/dashboard" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/tasks" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tasks</Link>
            {(user.role === 'Admin' || user.role === 'Manager') && <Link to="/engagements" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Engagements</Link>}
            {user.role === 'Admin' && <Link to="/admin" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Admin</Link>}
          </nav>
          <span>Welcome, <strong>{user.name || 'User'}</strong> ({user.role})</span>
          <button className="btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.2)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="glass-panel">
        <h3>Task Overview</h3>
        <p style={{ color: 'var(--text-secondary)' }}>Your current workload metrics</p>
        
        {metrics ? (
          <div className="grid-dashboard">
            <div className="stat-card">
              <Clock style={{ color: '#3b82f6', margin: '0 auto' }} />
              <div className="stat-value">{metrics.openTasks}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Open Tasks</div>
            </div>
            <div className="stat-card">
              <AlertCircle style={{ color: '#ef4444', margin: '0 auto' }} />
              <div className="stat-value" style={{ background: '#ef4444', WebkitBackgroundClip: 'text' }}>{metrics.overdueTasks}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Overdue Tasks</div>
            </div>
            <div className="stat-card">
              <CheckCircle style={{ color: '#10b981', margin: '0 auto' }} />
              <div className="stat-value" style={{ background: '#10b981', WebkitBackgroundClip: 'text' }}>{metrics.tasksDueToday}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Due Today</div>
            </div>
            <div className="stat-card">
              <Users style={{ color: '#f59e0b', margin: '0 auto' }} />
              <div className="stat-value" style={{ background: '#f59e0b', WebkitBackgroundClip: 'text' }}>{metrics.waitingForClient}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Waiting for Client</div>
            </div>
            <div className="stat-card">
              <CheckCircle style={{ color: '#8b5cf6', margin: '0 auto' }} />
              <div className="stat-value" style={{ background: '#8b5cf6', WebkitBackgroundClip: 'text' }}>{metrics.waitingForReview}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Waiting for Review</div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading metrics...</div>
        )}
      </div>
    </div>
  );
}
