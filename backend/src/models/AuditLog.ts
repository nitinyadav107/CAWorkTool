import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  entityId: mongoose.Types.ObjectId;
  entityType: 'Task' | 'Engagement';
  action: string;
  changedBy: mongoose.Types.ObjectId;
  details?: string;
}

const AuditLogSchema: Schema = new Schema({
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  entityType: { type: String, enum: ['Task', 'Engagement'], required: true },
  action: { type: String, required: true },
  changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: String },
}, { timestamps: true });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
