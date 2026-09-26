import { Router } from 'express';
import { getTasks, updateTask } from '../controllers/task.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', getTasks);
router.patch('/:id', updateTask);

export default router;
