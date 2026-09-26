import mongoose, { Schema, Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  TEAM_MEMBER = 'TeamMember',
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: Object.values(UserRole), default: UserRole.TEAM_MEMBER },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
