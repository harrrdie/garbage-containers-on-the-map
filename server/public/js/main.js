const API_URL = 'http://localhost:3000/api';
let map;
let markers = [];
let landfills = [];
let loadingOverlay;
let routingControls = [];
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initLoadingOverlay();
    initChat();
    document.getElementById('generateButton').addEventListener('click', generateAll);
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
    loadingOverlay.innerHTML = `
        <div class="spinner-container">
            <div class="spinner"></div>
            <div class="loading-text">Идет обработка данных...</div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);
}

function initChat() {
    const chatWidget = document.getElementById('chat-widget');
    const openChatBtn = document.getElementById('open-chat');
    const closeChatBtn = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');
    const quickActions = document.querySelectorAll('.quick-btn');

    openChatBtn.addEventListener('click', () => {
        chatWidget.style.display = 'flex';
        openChatBtn.style.display = 'none';
    });

    closeChatBtn.addEventListener('click', () => {
        chatWidget.style.display = 'none';
        openChatBtn.style.display = 'flex';
    });

    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => e.key === 'Enter' && sendMessage());

    quickActions.forEach(btn => {
        btn.addEventListener('click', () => {
            chatInput.value = btn.dataset.question;
            sendMessage();
        });
    });

    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';
        showTypingIndicator();

        setTimeout(() => generateAIResponse(message), 1000);
    }

    function addMessage(text, sender, isTyping = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        
        if (isTyping) {
            messageDiv.innerHTML = `
                <div class="typing-indicator">
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                    <span class="typing-dot"></span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `<p>${text}</p>`;
            if (sender === 'bot') {
                messageDiv.innerHTML += `
                    <div class="feedback">
                        <button class="like-btn">👍</button>
                        <button class="dislike-btn">👎</button>
                    </div>
                `;
            }
        }

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv;
    }

    function showTypingIndicator() {
        const typingElement = addMessage('', 'bot', true);
        setTimeout(() => {
            typingElement.remove();
        }, 1500);
    }

    async function generateAIResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        const predefinedAnswers = {
            "привет": "Здравствуйте! Чем могу помочь?",
            "как добавить контейнеры/полигоны": "Укажите город, количество контейнеров и полигонов → Нажмите кнопку 'Сгенерировать' → готово!",
            "как экспортировать": "Используйте кнопку 'Экспорт в Excel' в панели управления.",
            "контакты": "Напишите нам в t.me/harrrdie."
        };

        let reply = Object.keys(predefinedAnswers).find(key => lowerMessage.includes(key)) 
            ? predefinedAnswers[Object.keys(predefinedAnswers).find(key => lowerMessage.includes(key))] 
            : null;

        if (!reply) {
            try {
                const response = await fetch(`${API_URL}/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userMessage })
                });
                const data = await response.json();
                reply = data.reply || "Не могу ответить. Попробуйте переформулировать.";
            } catch {
                reply = "Ошибка соединения с сервером.";
            }
        }

        const botMessageElement = addMessage(reply, 'bot');
        setupFeedbackButtons(botMessageElement, reply);
        saveChatHistory(userMessage, reply);
    }

    function setupFeedbackButtons(element, reply) {
        element.querySelector('.like-btn')?.addEventListener('click', () => {
            alert("Спасибо за оценку! Ответ: \"" + reply + "\"");
        });
        element.querySelector('.dislike-btn')?.addEventListener('click', () => {
            prompt("Что не так с ответом? Мы улучшим сервис!", reply);
        });
    }

    function saveChatHistory(userMessage, botReply) {
        chatHistory.push({ user: userMessage, bot: botReply });
        localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
}

async function generateAll() {
    const city = document.getElementById('cityInput').value.trim();
    const markersCount = parseInt(document.getElementById('markersCountInput').value);
    const landfillsCount = parseInt(document.getElementById('landfillNumberInput').value);
    
    if (!city) {
        showAlert('Пожалуйста, введите название города', 'warning');
        return;
    }
    
    if (isNaN(markersCount) || markersCount < 1 || isNaN(landfillsCount) || landfillsCount < 1) {
        showAlert('Пожалуйста, введите корректные количества', 'warning');
        return;
    }
    
    showLoading(true);
    clearAll();
    
    try {
        const [markersResponse, landfillsResponse] = await Promise.all([
            fetch(`${API_URL}/generate-markers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city, count: markersCount })
            }),
            fetch(`${API_URL}/generate-landfills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city, count: landfillsCount })
            })
        ]);
        
        if (!markersResponse.ok || !landfillsResponse.ok) {
            throw new Error(await markersResponse.text() || await landfillsResponse.text());
        }
        
        markers = await markersResponse.json();
        landfills = await landfillsResponse.json();
        
        renderMarkers();
        renderLandfills();
        
        if (markers.length > 0 || landfills.length > 0) {
            const allLayers = [
                ...markers.map(m => L.marker([m.lat, m.lon])),
                ...landfills.map(l => L.marker([l.lat, l.lon]))
            ];
            const group = new L.featureGroup(allLayers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
        
        showAlert(`Успешно сгенерировано: ${markers.length} контейнеров и ${landfills.length} полигонов`, 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showAlert('Ошибка при генерации данных: ' + error.message, 'danger');
    } finally {
        showLoading(false);
    }
}

function renderMarkers() {
    const containerIcon = L.divIcon({
        html: `<div class="custom-marker container-marker"><i class="bi bi-trash"></i></div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    
    markers.forEach(marker => {
        const m = L.marker([marker.lat, marker.lon], { 
            icon: containerIcon,
            zIndexOffset: 1000
        }).addTo(map);
        
        m.bindPopup(`
            <div class="custom-popup">
                <h4><i class="bi bi-trash"></i> Мусорный контейнер</h4>
                <p><strong>Тип:</strong> ${marker.type}</p>
                <p><strong>Адрес:</strong> ${marker.address}</p>
                <p><strong>Обоснование:</strong> ${marker.reason}</p>
            </div>
        `);
    });
}

function renderLandfills() {
    const landfillIcon = L.divIcon({
        html: `<div class="custom-marker landfill-marker"><i class="bi bi-pin-map"></i></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
    });

    landfills.forEach((landfill, index) => {
        const m = L.marker([landfill.lat, landfill.lon], { 
            icon: landfillIcon,
            zIndexOffset: 500
        }).addTo(map);
        
        m.bindPopup(`
            <div class="custom-popup">
                <h4><i class="bi bi-pin-map"></i> Полигон вывоза</h4>
                <p><strong>Адрес:</strong> ${landfill.address}</p>
                <p><strong>Площадь:</strong> ${landfill.area || 'не указана'}</p>
                <button class="btn btn-warning btn-sm show-routes-btn" data-index="${index}">
                    <i class="bi bi-signpost"></i> Показать маршруты
                </button>
            </div>
        `).on('popupopen', () => {
            document.querySelector(`.show-routes-btn[data-index="${index}"]`)
                .addEventListener('click', () => showRoutesToLandfill(index));
        });
    });
}

function showRoutesToLandfill(landfillIndex) {
    clearRoutes();
    const landfill = landfills[landfillIndex];
    const landfillLatLng = L.latLng(landfill.lat, landfill.lon);

    markers.forEach(marker => {
        const routeControl = L.Routing.control({
            waypoints: [
                L.latLng(marker.lat, marker.lon),
                landfillLatLng
            ],
            routeWhileDragging: false,
            show: false,
            lineOptions: {
                styles: [{
                    color: '#f39c12',
                    opacity: 0.9,
                    weight: 4
                }]
            },
            createMarker: () => null
        }).addTo(map);
        routingControls.push(routeControl);
    });
}

function saveToExcel() {
    if (markers.length === 0 && landfills.length === 0) {
        showAlert('Нет данных для сохранения. Сначала сгенерируйте флажки и полигоны.', 'warning');
        return;
    }

    const wb = XLSX.utils.book_new();
    
    if (markers.length > 0) {
        const containersData = markers.map(marker => ({
            'Широта': marker.lat,
            'Долгота': marker.lon,
            'Тип контейнера': marker.type,
            'Адрес': marker.address,
            'Обоснование': marker.reason
        }));
        const wsContainers = XLSX.utils.json_to_sheet(containersData);
        XLSX.utils.book_append_sheet(wb, wsContainers, "Контейнеры");
    }

    if (landfills.length > 0) {
        const landfillsData = landfills.map(landfill => ({
            'Широта': landfill.lat,
            'Долгота': landfill.lon,
            'Адрес': landfill.address,
            'Площадь': landfill.area || 'не указана',
            'Обоснование': landfill.reason
        }));
        const wsLandfills = XLSX.utils.json_to_sheet(landfillsData);
        XLSX.utils.book_append_sheet(wb, wsLandfills, "Полигоны");
    }

    const city = document.getElementById('cityInput').value.trim() || 'данные';
    XLSX.writeFile(wb, `Мусорные_объекты_${city}.xlsx`);
    showAlert(`Файл сохранен: Мусорные_объекты_${city}.xlsx`, 'success');
}

function clearAll() {
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.Routing.Control) {
            map.removeLayer(layer);
        }
    });
    markers = [];
    landfills = [];
    clearRoutes();
}

function clearRoutes() {
    routingControls.forEach(control => map.removeControl(control));
    routingControls = [];
}

function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1100';
    alert.style.minWidth = '300px';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}
