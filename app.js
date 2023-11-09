const express = require('express');
const axios = require('axios');
const { DateTime } = require('luxon');

const app = express();
const PORT = process.env.PORT || 3000;

let altitudeData = [];

const fetchAltitude = async () => {
  try {
    const response = await axios.get('https://api.cfast.dev/satellite');
    return parseFloat(response.data.altitude);
  } catch (error) {
    console.error('Error fetching altitude:', error.message);
    return null;
  }
};

const updateAltitudeData = async () => {
  const currentAltitude = await fetchAltitude();
  if (currentAltitude !== null) {
    const timestamp = DateTime.utc();
    altitudeData.push({ timestamp, altitude: currentAltitude });
  }
};

app.get('/stats', (req, res) => {
  updateAltitudeData();

  const fiveMinutesAgo = DateTime.utc().minus({ minutes: 5 });
  const recentData = altitudeData.filter(({ timestamp }) => timestamp >= fiveMinutesAgo);

  if (recentData.length === 0) {
    return res.json({ message: 'Not enough data for the last 5 minutes' });
  }

  const altitudes = recentData.map(({ altitude }) => altitude);
  res.json({
    minAltitude: Math.min(...altitudes),
    maxAltitude: Math.max(...altitudes),
    avgAltitude: altitudes.reduce((sum, altitude) => sum + altitude, 0) / altitudes.length,
  });
});

app.get('/health', (req, res) => {
  updateAltitudeData();

  const oneMinuteAgo = DateTime.utc().minus({ minutes: 1 });
  const recentData = altitudeData.filter(({ timestamp }) => timestamp >= oneMinuteAgo);

  if (recentData.length === 0) {
    return res.json({ message: 'Not enough data for the last minute' });
  }

  const avgAltitude = recentData.reduce((sum, { altitude }) => sum + altitude, 0) / recentData.length;

  if (avgAltitude < 160) {
    res.json({ message: 'WARNING: RAPID ORBITAL DECAY IMMINENT' });
  } else if (avgAltitude >= 160 && avgAltitude < 161) {
    res.json({ message: 'Sustained Low Earth Orbit Resumed' });
  } else {
    res.json({ message: 'Altitude is A-OK' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
