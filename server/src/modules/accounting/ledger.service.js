const prisma = require('../../lib/prisma');
const { Decimal } = require('@prisma/client/runtime/library');

/**
 * Records a balanced double-entry journal transaction.
 * @param {string} organizationId - The tenant ID
 * @param {string} description - Reason for the transaction
 * @param {Array} lines - Array of { accountId, debit, credit }
 * @param {string} reference - Optional external reference (e.g., Invoice ID)
 * @param {string} currency - Optional transaction currency (defaults to org base currency)
 * @param {number|string|Decimal} exchangeRate - Exchange rate relative to organization base currency
 */
const recordTransaction = async (organizationId, description, lines, reference = null, currency = null, exchangeRate = 1.0) => {
    // 1. Fetch organization base currency
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { currency: true }
    });
    const baseCurrency = org?.currency || 'USD';
    const txCurrency = (currency || baseCurrency).toUpperCase();
    const rate = new Decimal(exchangeRate || 1.0);

    // 2. Calculate totals to enforce Debits = Credits
    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);

    for (const line of lines) {
        totalDebit = totalDebit.plus(line.debit || 0);
        totalCredit = totalCredit.plus(line.credit || 0);
    }

    if (!totalDebit.equals(totalCredit)) {
        throw new Error(`Transaction unbalanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
    }

    if (totalDebit.isZero()) {
        throw new Error('Transaction must have a non-zero value.');
    }

    // 3. Execute as a strictly isolated database transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create the immutable journal entry with currency tracking
        const entry = await tx.journalEntry.create({
            data: {
                organizationId,
                description,
                reference,
                currency: txCurrency,
                exchangeRate: rate,
                lines: {
                    create: lines.map(line => ({
                        accountId: line.accountId,
                        debit: line.debit || 0,
                        credit: line.credit || 0,
                        currency: txCurrency,
                        exchangeRate: rate
                    }))
                }
            },
            include: { lines: true }
        });

        // 4. Update cached balances on the individual accounts safely (converted to base currency if foreign)
        for (const line of lines) {
            const account = await tx.account.findUnique({ where: { id: line.accountId } });
            if (!account || account.organizationId !== organizationId) {
                throw new Error(`Account ${line.accountId} not found or belongs to another tenant.`);
            }

            // Normal balances: Assets & Expenses go UP with Debits. Liabilities, Equity, Revenue go UP with Credits.
            let balanceChange = new Decimal(line.debit || 0).minus(line.credit || 0);
            
            // If cross-currency, convert transaction amounts into base currency for the account balance
            if (txCurrency !== baseCurrency && !rate.equals(1)) {
                balanceChange = balanceChange.mul(rate);
            }

            if (['LIABILITY', 'EQUITY', 'REVENUE'].includes(account.type)) {
                balanceChange = balanceChange.negated();
            }

            await tx.account.update({
                where: { id: line.accountId },
                data: {
                    balance: { increment: balanceChange }
                }
            });
        }

        return entry;
    });

    return result;
};

const getTrialBalance = async (organizationId) => {
    const [org, accounts] = await Promise.all([
        prisma.organization.findUnique({
            where: { id: organizationId },
            select: { currency: true }
        }),
        prisma.account.findMany({
            where: { organizationId },
            select: { code: true, name: true, type: true, balance: true },
            orderBy: { code: 'asc' }
        })
    ]);

    const baseCurrency = org?.currency || 'USD';

    let totalDebits = new Decimal(0);
    let totalCredits = new Decimal(0);

    const report = accounts.map(acc => {
        const isDebitNormal = ['ASSET', 'EXPENSE'].includes(acc.type);
        if (isDebitNormal) {
            totalDebits = totalDebits.plus(acc.balance);
            return { ...acc, debit: acc.balance, credit: new Decimal(0) };
        } else {
            totalCredits = totalCredits.plus(acc.balance);
            return { ...acc, debit: new Decimal(0), credit: acc.balance };
        }
    });

    return {
        currency: baseCurrency,
        accounts: report,
        isBalanced: totalDebits.equals(totalCredits),
        totalDebits,
        totalCredits
    };
};

/**
 * Fetches recent journal entries and their associated lines for the tenant.
 */
const getJournalEntries = async (organizationId, limit = 10) => {
    return await prisma.journalEntry.findMany({
        where: { organizationId },
        include: {
            lines: {
                include: {
                    account: {
                        select: { code: true, name: true, type: true }
                    }
                }
            }
        },
        orderBy: { date: 'desc' },
        take: parseInt(limit, 10)
    });
};

module.exports = {
    recordTransaction,
    getTrialBalance,
    getJournalEntries // <-- Add to exports
};