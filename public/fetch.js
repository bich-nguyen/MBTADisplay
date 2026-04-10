// ===================== STATE =====================

let realtimeData = {};
let cachedWeather = null;
let cachedNews = [];

// ===================== FETCH =====================

async function fetchAPI(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        return await res.json();
    } catch (e) {
        console.error("Fetch error:", e);
        return null;
    }
}

async function fetchData() {
    const data = await fetchAPI("/api/data");
    if (!data) return;
    if (data.realtime) realtimeData = data.realtime;
    if (data.weather)  cachedWeather = data.weather;
    if (data.news?.length) cachedNews = data.news;
}


// ===================== PREDICTION TRANSFORM =====================

function getPredictions(data) {
    if (!data?.data) return [];
    const now = new Date();

    const predictionsByTrip = {};
    const tripsById = {};

    data.included?.forEach((item) => {
        if (item.type === "prediction") {
            const tripId = item.relationships?.trip?.data?.id;
            if (tripId) predictionsByTrip[tripId] = item.attributes;
        } else if (item.type === "trip") {
            tripsById[item.id] = item.attributes.headsign;
        }
    });

    const results = [];
    data.data.forEach((schedule) => {
        const tripId = schedule.relationships?.trip?.data?.id;
        const prediction = predictionsByTrip[tripId];
        const timeStr =
            prediction?.departure_time || prediction?.arrival_time ||
            schedule.attributes.departure_time || schedule.attributes.arrival_time;
        if (!timeStr) return;

        const minutes = (new Date(timeStr) - now) / 60000;
        if (minutes < -1 || minutes > 480) return;

        const headsign = tripsById[tripId];
        if (!headsign) return;

        results.push({ minutes, headsign, isRealtime: !!prediction });
    });

    return results.sort((a, b) => a.minutes - b.minutes);
}
