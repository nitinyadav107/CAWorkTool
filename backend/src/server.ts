import app from './app';
import connectDB from './config/db';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { generateRecurringEngagements } from './services/cron.service';
import { getJwtSecret } from './config/jwt';
import { bootstrapAdmin } from './utils/bootstrap';

dotenv.config();

const PORT = process.env.PORT || 5000;

getJwtSecret();

connectDB().then(async () => {
  await bootstrapAdmin();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    
    // Schedule recurring engagements generator to run daily at midnight
    cron.schedule('0 0 * * *', () => {
      console.log('Running recurring engagements cron job...');
      generateRecurringEngagements();
    });
  });
});
