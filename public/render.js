// ===================== RENDER HELPERS =====================

function getBadgeHtml(routeId) {
    if (routeId === "Red")           return '<span class="badge badge-red">RL</span>';
    if (routeId === "Orange")        return '<span class="badge badge-orange">OL</span>';
    if (routeId === "Blue")          return '<span class="badge badge-blue">BL</span>';
    if (routeId === "Green-B")       return '<span class="badge badge-green">B</span>';
    if (routeId === "Green-C")       return '<span class="badge badge-green">C</span>';
    if (routeId === "Green-D")       return '<span class="badge badge-green">D</span>';
    if (routeId === "Green-E")       return '<span class="badge badge-green">E</span>';
    if (routeId.startsWith("CR-"))   return '<span class="badge badge-cr">CR</span>';
    if (routeId === "Boat-F1") return '<span class="badge badge-ferry">F1</span>';
    if (routeId === "Boat-F2H") return '<span class="badge badge-ferry">F2H</span>';
    if (routeId === "Boat-F4") return '<span class="badge badge-ferry">F4</span>';
    if (routeId === "Boat-EastBoston") return '<span class="badge badge-ferry">F3</span>';
    if (routeId === "Boat-Lynn") return '<span class="badge badge-ferry">F5</span>';
    if (routeId === "Boat-F6") return '<span class="badge badge-ferry">F6</span>';
    if (routeId === "Boat-F7") return '<span class="badge badge-ferry">F7</span>';

    return "";
}

// NWS hourly forecast has no apparent-temperature field — approximate it
// from temperature + humidity (heat index) or temperature + wind (wind chill).
function computeFeelsLike(tempF, relHumidityPct, windMph) {
    if (tempF >= 80 && relHumidityPct != null) {
        const T = tempF, R = relHumidityPct;
        const hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
            - 0.00683783 * T * T - 0.05481717 * R * R + 0.00122874 * T * T * R
            + 0.00085282 * T * R * R - 0.00000199 * T * T * R * R;
        return Math.round(hi);
    }
    if (tempF <= 50 && windMph >= 3) {
        const T = tempF, V = windMph;
        const wc = 35.74 + 0.6215 * T - 35.75 * Math.pow(V, 0.16) + 0.4275 * T * Math.pow(V, 0.16);
        return Math.round(wc);
    }
    return Math.round(tempF);
}

function depCellHtml(p, variant) {
    if (!p) return `<div class="dep-${variant}">—</div>`;
    const dot = p.isRealtime ? `<span class="live-dot live-dot-${variant}"></span>` : "";
    return `<div class="dep-${variant}">${dot}${formatTime(p.minutes)}</div>`;
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
            if (!preds.length) return;
            const headsign = preds[0].headsign;
            if (!byDestination.has(headsign))
                byDestination.set(headsign, { routeId: svc.routeId ?? panel.routeId, times: [] });
            preds.forEach((p) => byDestination.get(headsign).times.push(p));
        });
    });

    const destinations = [...byDestination.entries()].map(([headsign, data]) => {
        data.times.sort((a, b) => a.minutes - b.minutes);
        return { headsign, ...data };
    });
    destinations.sort((a, b) => a.times[0].minutes - b.times[0].minutes);

    function rowsHTML() {
        return destinations.length
            ? destinations.map(({ headsign, routeId, times }) => `
                <div class="prediction-row" data-headsign="${headsign.replace(/"/g, "&quot;")}">
                    ${getBadgeHtml(routeId)}
                    <div class="destination">${headsign}</div>
                    ${depCellHtml(times[0], "next")}
                    ${depCellHtml(times[1], "following")}
                </div>`).join("")
            : `<div class="no-trains">No service</div>`;
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="header-station">${group.stationName}</span>
                    <span class="walk-min">${group.walkMin} min walk</span>
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
        existingRows[i].querySelector(".dep-next").outerHTML = depCellHtml(destinations[i].times[0], "next");
        existingRows[i].querySelector(".dep-following").outerHTML = depCellHtml(destinations[i].times[1], "following");
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

    panelData.sort((a, b) => a.preds[0].minutes - b.preds[0].minutes);

    function rowsHTML() {
        return panelData.map(({ panel, preds }) => `
            <div class="prediction-row" data-title="${panel.title.replace(/"/g, "&quot;")}">
                ${getBadgeHtml(panel.routeId)}
                <div class="destination">${panel.title}</div>
                ${depCellHtml(preds[0], "next")}
                ${depCellHtml(preds[1], "following")}
            </div>`).join("");
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="header-station">${stationName}</span>
                    <span class="walk-min">${walkMin} min walk</span>
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
        existingRows[i].querySelector(".dep-next").outerHTML = depCellHtml(panelData[i].preds[0], "next");
        existingRows[i].querySelector(".dep-following").outerHTML = depCellHtml(panelData[i].preds[1], "following");
    }
}

function renderFerryPanel(panels, stationClass, walkText) {
    const container = document.querySelector(`.${stationClass}`);
    if (!container) return;

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

    entries.sort((a, b) => a.preds[0].minutes - b.preds[0].minutes);

    function entryHTML({ key, panel, destination, preds }) {
        const dock = DOCKS[panel.title];
        const dockLine = dock ? `From ${dock.name} · ${dock.walkMin} min walk` : "";
        return `
            <div class="prediction-row ferry-row" data-key="${key.replace(/"/g, "&quot;")}">
                ${getBadgeHtml(panel.routeId)}
                <div class="destination-block">
                    <div class="destination">${destination}</div>
                    <div class="dock-line">${dockLine}</div>
                </div>
                ${depCellHtml(preds[0], "next")}
                ${depCellHtml(preds[1], "following")}
            </div>`;
    }

    const card = container.querySelector(".card");
    if (!card) {
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <span class="header-station">Ferry</span>
                    <span class="walk-min">${walkText}</span>
                </div>
                <div class="card-body">${entries.map(entryHTML).join("")}</div>
            </div>`;
        return;
    }

    const body = card.querySelector(".card-body");
    const existingRows = [...body.querySelectorAll(".ferry-row[data-key]")];
    const newKeys = entries.map((e) => e.key);

    if (!keysMatch(existingRows.map((e) => e.dataset.key), newKeys)) {
        body.innerHTML = entries.map(entryHTML).join("");
        return;
    }

    for (let i = 0; i < existingRows.length; i++) {
        existingRows[i].querySelector(".dep-next").outerHTML = depCellHtml(entries[i].preds[0], "next");
        existingRows[i].querySelector(".dep-following").outerHTML = depCellHtml(entries[i].preds[1], "following");
    }
}

function renderFerryFootnote(text, stationClass) {
    const container = document.querySelector(`.${stationClass}`);
    if (!container) return;
    container.innerHTML = `
        <div class="footnote-card">
            <div class="footnote-label">Docks</div>
            <div class="footnote-text">${text}</div>
        </div>`;
}

function renderWeather() {
    const container = document.getElementById("weather-box");
    if (!container || !cachedWeather?.length) return;

    const current = cachedWeather[0];
    const tempF = Math.round(current.temperature);
    const windMph = parseFloat(current.windSpeed) || 0;
    const humidity = current.relativeHumidity?.value ?? null;
    const feelsLike = computeFeelsLike(tempF, humidity, windMph);
    const windText = current.windSpeed && current.windDirection
        ? `Wind ${current.windSpeed} ${current.windDirection}`
        : "";
    const detail = [`Feels like ${feelsLike}°`, windText].filter(Boolean).join(" · ");

    const built = container.querySelector(".weather-temp");
    if (!built) {
        container.innerHTML = `
            <div class="header-left">
                <div class="weather-temp">${tempF}°</div>
                <div class="weather-condition-group">
                    <div class="weather-condition">${current.shortForecast}</div>
                    <div class="weather-detail">${detail}</div>
                </div>
            </div>
            <div class="header-right">
                <div id="date-label" class="date-label"></div>
                <div id="timestamp" class="clock"></div>
            </div>`;
        return;
    }

    container.querySelector(".weather-temp").textContent = `${tempF}°`;
    container.querySelector(".weather-condition").textContent = current.shortForecast;
    container.querySelector(".weather-detail").textContent = detail;
}

const DEFAULT_HEADLINE = "Live MBTA departures and service updates";

function renderNews(articles) {
    const track = document.getElementById("ticker-track");
    if (!track) return;
    const titles = articles && articles.length
        ? articles.map((a) => a.title || DEFAULT_HEADLINE)
        : [DEFAULT_HEADLINE];
    const sep = '<span class="ticker-sep">▪</span>';
    const items = titles.map((t) => `<span class="ticker-item">${t}</span>`).join(sep);
    const content = items + sep + items + sep;
    if (track.innerHTML !== content) track.innerHTML = content;
}
