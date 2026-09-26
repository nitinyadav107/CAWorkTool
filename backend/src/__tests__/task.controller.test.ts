import { Request, Response } from 'express';
import { updateTask } from '../controllers/task.controller';
import Task, { TaskStatus } from '../models/Task';
import Engagement from '../models/Engagement';
import User from '../models/User';

jest.mock('../models/Task');
jest.mock('../models/AuditLog');
jest.mock('../models/Engagement');
jest.mock('../models/User');

describe('Task Controller', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      params: { id: '0123456789abcdef01234567' },
      body: {},
      user: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();
    (Engagement.findById as jest.Mock).mockImplementation(async () => ({
      managerId: { toString: () => mockReq.user.id },
    }));
  });

  it('rejects unauthorized task update for TeamMember (not assignee)', async () => {
    mockReq.user = { id: 'user1', role: 'TeamMember' };
    mockReq.body.status = TaskStatus.IN_PROGRESS;
    
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId',
      engagementId: 'eng1',
      assigneeId: { toString: () => 'user2' },
      status: TaskStatus.NOT_STARTED,
      save: jest.fn(),
      populate: jest.fn().mockResolvedValue({}),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Cannot update another users task' });
  });

  it('rejects self-approval for Manager', async () => {
    mockReq.user = { id: 'manager1', role: 'Manager' };
    mockReq.body.status = TaskStatus.COMPLETED;
    
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId',
      engagementId: 'eng1',
      assigneeId: { toString: () => 'manager1' }, // Assignee is same as user
      status: TaskStatus.READY_FOR_REVIEW,
      save: jest.fn(),
      populate: jest.fn().mockResolvedValue({}),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Cannot approve/reject your own work' });
  });

  it('rejects invalid workflow transition', async () => {
    mockReq.user = { id: 'user1', role: 'TeamMember' };
    mockReq.body.status = TaskStatus.READY_FOR_REVIEW; // Invalid jump from NOT_STARTED
    
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId',
      engagementId: 'eng1',
      assigneeId: { toString: () => 'user1' },
      status: TaskStatus.NOT_STARTED,
      save: jest.fn(),
      populate: jest.fn().mockResolvedValue({}),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('allows successful manager approval', async () => {
    mockReq.user = { id: 'manager2', role: 'Manager' };
    mockReq.body.status = TaskStatus.COMPLETED;
    
    const mockSave = jest.fn();
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId',
      engagementId: 'eng1',
      assigneeId: { toString: () => 'user1' },
      status: TaskStatus.READY_FOR_REVIEW,
      save: mockSave,
      populate: jest.fn().mockResolvedValue({}),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockSave).toHaveBeenCalled();
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Task updated successfully' }));
  });

  it('rejects assigning a task to a user who is not a team member', async () => {
    mockReq.user = { id: 'manager1', role: 'Manager' };
    mockReq.body.assigneeId = '0123456789abcdef01234567';
    (User.findById as jest.Mock).mockResolvedValue({ _id: mockReq.body.assigneeId, role: 'Manager' });
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId', engagementId: 'eng1', status: TaskStatus.NOT_STARTED,
      assigneeId: null, save: jest.fn(), populate: jest.fn(),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Tasks can only be assigned to an existing team member' });
  });

  it('prevents managers from editing tasks in another manager’s engagement', async () => {
    mockReq.user = { id: 'manager1', role: 'Manager' };
    mockReq.body.dueDate = '2026-10-01';
    (Engagement.findById as jest.Mock).mockResolvedValue({ managerId: { toString: () => 'manager2' } });
    (Task.findById as jest.Mock).mockResolvedValue({
      _id: 'taskId', engagementId: 'eng2', status: TaskStatus.NOT_STARTED,
      assigneeId: null, save: jest.fn(), populate: jest.fn(),
    });

    await updateTask(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({ message: 'Managers can only manage tasks in their engagements' });
  });
});
