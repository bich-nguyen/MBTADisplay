// ===================== CONFIG =====================

const SUBWAY_STATION_GROUPS = [
    { stationName: "South Station", elementId: "south-station-red",    walkMin: 7,  panelRouteIds: ["Red"] },
    { stationName: "State Street",  elementId: "state-station-orange",  walkMin: 9,  panelRouteIds: ["Orange", "Blue"] },
    { stationName: "Park Street",   elementId: "park-street-green",     walkMin: 16, panelRouteIds: ["Green"] },
];

const LIVE_ICON     = '<i class="bi bi-broadcast-pin" style="font-size:0.9em; margin-right:4px;"></i>';
const SCHEDULE_ICON = '<i class="bi bi-calendar-date"></i>';
const WALK_ICON     = '<i class="bi bi-person-walking"></i>';

function buildKey(panel, svc) {
    const routeId = svc.routeId ?? panel.routeId;
    return `${routeId}-${svc.stopId}-${svc.directionId}-${svc.headsignContains}`;
}

function formatTime(minutes) {
    if (minutes <= 1) return "Now";
    return `${Math.floor(minutes)}m`;
}
