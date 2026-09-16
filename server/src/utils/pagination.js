const getPagination = (query, defaultLimit = 20, maxLimit = 100) => {
    let page = parseInt(query.page, 10);
    let limit = parseInt(query.limit, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;

    const skip = (page - 1) * limit;

    return {
        page,
        limit,
        skip,
        take: limit
    };
};

const formatPaginatedResult = (data, totalCount, pagination) => {
    const totalPages = Math.ceil(totalCount / pagination.limit);
    return {
        data,
        pagination: {
            currentPage: pagination.page,
            pageSize: pagination.limit,
            totalRecords: totalCount,
            totalPages,
            hasNextPage: pagination.page < totalPages,
            hasPreviousPage: pagination.page > 1
        }
    };
};

module.exports = {
    getPagination,
    formatPaginatedResult
};
