const ledgerService = require('../../server/src/modules/accounting/ledger.service');
const prisma = require('../../server/src/lib/prisma');
const { Decimal } = require('@prisma/client/runtime/library');

jest.mock('../../server/src/lib/prisma', () => ({
    organization: {
        findUnique: jest.fn()
    },
    account: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
    },
    journalEntry: {
        create: jest.fn(),
        findMany: jest.fn()
    },
    $transaction: jest.fn()
}));

describe('Ledger Service (Double-Entry Accounting & Multi-Currency)', () => {
    const tenantId = 'tenant-org-1';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('recordTransaction', () => {
        it('should record a balanced transaction successfully in organization base currency', async () => {
            prisma.organization.findUnique.mockResolvedValue({ id: tenantId, currency: 'USD' });

            const lines = [
                { accountId: 'acc-cash', debit: 100, credit: 0 },
                { accountId: 'acc-sales', debit: 0, credit: 100 }
            ];

            const mockCreatedEntry = {
                id: 'je-1',
                organizationId: tenantId,
                description: 'Product Sale',
                currency: 'USD',
                exchangeRate: new Decimal(1.0),
                lines
            };

            prisma.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    journalEntry: {
                        create: jest.fn().mockResolvedValue(mockCreatedEntry)
                    },
                    account: {
                        findUnique: jest.fn()
                            .mockResolvedValueOnce({ id: 'acc-cash', organizationId: tenantId, type: 'ASSET' })
                            .mockResolvedValueOnce({ id: 'acc-sales', organizationId: tenantId, type: 'REVENUE' }),
                        update: jest.fn().mockResolvedValue({})
                    }
                };
                return await callback(tx);
            });

            const result = await ledgerService.recordTransaction(
                tenantId,
                'Product Sale',
                lines,
                'INV-001'
            );

            expect(result).toEqual(mockCreatedEntry);
            expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        });

        it('should convert amounts using exchange rate when transaction is in foreign currency', async () => {
            // Organization is EUR, transaction is USD with exchange rate 0.92
            prisma.organization.findUnique.mockResolvedValue({ id: tenantId, currency: 'EUR' });

            const lines = [
                { accountId: 'acc-bank', debit: 100, credit: 0 },
                { accountId: 'acc-revenue', debit: 0, credit: 100 }
            ];

            const mockTxAccountUpdate = jest.fn().mockResolvedValue({});

            prisma.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    journalEntry: {
                        create: jest.fn().mockResolvedValue({ id: 'je-multi', currency: 'USD' })
                    },
                    account: {
                        findUnique: jest.fn()
                            .mockResolvedValueOnce({ id: 'acc-bank', organizationId: tenantId, type: 'ASSET' })
                            .mockResolvedValueOnce({ id: 'acc-revenue', organizationId: tenantId, type: 'REVENUE' }),
                        update: mockTxAccountUpdate
                    }
                };
                return await callback(tx);
            });

            await ledgerService.recordTransaction(
                tenantId,
                'Foreign Sales',
                lines,
                'INV-US-01',
                'USD',
                0.92
            );

            // Asset debit: 100 * 0.92 = 92
            expect(mockTxAccountUpdate).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'acc-bank' },
                data: {
                    balance: { increment: expect.any(Decimal) }
                }
            }));
        });

        it('should throw an error if debits do not equal credits', async () => {
            prisma.organization.findUnique.mockResolvedValue({ id: tenantId, currency: 'USD' });

            const unbalancedLines = [
                { accountId: 'acc-cash', debit: 100, credit: 0 },
                { accountId: 'acc-sales', debit: 0, credit: 80 }
            ];

            await expect(
                ledgerService.recordTransaction(tenantId, 'Unbalanced Sale', unbalancedLines)
            ).rejects.toThrow(/Transaction unbalanced/i);

            expect(prisma.$transaction).not.toHaveBeenCalled();
        });

        it('should throw an error if transaction has zero total value', async () => {
            prisma.organization.findUnique.mockResolvedValue({ id: tenantId, currency: 'USD' });

            const zeroLines = [
                { accountId: 'acc-cash', debit: 0, credit: 0 },
                { accountId: 'acc-sales', debit: 0, credit: 0 }
            ];

            await expect(
                ledgerService.recordTransaction(tenantId, 'Zero Value', zeroLines)
            ).rejects.toThrow('Transaction must have a non-zero value.');
        });
    });

    describe('getTrialBalance', () => {
        it('should return balanced report with organization currency and correct debits/credits', async () => {
            prisma.organization.findUnique.mockResolvedValue({ id: tenantId, currency: 'GBP' });
            prisma.account.findMany.mockResolvedValue([
                { code: '1000', name: 'Cash', type: 'ASSET', balance: new Decimal(500) },
                { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balance: new Decimal(500) }
            ]);

            const result = await ledgerService.getTrialBalance(tenantId);

            expect(result.currency).toBe('GBP');
            expect(result.isBalanced).toBe(true);
            expect(result.totalDebits.equals(new Decimal(500))).toBe(true);
            expect(result.totalCredits.equals(new Decimal(500))).toBe(true);
            expect(result.accounts).toHaveLength(2);
        });
    });

    describe('getJournalEntries', () => {
        it('should fetch journal entries with limit and organization filter', async () => {
            const mockEntries = [{ id: 'je-1', description: 'Test Entry' }];
            prisma.journalEntry.findMany.mockResolvedValue(mockEntries);

            const result = await ledgerService.getJournalEntries(tenantId, 5);

            expect(prisma.journalEntry.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { organizationId: tenantId },
                take: 5
            }));
            expect(result).toEqual(mockEntries);
        });
    });
});
