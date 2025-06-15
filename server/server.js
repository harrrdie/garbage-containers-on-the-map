require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate-markers', async (req, res) => {
    const { city, count } = req.body;
    try {
        const coords = await getCityCoordinates(city);
        if (!coords) return res.status(404).json({ error: 'Город не найден' });
        const markers = await generateWithGemini(coords, count, 'markers');
        res.json(markers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.post('/api/generate-landfills', async (req, res) => {
    const { city, count } = req.body;
    try {
        const coords = await getCityCoordinates(city);
        if (!coords) return res.status(404).json({ error: 'Город не найден' });
        const landfills = await generateWithGemini(coords, count, 'landfills');
        res.json(landfills);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = `
Ты — AI-ассистент экологического сервиса MapPro (не путай с другими MapPro!). 

Специализация: 
ТОЛЬКО управление мусорными контейнерами и полигонами. Никакого геомаркетинга!

Функционал:
1. Генерация точек контейнеров (пластик/стекло/бумага/смешанные)
2. Создание полигонов вывоза отходов
3. Построение маршрутов транспортировки
4. Экспорт данных в Excel

Жесткие правила:
- Запрещено обсуждать маркетинг, рекламу, поиск клиентов
- Если вопрос не про мусор — отвечай: "Это не поддерживается. MapPro работает только с отходами."
- Примеры ответов:
  • Вопрос: "Как искать клиентов?" → Ответ: "Невозможно. Сервис для логистики отходов."
  • Вопрос: "Как добавить контейнер?" → Ответ: "Введите город, укажите количество и нажмите 'Сгенерировать'."

Текущий вопрос: «${message}»
`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ reply: response.text() });
    } catch (error) {
        res.status(500).json({ error: "Ошибка ИИ. Попробуйте позже." });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function getCityCoordinates(city) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    const data = await response.json();
    return data[0] ? {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
    } : null;
}

async function generateWithGemini(coords, count, type) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const prompt = type === 'markers' ? 
        `Ты эксперт по городской инфраструктуре. Для города ${coords.displayName} (координаты: ${coords.lat}, ${coords.lon}) сгенерируй ${count} оптимальных мест для мусорных контейнеров. Формат ответа (строго JSON): { "markers": [ { "lat": число, "lon": число, "type": "пластик/стекло/бумага/смешанные", "address": "примерный адрес", "reason": "обоснование выбора" } ] }`
        :
        `Ты эксперт по городской инфраструктуре. Для города ${coords.displayName} (координаты: ${coords.lat}, ${coords.lon}) сгенерируй ${count} оптимальных мест для полигонов вывоза мусора. Формат ответа (строго JSON): { "landfills": [ { "lat": число, "lon": число, "address": "примерный адрес", "area": "число га", "reason": "обоснование выбора" } ] }`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}') + 1;
    return JSON.parse(text.slice(startIdx, endIdx))[type];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
