require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate-markers', async (req, res) => {
    const { city, count } = req.body;

    try {
        const coords = await getCityCoordinates(city);
        if (!coords) {
            return res.status(404).json({ error: 'Город не найден' });
        }

        const markers = await generateWithGemini(coords, count);
        
        res.json(markers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
});

async function getCityCoordinates(city) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`
    );
    const data = await response.json();
    return data[0] ? {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        displayName: data[0].display_name
    } : null;
}

async function generateWithGemini(coords, count) {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
        Ты эксперт по городской инфраструктуре. Для города ${coords.displayName} (координаты: 
        ${coords.lat}, ${coords.lon}) сгенерируй ${count} оптимальных мест для мусорных контейнеров.
        
        Требования:
        1. Учитывай плотность населения
        2. Располагай в 50-100 метрах от жилых домов
        3. Обеспечь доступность для спецтранспорта
        
        Формат ответа (строго JSON):
        {
            "markers": [
                {
                    "lat": число (в радиусе 5 км от центра),
                    "lon": число,
                    "type": "пластик/стекло/бумага/смешанные",
                    "address": "примерный адрес",
                    "reason": "обоснование выбора"
                }
            ]
        }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}') + 1;
    return JSON.parse(text.slice(startIdx, endIdx)).markers;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
