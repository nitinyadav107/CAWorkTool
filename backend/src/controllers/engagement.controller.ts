import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Engagement, { EngagementStatus } from '../models/Engagement';
import TaskTemplate from '../models/TaskTemplate';
import Task from '../models/Task';
import AuditLog from '../models/AuditLog';
import Client from '../models/Client';
import ServiceType from '../models/ServiceType';
import User, { UserRole } from '../models/User';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const createEngagementSchema = z.object({
  clientId: z.string().regex(objectIdRegex, 'Invalid Client ID'),
  serviceTypeId: z.string().regex(objectIdRegex, 'Invalid Service Type ID'),
  managerId: z.string().regex(objectIdRegex, 'Invalid Manager ID'),
  period: z.string().regex(/^\d{4}(-\d{2})?$/, 'Period must be YYYY or YYYY-MM').nullable().optional(),
});
const updateEngagementSchema = z.object({
  status: z.nativeEnum(EngagementStatus),
});

export const createEngagement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let session: mongoose.ClientSession | undefined;
  try {
    const data = createEngagementSchema.parse(req.body);
    const [client, serviceType, manager] = await Promise.all([
      Client.findById(data.clientId),
      ServiceType.findById(data.serviceTypeId),
      User.findById(data.managerId),
    ]);
    if (!client || client.isActive === false || !serviceType || !manager || manager.isActive === false || manager.role !== UserRole.MANAGER) {
      return res.status(400).json({ message: 'Client, service type, or manager is invalid' });
    }
    if (req.user!.role === UserRole.MANAGER && data.managerId !== req.user!.id) {
      return res.status(403).json({ message: 'Managers can only create engagements for themselves' });
    }

    const period = data.period ?? null;
    if (serviceType.isRecurring) {
      const validPeriod = serviceType.recurrenceFrequency === 'Yearly'
        ? /^\d{4}$/.test(period || '')
        : /^\d{4}-(0[1-9]|1[0-2])$/.test(period || '');
      if (!validPeriod) {
        return res.status(400).json({
          message: serviceType.recurrenceFrequency === 'Yearly'
            ? 'Yearly services require a YYYY period'
            : 'Monthly services require a YYYY-MM period',
        });
      }
    } else if (period !== null) {
      return res.status(400).json({ message: 'One-time services must not have a period' });
    }

    const templates = await TaskTemplate.find({ serviceTypeId: data.serviceTypeId }).sort({ orderIndex: 1 });
    if (templates.length === 0) {
      return res.status(400).json({ message: 'Add at least one task template before creating this engagement' });
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // 1. Create Engagement
    const engagement = new Engagement({ ...data, period, status: EngagementStatus.ACTIVE });
    await engagement.save({ session });

    // 2. Generate tasks from the service template in the same transaction.
    const tasksToCreate = templates.map((tpl) => ({
      engagementId: engagement._id,
      templateId: tpl._id,
      name: tpl.name,
      status: 'Not Started',
    }));

    if (tasksToCreate.length > 0) {
      await Task.insertMany(tasksToCreate, { session });
    }

    // 3. Record the operation in the same transaction.
    await AuditLog.create([{
      entityId: engagement._id,
      entityType: 'Engagement',
      action: 'CREATED',
      changedBy: req.user!.id,
    }], { session });

    await session.commitTransaction();

    res.status(201).json({ message: 'Engagement created successfully', engagementId: engagement._id });
  } catch (error) {
    if (session?.inTransaction()) await session.abortTransaction();
    next(error);
  } finally {
    await session?.endSession();
  }
};

export const getEngagements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role;
    let query: any = {};
    if (userRole === 'Manager') {
      query.managerId = req.user!.id;
    }
    const engagements = await Engagement.find(query)
      .populate('clientId', 'name contactEmail')
      .populate('serviceTypeId', 'name')
      .populate('managerId', 'name')
      .sort({ createdAt: -1 });
    res.json(engagements);
  } catch (error) { next(error); }
};

export const updateEngagement = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const engagementId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!objectIdRegex.test(engagementId)) {
      return res.status(400).json({ message: 'Invalid engagement ID' });
    }
    const { status } = updateEngagementSchema.parse(req.body);
    const engagement = await Engagement.findById(engagementId);
    if (!engagement) return res.status(404).json({ message: 'Engagement not found' });
    if (req.user!.role === UserRole.MANAGER && engagement.managerId.toString() !== req.user!.id) {
      return res.status(403).json({ message: 'Managers can only manage their own engagements' });
    }

    const previousStatus = engagement.status;
    engagement.status = status;
    await engagement.save();
    if (previousStatus !== status) {
      await AuditLog.create({
        entityId: engagement._id,
        entityType: 'Engagement',
        action: 'STATUS_CHANGED',
        changedBy: req.user!.id,
        details: `${previousStatus} -> ${status}`,
      });
    }
    res.json({ message: 'Engagement updated successfully', engagement });
  } catch (error) {
    next(error);
  }
};
