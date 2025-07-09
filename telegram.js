// telegram.js – вся логика Telegram Mini‑App
// Подключается ПЕРЕД script.js в index.html
// --------------------------------------------------
(() => {
  /* === Константы администратора === */
  const ADMIN_ID = 154383433;            // numeric user_id Игоря
  const ADMIN_USERNAME = 'konovalchik';  // запасной username, если ID недоступен

  /* === Объект Telegram WebApp === */
  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user || null;

  /* === Функция блокировки доступа === */
  function toggleAccessOverlay(show = true) {
    const ov = document.getElementById('accessOverlay');
    if (!ov) return;
    ov.style.display = show ? 'flex' : 'none';
  }

  /* === Автоматическая тема из Telegram === */
  function applyTelegramTheme() {
    if (tg?.colorScheme) {
      // Telegram передает 'dark' или 'light'
      document.documentElement.setAttribute('data-theme', tg.colorScheme);
      localStorage.setItem('theme', tg.colorScheme);
      
      const themeToggle = document.querySelector('.theme-toggle');
      if (themeToggle) {
        themeToggle.textContent = tg.colorScheme === 'light' ? '🌙' : '☀️';
      }
    }
  }

  /* === Основная логика доступа === */
 function applyAccess() {
    const participants = window.participants;
    
    // Ищем участника по Telegram_ID или username
    const match = participants.find(p => {
      const idOK = p.telegramId && p.telegramId.toString() === telegramUser.id.toString();
      const userOK = p.telegram && telegramUser.username && 
                     p.telegram.replace('@', '').toLowerCase() === telegramUser.username.toLowerCase();
      return idOK || userOK;
    });

    if (!match) {
      // Нет в базе → включаем demoMode
      window.isDemoMode = true;
      console.log('[DEBUG] Telegram: demoMode включён, пользователь не найден в базе');
      toggleAccessOverlay(false); // Скрываем блокировку
      if (typeof window.updateMenu === 'function') window.updateMenu();
      return;
    }
    window.isDemoMode = false;

    // Снимаем блокировку
    toggleAccessOverlay(false);
    
    // 1. Большое приветствие под шапкой
    const bigGreet = document.getElementById('bigGreeting');
    if (bigGreet) {
      bigGreet.textContent = `Привет, ${match.name}!`;
      bigGreet.style.display = 'block';
    }
    
    // 2. Прячем селектор участника
    const userSelector = document.getElementById('userSelector');
    if (userSelector) {
      userSelector.style.display = 'none';
    }
    
    // 3. Выставляем текущего пользователя
    const userSelect = document.getElementById('currentUser');
    if (userSelect) {
      userSelect.value = match.name;
    }

    // ИСПРАВЛЕНИЕ: Вызываем функцию setCurrentUser правильно
    if (typeof window.setCurrentUser === 'function') {
        window.setCurrentUser(match.name);
    } else {
        // Fallback если функция еще не загружена
        window.currentUser = match.name;
    }

    // 4. Определяем режим (admin / user)
    const isAdmin = match.isAdmin === true;
    
    // Сохраняем режим в глобальную переменную
    window.currentMode = isAdmin ? 'admin' : 'user';
    
    // Вызываем функции из script.js если они уже загружены
    if (typeof window.setMode === 'function') {
      window.setMode(window.currentMode);
    }
    
    if (typeof window.updateView === 'function') {
      window.updateView();
    }
    
    if (typeof window.updateMenu === 'function') {
      window.updateMenu();
    }
}

  /* === Ждём, когда данные и DOM будут готовы === */
  function waitForData() {
    if (!telegramUser) {
      // Открыто в браузере, а не в Telegram
      toggleAccessOverlay(false);
      
      // В веб-версии показываем селектор для всех
      const userSelector = document.getElementById('userSelector');
      if (userSelector) {
        userSelector.style.display = 'block';
      }
      
      // В веб-версии устанавливаем user режим по умолчанию
      window.currentMode = 'user';
      
      return;
    }

    if (!window.participants || !Array.isArray(window.participants) || window.participants.length === 0) {
      // Airtable ещё не загрузился – проверяем позже
      setTimeout(waitForData, 300);
      return;
    }

    // Применяем тему из Telegram
    applyTelegramTheme();
    
    // Применяем доступ
    applyAccess();
  }

  /* === Стартуем после полной загрузки === */
  document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем Telegram WebApp
    if (tg) {
      tg.ready();
      tg.expand(); // Разворачиваем на весь экран
    }
    
    // Начинаем проверку доступа
    waitForData();
  });
  
  // Экспортируем функции для использования в других скриптах
  window.telegramUtils = {
    toggleAccessOverlay,
    applyTelegramTheme,
    telegramUser,
    tg
  };
  
  // Слушаем изменения темы в Telegram
  if (tg) {
    tg.onEvent('themeChanged', () => {
      applyTelegramTheme();
    });
  }
})();
