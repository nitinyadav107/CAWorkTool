import mongoose, { Schema, Document } from 'mongoose';

export enum EngagementStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface IEngagement extends Document {
  clientId: mongoose.Types.ObjectId;
  serviceTypeId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  period: string | null; // e.g. "2023-10" for monthly, null for one-time
  status: EngagementStatus;
}

const EngagementSchema: Schema = new Schema({
  clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
  serviceTypeId: { type: Schema.Types.ObjectId, ref: 'ServiceType', required: true },
  managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  period: { type: String, default: null },
  status: { type: String, enum: Object.values(EngagementStatus), default: EngagementStatus.ACTIVE },
}, { timestamps: true });

// Compound unique partial index to prevent duplicate recurring engagements
// but allow multiple one-time engagements (where period is null)
EngagementSchema.index(
  { clientId: 1, serviceTypeId: 1, period: 1 },
  // $type is supported by MongoDB partial indexes; $ne is not.
  // One-time engagements use a null period and are excluded from this index.
  { unique: true, partialFilterExpression: { period: { $type: 'string' } } }
);

export default mongoose.model<IEngagement>('Engagement', EngagementSchema);
