import { Request, Response, NextFunction } from 'express';
import User, { UserRole } from '../models/User';
import Client from '../models/Client';
import ServiceType from '../models/ServiceType';
import TaskTemplate from '../models/TaskTemplate';
import { RecurrenceFrequency } from '../models/ServiceType';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import Engagement from '../models/Engagement';
import Task from '../models/Task';
import { AuthRequest } from '../middlewares/auth.middleware';

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(['Admin', 'Manager', 'TeamMember']),
});

const createClientSchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  industry: z.string().trim().max(120).optional(),
});

const createServiceTypeSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.nativeEnum(RecurrenceFrequency).default(RecurrenceFrequency.NONE),
}).refine(data => data.isRecurring === (data.recurrenceFrequency !== RecurrenceFrequency.NONE), {
  message: 'Choose Monthly or Yearly for recurring services, and None for one-time services',
});

const createTaskTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).optional(),
  serviceTypeId: z.string().regex(/^[0-9a-fA-F]{24}$/),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().transform(value => value.toLowerCase()).optional(),
  password: z.string().min(8).max(128).optional(),
  role: z.nativeEnum(UserRole).optional(),
}).refine(data => Object.keys(data).length > 0, 'Provide at least one user field to update');

const updateClientSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  contactEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  industry: z.string().trim().max(120).optional(),
}).refine(data => Object.keys(data).length > 0, 'Provide at least one client field to update');

const parseId = (id: string | string[]) => Array.isArray(id) ? id[0] : id;
const validId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Basic CRUD for Users
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = createUserSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ name, email, passwordHash, role });
    await user.save();
    res.status(201).json({ message: 'User created', userId: user._id });
  } catch (error) { next(error); }
};

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.find({}, '-passwordHash');
    res.json(users);
  } catch (error) { next(error); }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!validId(id)) return res.status(400).json({ message: 'Invalid user ID' });
    const updates = updateUserSchema.parse(req.body);
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (updates.role && updates.role !== user.role) {
      if (updates.role !== 'TeamMember' && await Task.exists({ assigneeId: user._id })) {
        return res.status(409).json({ message: 'Reassign this user’s tasks before changing their role' });
      }
      if (updates.role !== 'Manager' && await Engagement.exists({ managerId: user._id })) {
        return res.status(409).json({ message: 'Reassign this user’s engagements before changing their role' });
      }
      if (user.role === UserRole.ADMIN && updates.role !== UserRole.ADMIN && await User.countDocuments({ role: UserRole.ADMIN }) <= 1) {
        return res.status(409).json({ message: 'The last admin cannot be demoted' });
      }
    }

    if (updates.name !== undefined) user.name = updates.name;
    if (updates.email !== undefined) user.email = updates.email;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.password !== undefined) user.passwordHash = await bcrypt.hash(updates.password, 10);
    await user.save();
    res.json({ message: 'User updated', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) { next(error); }
};

export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!validId(id)) return res.status(400).json({ message: 'Invalid user ID' });
    if (id === req.user!.id) return res.status(400).json({ message: 'You cannot delete your own account' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === UserRole.ADMIN && await User.countDocuments({ role: UserRole.ADMIN }) <= 1) {
      return res.status(409).json({ message: 'The last admin cannot be deleted' });
    }
    const [hasTasks, hasEngagements] = await Promise.all([
      Task.exists({ $or: [{ assigneeId: user._id }, { reviewedById: user._id }] }),
      Engagement.exists({ managerId: user._id }),
    ]);
    if (hasTasks || hasEngagements) {
      return res.status(409).json({ message: 'Reassign this user’s tasks and engagements before deleting the account' });
    }
    await user.deleteOne();
    res.status(204).send();
  } catch (error) { next(error); }
};

// Basic CRUD for Clients
export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const client = new Client(createClientSchema.parse(req.body));
    await client.save();
    res.status(201).json({ message: 'Client created', clientId: client._id });
  } catch (error) { next(error); }
};

export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clients = await Client.find();
    res.json(clients);
  } catch (error) { next(error); }
};

export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!validId(id)) return res.status(400).json({ message: 'Invalid client ID' });
    const updates = updateClientSchema.parse(req.body);
    const client = await Client.findByIdAndUpdate(id, updates, { returnDocument: 'after', runValidators: true });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client updated', client });
  } catch (error) { next(error); }
};

export const deleteClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!validId(id)) return res.status(400).json({ message: 'Invalid client ID' });
    if (await Engagement.exists({ clientId: id })) {
      return res.status(409).json({ message: 'A client with engagements cannot be deleted' });
    }
    const client = await Client.findByIdAndDelete(id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.status(204).send();
  } catch (error) { next(error); }
};

// Basic CRUD for Service Types
export const createServiceType = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceType = new ServiceType(createServiceTypeSchema.parse(req.body));
    await serviceType.save();
    res.status(201).json({ message: 'Service Type created', serviceTypeId: serviceType._id });
  } catch (error) { next(error); }
};

export const getServiceTypes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceTypes = await ServiceType.find();
    res.json(serviceTypes);
  } catch (error) { next(error); }
};

// Basic CRUD for Task Templates
export const createTaskTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createTaskTemplateSchema.parse(req.body);
    if (!await ServiceType.exists({ _id: data.serviceTypeId })) {
      return res.status(400).json({ message: 'Service type not found' });
    }
    const taskTemplate = new TaskTemplate(data);
    await taskTemplate.save();
    res.status(201).json({ message: 'Task Template created', templateId: taskTemplate._id });
  } catch (error) { next(error); }
};

export const getTaskTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templates = await TaskTemplate.find();
    res.json(templates);
  } catch (error) { next(error); }
};
