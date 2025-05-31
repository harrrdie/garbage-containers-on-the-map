document.addEventListener('DOMContentLoaded', function() {
    const map = L.map('map').setView([55.7558, 37.6173], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 35],
        iconAnchor: [12, 35],
        popupAnchor: [0, -35]
    });

    const greenIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        iconSize: [25, 35],
        iconAnchor: [12, 35],
        popupAnchor: [0, -35]
    });

    let zipFiles = [];
    let currentMarkers = [];
    let zipLoaded = false;
    let zipInstance = null;

    document.querySelectorAll('#importExcelButton').forEach((btn) => {
        btn.addEventListener('click', function() {
            document.getElementById('excelInput').click();
        });
    });

    document.querySelectorAll('#importZipButton').forEach((btn) => {
        btn.addEventListener('click', function() {
            document.getElementById('zipInput').click();
        });
    });

    document.getElementById('zipInput').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            zipInstance = await JSZip.loadAsync(file);
            zipFiles = [];
            
            Object.keys(zipInstance.files).forEach(filename => {
                if (filename.match(/\.(jpg|jpeg|png)$/i)) {
                    zipFiles.push(filename);
                }
            });
            
            zipLoaded = true;
        } catch (error) {
            console.error('Ошибка чтения ZIP:', error);
            alert('Ошибка при чтении ZIP архива');
        }
    });

    document.getElementById('excelInput').addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                if (!firstSheet) {
                    alert('Ошибка: Лист в Excel не найден');
                    return;
                }

                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                if (jsonData.length === 0) {
                    alert('Ошибка: Excel файл пуст');
                    return;
                }

                if (!zipLoaded) {
                    alert('Сначала загрузите ZIP архив с изображениями');
                    return;
                }

                await processExcelData(jsonData);
            } catch (error) {
                console.error('Ошибка чтения Excel:', error);
                alert('Ошибка при чтении Excel файла');
            }
        };
        reader.readAsArrayBuffer(file);
    });

    async function processExcelData(data) {
        currentMarkers.forEach(marker => map.removeLayer(marker));
        currentMarkers = [];

        if (data.length === 0) {
            alert('Excel файл не содержит данных');
            return;
        }

        for (const row of data) {
            const number = row["НомерПлощадки"];
            const lat = row["Широта"];
            const lon = row["Долгота"];

            if (!lat || !lon) {
                console.warn(`Пропущена запись с неправильными координатами: ${number}`);
                continue;
            }

            const hasImage = zipFiles.some(file => {
                const fileName = file.split('/').pop();
                return fileName.startsWith(`${number}_`);
            });

            let popupContent = ` 
                <b>Наименование:</b> ${row["Наименование"] || 'Нет данных'}<br>
                <b>Номер площадки:</b> ${number || 'Нет данных'}<br>
                <b>Район:</b> ${row["Район"] || 'Нет данных'}<br>
                <b>График:</b> ${row["График"] || 'Нет данных'}
            `;

            if (hasImage && zipInstance) {
                const imageFile = zipFiles.find(file => {
                    const fileName = file.split('/').pop();
                    return fileName.startsWith(`${number}_`);
                });

                try {
                    const imageFileBlob = await zipInstance.file(imageFile).async('blob');
                    const imageUrl = URL.createObjectURL(imageFileBlob);
                    popupContent += `<br><img src="${imageUrl}" style="max-width: 200px; margin-top: 10px;">`;
                } catch (error) {
                    console.error('Ошибка загрузки изображения:', error);
                }
            }

            const marker = L.marker([lat, lon], {
                icon: hasImage ? greenIcon : redIcon
            }).addTo(map).bindPopup(popupContent);

            currentMarkers.push(marker);
        }

        if (currentMarkers.length > 0) {
            const markerGroup = new L.featureGroup(currentMarkers);
            map.fitBounds(markerGroup.getBounds());
        }
    }
});
