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
    if (data.realtime) {
        realtimeData = data.realtime;
        const firstKey = Object.keys(data.realtime)[0];
        console.error("realtime sample —", firstKey, ":", data.realtime[firstKey]);
    }
    if (data.weather)  cachedWeather = data.weather;
    if (data.news?.length) cachedNews = data.news;
}


// ===================== PREDICTION TRANSFORM =====================

function getPredictions(data) {
    if (!Array.isArray(data)) return [];
    const now = new Date();
    return data.map((d) => ({ ...d, minutes: (new Date(d.departureTime) - now) / 60000 }));
}
