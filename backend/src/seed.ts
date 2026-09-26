import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca-work-tool');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await User.findOneAndUpdate(
      { email: 'admin@example.com' },
      { name: 'Admin User', email: 'admin@example.com', passwordHash, role: 'Admin' },
      { upsert: true, returnDocument: 'after' }
    );
    
    console.log('Successfully seeded admin@example.com');
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
};

seed();
