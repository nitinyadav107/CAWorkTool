import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes';
import engagementRoutes from './routes/engagement.routes';
import taskRoutes from './routes/task.routes';
import dashboardRoutes from './routes/dashboard.routes';
import adminRoutes from './routes/admin.routes';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/engagements', engagementRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Task & Engagement Management API is running' });
});

app.use(errorHandler);

export default app;
