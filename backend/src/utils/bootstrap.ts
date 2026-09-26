import bcrypt from 'bcryptjs';
import User, { UserRole } from '../models/User';

export const bootstrapAdmin = async () => {
  try {
    const adminCount = await User.countDocuments({ role: UserRole.ADMIN });
    if (adminCount === 0) {
      console.log('No Admin user found in the database. Bootstrapping default admin...');
      const passwordHash = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Super Admin',
        email: 'admin@example.com',
        passwordHash,
        role: UserRole.ADMIN
      });
      console.log('✅ Default Admin created successfully: admin@example.com / password123');
    }
  } catch (error) {
    console.error('Error bootstrapping admin user:', error);
  }
};
