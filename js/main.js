const API_URL = 'http://localhost:3000/api';
let map;
let markers = [];
let loadingOverlay;

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initLoadingOverlay();
    
    document.getElementById('generateButton').addEventListener('click', generateMarkers);
    document.getElementById('saveButton').addEventListener('click', saveToExcel);
});

function initMap() {
    map = L.map('map').setView([55.7558, 37.6173], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

function initLoadingOverlay() {
    loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(loadingOverlay);
}

async function generateMarkers() {
    const city = document.getElementById('cityInput').value.trim();
    const count = parseInt(document.getElementById('markersCountInput').value);
    
    if (!city) {
        alert('Пожалуйста, введите название города');
        return;
    }
    
    if (isNaN(count) || count < 1) {
        alert('Пожалуйста, введите корректное количество флажков');
        return;
    }
    
    showLoading(true);
    clearMarkers();
    
    try {
        const response = await fetch(`${API_URL}/generate-markers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, count })
        });
        
        if (!response.ok) {
            throw new Error(await response.text());
        }
        
        markers = await response.json();
        renderMarkers();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при генерации флажков: ' + error.message);
    } finally {
        showLoading(false);
    }
}

function renderMarkers() {
    const flagIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
    });
    
    markers.forEach(marker => {
        L.marker([marker.lat, marker.lon], { icon: flagIcon })
            .addTo(map)
            .bindPopup(`
                <b>Тип:</b> ${marker.type}<br>
                <b>Адрес:</b> ${marker.address}<br>
                <b>Обоснование:</b> ${marker.reason}
            `);
    });
    
    if (markers.length > 0) {
        const group = new L.featureGroup(markers.map(m => L.marker([m.lat, m.lon])));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

function clearMarkers() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    markers = [];
}

function saveToExcel() {
    if (markers.length === 0) {
        alert('Нет данных для сохранения. Сначала сгенерируйте флажки.');
        return;
    }
    
    const data = markers.map(marker => ({
        'Широта': marker.lat,
        'Долгота': marker.lon,
        'Тип контейнера': marker.type,
        'Адрес': marker.address,
        'Обоснование': marker.reason
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Контейнеры");
    
    const city = document.getElementById('cityInput').value.trim() || 'контейнеры';
    XLSX.writeFile(wb, `Мусорные_контейнеры_${city}.xlsx`);
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}
