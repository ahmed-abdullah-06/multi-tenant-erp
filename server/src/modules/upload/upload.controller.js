const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        // Return the path so the frontend can save it to an Expense or Product
        const fileUrl = `/uploads/${req.file.filename}`;
        
        res.status(201).json({ 
            data: { url: fileUrl },
            message: 'File uploaded successfully'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { uploadFile };