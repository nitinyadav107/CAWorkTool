import mongoose, { Schema, Document } from 'mongoose';

export interface ITaskTemplate extends Document {
  serviceTypeId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  orderIndex: number;
}

const TaskTemplateSchema: Schema = new Schema({
  serviceTypeId: { type: Schema.Types.ObjectId, ref: 'ServiceType', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  orderIndex: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model<ITaskTemplate>('TaskTemplate', TaskTemplateSchema);
