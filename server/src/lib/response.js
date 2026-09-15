const successResponse = (res, statusCode, message, data = null, meta = undefined) => {
    const payload = {
        success: true,
        message,
        data
    };
    if (meta !== undefined) {
        payload.meta = meta;
    }
    return res.status(statusCode).json(payload);
};

const errorResponse = (res, statusCode, message, errors = null) => {
    const payload = {
        success: false,
        error: {
            message
        }
    };
    if (errors) {
        payload.error.details = errors;
    }
    return res.status(statusCode).json(payload);
};

module.exports = {
    successResponse,
    errorResponse
};
