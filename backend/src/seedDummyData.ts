import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User, { UserRole } from './models/User';
import Client from './models/Client';
import ServiceType, { RecurrenceFrequency } from './models/ServiceType';
import TaskTemplate from './models/TaskTemplate';
import Engagement, { EngagementStatus } from './models/Engagement';
import Task, { TaskStatus } from './models/Task';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca-work-tool');
    console.log('Connected to MongoDB. Wiping existing data...');

    await User.deleteMany({});
    await Client.deleteMany({});
    await ServiceType.deleteMany({});
    await TaskTemplate.deleteMany({});
    await Engagement.deleteMany({});
    await Task.deleteMany({});

    console.log('Creating Users...');
    const passwordHash = await bcrypt.hash('password123', 10);

    const admin = await User.create({ name: 'Admin (Partner)', email: 'admin@example.com', passwordHash, role: UserRole.ADMIN });
    const mgr1 = await User.create({ name: 'Ravi (Tax Manager)', email: 'ravi@example.com', passwordHash, role: UserRole.MANAGER });
    const mgr2 = await User.create({ name: 'Priya (Audit Manager)', email: 'priya@example.com', passwordHash, role: UserRole.MANAGER });
    
    const tm1 = await User.create({ name: 'Amit (Article Assistant)', email: 'amit@example.com', passwordHash, role: UserRole.TEAM_MEMBER });
    const tm2 = await User.create({ name: 'Sneha (Junior Accountant)', email: 'sneha@example.com', passwordHash, role: UserRole.TEAM_MEMBER });
    const tm3 = await User.create({ name: 'Rahul (GST Executive)', email: 'rahul@example.com', passwordHash, role: UserRole.TEAM_MEMBER });
    const tm4 = await User.create({ name: 'Kavita (Audit Executive)', email: 'kavita@example.com', passwordHash, role: UserRole.TEAM_MEMBER });

    console.log('Creating Realistic CA Clients...');
    const clients = await Client.insertMany([
      { name: 'Reliance Industries Ltd', contactEmail: 'finance@ril.com', industry: 'Conglomerate' },
      { name: 'TechNova Startup Pvt Ltd', contactEmail: 'founder@technova.in', industry: 'IT/Software' },
      { name: 'Sharma Sweets & Bakers', contactEmail: 'sharma.sweets@gmail.com', industry: 'Food & Beverage' },
      { name: 'Dr. Batra Clinic', contactEmail: 'accounts@batraclinic.com', industry: 'Healthcare' },
      { name: 'Apex Builders & Developers', contactEmail: 'tax@apexbuilders.com', industry: 'Real Estate' }
    ]);

    console.log('Creating CA Service Types...');
    const srvITR = await ServiceType.create({ name: 'Income Tax Return (ITR) Filing', isRecurring: true, recurrenceFrequency: RecurrenceFrequency.YEARLY });
    const srvGSTMonthly = await ServiceType.create({ name: 'Monthly GST Return (GSTR-1 & 3B)', isRecurring: true, recurrenceFrequency: RecurrenceFrequency.MONTHLY });
    const srvTaxAudit = await ServiceType.create({ name: 'Tax Audit u/s 44AB', isRecurring: true, recurrenceFrequency: RecurrenceFrequency.YEARLY });
    const srvCompanyReg = await ServiceType.create({ name: 'Company Incorporation (Pvt Ltd)', isRecurring: false, recurrenceFrequency: RecurrenceFrequency.NONE });
    const srvGSTReg = await ServiceType.create({ name: 'GST Registration', isRecurring: false, recurrenceFrequency: RecurrenceFrequency.NONE });

    console.log('Creating Task Templates for Services...');
    const templates = await TaskTemplate.insertMany([
      // ITR Filing Tasks
      { serviceTypeId: srvITR._id as any, name: 'Request Form 16 & Bank Statements', orderIndex: 1 },
      { serviceTypeId: srvITR._id as any, name: 'Compute Total Income & Tax Liability', orderIndex: 2 },
      { serviceTypeId: srvITR._id as any, name: 'Client Approval on Tax Computation', orderIndex: 3 },
      { serviceTypeId: srvITR._id as any, name: 'File ITR on Income Tax Portal', orderIndex: 4 },
      { serviceTypeId: srvITR._id as any, name: 'Send ITR-V Acknowledgment to Client', orderIndex: 5 },
      
      // Monthly GST Tasks
      { serviceTypeId: srvGSTMonthly._id as any, name: 'Request Sales & Purchase Invoices', orderIndex: 1 },
      { serviceTypeId: srvGSTMonthly._id as any, name: 'Reconcile GSTR-2B with Purchase Register', orderIndex: 2 },
      { serviceTypeId: srvGSTMonthly._id as any, name: 'File GSTR-1 (Outward Supplies)', orderIndex: 3 },
      { serviceTypeId: srvGSTMonthly._id as any, name: 'File GSTR-3B & Pay Tax Challan', orderIndex: 4 },
      
      // Tax Audit Tasks
      { serviceTypeId: srvTaxAudit._id as any, name: 'Collect Final Trial Balance & Books', orderIndex: 1 },
      { serviceTypeId: srvTaxAudit._id as any, name: 'Vouching and Ledger Scrutiny', orderIndex: 2 },
      { serviceTypeId: srvTaxAudit._id as any, name: 'Draft Form 3CB-3CD', orderIndex: 3 },
      { serviceTypeId: srvTaxAudit._id as any, name: 'Partner Review & Sign-off', orderIndex: 4 },
      { serviceTypeId: srvTaxAudit._id as any, name: 'Upload Audit Report on Portal', orderIndex: 5 },

      // Company Incorporation Tasks
      { serviceTypeId: srvCompanyReg._id as any, name: 'Collect KYC (PAN, Aadhar, Photos) of Directors', orderIndex: 1 },
      { serviceTypeId: srvCompanyReg._id as any, name: 'Apply for RUN (Name Approval)', orderIndex: 2 },
      { serviceTypeId: srvCompanyReg._id as any, name: 'Draft MOA, AOA & INC-9', orderIndex: 3 },
      { serviceTypeId: srvCompanyReg._id as any, name: 'File SPICe+ Form with MCA', orderIndex: 4 },
      { serviceTypeId: srvCompanyReg._id as any, name: 'Handover Certificate of Incorporation (COI)', orderIndex: 5 },

      // GST Registration Tasks
      { serviceTypeId: srvGSTReg._id as any, name: 'Collect Rent Agreement, Electricity Bill, PAN', orderIndex: 1 },
      { serviceTypeId: srvGSTReg._id as any, name: 'Submit Application on GST Portal', orderIndex: 2 },
      { serviceTypeId: srvGSTReg._id as any, name: 'Follow up for ARN & Clarifications', orderIndex: 3 }
    ]);

    console.log('Creating Engagements & Tasks...');
    const getTM = () => [tm1._id, tm2._id, tm3._id, tm4._id][Math.floor(Math.random() * 4)];
    const getStatus = () => {
      const statuses = [
        TaskStatus.NOT_STARTED, 
        TaskStatus.IN_PROGRESS, 
        TaskStatus.WAITING_FOR_CLIENT, 
        TaskStatus.READY_FOR_REVIEW, 
        TaskStatus.COMPLETED
      ];
      return statuses[Math.floor(Math.random() * statuses.length)];
    };

    let taskCount = 0;

    // Create Monthly GST for all clients for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    for (const client of clients) {
      const engGST = await Engagement.create({
        clientId: client._id,
        serviceTypeId: srvGSTMonthly._id,
        managerId: mgr1._id, // Ravi (Tax Manager)
        status: EngagementStatus.ACTIVE,
        period: currentMonth,
      });

      for (const t of templates.filter(t => t.serviceTypeId.toString() === (srvGSTMonthly._id as any).toString())) {
        await Task.create({
          engagementId: engGST._id,
          templateId: t._id as any,
          assigneeId: getTM(),
          name: t.name,
          status: getStatus(),
          dueDate: new Date(Date.now() + (Math.random() * 10) * 24 * 60 * 60 * 1000), // random due date within 10 days
        });
        taskCount++;
      }
    }

    // Create Company Registration for the Startup
    const startupClient = clients.find(c => c.name === 'TechNova Startup Pvt Ltd');
    if (startupClient) {
      const engReg = await Engagement.create({
        clientId: startupClient._id,
        serviceTypeId: srvCompanyReg._id,
        managerId: mgr2._id, // Priya (Audit Manager)
        status: EngagementStatus.ACTIVE,
        period: null, // one-time
      });
      for (const t of templates.filter(t => t.serviceTypeId.toString() === (srvCompanyReg._id as any).toString())) {
        await Task.create({
          engagementId: engReg._id,
          templateId: t._id as any,
          assigneeId: getTM(),
          name: t.name,
          status: getStatus(),
          dueDate: new Date(Date.now() + (Math.random() * 5) * 24 * 60 * 60 * 1000),
        });
        taskCount++;
      }
    }

    // Create Tax Audit for Reliance
    const relClient = clients.find(c => c.name === 'Reliance Industries Ltd');
    if (relClient) {
      const engAudit = await Engagement.create({
        clientId: relClient._id,
        serviceTypeId: srvTaxAudit._id,
        managerId: mgr2._id,
        status: EngagementStatus.ACTIVE,
        period: new Date().getFullYear().toString(), // YYYY
      });
      for (const t of templates.filter(t => t.serviceTypeId.toString() === (srvTaxAudit._id as any).toString())) {
        await Task.create({
          engagementId: engAudit._id,
          templateId: t._id as any,
          assigneeId: getTM(),
          name: t.name,
          status: getStatus(),
          dueDate: new Date(Date.now() + (Math.random() * 30) * 24 * 60 * 60 * 1000),
        });
        taskCount++;
      }
    }

    console.log(`Successfully generated ${taskCount} realistic tasks!`);
    console.log('✅ Real World CA Data seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed real world CA data:', err);
    process.exit(1);
  }
};

seed();
