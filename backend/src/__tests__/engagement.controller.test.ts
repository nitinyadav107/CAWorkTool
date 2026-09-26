import { Request, Response } from 'express';
import { createEngagement } from '../controllers/engagement.controller';
import Engagement from '../models/Engagement';
import TaskTemplate from '../models/TaskTemplate';
import Task from '../models/Task';
import AuditLog from '../models/AuditLog';
import mongoose from 'mongoose';
import Client from '../models/Client';
import ServiceType from '../models/ServiceType';
import User from '../models/User';

jest.mock('../models/Engagement');
jest.mock('../models/TaskTemplate');
jest.mock('../models/Task');
jest.mock('../models/AuditLog');
jest.mock('../models/Client');
jest.mock('../models/ServiceType');
jest.mock('../models/User');

describe('Engagement Controller', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let mockSession: any;

  beforeEach(() => {
    mockReq = {
      body: {
        clientId: new mongoose.Types.ObjectId().toHexString(),
        serviceTypeId: new mongoose.Types.ObjectId().toHexString(),
        managerId: new mongoose.Types.ObjectId().toHexString(),
        period: '2023-11',
      },
      user: { id: 'admin1', role: 'Admin' }
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    mockNext = jest.fn();

    mockSession = {
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
      inTransaction: jest.fn().mockReturnValue(true),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession as any);
    (Client.findById as jest.Mock).mockResolvedValue({ _id: mockReq.body.clientId });
    (ServiceType.findById as jest.Mock).mockResolvedValue({
      _id: mockReq.body.serviceTypeId, isRecurring: true, recurrenceFrequency: 'Monthly',
    });
    (User.findById as jest.Mock).mockResolvedValue({ _id: mockReq.body.managerId, role: 'Manager' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('successfully creates an engagement and tasks within a transaction', async () => {
    const mockEngagement = { _id: 'eng1', save: jest.fn() };
    (Engagement as unknown as jest.Mock).mockImplementation(() => mockEngagement);
    
    (TaskTemplate.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { _id: 'tpl1', name: 'Task 1' }
      ])
    });

    await createEngagement(mockReq, mockRes, mockNext);

    expect(mockSession.startTransaction).toHaveBeenCalled();
    expect(mockEngagement.save).toHaveBeenCalledWith({ session: mockSession });
    expect(Task.insertMany).toHaveBeenCalled();
    expect(AuditLog.create).toHaveBeenCalled();
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it('rolls back transaction on error', async () => {
    const mockEngagement = { _id: 'eng1', save: jest.fn().mockRejectedValue(new Error('DB Error')) };
    (Engagement as unknown as jest.Mock).mockImplementation(() => mockEngagement);

    await createEngagement(mockReq, mockRes, mockNext);

    expect(mockSession.abortTransaction).toHaveBeenCalled();
    expect(mockSession.endSession).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('rejects a one-time engagement with a non-null period', async () => {
    mockReq.body.period = '2026-09';
    (ServiceType.findById as jest.Mock).mockResolvedValue({
      _id: mockReq.body.serviceTypeId, isRecurring: false, recurrenceFrequency: 'None',
    });

    await createEngagement(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockSession.startTransaction).not.toHaveBeenCalled();
  });

  it('creates a one-time engagement with no period', async () => {
    mockReq.body.period = null;
    (ServiceType.findById as jest.Mock).mockResolvedValue({
      _id: mockReq.body.serviceTypeId, isRecurring: false, recurrenceFrequency: 'None',
    });
    (Engagement as unknown as jest.Mock).mockImplementation(() => ({ _id: 'one-time-eng', save: jest.fn() }));
    (TaskTemplate.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockResolvedValue([{ _id: 'tpl1', name: 'One-time task' }]),
    });

    await createEngagement(mockReq, mockRes, mockNext);

    expect(Engagement).toHaveBeenCalledWith(expect.objectContaining({ period: null }));
    expect(mockSession.commitTransaction).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });
});
