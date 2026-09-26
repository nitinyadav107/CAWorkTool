import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function Admin() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userEditForm, setUserEditForm] = useState({ name: '', email: '', role: 'TeamMember' });
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientEditForm, setClientEditForm] = useState({ name: '', contactEmail: '', industry: '' });
  
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'TeamMember' });
  const [clientForm, setClientForm] = useState({ name: '', contactEmail: '', industry: '' });
  const [serviceTypeForm, setServiceTypeForm] = useState({ name: '', description: '', isRecurring: false, recurrenceFrequency: 'None' });
  const [taskTemplateForm, setTaskTemplateForm] = useState({ name: '', description: '', serviceTypeId: '', orderIndex: 0 });

  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};

  const fetchData = useCallback(async () => {
    try {
      const [uRes, cRes, sRes, tRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/clients'),
        api.get('/admin/service-types'),
        api.get('/admin/templates')
      ]);
      setUsersList(uRes.data);
      setClients(cRes.data);
      setServiceTypes(sRes.data);
      setTaskTemplates(tRes.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('token') || user.role !== 'Admin') {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [fetchData, navigate, user.role]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', userForm);
      setUserForm({ name: '', email: '', password: '', role: 'TeamMember' });
      fetchData();
      alert('User created');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/clients', clientForm);
      setClientForm({ name: '', contactEmail: '', industry: '' });
      fetchData();
      alert('Client created');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleCreateServiceType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/service-types', serviceTypeForm);
      setServiceTypeForm({ name: '', description: '', isRecurring: false, recurrenceFrequency: 'None' });
      fetchData();
      alert('Service Type created');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleCreateTaskTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/templates', taskTemplateForm);
      setTaskTemplateForm({ name: '', description: '', serviceTypeId: '', orderIndex: 0 });
      fetchData();
      alert('Task Template created');
    } catch (err: any) { alert(err.response?.data?.message || 'Error'); }
  };

  const handleSaveUser = async (id: string) => {
    try {
      await api.patch(`/admin/users/${id}`, userEditForm);
      setEditingUserId(null);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error updating user'); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Delete this user account? Accounts linked to tasks or engagements must be reassigned first.')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error deleting user'); }
  };

  const handleSaveClient = async (id: string) => {
    try {
      await api.patch(`/admin/clients/${id}`, clientEditForm);
      setEditingClientId(null);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error updating client'); }
  };

  const handleDeleteClient = async (id: string) => {
    if (!window.confirm('Delete this client? Clients with engagements cannot be deleted.')) return;
    try {
      await api.delete(`/admin/clients/${id}`);
      await fetchData();
    } catch (err: any) { alert(err.response?.data?.message || 'Error deleting client'); }
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
          <ShieldCheck /> Admin Panel
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', gap: '20px', marginRight: '20px' }}>
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/tasks" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Tasks</Link>
            <Link to="/engagements" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Engagements</Link>
            <Link to="/admin" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Admin</Link>
          </nav>
          <span>Welcome, <strong>{user.name || 'User'}</strong> ({user.role})</span>
          <button className="btn" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239, 68, 68, 0.2)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3>Create User</h3>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <input type="text" className="input-field" placeholder="Name" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} required />
            <input type="email" className="input-field" placeholder="Email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} required />
            <input type="password" className="input-field" placeholder="Temporary password (8+ characters)" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} minLength={8} required />
            <select className="input-field" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="TeamMember">TeamMember</option>
            </select>
            <button type="submit" className="btn">Create User</button>
          </form>
        </div>

        <div className="glass-panel" style={{ flex: 1 }}>
          <h3>Create Client</h3>
          <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <input type="text" className="input-field" placeholder="Client Name" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} required />
            <input type="email" className="input-field" placeholder="Client Email" value={clientForm.contactEmail} onChange={e => setClientForm({...clientForm, contactEmail: e.target.value})} />
            <input type="text" className="input-field" placeholder="Industry" value={clientForm.industry} onChange={e => setClientForm({...clientForm, industry: e.target.value})} />
            <button type="submit" className="btn">Create Client</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="glass-panel" style={{ flex: 1 }}>
          <h3>Create Service Type</h3>
          <form onSubmit={handleCreateServiceType} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <input type="text" className="input-field" placeholder="Service Name" value={serviceTypeForm.name} onChange={e => setServiceTypeForm({...serviceTypeForm, name: e.target.value})} required />
            <input type="text" className="input-field" placeholder="Description" value={serviceTypeForm.description} onChange={e => setServiceTypeForm({...serviceTypeForm, description: e.target.value})} />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={serviceTypeForm.isRecurring} onChange={e => setServiceTypeForm({...serviceTypeForm, isRecurring: e.target.checked, recurrenceFrequency: e.target.checked ? 'Monthly' : 'None'})} />
              Is Recurring?
            </label>
            {serviceTypeForm.isRecurring && (
              <select className="input-field" value={serviceTypeForm.recurrenceFrequency} onChange={e => setServiceTypeForm({...serviceTypeForm, recurrenceFrequency: e.target.value})}>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            )}
            <button type="submit" className="btn">Create Service</button>
          </form>
        </div>

        <div className="glass-panel" style={{ flex: 1 }}>
          <h3>Create Task Template</h3>
          <form onSubmit={handleCreateTaskTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
            <input type="text" className="input-field" placeholder="Task Name" value={taskTemplateForm.name} onChange={e => setTaskTemplateForm({...taskTemplateForm, name: e.target.value})} required />
            <select className="input-field" value={taskTemplateForm.serviceTypeId} onChange={e => setTaskTemplateForm({...taskTemplateForm, serviceTypeId: e.target.value})} required>
              <option value="">Select Service Type</option>
              {serviceTypes.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <input type="number" className="input-field" placeholder="Order Index" value={taskTemplateForm.orderIndex} onChange={e => setTaskTemplateForm({...taskTemplateForm, orderIndex: Number(e.target.value)})} required />
            <button type="submit" className="btn">Create Template</button>
          </form>
        </div>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3>Clients</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
          <thead><tr><th style={{ padding: '12px' }}>Name</th><th style={{ padding: '12px' }}>Email</th><th style={{ padding: '12px' }}>Industry</th><th style={{ padding: '12px' }}>Actions</th></tr></thead>
          <tbody>{clients.map(client => <tr key={client._id}>
            {editingClientId === client._id ? <>
              <td style={{ padding: '12px' }}><input className="input-field" value={clientEditForm.name} onChange={e => setClientEditForm({...clientEditForm, name: e.target.value})} /></td>
              <td style={{ padding: '12px' }}><input className="input-field" type="email" value={clientEditForm.contactEmail} onChange={e => setClientEditForm({...clientEditForm, contactEmail: e.target.value})} /></td>
              <td style={{ padding: '12px' }}><input className="input-field" value={clientEditForm.industry} onChange={e => setClientEditForm({...clientEditForm, industry: e.target.value})} /></td>
              <td style={{ padding: '12px' }}><button className="btn" onClick={() => handleSaveClient(client._id)}>Save</button> <button className="btn" onClick={() => setEditingClientId(null)}>Cancel</button></td>
            </> : <>
              <td style={{ padding: '12px' }}>{client.name}</td>
              <td style={{ padding: '12px' }}>{client.contactEmail || '-'}</td>
              <td style={{ padding: '12px' }}>{client.industry || '-'}</td>
              <td style={{ padding: '12px' }}><button className="btn" onClick={() => { setEditingClientId(client._id); setClientEditForm({ name: client.name, contactEmail: client.contactEmail || '', industry: client.industry || '' }); }}>Edit</button> <button className="btn" onClick={() => handleDeleteClient(client._id)}>Delete</button></td>
            </>}
          </tr>)}</tbody>
        </table>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3>Service Types and Task Templates</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
          <thead><tr><th style={{ padding: '12px' }}>Service</th><th style={{ padding: '12px' }}>Frequency</th><th style={{ padding: '12px' }}>Template tasks</th></tr></thead>
          <tbody>{serviceTypes.map(service => <tr key={service._id}>
            <td style={{ padding: '12px' }}>{service.name}</td>
            <td style={{ padding: '12px' }}>{service.isRecurring ? service.recurrenceFrequency : 'One-time'}</td>
            <td style={{ padding: '12px' }}>{taskTemplates.filter(template => template.serviceTypeId === service._id || template.serviceTypeId?._id === service._id).map(template => template.name).join(', ') || 'No tasks yet'}</td>
          </tr>)}</tbody>
        </table>
      </div>

      <div className="glass-panel" style={{ marginBottom: '20px' }}>
        <h3>Platform Users</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '16px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Role</th>
              <th style={{ padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersList.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                {editingUserId === u._id ? <>
                  <td style={{ padding: '12px' }}><input className="input-field" value={userEditForm.name} onChange={e => setUserEditForm({...userEditForm, name: e.target.value})} /></td>
                  <td style={{ padding: '12px' }}><input className="input-field" type="email" value={userEditForm.email} onChange={e => setUserEditForm({...userEditForm, email: e.target.value})} /></td>
                  <td style={{ padding: '12px' }}><select className="input-field" value={userEditForm.role} onChange={e => setUserEditForm({...userEditForm, role: e.target.value})}><option>Admin</option><option>Manager</option><option>TeamMember</option></select></td>
                  <td style={{ padding: '12px' }}><button className="btn" onClick={() => handleSaveUser(u._id)}>Save</button> <button className="btn" onClick={() => setEditingUserId(null)}>Cancel</button></td>
                </> : <>
                  <td style={{ padding: '12px' }}>{u.name}</td>
                  <td style={{ padding: '12px' }}>{u.email}</td>
                  <td style={{ padding: '12px' }}>{u.role}</td>
                  <td style={{ padding: '12px' }}><button className="btn" onClick={() => { setEditingUserId(u._id); setUserEditForm({ name: u.name, email: u.email, role: u.role }); }}>Edit</button> <button className="btn" onClick={() => handleDeleteUser(u._id)}>Delete</button></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
