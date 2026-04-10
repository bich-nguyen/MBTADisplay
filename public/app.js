function svc(routeId, directionId, stopId, destination) {
    return { routeId, directionId, stopId, headsignContains: destination };
}

// Subway panels — used by renderStationGroup via global PANELS
const PANELS = [
    {
        title: "Red Line", routeId: "Red",
        services: [
            svc("Red", 0, "place-sstat", "Ashmont"),
            svc("Red", 0, "place-sstat", "Braintree"),
            svc("Red", 1, "place-sstat", "Alewife"),
        ],
    },
    {
        title: "Orange Line", routeId: "Orange",
        services: [
            svc("Orange", 0, "place-state", "Forest Hills"),
            svc("Orange", 1, "place-state", "Oak Grove"),
        ],
    },
    {
        title: "Blue Line", routeId: "Blue",
        services: [
            svc("Blue", 0, "place-state", "Bowdoin"),
            svc("Blue", 1, "place-state", "Wonderland"),
        ],
    },
    {
        title: "Green Line", routeId: "Green",
        services: [
            svc("Green-B", 0, "place-pktrm", "Boston College"),
            svc("Green-C", 0, "place-pktrm", "Cleveland Circle"),
            svc("Green-D", 0, "place-pktrm", "Riverside"),
            svc("Green-E", 0, "place-pktrm", "Heath Street"),
            svc("Green-E", 1, "place-pktrm", "Medford"),
            svc("Green-B", 1, "place-pktrm", "Lechmere"),
        ],
    },
];

const CR_SOUTH_PANELS = [
    { title: "Greenbush",              routeId: "CR-Greenbush",  services: [svc("CR-Greenbush",  0, "place-sstat", "Greenbush")] },
    { title: "Fairmount",              routeId: "CR-Fairmount",  services: [svc("CR-Fairmount",  0, "place-sstat", "Readville"), svc("CR-Fairmount", 0, "place-sstat", "Fairmount")] },
    { title: "Fall River/New Bedford", routeId: "CR-NewBedford", services: [svc("CR-NewBedford", 0, "place-sstat", "New Bedford"), svc("CR-NewBedford", 0, "place-sstat", "Fall River")] },
    { title: "Framingham/Worcester",   routeId: "CR-Worcester",  services: [svc("CR-Worcester",  0, "place-sstat", "Worcester"), svc("CR-Worcester", 0, "place-sstat", "Framingham")] },
    { title: "Franklin/Foxboro",       routeId: "CR-Franklin",   services: [svc("CR-Franklin",   0, "place-sstat", "Foxboro"), svc("CR-Franklin", 0, "place-sstat", "Forge Park"), svc("CR-Franklin", 0, "place-sstat", "Walpole")] },
    { title: "Providence/Stoughton",   routeId: "CR-Providence", services: [svc("CR-Providence", 0, "place-sstat", "Providence"), svc("CR-Providence", 0, "place-sstat", "Wickford"), svc("CR-Providence", 0, "place-sstat", "Stoughton")] },
    { title: "Kingston",               routeId: "CR-Kingston",   services: [svc("CR-Kingston",   0, "place-sstat", "Kingston")] },
    { title: "Needham",                routeId: "CR-Needham",    services: [svc("CR-Needham",    0, "place-sstat", "Needham")] },
];

const CR_NORTH_PANELS = [
    { title: "Fitchburg",            routeId: "CR-Fitchburg",   services: [svc("CR-Fitchburg",   0, "place-north", "Fitchburg"), svc("CR-Fitchburg", 0, "place-north", "Wachusett")] },
    { title: "Lowell",               routeId: "CR-Lowell",      services: [svc("CR-Lowell",      0, "place-north", "Lowell")] },
    { title: "Haverhill",            routeId: "CR-Haverhill",   services: [svc("CR-Haverhill",   0, "place-north", "Haverhill"), svc("CR-Haverhill", 0, "place-north", "Bradford")] },
    { title: "Newburyport/Rockport", routeId: "CR-Newburyport", services: [svc("CR-Newburyport", 0, "place-north", "Newburyport"), svc("CR-Newburyport", 0, "place-north", "Rockport"), svc("CR-Newburyport", 0, "place-north", "Gloucester")] },
];

const FERRY_PANELS = [
    { title: "(F1) RW",   routeId: "Boat-F1",         services: [svc("Boat-F1", 0, "Boat-Rowes", "Hingham")] },
    {
        title: "(F2H) LWN", routeId: "Boat-F1",
        services: [
            svc("Boat-F1", 0, "Boat-Long", "Hingham via Hull"),
            svc("Boat-F1", 0, "Boat-Long", "Hull"),
            svc("Boat-F1", 0, "Boat-Long", "Hingham via Logan Airport & Hull"),
            svc("Boat-F1", 0, "Boat-Long", "HingHam via Logan Airport"),
            svc("Boat-F1", 0, "Boat-Long", "Hingham"),
            svc("Boat-F1", 0, "Boat-Long", "Hull via Logan Airport"),
        ],
    },
    { title: "(F4) LWS",  routeId: "Boat-F4",         services: [svc("Boat-F4",         0, "Boat-Long-South", "Charlestown")] },
    { title: "(F3) LWN",  routeId: "Boat-EastBoston",  services: [svc("Boat-EastBoston",  0, "Boat-Long",       "Lewis Mall")] },
    { title: "(F5) LWN",  routeId: "Boat-Lynn",        services: [svc("Boat-Lynn",        0, "Boat-Long",       "Blossom Street")] },
    { title: "(F6) - AQ", routeId: "Boat-F6",          services: [svc("Boat-F6",          0, "Boat-Aquarium",   "Winthrop")] },
    { title: "(F7) - AQ", routeId: "Boat-F7",          services: [svc("Boat-F7",          0, "Boat-Aquarium",   "Quincy")] },
];

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

    renderCRPanel(CR_SOUTH_PANELS, "South Station", "south-station-cr", 7);
    renderCRPanel(CR_NORTH_PANELS, "North Station", "north-station-cr", 21);
    renderFerryPanel(FERRY_PANELS, "ferry");

    renderNews(cachedNews);
    renderWeather();
}

function startPolling() {
    updateAll();
    setInterval(updateAll, 60000);
}

async function initialLoad() {
    await fetchData();
    if (Object.keys(realtimeData).length > 0) {
        startPolling();
        return;
    }
    // Server hasn't completed its first fetch yet — retry every 5s
    const retryId = setInterval(async () => {
        await fetchData();
        if (Object.keys(realtimeData).length > 0) {
            clearInterval(retryId);
            startPolling();
        }
    }, 5000);
}

startClock();
initialLoad();
