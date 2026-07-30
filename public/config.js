// ===================== CONFIG =====================

const SUBWAY_STATION_GROUPS = [
    { stationName: "South Station", elementId: "south-station-red",    walkMin: 7,  panelRouteIds: ["Red"] },
    { stationName: "State Street",  elementId: "state-station-orange",  walkMin: 9,  panelRouteIds: ["Orange", "Blue"] },
    { stationName: "Park Street",   elementId: "park-street-green",     walkMin: 16, panelRouteIds: ["Green"] },
];

// Ferry dock lookup — keyed by FERRY_PANELS[].title in app.js
const DOCKS = {
    "RW":     { name: "Rowes Wharf",         walkMin: 5 },
    "LWN 5A": { name: "Long Wharf North 5A", walkMin: 9 },
    "LWN 5B": { name: "Long Wharf North 5B", walkMin: 11 },
    "LWN 5C": { name: "Long Wharf North 5C", walkMin: 12 },
    "LWS":    { name: "Long Wharf South",    walkMin: 10 },
    "CW":     { name: "Central Wharf",       walkMin: 9 },
    "SP":     { name: "Seaport / Fan Pier",  walkMin: 13 },
};

const FERRY_WALK_RANGE = "5–13 min walk";
const FERRY_FOOTNOTE = "Rowes Wharf 5 min · Long Wharf N 9–12 min · Long Wharf S 10 min · Central Wharf 9 min · Seaport 13 min";

function buildKey(panel, svc) {
    const routeId = svc.routeId ?? panel.routeId;
    return `${routeId}-${svc.stopId}-${svc.directionId}-${svc.headsignContains}`;
}

function formatTime(minutes) {
    if (minutes <= 1) return "Now";
    return `${Math.floor(minutes)}m`;
}
