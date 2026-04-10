function startClock() {
    function tick() {
        const ts = document.getElementById("timestamp");
        if (ts) ts.textContent = new Date().toLocaleTimeString([], {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
    }
    tick();
    setInterval(tick, 1000);
}

async function updateAll() {
    await fetchData();

    SUBWAY_STATION_GROUPS.forEach(renderStationGroup);

    renderCRPanel(PANELS.filter((p) => SOUTHSTATIONCR.includes(p.routeId)), "South Station", "south-station-cr", 7);
    renderCRPanel(PANELS.filter((p) => NORTHSTATIONCR.includes(p.routeId)), "North Station", "north-station-cr", 21);
    renderFerryPanel(PANELS.filter((p) => FERRY.includes(p.routeId)), "ferry");

    renderNews(cachedNews);
    renderWeather();
}

startClock();
updateAll();
setInterval(updateAll, 30000);
