import Engagement from '../models/Engagement';

describe('Engagement recurring constraints', () => {
  it('declares a unique client/service/period index only for string periods', () => {
    const recurringIndex = Engagement.schema.indexes().find(([keys]) =>
      Object.keys(keys).join(',') === 'clientId,serviceTypeId,period'
    );

    expect(recurringIndex).toBeDefined();
    expect(recurringIndex?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { period: { $type: 'string' } },
    });
  });
});
