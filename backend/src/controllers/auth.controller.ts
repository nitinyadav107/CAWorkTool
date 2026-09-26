import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { z } from 'zod';
import { getJwtSecret } from '../config/jwt';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.isActive === false) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, getJwtSecret(), { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    next(error);
  }
};
