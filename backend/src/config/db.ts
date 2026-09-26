import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Engagement from '../models/Engagement';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca-work-tool', {
      family: 4
    });
    // Ensure critical unique constraints exist even when autoIndex is disabled in production.
    await Engagement.createIndexes();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error}`);
    process.exit(1);
  }
};

export default connectDB;
