# 📊 Основной алгоритм (RU):
1. **Пользователь вводит город** для генерации мусорных объектов.
2. **Пользователь указывает количество** контейнеров и полигонов.
3. Система **генерирует данные** через Gemini AI и получает:
   - **Координаты** (широта/долгота)
   - **Тип контейнера** (пластик/стекло/бумага/смешанные)
   - **Адресные данные**
   - **Обоснование выбора локации**
4. На карту добавляются маркеры с разными **иконками**:
   - 🟢 Зеленый контейнер - мусорные баки
   - 🔴 Красный значок - полигоны вывоза
5. Пользователь может **построить маршруты** от контейнеров к полигонам.

---

# ⚙️ Набор технологий, инструментов и библиотек (RU):

## 🖥️ Языки программирования:
- **HTML5** – Структура страницы
- **CSS** – Стилизация элементов (glassmorphism)
- **JavaScript** – Основная логика приложения

## 📚 Библиотеки:
- **Leaflet** – Работа с картами
- **Leaflet Routing Machine** – Построение маршрутов
- **SheetJS (xlsx)** – Экспорт в Excel
- **Bootstrap 5.3.0** – Оформление интерфейса

## 🤖 AI-интеграции:
- **Google Gemini** – генерация локаций

---

# 📊 Core Algorithm (EN):
1. **User enters a city** to generate waste management objects.
2. **User specifies the quantity** of containers and landfills.
3. System **generates data** via Gemini AI and retrieves:
   - **Coordinates** (latitude/longitude)
   - **Container type** (plastic/glass/paper/mixed)
   - **Address data**
   - **Location selection rationale**
4. Map displays markers with different **icons**:
   - 🟢 Green container - waste bins
   - 🔴 Red pin - landfills
5. User can **build routes** from containers to landfills.

---

# ⚙️ Technology Stack (EN):

## 🖥️ Programming Languages:
- **HTML5** – Page structure
- **CSS** – Element styling (glassmorphism)
- **JavaScript** – Application logic

## 📚 Libraries:
- **Leaflet** – Map operations
- **Leaflet Routing Machine** – Route building
- **SheetJS (xlsx)** – Excel export
- **Bootstrap 5.3.0** – Interface design

## 🤖 AI Integrations:
- **Google Gemini** – Location generation
