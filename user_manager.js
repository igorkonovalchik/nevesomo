// user-manager.js - Управление пользователями и режимами приложения NEVESOMO
// Отвечает за переключение режимов, управление текущим пользователем и обновление интерфейса

import { 
    participants,
    assignments,
    allRoles,
    schedule
} from './core/data-manager.js';

import { 
    renderSchedule,
    updateSessionTabs
} from './ui/ui-renderer.js';

import {
    openMySchedule,
    openStatsPopup,
    openSchedulePopup,
    openDataEditPopup,
    openRolesInfoPopup
} from './ui/popup-manager.js';

/* === СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ === */
export let currentMode = 'user'; // По умолчанию пользовательский режим
export let currentUser = '';

/* === УПРАВЛЕНИЕ РЕЖИМАМИ === */

/**
 * Переключает режим приложения между user и admin
 * @param {string} mode - новый режим ('user' или 'admin')
 */
export function setMode(mode) {
    currentMode = mode;
    
    const deadlineWarning = document.getElementById('deadlineWarning');
    const userSelector = document.getElementById('userSelector');
    const myScheduleBtn = document.getElementById('myScheduleBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const bigGreeting = document.getElementById('bigGreeting');
    
    if (mode === 'admin') {
        // Админ режим
        if (deadlineWarning) deadlineWarning.style.display = 'none';
        if (userSelector) userSelector.style.display = 'block'; // Селектор показываем только админу
        if (myScheduleBtn) myScheduleBtn.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        if (progressText) progressText.style.display = 'none';
        if (bigGreeting) bigGreeting.style.display = 'none'; // Прячем приветствие в админ режиме
    } else {
        // Пользовательский режим
        if (deadlineWarning) deadlineWarning.style.display = 'block';
        if (userSelector) userSelector.style.display = 'none'; // Для обычных участников прячем селектор
        if (myScheduleBtn) myScheduleBtn.style.display = 'block';
        if (progressBar) progressBar.style.display = 'block';
        if (progressText) progressText.style.display = 'block';
        if (bigGreeting) bigGreeting.style.display = 'block'; // Показываем приветствие
    }
    
    updateMenu();
    updateView();
    
    // Сохраняем режим в глобальной области
    window.currentMode = currentMode;
    
    // Уведомляем другие модули о смене режима
    window.dispatchEvent(new CustomEvent('modeChanged', {
        detail: { mode, currentUser }
    }));
}

/**
 * Устанавливает текущего пользователя
 * @param {string} userName - имя пользователя
 */
export function setCurrentUser(userName) {
    currentUser = userName;
    
    // Обновляем селектор
    const userSelect = document.getElementById('currentUser');
    if (userSelect && userSelect.value !== userName) {
        userSelect.value = userName;
    }
    
    // Сохраняем в глобальной области
    window.currentUser = currentUser;
    
    updateView();
    
    // Уведомляем другие модули о смене пользователя
    window.dispatchEvent(new CustomEvent('userChanged', {
        detail: { user: userName, mode: currentMode }
    }));
}

/* === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА === */

/**
 * Обновляет вид приложения
 */
export function updateView() {
    if (currentMode === 'user') {
        currentUser = document.getElementById('currentUser')?.value || currentUser;
        setCurrentUser(currentUser);
    }
    
    // Отрисовываем расписание с новыми параметрами
    renderSchedule(currentMode, currentUser, window.sessionFilters || {});
    updateProgress();
    
    // Обновляем табы после рендеринга
    setTimeout(() => {
        Object.keys(schedule).forEach(day => {
            schedule[day].forEach(session => {
                const sessionKey = `${day}_${session.time}`;
                updateSessionTabs(sessionKey);
            });
        });
    }, 100);
}

/**
 * Обновляет меню в зависимости от режима
 */
export function updateMenu() {
    const menuItems = document.getElementById('menuItems');
    if (!menuItems) return;
    
    let html = '';

    if (currentMode === 'admin') {
        html = `
            <div class="menu-item" onclick="openStatsPopup(); closeMenu();">
                <span>📊 Статистика</span>
            </div>
            <div class="menu-item" onclick="openSchedulePopup(); closeMenu();">
                <span>📅 Расписание</span>
            </div>
            <div class="menu-item" onclick="openDataEditPopup(); closeMenu();">
                <span>⚙️ Изменить данные</span>
            </div>
            <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();">
                <span>❓ О шифтах</span>
            </div>
            <div class="menu-item" onclick="setMode('user'); closeMenu();">
                <span>👤 Режим участника</span>
            </div>
        `;
    } else {
        html = `
            <div class="menu-item" onclick="openMySchedule(); closeMenu();">
                <span>📅 Мое расписание</span>
            </div>
            <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();">
                <span>❓ О шифтах</span>
            </div>
        `;
        
        // Для веб-версии показываем переключение в админ режим
        if (!window.telegramUtils?.telegramUser) {
            html += `
                <div class="menu-item" onclick="setMode('admin'); closeMenu();">
                    <span>👨‍💼 Админ режим</span>
                </div>
            `;
        }
    }

    menuItems.innerHTML = html;
}

/**
 * Обновляет прогресс бар пользователя
 */
export function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const deadlineWarning = document.getElementById('deadlineWarning');
    
    if (currentMode !== 'user' || !currentUser || !progressBar || !progressText || !progressFill) {
        if (progressBar) progressBar.style.display = 'none';
        if (progressText) progressText.style.display = 'none';
        return;
    }
    
    let userShifts = 0;
    Object.values(assignments).forEach(session => {
        Object.values(session).forEach(user => {
            if (user === currentUser) {
                userShifts++;
            }
        });
    });
    
    const minShifts = 8; // Минимум шифтов для участника
    const progress = Math.min((userShifts / minShifts) * 100, 100);
    
    progressFill.style.width = `${progress}%`;
    
    if (progress >= 100) {
        progressText.textContent = '✅ Все шифты выбраны!';
        if (deadlineWarning) deadlineWarning.style.display = 'none';
        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
            if (progressText) progressText.style.display = 'none';
        }, 3000);
    } else {
        progressText.textContent = `${userShifts}/${minShifts} шифтов выбрано`;
        if (deadlineWarning) deadlineWarning.style.display = 'block';
    }
}

/* === ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЕЙ === */

/**
 * Заполняет селектор участников
 */
export function initializeParticipantsSelector() {
    const userSelect = document.getElementById('currentUser');
    if (!userSelect) return;
    
    userSelect.innerHTML = '<option value="">Выберите участника</option>';
    participants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant.name;
        option.textContent = `${participant.name} (${participant.telegram})`;
        userSelect.appendChild(option);
    });
}

/**
 * Инициализирует приветствие для Telegram пользователя
 * @param {string} userName - имя пользователя
 */
export function initializeTelegramUser(userName) {
    const bigGreeting = document.getElementById('bigGreeting');
    const userSelector = document.getElementById('userSelector');
    
    if (bigGreeting) {
        bigGreeting.textContent = `Привет, ${userName}!`;
        bigGreeting.style.display = 'block';
    }
    
    if (userSelector) {
        userSelector.style.display = 'none';
    }
    
    setCurrentUser(userName);
}

/**
 * Определяет режим для пользователя (admin или user)
 * @param {Object} participant - данные участника
 * @returns {string} - режим пользователя
 */
export function determineUserMode(participant) {
    // Для Игоря проверяем только поле isAdmin из таблицы
    return participant.isAdmin === true ? 'admin' : 'user';
}

/* === ОБРАБОТЧИКИ СОБЫТИЙ === */

/**
 * Инициализирует обработчики событий пользователя
 */
export function initUserHandlers() {
    // Обработчик изменения селектора участника
    const userSelect = document.getElementById('currentUser');
    if (userSelect) {
        userSelect.addEventListener('change', (event) => {
            setCurrentUser(event.target.value);
        });
    }
    
    // Обработчик события загрузки данных
    window.addEventListener('dataLoaded', () => {
        initializeParticipantsSelector();
        updateView();
    });
    
    // Обработчик события изменения назначений
    window.addEventListener('assignmentsChanged', () => {
        updateProgress();
    });
    
    // Обработчик события перезагрузки данных
    window.addEventListener('dataReloaded', () => {
        updateView();
    });
}

/* === ГЕТТЕРЫ === */

/**
 * Получает текущего пользователя
 * @returns {string}
 */
export function getCurrentUser() {
    return currentUser;
}

/**
 * Получает текущий режим
 * @returns {string}
 */
export function getCurrentMode() {
    return currentMode;
}

/**
 * Проверяет, является ли текущий пользователь админом
 * @returns {boolean}
 */
export function isCurrentUserAdmin() {
    if (!currentUser) return false;
    const participant = participants.find(p => p.name === currentUser);
    return participant?.isAdmin === true;
}

/**
 * Получает данные текущего пользователя
 * @returns {Object|null}
 */
export function getCurrentUserData() {
    if (!currentUser) return null;
    return participants.find(p => p.name === currentUser) || null;
}

/* === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ONCLICK === */

// Экспортируем функции в глобальную область для onclick
window.setMode = setMode;
window.updateView = updateView;

// Сохраняем текущие значения в глобальной области
window.currentMode = currentMode;
window.currentUser = currentUser;

/* === ИНФОРМАЦИОННЫЕ ФУНКЦИИ === */

/**
 * Показывает информацию о бане
 */
export function showBathInfo() {
    alert(`Банный кемп NEVESOMO\n\nЗдесь проходят банные сессии с парением, массажем и заботой о гостях.\n\nПодробнее в описании ролей.`);
}

// Глобальная функция для onclick
window.showBathInfo = showBathInfo;

console.log('👤 User Manager загружен');