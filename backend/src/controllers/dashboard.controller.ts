import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Task, { TaskStatus } from '../models/Task';
import Engagement from '../models/Engagement';
import { AuthRequest } from '../middlewares/auth.middleware';

export const getDashboardMetrics = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const userRole = req.user!.role;
    
    const matchStage: any = {};
    if (userRole === 'TeamMember') {
      matchStage.assigneeId = userId;
    } else if (userRole === 'Manager') {
      const engagements = await Engagement.find({ managerId: userId }).select('_id');
      matchStage.engagementId = { $in: engagements.map((engagement) => engagement._id) };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const metrics = await Task.aggregate([
      { $match: matchStage },
      {
        $facet: {
          openTasks: [
            { $match: { status: { $ne: TaskStatus.COMPLETED } } },
            { $count: 'count' }
          ],
          overdueTasks: [
            { $match: { status: { $ne: TaskStatus.COMPLETED }, dueDate: { $lt: todayStart } } },
            { $count: 'count' }
          ],
          tasksDueToday: [
            { $match: { status: { $ne: TaskStatus.COMPLETED }, dueDate: { $gte: todayStart, $lte: todayEnd } } },
            { $count: 'count' }
          ],
          waitingForClient: [
            { $match: { status: TaskStatus.WAITING_FOR_CLIENT } },
            { $count: 'count' }
          ],
          waitingForReview: [
            { $match: { status: TaskStatus.READY_FOR_REVIEW } },
            { $count: 'count' }
          ]
        }
      }
    ]);

    const result = {
      openTasks: metrics[0].openTasks[0]?.count || 0,
      overdueTasks: metrics[0].overdueTasks[0]?.count || 0,
      tasksDueToday: metrics[0].tasksDueToday[0]?.count || 0,
      waitingForClient: metrics[0].waitingForClient[0]?.count || 0,
      waitingForReview: metrics[0].waitingForReview[0]?.count || 0,
    };

    res.json(result);
  } catch (error) {
    next(error);
  }
};
