import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const MBTA_API_KEY = process.env.MBTA_API_KEY;
const WEATHER_CONTACT = process.env.WEATHER_CONTACT;

const JSON_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
};

function sendError(res, message, status = 500) {
    res.status(status).set(JSON_HEADERS).json({ error: message, status });
}

// MBTA API proxy
app.get("/api/mbta*", async (req, res) => {
    if (!MBTA_API_KEY) {
        return sendError(res, "Missing MBTA_API_KEY");
    }
    const mbtaPath = req.path.replace("/api/mbta", "");
    const params = new URLSearchParams(req.query);
    params.set("api_key", MBTA_API_KEY);
    const apiUrl = `https://api-v3.mbta.com${mbtaPath}?${params}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.text();
        res.status(response.status).set(JSON_HEADERS).send(data);
    } catch (e) {
        sendError(res, "MBTA fetch failed");
    }
});

// Weather API proxy
app.get("/api/weather*", async (req, res) => {
    const weatherPath = req.path.replace("/api/weather", "");
    if (!weatherPath) {
        return sendError(res, "Missing weather path", 400);
    }
    const params = new URLSearchParams(req.query);
    const apiUrl = `https://api.weather.gov${weatherPath}${params.size ? "?" + params : ""}`;
    try {
        const response = await fetch(apiUrl, {
            headers: {
                "User-Agent": `MBTADashboard/1.0 (${WEATHER_CONTACT})`,
                Accept: "application/geo+json",
            },
        });
        const data = await response.text();
        res.status(response.status).set(JSON_HEADERS).send(data);
    } catch (e) {
        sendError(res, "Weather fetch failed");
    }
});

// News proxy (rss2json feeds)
const NEWS_FEEDS = [
    "https://masslawyersweekly.com/feed/",
    "http://rss.justia.com/BostonLawyerBlogCom",
    "https://www.bostoncriminaldefenselawyer-blog.com/feed/",
];

app.get("/api/news", async (_req, res) => {
    try {
        const results = await Promise.all(
            NEWS_FEEDS.map((feed) =>
                fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`)
                    .then((r) => r.json())
                    .then((data) => (data?.items ?? []).slice(0, 3))
                    .catch(() => [])
            )
        );
        res.set(JSON_HEADERS).json(results.flat());
    } catch (e) {
        sendError(res, "News fetch failed");
    }
});

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});
