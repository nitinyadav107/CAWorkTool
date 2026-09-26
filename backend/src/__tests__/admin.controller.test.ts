import { deleteClient } from '../controllers/admin.controller';
import Client from '../models/Client';
import Engagement from '../models/Engagement';

jest.mock('../models/Client');
jest.mock('../models/Engagement');

describe('Admin client management', () => {
  it('prevents deleting a client that still has engagements', async () => {
    const req: any = { params: { id: '0123456789abcdef01234567' }, user: { id: 'admin1', role: 'Admin' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn(), send: jest.fn() };
    const next = jest.fn();
    (Engagement.exists as jest.Mock).mockResolvedValue({ _id: 'eng1' });

    await deleteClient(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'A client with engagements cannot be deleted' });
    expect(Client.findByIdAndDelete).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
