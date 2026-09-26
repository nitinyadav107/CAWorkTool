import mongoose, { Schema, Document } from 'mongoose';

export enum TaskStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  WAITING_FOR_CLIENT = 'Waiting for Client',
  READY_FOR_REVIEW = 'Ready for Review',
  CHANGES_REQUESTED = 'Changes Requested',
  COMPLETED = 'Completed',
}

export interface ITask extends Document {
  engagementId: mongoose.Types.ObjectId;
  templateId?: mongoose.Types.ObjectId;
  assigneeId?: mongoose.Types.ObjectId;
  reviewedById?: mongoose.Types.ObjectId;
  name: string;
  status: TaskStatus;
  dueDate?: Date;
}

const TaskSchema: Schema = new Schema({
  engagementId: { type: Schema.Types.ObjectId, ref: 'Engagement', required: true, index: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'TaskTemplate' },
  assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedById: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.NOT_STARTED },
  dueDate: { type: Date, index: true },
}, { timestamps: true });

// Compound index for dashboard queries
TaskSchema.index({ assigneeId: 1, status: 1, dueDate: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);
