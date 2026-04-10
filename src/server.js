import express from "express";
import { PANELS, NEWS_FEEDS, buildKey } from "/opt/mbta-proxy/config.js";

const app = express();
const PORT = process.env.PORT || 3000;

const MBTA_API_KEY = process.env.MBTA_API_KEY;
const WEATHER_CONTACT = process.env.WEATHER_CONTACT;

const JSON_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};

app.use(express.static("public"));

// ===================== CACHE =====================

const INTERVALS = {
    realtime: 30_000,
    alerts:   30_000,
    weather:  20 * 60_000,
    news:     60 * 60_000,
};

const cache = {
    realtime: { data: null, fetchedAt: 0 },
    alerts:   { data: null, fetchedAt: 0 },
    weather:  { data: null, fetchedAt: 0 },
    news:     { data: null, fetchedAt: 0 },
};

function getCached(key) {
    const { data, fetchedAt } = cache[key];
    if (!data || Date.now() - fetchedAt > 2 * INTERVALS[key]) return null;
    return data;
}

// ===================== FETCHERS =====================

function transformRealtime(json) {
    if (!json?.data) return [];
    const now = new Date();
    const cutoffMs = now.getTime() + 120 * 60_000;

    const predictionsByTrip = {};
    const tripsById = {};
    (json.included ?? []).forEach((item) => {
        if (item.type === "prediction") {
            const tripId = item.relationships?.trip?.data?.id;
            if (tripId) predictionsByTrip[tripId] = item.attributes;
        } else if (item.type === "trip") {
            tripsById[item.id] = item.attributes.headsign;
        }
    });

    const results = [];
    json.data.forEach((schedule) => {
        const tripId = schedule.relationships?.trip?.data?.id;
        const prediction = predictionsByTrip[tripId];
        const timeStr =
            prediction?.departure_time ?? prediction?.arrival_time ??
            schedule.attributes.departure_time ?? schedule.attributes.arrival_time;
        if (!timeStr) return;

        const timeMs = new Date(timeStr).getTime();
        const minutes = (timeMs - now.getTime()) / 60_000;
        if (minutes < -1 || timeMs > cutoffMs) return;

        const headsign = tripsById[tripId];
        if (!headsign) return;

        results.push({ headsign, departureTime: timeStr, isRealtime: !!prediction });
    });

    return results.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
}

async function refreshRealtime() {
    if (!MBTA_API_KEY) return;
    const results = {};
    try {
        await Promise.all(
            PANELS.flatMap((panel) =>
                panel.services.map(async (svc) => {
                    const key = buildKey(panel, svc);
                    const routeId = svc.routeId ?? panel.routeId;
                    const params = new URLSearchParams({
                        "filter[stop]": svc.stopId,
                        "filter[route]": routeId,
                        include: "prediction,trip",
                        api_key: MBTA_API_KEY,
                    });
                    if (svc.directionId !== undefined) params.set("filter[direction_id]", String(svc.directionId));
                    const res = await fetch(`https://api-v3.mbta.com/schedules?${params}`);
                    if (!res.ok) throw new Error(`MBTA schedule ${res.status} for ${key}`);
                    results[key] = transformRealtime(await res.json());
                })
            )
        );
        cache.realtime = { data: results, fetchedAt: Date.now() };
    } catch (e) {
        console.error("Realtime refresh failed:", e.message);
        cache.realtime = { data: null, fetchedAt: 0 };
    }
}

async function refreshAlerts() {
    if (!MBTA_API_KEY) return;
    try {
        const params = new URLSearchParams({
            "filter[activity]": "BOARD,EXIT,RIDE",
            api_key: MBTA_API_KEY,
        });
        const res = await fetch(`https://api-v3.mbta.com/alerts?${params}`);
        if (!res.ok) throw new Error(`MBTA alerts ${res.status}`);
        const json = await res.json();
        cache.alerts = { data: json.data ?? [], fetchedAt: Date.now() };
    } catch (e) {
        console.error("Alerts refresh failed:", e.message);
        cache.alerts = { data: null, fetchedAt: 0 };
    }
}

async function refreshWeather() {
    try {
        const res = await fetch("https://api.weather.gov/gridpoints/BOX/72,90/forecast/hourly", {
            headers: {
                "User-Agent": `MBTADashboard/1.0 (${WEATHER_CONTACT})`,
                Accept: "application/geo+json",
            },
        });
        if (!res.ok) throw new Error(`Weather ${res.status}`);
        const json = await res.json();
        cache.weather = { data: json.properties?.periods ?? [], fetchedAt: Date.now() };
    } catch (e) {
        console.error("Weather refresh failed:", e.message);
        cache.weather = { data: null, fetchedAt: 0 };
    }
}

async function refreshNews() {
    try {
        const results = await Promise.all(
            NEWS_FEEDS.map((feed) =>
                fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`)
                    .then((r) => r.json())
                    .then((d) => (d?.items ?? []).slice(0, 3))
                    .catch(() => [])
            )
        );
        const merged = results.flat();
        if (merged.length) {
            cache.news = { data: merged, fetchedAt: Date.now() };
        } else {
            cache.news = { data: null, fetchedAt: 0 };
        }
    } catch (e) {
        console.error("News refresh failed:", e.message);
        cache.news = { data: null, fetchedAt: 0 };
    }
}

// ===================== POLLING =====================

function startPolling() {
    refreshRealtime();
    refreshAlerts();
    refreshWeather();
    refreshNews();

    setInterval(refreshRealtime, INTERVALS.realtime);
    setInterval(refreshAlerts,   INTERVALS.alerts);
    setInterval(refreshWeather,  INTERVALS.weather);
    setInterval(refreshNews,     INTERVALS.news);
}

// ===================== ROUTES =====================

app.get("/api/data", (_req, res) => {
    res.set(JSON_HEADERS).json({
        realtime: getCached("realtime"),
        alerts:   getCached("alerts"),
        weather:  getCached("weather"),
        news:     getCached("news"),
    });
});

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
    startPolling();
});
