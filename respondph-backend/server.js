require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Allow your frontend to talk to this backend
app.use(cors({
    origin: '*' // In production, change this to your Firebase web.app URL
}));
app.use(express.json());

// The KYC Endpoint
app.post('/api/kyc/create-session', async (req, res) => {
    try {
        const { workflow_id, vendor_data, redirect_url } = req.body;

        // The server talks to Didit securely (API key is hidden here)
        const response = await axios.post('https://verification.didit.me/v3/session/', {
            workflow_id,
            vendor_data,
            redirect_url
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.DIDIT_API_KEY
                // Note: If Bearer doesn't work, change it back to 'x-api-key': process.env.DIDIT_API_KEY
            }
        });

        // Send the URL back to your React frontend
        res.json({ url: response.data.url || response.data.session_url });

    } catch (error) {
        console.error("Didit API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ error: "Failed to create KYC session" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend Server running securely on http://localhost:${PORT}`);
});