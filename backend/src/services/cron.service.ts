import mongoose from 'mongoose';
import Engagement, { EngagementStatus } from '../models/Engagement';
import ServiceType, { RecurrenceFrequency } from '../models/ServiceType';
import TaskTemplate from '../models/TaskTemplate';
import Task from '../models/Task';
import AuditLog from '../models/AuditLog';

export const generateRecurringEngagements = async () => {
  const recurringServices = await ServiceType.find({
    isRecurring: true,
    recurrenceFrequency: { $in: [RecurrenceFrequency.MONTHLY, RecurrenceFrequency.YEARLY] },
  });
  
  const now = new Date();
  const currentMonthlyPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearlyPeriod = `${now.getFullYear()}`;

  for (const service of recurringServices) {
    const period = service.recurrenceFrequency === 'Yearly' ? currentYearlyPeriod : currentMonthlyPeriod;
    const recurringEngagementFilter = { serviceTypeId: service._id, period: { $ne: null } };
    const previousEngagements = await Engagement.find(recurringEngagementFilter).distinct('clientId');
    
    for (const clientId of previousEngagements) {
       const session = await mongoose.startSession();
       session.startTransaction();
       try {
         const lastEng = await Engagement.findOne({ ...recurringEngagementFilter, clientId }).sort({ createdAt: -1 });
         if (!lastEng) {
           await session.abortTransaction();
           session.endSession();
           continue;
         }

         const engagement = new Engagement({
           clientId,
           serviceTypeId: service._id,
           managerId: lastEng.managerId,
           period,
           status: EngagementStatus.ACTIVE
         });
         await engagement.save({ session });

         const templates = await TaskTemplate.find({ serviceTypeId: service._id }).sort({ orderIndex: 1 }).session(session);
         const tasksToCreate = templates.map((tpl) => ({
           engagementId: engagement._id,
           templateId: tpl._id,
           name: tpl.name,
           status: 'Not Started',
         }));

         if (tasksToCreate.length > 0) {
           await Task.insertMany(tasksToCreate, { session });
         }

         await AuditLog.create([{
           entityId: engagement._id,
           entityType: 'Engagement',
           action: 'RECURRING_AUTO_GENERATED',
           changedBy: lastEng.managerId,
         }], { session });

         await session.commitTransaction();
         console.log(`Successfully generated recurring engagement for client ${clientId} service ${service._id}`);
       } catch (error: any) {
         await session.abortTransaction();
         if (error.code === 11000) {
           // Skip silently on duplicate key error (Idempotency)
           console.log(`Duplicate recurring engagement skipped for client ${clientId} service ${service._id} period ${period}`);
         } else {
           console.error('Error generating recurring engagement:', error);
         }
       } finally {
         session.endSession();
       }
    }
  }
};
