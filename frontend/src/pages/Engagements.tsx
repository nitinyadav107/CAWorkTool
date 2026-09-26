import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { LogOut, Briefcase } from 'lucide-react';

export default function Engagements() {
  const [engagements, setEngagements] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  
  const [form, setForm] = useState({ clientId: '', serviceTypeId: '', managerId: '', period: '' });
  
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const selectedService = serviceTypes.find(service => service._id === form.serviceTypeId);

  const fetchData = useCallback(async () => {
    try {
      const [engRes, clientsRes, servicesRes, usersRes] = await Promise.all([
        api.get('/engagements'),
        api.get('/admin/clients'),
        api.get('/admin/service-types'),
        api.get('/admin/users')
      ]);
      setEngagements(engRes.data);
      setClients(clientsRes.data);
      setServiceTypes(servicesRes.data);
      setManagers(usersRes.data.filter((candidate: any) => candidate.role === 'Manager'));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token') || (user.role !== 'Admin' && user.role !== 'Manager')) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [fetchData, navigate, user.role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        clientId: form.clientId,
        serviceTypeId: form.serviceTypeId,
        managerId: user.role === 'Manager' ? user.id : form.managerId
      };
      if (form.period) {
        payload.period = form.period;
      } else {
        payload.period = null;
      }
      await api.post('/engagements', payload);
      alert('Engagement created successfully');
      setForm({ clientId: '', serviceTypeId: '', managerId: '', period: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating engagement');
    }
  };

  const handleStatusChange = async (engagementId: string, status: string) => {
    try {
      await api.patch(`/engagements/${engagementId}`, { status });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating engagement');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Briefcase /> Engagements
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', gap: '20px', marginRight: '20px' }}>
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/tasks" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tasks</Link>
            <Link to="/engagements" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Engagements</Link>
            {user.role === 'Admin' && <Link to="/admin" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Admin</Link>}
          </nav>
          <span>Welcome, <strong>{user.name || 'User'}</strong> ({user.role})</span>
          <button className="btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.2)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3>Create Engagement</h3>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', marginTop: '16px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Client</label>
            <select className="input-field" value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})} required>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Service Type</label>
            <select className="input-field" value={form.serviceTypeId} onChange={e => {
              setForm({...form, serviceTypeId: e.target.value, period: ''});
            }} required>
              <option value="">Select Service</option>
              {serviceTypes.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          {user.role === 'Admin' && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Manager</label>
              <select className="input-field" value={form.managerId} onChange={e => setForm({...form, managerId: e.target.value})} required>
                <option value="">Select Manager</option>
                {managers.map(manager => <option key={manager._id} value={manager._id}>{manager.name}</option>)}
              </select>
            </div>
          )}
          {selectedService?.isRecurring && (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                {selectedService.recurrenceFrequency === 'Yearly' ? 'Period (YYYY)' : 'Period (YYYY-MM)'}
              </label>
              <input
                type="text"
                className="input-field"
                placeholder={selectedService.recurrenceFrequency === 'Yearly' ? 'e.g. 2026' : 'e.g. 2026-09'}
                pattern={selectedService.recurrenceFrequency === 'Yearly' ? '\\d{4}' : '\\d{4}-(0[1-9]|1[0-2])'}
                title={selectedService.recurrenceFrequency === 'Yearly' ? 'Enter a year as YYYY' : 'Enter a month as YYYY-MM'}
                value={form.period}
                onChange={e => setForm({...form, period: e.target.value})}
                required
              />
            </div>
          )}
          <button type="submit" className="btn" style={{ padding: '12px 24px', height: '42px', marginBottom: '16px' }}>Create</button>
        </form>
      </div>

      <div className="glass-panel">
        <h3>All Engagements</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px' }}>Client</th>
              <th style={{ padding: '12px' }}>Service</th>
              <th style={{ padding: '12px' }}>Manager</th>
              <th style={{ padding: '12px' }}>Period</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {engagements.map(e => (
              <tr key={e._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px' }}>{e.clientId?.name}</td>
                <td style={{ padding: '12px' }}>{e.serviceTypeId?.name}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem',
                    background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' 
                  }}>
                    {e.managerId?.name || 'Unknown'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>{e.period}</td>
                <td style={{ padding: '12px' }}>
                  <select className="input-field" style={{ marginBottom: 0, padding: '6px', width: 'auto' }} value={e.status} onChange={event => handleStatusChange(e._id, event.target.value)}>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
