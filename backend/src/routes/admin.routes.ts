import { Router } from 'express';
import { 
  createUser, getUsers, updateUser, deleteUser,
  createClient, getClients, updateClient, deleteClient,
  createServiceType, getServiceTypes, 
  createTaskTemplate, getTaskTemplates 
} from '../controllers/admin.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { UserRole } from '../models/User';

const router = Router();
router.use(authenticate);
// We apply requireRole per route now
// router.use(requireRole([UserRole.ADMIN]));

router.post('/users', requireRole([UserRole.ADMIN]), createUser);
router.get('/users', requireRole([UserRole.ADMIN, UserRole.MANAGER]), getUsers);
router.patch('/users/:id', requireRole([UserRole.ADMIN]), updateUser);
router.delete('/users/:id', requireRole([UserRole.ADMIN]), deleteUser);

router.post('/clients', requireRole([UserRole.ADMIN]), createClient);
router.get('/clients', requireRole([UserRole.ADMIN, UserRole.MANAGER]), getClients);
router.patch('/clients/:id', requireRole([UserRole.ADMIN]), updateClient);
router.delete('/clients/:id', requireRole([UserRole.ADMIN]), deleteClient);

router.post('/service-types', requireRole([UserRole.ADMIN]), createServiceType);
router.get('/service-types', requireRole([UserRole.ADMIN, UserRole.MANAGER]), getServiceTypes);

router.post('/templates', requireRole([UserRole.ADMIN]), createTaskTemplate);
router.get('/templates', requireRole([UserRole.ADMIN, UserRole.MANAGER]), getTaskTemplates);

export default router;
