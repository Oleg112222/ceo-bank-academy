const crypto = require('crypto');

// Проста функція для хешування пароля, аналогічна до `simpleHash` на клієнті
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
};

const generateRandomID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const prefix = chars[Math.floor(Math.random()*chars.length)] + chars[Math.floor(Math.random()*chars.length)];
  const num = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}${num}`;
};


// --- Глобальний стан на сервері ---
let appData = {
  user: {},
  shopItems: [],
  teams: [],
  settings: {
    initialBalance: 100,
  }
};

function initializeDefaultState() {
  console.log("Initializing default state...");
  // Створюємо адміна, якщо його немає
  if (!appData.user['admin']) {
    appData.user['admin'] = { password: simpleHash('admin123'), isAdmin: true };
  }

  // Створюємо 60 тестових користувачів, якщо їх немає
  if (Object.keys(appData.user).length <= 1) { // Тільки адмін існує
    for (let i = 1; i <= 60; i++) {
      const username = `user${i}`;
      if(!appData.user[username]) {
        appData.user[username] = {
          password: simpleHash(`pass${i}`),
          balance: appData.settings.initialBalance || 100,
          transactions: [],
          isBlocked: false,
          totalSent: 0,
          photo: `./foto${i % 20 + 1}.png`,
          team: null,
          studentID: {
            surname: `Прізвище${i}`,
            name: `Ім'я${i}`,
            dob: `${2000+(i%15)}-${String(i%12+1).padStart(2,'0')}-${String(i%28+1).padStart(2,'0')}`,
            number: generateRandomID(),
            room: `${100+i}`,
          },
        };
      }
    }
    console.log(`${Object.keys(appData.user).length - 1} users created.`);
  }

  // Можна додати початкові товари, якщо потрібно
  if (appData.shopItems.length === 0) {
    appData.shopItems.push(
      { id: 1672522500001, name: "Кава 'Енергія СЕО'", price: 50, discountPrice: 45, quantity: 100, category: 'drinks', description: 'Найкраща кава для продуктивного дня.', image: './t1.png', popularity: 10 },
      { id: 1672522500002, name: "Снек 'Кодерський перекус'", price: 35, discountPrice: null, quantity: 200, category: 'food', description: 'Корисний та смачний.', image: './t2.png', popularity: 5 },
      { id: 1672522500003, name: "Футболка 'Я - СЕО'", price: 350, discountPrice: 300, quantity: 50, category: 'clothing', description: 'Покажи, хто тут головний.', image: './t3.png', popularity: 20 }
    );
    console.log(`${appData.shopItems.length} shop items created.`);
  }
}

// Запускаємо ініціалізацію при першому завантаженні модуля
initializeDefaultState();


// --- Функції для доступу до даних ---

const getData = () => appData;

const findUserByUsername = (username) => {
  return appData.user[username] || null;
};

const getAllUsers = () => {
  // Повертаємо всіх, крім адміна
  const { admin, ...users } = appData.user;
  return users;
};

const updateUser = (username, userData) => {
  if (appData.user[username]) {
    appData.user[username] = { ...appData.user[username], ...userData };
    return appData.user[username];
  }
  return null;
};

const updateShopItems = (items) => {
  appData.shopItems = items;
}

const updateTeams = (teams) => {
  appData.teams = teams;
}

// Експортуємо функції, щоб їх можна було використовувати в server.js
module.exports = {
  simpleHash,
  getData,
  findUserByUsername,
  getAllUsers,
  updateUser,
  updateShopItems,
  updateTeams
};
