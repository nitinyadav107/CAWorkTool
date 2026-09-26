import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { LogOut, ListTodo } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : {};
  const role = user.role;

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
      if (role === 'Admin' || role === 'Manager') {
        const uRes = await api.get('/admin/users');
        setUsersList(uRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [role]);

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchTasks();
  }, [fetchTasks, navigate]);

  const handleUpdateTask = async (taskId: string, updates: any) => {
    try {
      await api.patch(`/tasks/${taskId}`, updates);
      fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating task');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    handleUpdateTask(taskId, { status: newStatus });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const validTransitions: Record<string, string[]> = {
    'Not Started': ['In Progress'],
    'In Progress': ['Waiting for Client', 'Ready for Review'],
    'Waiting for Client': ['In Progress'],
    'Ready for Review': ['Changes Requested', 'Completed'],
    'Changes Requested': ['In Progress'],
    'Completed': [],
  };

  const groupedTasks = tasks.reduce((acc: any, task: any) => {
    const clientName = task.engagementId?.clientId?.name || 'Unknown Client';
    const serviceName = task.engagementId?.serviceTypeId?.name || 'Unknown Service';
    const groupKey = `${clientName} | ${serviceName}`;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(task);
    return acc;
  }, {});

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ListTodo /> Tasks
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <nav style={{ display: 'flex', gap: '20px', marginRight: '20px' }}>
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/tasks" style={{ color: 'var(--accent-color)', fontWeight: 'bold', textDecoration: 'none' }}>Tasks</Link>
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
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '12px' }}>Client / Service</th>
              <th style={{ padding: '12px' }}>Task Name</th>
              <th style={{ padding: '12px' }}>Assignee</th>
              <th style={{ padding: '12px' }}>Due Date</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedTasks).map(groupKey => (
              <React.Fragment key={groupKey}>
                <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottom: '2px solid var(--border-color)' }}>
                  <td colSpan={6} style={{ padding: '12px', fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                    📂 {groupKey}
                  </td>
                </tr>
                {groupedTasks[groupKey].map((task: any) => (
                  <tr key={task._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontSize: '0.9rem', paddingLeft: '24px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>↳ Step</span>
                    </td>
                    <td style={{ padding: '12px' }}>{task.name}</td>
                <td style={{ padding: '12px' }}>
                  {(user.role === 'Admin' || user.role === 'Manager') ? (
                    <select 
                      className="input-field" 
                      style={{ marginBottom: 0, padding: '4px', width: 'auto' }}
                      value={task.assigneeId?._id || ''}
                      onChange={(e) => handleUpdateTask(task._id, { assigneeId: e.target.value || null })}
                    >
                      <option value="">Unassigned</option>
                      {usersList.filter(u => u.role === 'TeamMember').map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                    </select>
                  ) : (
                    task.assigneeId?.name || 'Unassigned'
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  {(user.role === 'Admin' || user.role === 'Manager') ? (
                    <input 
                      type="date" 
                      className="input-field" 
                      style={{ marginBottom: 0, padding: '4px', width: 'auto' }}
                      value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                      onChange={(e) => handleUpdateTask(task._id, { dueDate: e.target.value || null })}
                    />
                  ) : (
                    task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: '12px', fontSize: '0.85rem',
                    background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' 
                  }}>
                    {task.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <select 
                    className="input-field" 
                    style={{ marginBottom: 0, padding: '8px', width: 'auto' }}
                    value={task.status}
                    onChange={(e) => handleStatusChange(task._id, e.target.value)}
                  >
                    <option value={task.status}>{task.status}</option>
                    {(validTransitions[task.status] || [])
                      .filter((status: string) => user.role !== 'TeamMember' || !['Completed', 'Changes Requested'].includes(status))
                      .map((status: string) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && <div style={{ padding: '20px', textAlign: 'center' }}>No tasks found.</div>}
      </div>
    </div>
  );
}
