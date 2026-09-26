import { Request, Response, NextFunction } from 'express';
import Task, { TaskStatus } from '../models/Task';
import AuditLog from '../models/AuditLog';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/auth.middleware';
import mongoose from 'mongoose';
import Engagement from '../models/Engagement';
import User, { UserRole } from '../models/User';

// Valid transitions
const validTransitions: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.NOT_STARTED]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.WAITING_FOR_CLIENT, TaskStatus.READY_FOR_REVIEW],
  [TaskStatus.WAITING_FOR_CLIENT]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.READY_FOR_REVIEW]: [TaskStatus.CHANGES_REQUESTED, TaskStatus.COMPLETED],
  [TaskStatus.CHANGES_REQUESTED]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.COMPLETED]: [],
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user!.role;
    let query: any = {};
    if (userRole === UserRole.TEAM_MEMBER) {
      query.assigneeId = req.user!.id;
    } else if (userRole === UserRole.MANAGER) {
      const engagements = await Engagement.find({ managerId: req.user!.id }).select('_id');
      query.engagementId = { $in: engagements.map((engagement) => engagement._id) };
    }
    const tasks = await Task.find(query)
      .populate('assigneeId', 'name email')
      .populate({
        path: 'engagementId',
        populate: [
          { path: 'clientId', select: 'name' },
          { path: 'serviceTypeId', select: 'name' }
        ]
      })
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) { next(error); }
};

const updateTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  assigneeId: z.union([z.string().regex(/^[0-9a-fA-F]{24}$/), z.null()]).optional(),
  dueDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    z.string().datetime({ offset: true }),
    z.null(),
  ]).optional(),
});

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const taskId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!/^[0-9a-fA-F]{24}$/.test(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    const updates = updateTaskSchema.parse(req.body);
    const { status: newStatus, assigneeId, dueDate } = updates;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Provide a task status, assignee, or due date to update' });
    }

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const engagement = await Engagement.findById(task.engagementId);
    if (!engagement) return res.status(404).json({ message: 'Task engagement not found' });
    if (userRole === UserRole.MANAGER && engagement.managerId.toString() !== userId) {
      return res.status(403).json({ message: 'Managers can only manage tasks in their engagements' });
    }

    // Authorization checks
    if (userRole === UserRole.TEAM_MEMBER && task.assigneeId?.toString() !== userId) {
      return res.status(403).json({ message: 'Cannot update another users task' });
    }

    const auditEntries: Array<{ entityId: mongoose.Types.ObjectId; entityType: 'Task'; action: string; changedBy: string; details?: string }> = [];

    if (assigneeId !== undefined || dueDate !== undefined) {
      if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
        return res.status(403).json({ message: 'Only managers/admins can assign tasks or set deadlines' });
      }
      if (assigneeId !== undefined) {
        if (assigneeId === null) {
          task.assigneeId = undefined;
        } else {
          const assignee = await User.findById(assigneeId);
          if (!assignee || assignee.role !== UserRole.TEAM_MEMBER) {
            return res.status(400).json({ message: 'Tasks can only be assigned to an existing team member' });
          }
          task.assigneeId = assignee._id;
        }
        auditEntries.push({
          entityId: task._id,
          entityType: 'Task',
          action: 'ASSIGNEE_CHANGED',
          changedBy: userId,
          details: assigneeId || 'Unassigned',
        });
      }
      if (dueDate !== undefined) {
        if (dueDate === null) {
          task.dueDate = undefined;
        } else {
          const parsedDueDate = new Date(dueDate);
          const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dueDate);
          if (Number.isNaN(parsedDueDate.getTime()) || (isDateOnly && parsedDueDate.toISOString().slice(0, 10) !== dueDate)) {
            return res.status(400).json({ message: 'Invalid due date' });
          }
          task.dueDate = parsedDueDate;
        }
        auditEntries.push({
          entityId: task._id,
          entityType: 'Task',
          action: 'DUE_DATE_CHANGED',
          changedBy: userId,
          details: dueDate || 'Cleared',
        });
      }
    }

    if (newStatus && newStatus !== task.status) {
      // Approval block logic
      if (newStatus === TaskStatus.COMPLETED || newStatus === TaskStatus.CHANGES_REQUESTED) {
        if (userRole !== UserRole.ADMIN && userRole !== UserRole.MANAGER) {
          return res.status(403).json({ message: 'Only managers/admins can approve or reject' });
        }
        if (task.assigneeId?.toString() === userId) {
          return res.status(403).json({ message: 'Cannot approve/reject your own work' });
        }
        task.reviewedById = userId as any;
      }

      // State machine check
      const allowedNextStates = validTransitions[task.status as TaskStatus];
      if (!allowedNextStates.includes(newStatus)) {
        return res.status(400).json({ message: `Invalid transition from ${task.status} to ${newStatus}` });
      }

      const oldStatus = task.status;
      task.status = newStatus;
      
      auditEntries.push({
        entityId: task._id,
        entityType: 'Task',
        action: `STATUS_CHANGED_${oldStatus.replace(/ /g, '_')}_TO_${newStatus.replace(/ /g, '_')}`,
        changedBy: userId,
      });
    }

    await task.save();
    if (auditEntries.length > 0) await AuditLog.create(auditEntries);
    await task.populate('assigneeId', 'name email');
    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
};
