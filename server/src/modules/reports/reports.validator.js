const getReports = (req, res, next) => {
    const { startDate, endDate } = req.query;

    if (startDate && isNaN(Date.parse(startDate))) {
        return res.status(400).json({ error: 'startDate must be a valid date string' });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
        return res.status(400).json({ error: 'endDate must be a valid date string' });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({ error: 'startDate cannot be strictly after endDate' });
    }
    
    next();
};

module.exports = { getReports };