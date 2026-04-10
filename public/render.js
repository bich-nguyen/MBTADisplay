// ===================== RENDER HELPERS =====================

function getLinePill(routeId) {
    if (routeId === "Red")           return '<span class="line-pill pill-red">RL</span>';
    if (routeId === "Orange")        return '<span class="line-pill pill-orange">OL</span>';
    if (routeId === "Blue")          return '<span class="line-pill pill-blue">BL</span>';
    if (routeId === "Green-B")       return '<span class="line-pill pill-green">B</span>';
    if (routeId === "Green-C")       return '<span class="line-pill pill-green">C</span>';
    if (routeId === "Green-D")       return '<span class="line-pill pill-green">D</span>';
    if (routeId === "Green-E")       return '<span class="line-pill pill-green">E</span>';
    if (routeId.startsWith("CR-"))   return '<span class="line-pill pill-cr">CR</span>';
    if (routeId.startsWith("Boat-")) return '<span class="line-pill pill-boat">FR</span>';
    return "";
}

function forecastToEmoji(forecast, isDaytime) {
    const f = forecast.toLowerCase();
    if (f.includes("blizzard")) return "🌨️❄️💨";
    if (f.includes("thunderstorm") || f.includes("lightning"))
        return f.includes("rain") || f.includes("shower") ? "⛈️⚡🌧️" : "⛈️⚡";
    if (f.includes("freezing rain") || f.includes("sleet") || f.includes("ice pellet")) return "🌨️💧";
    if (f.includes("heavy snow")) return "❄️🌨️❄️";
    if (f.includes("snow") || f.includes("flurr")) return "❄️🌨️";
    if (f.includes("heavy rain")) return "🌧️💧💧";
    if (f.includes("rain") && (f.includes("wind") || f.includes("bree"))) return "🌧️💨";
    if (f.includes("shower") && f.includes("sun")) return "🌦️☀️";
    if (f.includes("rain") || f.includes("shower")) return "🌧️💧";
    if (f.includes("drizzle")) return "🌦️💧";
    if (f.includes("dense fog")) return "🌫️🌫️";
    if (f.includes("fog") || f.includes("haze") || f.includes("mist") || f.includes("smoke")) return "🌫️";
    if (f.includes("mostly sunny") && (f.includes("wind") || f.includes("bree"))) return "🌤️💨";
    if (f.includes("partly sunny") || f.includes("mostly sunny")) return "🌤️";
    if (f.includes("partly cloudy")) return isDaytime ? "⛅" : "🌙⛅";
    if (f.includes("mostly cloudy")) return "🌥️☁️";
    if (f.includes("cloudy") || f.includes("overcast")) return "☁️☁️";
    if (f.includes("sunny") || f.includes("clear")) {
        if (f.includes("wind") || f.includes("bree")) return isDaytime ? "☀️💨" : "🌙💨";
        return isDaytime ? "☀️" : "🌙✨";
    }
    if (f.includes("wind") || f.includes("bree")) return "💨💨";
    return isDaytime ? "🌡️" : "🌙";
}

function predTimeHtml(p) {
    return `<div class="pred-time ${p.isRealtime ? "realtime" : "scheduled"}">${p.isRealtime ? LIVE_ICON : SCHEDULE_ICON} ${formatTime(p.minutes)}</div>`;
}

function keysMatch(a, b) {
    return a.length === b.length && a.every((k, i) => k === b[i]);
}

// ===================== RENDER =====================

function renderStationGroup(group) {
    const container = document.getElementById(group.elementId);
    if (!container) return;

    const groupPanels = PANELS.filter((p) => group.panelRouteIds.includes(p.routeId));

    const byDestination = new Map();
    groupPanels.forEach((panel) => {
        panel.services.forEach((svc) => {
            const key = buildKey(panel, svc);
            const preds = getPredictions(realtimeData[key])
                .filter((p) => p.headsign.includes(svc.headsignContains))
                .filter((p) => p.minutes >= group.walkMin);
            if (!preds.length) {
                console.error("no preds —", key, ":", realtimeData[key]);
                return;
            }
            const headsign = preds[0].headsign;
            if (!byDestination.has(headsign))
                byDestination.set(headsign, { routeId: svc.routeId ?? panel.routeId, times: [] });
            preds.forEach((p) => byDestination.get(headsign).times.push(p));
        });
    });

    const GREEN_BRANCH_ORDER = { B: 0, C: 1, D: 2, E: 3 };
    const destinations = [...byDestination.entries()].map(([headsign, data]) => {
        data.times.sort((a, b) => a.minutes - b.minutes);
        return { headsign, ...data };
    });
    destinations.sort((a, b) => {
        if (a.routeId.startsWith("Green-") && b.routeId.startsWith("Green-")) {
            const diff = (GREEN_BRANCH_ORDER[a.routeId.split("-")[1]] ?? 99) -
                         (GREEN_BRANCH_ORDER[b.routeId.split("-")[1]] ?? 99);
            if (diff !== 0) return diff;
        }
        return a.times[0].minutes - b.times[0].minutes;
    });

    function rowsHTML() {
        return destinations.length
            ? destinations.map(({ headsign, routeId, times }) => `
                <div class="prediction-row" data-headsign="${headsign.replace(/"/g, "&quot;")}">
                    ${getLinePill(routeId)}
                    <div class="destination-main">${headsign}</div>
                    <div class="pred-times">${times.slice(0, 2).map(predTimeHtml).join("")}</div>
                </div>`).join("")
            : `<div class="no-trains">No service</div>`;
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="header-station">${group.stationName}</span>
                    <span class="walk-min">${WALK_ICON} ${group.walkMin} min</span>
                </div>
                <div class="card-body">${rowsHTML()}</div>
            </div>`;
        return;
    }

    const body = card.querySelector(".card-body");
    const existingRows = [...body.querySelectorAll(".prediction-row[data-headsign]")];
    const newKeys = destinations.map((d) => d.headsign);

    if (!keysMatch(existingRows.map((r) => r.dataset.headsign), newKeys)) {
        body.innerHTML = rowsHTML();
        return;
    }

    for (let i = 0; i < existingRows.length; i++) {
        existingRows[i].querySelector(".pred-times").innerHTML =
            destinations[i].times.slice(0, 2).map(predTimeHtml).join("");
    }
}

function renderCRPanel(panels, stationName, stationClass, walkMin) {
    const container = document.querySelector(`.${stationClass}`);
    if (!container) return;

    const panelData = panels.map((panel) => {
        const allPreds = panel.services.flatMap((svc) =>
            getPredictions(realtimeData[buildKey(panel, svc)])
                .filter((p) => p.headsign.includes(svc.headsignContains))
        );
        allPreds.sort((a, b) => a.minutes - b.minutes);
        return { panel, preds: allPreds.slice(0, 2) };
    }).filter(({ preds }) => preds.length > 0);

    function rowsHTML() {
        return panelData.map(({ panel, preds }) => `
            <div class="prediction-row" data-title="${panel.title.replace(/"/g, "&quot;")}">
                ${getLinePill(panel.routeId)}
                <div class="destination-main">${panel.title}</div>
                <div class="pred-times">${preds.map(predTimeHtml).join("")}</div>
            </div>`).join("");
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="header-station">${stationName}</span>
                    <span class="walk-min">${WALK_ICON} ${walkMin} min</span>
                </div>
                <div class="card-body">${rowsHTML()}</div>
            </div>`;
        return;
    }

    const body = card.querySelector(".card-body");
    const existingRows = [...body.querySelectorAll(".prediction-row[data-title]")];
    const newKeys = panelData.map(({ panel }) => panel.title);

    if (!keysMatch(existingRows.map((r) => r.dataset.title), newKeys)) {
        body.innerHTML = rowsHTML();
        return;
    }

    for (let i = 0; i < existingRows.length; i++) {
        existingRows[i].querySelector(".pred-times").innerHTML =
            panelData[i].preds.map(predTimeHtml).join("");
    }
}

function renderFerryPanel(panels, stationClass) {
    const container = document.querySelector(`.${stationClass}`);
    if (!container) return;

    // Build entry data — one entry per visible (panel, base-destination) pair
    const entries = panels.flatMap((panel) => {
        const groups = new Map();
        for (const svc of panel.services) {
            const baseDest = svc.headsignContains.split(" via ")[0];
            if (!groups.has(baseDest)) groups.set(baseDest, []);
            groups.get(baseDest).push(svc);
        }
        return [...groups.entries()].map(([destination, svcs]) => {
            const preds = svcs
                .flatMap((svc) =>
                    getPredictions(realtimeData[buildKey(panel, svc)])
                        .filter((p) => p.headsign.includes(svc.headsignContains))
                )
                .sort((a, b) => a.minutes - b.minutes)
                .slice(0, 2);
            return preds.length ? { key: `${panel.title}|${destination}`, panel, destination, preds } : null;
        }).filter(Boolean);
    });

    function entryHTML({ key, panel, destination, preds }) {
        return `
            <div class="ferry-entry" data-key="${key.replace(/"/g, "&quot;")}" style="display:contents">
                <div class="ferry-stop">${panel.title}</div>
                <div><div class="ferry-line">${destination}</div></div>
                <div class="ferry-times">${preds.map(predTimeHtml).join("")}</div>
            </div>`;
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header"><span class="header-station">Ferry</span></div>
                <div class="card-body"><div class="ferry-grid">${entries.map(entryHTML).join("")}</div></div>
            </div>`;
        return;
    }

    const grid = card.querySelector(".ferry-grid");
    const existingEntries = [...grid.querySelectorAll(".ferry-entry[data-key]")];
    const newKeys = entries.map((e) => e.key);

    if (!keysMatch(existingEntries.map((e) => e.dataset.key), newKeys)) {
        grid.innerHTML = entries.map(entryHTML).join("");
        return;
    }

    for (let i = 0; i < existingEntries.length; i++) {
        existingEntries[i].querySelector(".ferry-times").innerHTML =
            entries[i].preds.map(predTimeHtml).join("");
    }
}

function renderWeather() {
    const container = document.getElementById("weather-box");
    if (!container || !cachedWeather?.length) return;

    const current = cachedWeather[0];
    const tempF = Math.round(current.temperature);
    const emoji = forecastToEmoji(current.shortForecast, current.isDaytime);

    const card = container.querySelector(".weather-card");
    if (!card) {
        container.innerHTML = `
            <div class="card weather-card">
                <div class="card-body weather-card-body">
                    <span class="weather-temp">${tempF}°</span>
                    <span class="weather-emoji">${emoji}</span>
                    <span class="weather-desc">${current.shortForecast}</span>
                    <div class="weather-spacer"></div>
                    <div class="weather-right-group">
                        <div id="timestamp"></div>
                    </div>
                </div>
            </div>`;
        return;
    }

    card.querySelector(".weather-temp").textContent = `${tempF}°`;
    card.querySelector(".weather-emoji").textContent = emoji;
    card.querySelector(".weather-desc").textContent = current.shortForecast;
}

function renderNews(articles) {
    const track = document.getElementById("ticker-track");
    if (!track || !articles.length) return;
    const separator = '<span class="ticker-sep">&#9679;</span>';
    const items = articles.map((a) => `<span class="ticker-item">${a.title}</span>`).join(separator);
    const content = items + separator + items + separator;
    if (track.innerHTML !== content) track.innerHTML = content;
}
