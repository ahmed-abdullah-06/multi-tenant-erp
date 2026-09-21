const prisma = require('../../lib/prisma');
const { Decimal } = require('@prisma/client/runtime/library');

/**
 * Records a balanced double-entry journal transaction.
 * @param {string} organizationId - The tenant ID
 * @param {string} description - Reason for the transaction
 * @param {Array} lines - Array of { accountId, debit, credit }
 * @param {string} reference - Optional external reference (e.g., Invoice ID)
 */
const recordTransaction = async (organizationId, description, lines, reference = null) => {
    // 1. Calculate totals to enforce Debits = Credits
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

    // 2. Execute as a strictly isolated database transaction
    const result = await prisma.$transaction(async (tx) => {
        // Create the immutable journal entry
        const entry = await tx.journalEntry.create({
            data: {
                organizationId,
                description,
                reference,
                lines: {
                    create: lines.map(line => ({
                        accountId: line.accountId,
                        debit: line.debit || 0,
                        credit: line.credit || 0
                    }))
                }
            },
            include: { lines: true }
        });

        // 3. Update cached balances on the individual accounts safely
        for (const line of lines) {
            const account = await tx.account.findUnique({ where: { id: line.accountId } });
            if (!account || account.organizationId !== organizationId) {
                throw new Error(`Account ${line.accountId} not found or belongs to another tenant.`);
            }

            // Normal balances: Assets & Expenses go UP with Debits. Liabilities, Equity, Revenue go UP with Credits.
            let balanceChange = new Decimal(line.debit || 0).minus(line.credit || 0);
            
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
    const accounts = await prisma.account.findMany({
        where: { organizationId },
        select: { code: true, name: true, type: true, balance: true },
        orderBy: { code: 'asc' }
    });

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
        accounts: report,
        isBalanced: totalDebits.equals(totalCredits),
        totalDebits,
        totalCredits
    };
};

module.exports = {
    recordTransaction,
    getTrialBalance
};