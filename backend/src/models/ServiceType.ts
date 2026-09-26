import mongoose, { Schema, Document } from 'mongoose';

export enum RecurrenceFrequency {
  NONE = 'None',
  MONTHLY = 'Monthly',
  YEARLY = 'Yearly',
}

export interface IServiceType extends Document {
  name: string;
  description?: string;
  isRecurring: boolean;
  recurrenceFrequency: RecurrenceFrequency;
}

const ServiceTypeSchema: Schema = new Schema({
  name: { type: String, required: true },
  description: { type: String, trim: true },
  isRecurring: { type: Boolean, default: false },
  recurrenceFrequency: { type: String, enum: Object.values(RecurrenceFrequency), default: RecurrenceFrequency.NONE },
}, { timestamps: true });

export default mongoose.model<IServiceType>('ServiceType', ServiceTypeSchema);
