var map = L.map('map').setView([55.7558, 37.6173], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var redFlagIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',  
    iconSize: [25, 35],
    iconAnchor: [15, 45], 
    popupAnchor: [0, -45] 
});

var yellowFlagIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',  
    iconSize: [25, 35],
    iconAnchor: [15, 45], 
    popupAnchor: [0, -45] 
});

var greenFlagIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',  
    iconSize: [25, 35],
    iconAnchor: [15, 45], 
    popupAnchor: [0, -45] 
});

document.getElementById('importButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(evt) {
        var data = evt.target.result;
        var workbook = XLSX.read(data, { type: 'binary' });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var jsonData = XLSX.utils.sheet_to_json(sheet);

        processExcelData(jsonData);
    };
    reader.readAsBinaryString(file);
});

function processExcelData(data) {
    var markersData = [];

    data.forEach(row => {
        var lat = row["Широта"];
        var lon = row["Долгота"];
        var type = row["Признак"];

        var icon;
        if (type === "Контейнер") {
            icon = redFlagIcon;
        } else if (type === "Урна") {
            icon = yellowFlagIcon;
        } else if (type === "Мусорный бак") {
            icon = greenFlagIcon;
        }
        
        if (lat && lon && icon) {
            markersData.push({
                lat: lat,
                lon: lon,
                icon: icon,
                popupText: type
            });
        }
    });
    
    addMarkersToMap(markersData);
}

function addMarkersToMap(markersData) {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });

    markersData.forEach(marker => {
        L.marker([marker.lat, marker.lon], { icon: marker.icon })
            .addTo(map)
            .bindPopup(marker.popupText);
    });

    if (markersData.length > 0) {
        var markerGroup = new L.featureGroup(
            markersData.map(m => L.marker([m.lat, m.lon]))
        );
        map.fitBounds(markerGroup.getBounds());
    }
}
