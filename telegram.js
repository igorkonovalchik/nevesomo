// telegram.js – вся логика Telegram Mini‑App
// Подключается ПЕРЕД script.js в index.html
// --------------------------------------------------
(() => {
  /* === Константы администратора === */
  const ADMIN_ID = 154383433;            // numeric user_id Игоря
  const ADMIN_USERNAME = 'konovalchik';  // запасной username, если ID недоступен

  /* === Объект Telegram WebApp === */
  const tg = window.Telegram?.WebApp;
  const telegramUser = tg?.initDataUnsafe?.user || null;

  /* === Функция блюра доступа === */
  function toggleAccessOverlay(show = true) {
    const ov = document.getElementById('accessOverlay');
    if (!ov) return;
    ov.classList[show ? 'add' : 'remove']('show');
  }

  /* === Ждём, когда данные и DOM будут готовы === */
  function waitForData() {
    if (!telegramUser) {
      // Открыто в браузере, а не в Telegram → ничего не блокируем
      toggleAccessOverlay(false);
      return;
    }

    if (!window.participants || !Array.isArray(window.participants) || window.participants.length === 0) {
      // Airtable ещё не загрузился – проверяем позже
      return setTimeout(waitForData, 300);
    }

    applyAccess();
  }

  /* === Основная логика доступа === */
  function applyAccess() {
    const participants = window.participants;

    // 1. большое «Привет, …» под шапкой
    const bigGreet = document.getElementById('bigGreeting');
    if (bigGreet) bigGreet.textContent = `Привет, ${match.name}!`;
    
    // 2. прячем селектор участника (он нужен лишь в веб-версии)
    document.getElementById('userSelector')?.style.setProperty('display', 'none');
    
    // 3. ставим выбранного пользователя в скрытый select,
    //    чтобы остальной код не ломался
    document.getElementById('currentUser').value = match.name;

    // Ищем участника по Telegram_ID или username
    const match = participants.find(p => {
      const idOK = p.telegramId && p.telegramId.toString() === telegramUser.id.toString();
      const userOK = p.telegram && telegramUser.username && p.telegram.replace('@', '') === telegramUser.username;
      return idOK || userOK;
    });

    if (!match) {
      // Нет в базе → блокируем
      toggleAccessOverlay(true);
      return;
    }

    // Приветствие
    const greetingEl = document.getElementById('greetingName');
    if (greetingEl) greetingEl.textContent = match.name;

    // Выставляем текущего пользователя в селекторе (если он существует)
    const userSelect = document.getElementById('currentUser');
    if (userSelect) userSelect.value = match.name;

    // Определяем режим (admin / participant)
    const isAdmin = match.isAdmin || telegramUser.id === ADMIN_ID || telegramUser.username === ADMIN_USERNAME;
    if (typeof window.setMode === 'function') {
      window.setMode(isAdmin ? 'admin' : 'user');
    }

    toggleAccessOverlay(false);
  }

  /* === Стартуем после полной загрузки === */
  document.addEventListener('DOMContentLoaded', () => {
    // Телеграм может прислать событие готовыности (необязательно), поэтому просто запускаем
    waitForData();
  });
})();
