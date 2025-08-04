const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

// Імпортуємо наш модуль для роботи з даними
const dataManager = require('./data');

const app = express();
const server = http.createServer(app);

// Налаштування для Railway: використовуємо порт, який надає платформа, або 3001 для локальної розробки
const PORT = process.env.PORT || 3001;

// --- WebSocket Server ---
const wss = new WebSocketServer({ server });

// Створюємо Map для зберігання з'єднань { username: WebSocket }
const clients = new Map();

// Функція для розсилки оновлених даних усім підключеним клієнтам
function broadcastUpdate() {
  const fullData = dataManager.getData();
  const dataString = JSON.stringify({ type: 'full_update', payload: fullData });

  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(dataString);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');

  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);

      // Коли клієнт реєструється після входу
      if (parsedMessage.type === 'register') {
        const username = parsedMessage.payload;
        ws.username = username; // Зберігаємо ім'я користувача в об'єкті з'єднання
        clients.set(username, ws);
        console.log(`User ${username} registered for WebSocket updates.`);
      }

      // Коли клієнт надсилає оновлені дані (наприклад, після транзакції)
      if (parsedMessage.type === 'client_update') {
        const updatedData = parsedMessage.payload;

        // Оновлюємо дані на сервері
        dataManager.updateUser(updatedData.currentUser, updatedData.userData);
        dataManager.updateShopItems(updatedData.shopItems);
        dataManager.updateTeams(updatedData.teams);

        console.log(`Received update from ${updatedData.currentUser}. Broadcasting...`);
        // Розсилаємо оновлення всім
        broadcastUpdate();
      }

    } catch (error) {
      console.error('Failed to parse message or invalid message format:', error);
    }
  });

  ws.on('close', () => {
    if (ws.username) {
      clients.delete(ws.username);
      console.log(`User ${ws.username} disconnected.`);
    } else {
      console.log('Client disconnected');
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});


// --- Express API Server ---

// Middleware
app.use(cors()); // Дозволяє запити з інших доменів
app.use(express.json()); // Дозволяє серверу читати JSON у тілі запиту

// --- API Routes ---

// Маршрут для логіну
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Ім\'я користувача та пароль є обов\'язковими.' });
  }

  const user = dataManager.findUserByUsername(username);
  const hashedPassword = dataManager.simpleHash(password);

  if (user && user.password === hashedPassword) {
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Ваш акаунт заблоковано.' });
    }

    console.log(`User ${username} logged in successfully.`);
    // Не повертаємо пароль клієнту
    const { password, ...userWithoutPassword } = user;
    res.json({ success: true, isAdmin: !!user.isAdmin, user: userWithoutPassword });
  } else {
    res.status(401).json({ success: false, message: 'Неправильне ім\'я користувача або пароль.' });
  }
});


// Маршрут для отримання всіх даних (після успішного логіну)
app.get('/api/data', (req, res) => {
  res.json(dataManager.getData());
});

// Головний маршрут для оновлення даних
app.post('/api/data', (req, res) => {
  const { user, shopItems, teams } = req.body;

  // Проста валідація
  if (!user) {
    return res.status(400).json({ success: false, message: 'Дані користувача відсутні' });
  }

  // Оновлюємо дані на сервері
  Object.keys(user).forEach(username => {
    dataManager.updateUser(username, user[username]);
  });
  if (shopItems) {
    dataManager.updateShopItems(shopItems);
  }
  if(teams) {
    dataManager.updateTeams(teams);
  }

  // Повідомляємо всім клієнтам про зміни
  broadcastUpdate();

  res.json({ success: true, message: 'Дані успішно оновлено.' });
});


// Запуск сервера
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('WebSocket server is ready.');
});
