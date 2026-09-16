const createNotification = (req, res, next) => {
    const { title, message } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
        return res.status(400).json({ error: 'Notification title is required' });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Notification message is required' });
    }
    next();
};

module.exports = {
    createNotification
};
