import mongoose, { Schema, Document } from 'mongoose';

export interface IClient extends Document {
  name: string;
  industry?: string;
  contactEmail?: string;
  isActive: boolean;
}

const ClientSchema: Schema = new Schema({
  name: { type: String, required: true, index: true },
  industry: { type: String },
  contactEmail: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IClient>('Client', ClientSchema);
