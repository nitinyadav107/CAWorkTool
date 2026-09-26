import { Router } from 'express';
import { createEngagement, getEngagements, updateEngagement } from '../controllers/engagement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole as checkRole } from '../middlewares/role.middleware';

const router = Router();
router.use(authenticate);

// Only Admins and Managers can create engagements
router.post('/', checkRole(['Admin', 'Manager']), createEngagement);
router.get('/', checkRole(['Admin', 'Manager']), getEngagements);
router.patch('/:id', checkRole(['Admin', 'Manager']), updateEngagement);

export default router;
