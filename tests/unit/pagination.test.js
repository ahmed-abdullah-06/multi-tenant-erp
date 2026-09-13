const { getPagination, formatPaginatedResult } = require('../../server/src/utils/pagination');

describe('Pagination Utility', () => {
    describe('getPagination', () => {
        it('should return default values when no query parameters are provided', () => {
            const result = getPagination({});
            expect(result).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
        });

        it('should correctly calculate skip based on page and limit', () => {
            const result = getPagination({ page: '3', limit: '10' });
            expect(result).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
        });

        it('should cap the limit at the maximum allowed value', () => {
            const result = getPagination({ page: '1', limit: '500' }, 20, 100);
            expect(result.limit).toBe(100);
            expect(result.take).toBe(100);
        });
    });

    describe('formatPaginatedResult', () => {
        it('should format the response payload correctly', () => {
            const data = [{ id: 1 }, { id: 2 }];
            const pagination = { page: 2, limit: 2, skip: 2, take: 2 };
            const totalCount = 5;

            const result = formatPaginatedResult(data, totalCount, pagination);

            expect(result.data).toEqual(data);
            expect(result.pagination.currentPage).toBe(2);
            expect(result.pagination.pageSize).toBe(2);
            expect(result.pagination.totalRecords).toBe(5);
            expect(result.pagination.totalPages).toBe(3);
            expect(result.pagination.hasNextPage).toBe(true);
            expect(result.pagination.hasPreviousPage).toBe(true);
        });
    });
});