const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const e = require('express');

const app = express();
app.use(cors());

// Add LiveScore API key variable (changed from const to let)
let LIVESCORE_API_KEY = 'ZdrlNTWN5LfSfo4V5JcX0';

// Add function to extract build ID from redirect response
const updateApiKey = (data) => {
    if (data.pageProps?.__N_REDIRECT) {
        const buildIdMatch = data.pageProps.__N_REDIRECT.match(/buildid=([^&]+)/);
        if (buildIdMatch && buildIdMatch[1]) {
            LIVESCORE_API_KEY = buildIdMatch[1];
            console.log('Updated API key to:', LIVESCORE_API_KEY);
            return true;
        }
    }
    return false;
};

// Modify each endpoint that uses the API key to handle redirects
const fetchWithKeyUpdate = async (url, options) => {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (updateApiKey(data)) {
        // Retry the request with the new API key
        const newUrl = url.replace(/\/_next\/data\/[^/]+\//, `/_next/data/${LIVESCORE_API_KEY}/`);
        const retryResponse = await fetch(newUrl, options);
        return await retryResponse.json();
    }
    
    return data;
};

// Serve static files
app.use(express.static(__dirname));

// Proxy endpoint
app.get('/api/sports', async (req, res) => {
    try {
        const date = req.query.date;
        console.log('Requested date:', date); // Debug log

        if (!date || !/^\d{8}$/.test(date)) {
            throw new Error('Invalid date format. Use YYYYMMDD');
        }

        const apiUrl = `https://prod-cdn-public-api.livescore.com/v1/api/app/date/soccer/${date}/7?locale=en&MD=1`;
        console.log('Fetching URL:', apiUrl); // Debug log

        const response = await fetch(apiUrl, {
            headers: {
                'authority': 'prod-cdn-public-api.livescore.com',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9,vi;q=0.8,zh-CN;q=0.7,zh;q=0.6,fr;q=0.5',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message); // Debug log
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoint for live matches
app.get('/api/sports/live', async (req, res) => {
    try {
        const apiUrl = 'https://prod-cdn-public-api.livescore.com/v1/api/app/live/soccer/7?locale=en&MD=1';
        
        const response = await fetch(apiUrl, {
            headers: {
                'authority': 'prod-cdn-public-api.livescore.com',
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'accept-language': 'en-US,en;q=0.9,vi;q=0.8,zh-CN;q=0.7,zh;q=0.6,fr;q=0.5',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Update match details endpoint
app.get('/api/match/:id', async (req, res) => {
    try {
        const matchId = req.params.id;
        
        // First API call to get basic match data
        const basicResponse = await fetch(`https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${matchId}?locale=en`, {
            headers: {
                'authority': 'prod-cdn-public-api.livescore.com',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        if (!basicResponse.ok) {
            throw new Error(`First API responded with status: ${basicResponse.status}`);
        }

        const basicData = await basicResponse.json();
        
        // Construct URL for second API using data from first API
        const stage = basicData.Stg.Scd;
        const country = basicData.Stg.Ccd.toLowerCase();
        const team1 = basicData.T1[0].Nm.toLowerCase().replace(/ /g, '-');
        const team2 = basicData.T2[0].Nm.toLowerCase().replace(/ /g, '-');
        
        const detailUrl = `https://www.livescore.com/_next/data/${LIVESCORE_API_KEY}/en/football/${country}/${stage}/${team1}-vs-${team2}/${matchId}.json`;

        // Second API call to get detailed match data
        const detailResponse = await fetchWithKeyUpdate(detailUrl, {
            headers: {
                'authority': 'www.livescore.com',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        if (!detailResponse.ok) {
            // If second API fails, just return data from first API
            console.warn('Second API failed, returning basic data only');
            return res.json(basicData);
        }

        const detailData = await detailResponse.json();

        // Merge data from both APIs
        const mergedData = {
            ...basicData,
            details: detailData.pageProps?.initialEventData?.event || {}
        };

        res.json(mergedData);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoint for match stats
app.get('/api/match/:id/stats', async (req, res) => {
    try {
        const matchId = req.params.id;
        const matchInfo = await fetch(`https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${matchId}?locale=en`).then(r => r.json());
        
        // Construct URL parameters
        const stage = matchInfo.Stg.Scd;
        const country = matchInfo.Stg.Ccd;
        const team1 = matchInfo.T1[0].Nm.toLowerCase().replace(/ /g, '-');
        const team2 = matchInfo.T2[0].Nm.toLowerCase().replace(/ /g, '-');
        
        const statsUrl = `https://www.livescore.com/_next/data/${LIVESCORE_API_KEY}/en/football/${country}/${stage}/${team1}-vs-${team2}/${matchId}/stats.json`;
        
        const data = await fetchWithKeyUpdate(statsUrl, {
            headers: {
                'authority': 'www.livescore.com',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        
        res.json(data);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoint for match lineups
app.get('/api/match/:id/lineups', async (req, res) => {
    try {
        const matchId = req.params.id;
        console.log('Match ID:', matchId);
        
        const matchInfo = await fetch(`https://prod-cdn-public-api.livescore.com/v1/api/app/scoreboard/soccer/${matchId}?locale=en`).then(r => r.json());
        
        // Construct URL parameters
        const stage = matchInfo.Stg.Scd;
        const country = matchInfo.Stg.Ccd;
        const team1 = matchInfo.T1[0].Nm.toLowerCase().replace(/ /g, '-');
        const team2 = matchInfo.T2[0].Nm.toLowerCase().replace(/ /g, '-');
        
        console.log('URL components:', {
            stage,
            country,
            team1,
            team2
        });
        
        const lineupsUrl = `https://www.livescore.com/_next/data/${LIVESCORE_API_KEY}/en/football/${country}/${stage}/${team1}-vs-${team2}/${matchId}/lineups.json`;
        console.log('Full lineups URL:', lineupsUrl);

        const data = await fetchWithKeyUpdate(lineupsUrl, {
            headers: {
                'authority': 'www.livescore.com',
                'accept': 'application/json',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });

        if (!data?.pageProps?.initialEventData?.event) {
            // Return a structured response indicating no lineup data
            return res.json({
                pageProps: {
                    initialEventData: {
                        event: null
                    }
                }
            });
        }

        const eventData = data?.pageProps?.initialEventData;

        // Transform data based on real API structure
        const transformedData = {
            pageProps: {
                initialEventData: {
                    event: {
                        ...eventData.event,
                        lineups: {
                            homeStarters: eventData.event?.lineups?.homeStarters || [],
                            awayStarters: eventData.event?.lineups?.awayStarters || [],
                            homeSubs: eventData.event?.lineups?.homeSubs || [],
                            awaySubs: eventData.event?.lineups?.awaySubs || [],
                            homeCoach: eventData.event?.lineups?.homeCoach || [],
                            awayCoach: eventData.event?.lineups?.awayCoach || []
                        },
                        fieldData: eventData.event?.fieldData || {
                            homeFormation: 'TBD',
                            awayFormation: 'TBD'
                        },
                        subs: eventData.event?.subs || {
                            homeSubOut: [],
                            awaySubOut: [],
                            homeSubIn: [],
                            awaySubIn: []
                        }
                    }
                }
            }
        };

        res.json(transformedData);
    } catch (error) {
        console.error('Error fetching lineup data:', error);
        // Return structured response for error case
        res.status(200).json({
            pageProps: {
                initialEventData: {
                    event: null
                }
            }
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
