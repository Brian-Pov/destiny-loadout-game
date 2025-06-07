// server.js - Our Secure Backend
// FINAL, PROXY-BASED VERSION. This is a more robust and secure architecture.

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 8080;

// --- The server will get credentials from the hosting environment ---
const BUNGIE_CLIENT_ID = process.env.BUNGIE_CLIENT_ID;
const BUNGIE_CLIENT_SECRET = process.env.BUNGIE_CLIENT_SECRET;
const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;


app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies
app.use(express.static(path.join(__dirname))); // Serve static files like index.html

// --- AUTHENTICATION ENDPOINTS ---

app.get('/login', (req, res) => {
    const authUrl = `https://www.bungie.net/en/OAuth/Authorize?client_id=${BUNGIE_CLIENT_ID}&response_type=code`;
    res.redirect(authUrl);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.status(400).send('Error: No authorization code provided.');

    try {
        const tokenUrl = 'https://www.bungie.net/platform/app/oauth/token/';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: BUNGIE_CLIENT_ID,
            client_secret: BUNGIE_CLIENT_SECRET,
        });

        const tokenResponse = await axios.post(tokenUrl, params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        const originalHost = req.get('host');
        const frontendRedirectUrl = `https://${originalHost}/#access_token=${accessToken}`;
        res.redirect(frontendRedirectUrl);

    } catch (error) {
        console.error('Error fetching access token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication. Check server logs.');
    }
});


// --- NEW API PROXY ENDPOINT ---

app.post('/api/get-user-profile', async (req, res) => {
    const { accessToken } = req.body;
    console.log("Proxy endpoint hit. Access Token received:", accessToken ? "Yes" : "No");

    if (!accessToken) {
        return res.status(401).json({ error: 'No access token provided.' });
    }

    try {
        const bungieApiUrl = 'https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/';
        
        const apiResponse = await axios.get(bungieApiUrl, {
            headers: {
                'X-API-Key': BUNGIE_API_KEY,
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        console.log("Successfully got response from Bungie.");
        res.json(apiResponse.data);

    } catch (error) {
        console.error('API Proxy Error:', error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ 
            error: 'Failed to fetch user profile from Bungie.',
            details: error.response?.data
        });
    }
});


app.listen(port, () => {
    console.log(`Destiny Loadout Game server listening at http://localhost:${port}`);
    console.log(`Navigate to your localtunnel URL to begin.`);
});