// main.js - Главный файл инициализации (без ES6 модулей)

/* === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ === */
let sessionFilters = {};

/* === ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ === */
async function init() {
    try {
        console.log('🚀 Запуск приложения NEVESOMO...');
        
        // Загружаем данные из Airtable
        await loadAirtableData();
        
        // Инициализируем селектор участников
        initializeParticipantsSelector();
        
        // Инициализируем фильтры сессий
        initSessionFilters();
        
        // Загружаем сохраненную тему
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        
        // Запускаем обратный отсчет
        startCountdown();
        
        // Инициализируем обработчики
        initAllHandlers();
        
        // Обновляем меню и интерфейс
        updateMenu();
        renderSchedule();
        updateProgress();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showErrorMessage('Не удалось загрузить приложение. Попробуйте перезагрузить страницу.');
    }
}

/* === ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ === */
function initSessionFilters() {
    sessionFilters = {};
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            sessionFilters[sessionKey] = 'all';
        });
    });
    
    // Делаем доступными глобально
    window.sessionFilters = sessionFilters;
}

function initAllHandlers() {
    // Инициализируем обработчики пользователей
    initUserHandlers();
    
    // Инициализируем обработчики попапов
    initPopupHandlers();
    
    // Инициализируем обработчики сессий
    initSessionHandlers();
    
    // Инициализируем обработчики меню
    initMenuHandlers();
    
    // Инициализируем обработчики тем
    initThemeHandlers();
}

function initSessionHandlers() {
    // Глобальные функции для работы с сессиями
    window.toggleSession = function(sessionKey) {
        const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
        if (sessionElement) {
            sessionElement.classList.toggle('expanded');
        }
    };
    
    window.setSessionFilter = function(sessionKey, filter) {
        sessionFilters[sessionKey] = filter;
        
        const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
        if (sessionElement) {
            sessionElement.querySelectorAll('.session-tab').forEach(tab => tab.classList.remove('active'));
            const filterTab = sessionElement.querySelector(`[data-filter="${filter}"]`);
            if (filterTab) {
                filterTab.classList.add('active');
            }
        }
        
        // Перерисовываем роли сессии
        const container = document.getElementById(`roles-${sessionKey}`);
        if (container) {
            const html = renderSessionRoles(sessionKey, filter);
            container.innerHTML = html;
        }
        updateSessionTabs(sessionKey);
    };
}

function initMenuHandlers() {
    window.toggleMenu = function() {
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) {
            menuOverlay.classList.toggle('show');
        }
    };

    window.closeMenu = function() {
        const menuOverlay = document.getElementById('menuOverlay');
        if (menuOverlay) {
            menuOverlay.classList.remove('show');
        }
    };
}

function initThemeHandlers() {
    window.toggleTheme = function() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };
}

/* === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ === */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

function startCountdown() {
    const deadline = new Date('2025-07-08T23:59:59');
    
    function updateCountdown() {
        const now = new Date();
        const timeLeft = deadline - now;
        
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;
        
        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            countdownElement.textContent = 
                `⏰ ${days}д ${hours}ч ${minutes}м ${seconds}с до дедлайна`;
        } else {
            countdownElement.textContent = '🔴 ДЕДЛАЙН ИСТЕК!';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function showErrorMessage(message) {
    const container = document.getElementById('schedule');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 2em; margin-bottom: 16px;">❌</div>
                <div style="font-size: 1.2em; color: var(--error-color); margin-bottom: 16px;">
                    Ошибка загрузки
                </div>
                <div style="color: var(--text-secondary); margin-bottom: 16px;">
                    ${message}
                </div>
                <button onclick="location.reload()" style="background: var(--accent-primary); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                    Перезагрузить
                </button>
            </div>
        `;
    }
}

/* === ИНТЕГРАЦИЯ С TELEGRAM === */
window.addEventListener('dataLoaded', () => {
    // Проверяем Telegram интеграцию
    const telegramUser = window.telegramUtils?.telegramUser;
    if (telegramUser && participants.length > 0) {
        console.log('🤖 Обнаружен Telegram пользователь:', telegramUser);
        
        // Ищем участника по Telegram ID или username
        const match = participants.find(p => {
            const idOK = p.telegramId && p.telegramId.toString() === telegramUser.id.toString();
            const userOK = p.telegram && telegramUser.username && 
                         p.telegram.replace('@', '').toLowerCase() === telegramUser.username.toLowerCase();
            return idOK || userOK;
        });

        if (match) {
            console.log('✅ Участник найден:', match.name);
            
            // Инициализируем Telegram пользователя
            initializeTelegramUser(match.name);
            
            // Определяем и устанавливаем режим
            const userMode = determineUserMode(match);
            setMode(userMode);
            
            console.log(`👤 Режим пользователя: ${userMode}`);
        } else {
            console.log('❌ Участник не найден в базе');
        }
    }
});

/* === ГЛОБАЛЬНЫЕ ФУНКЦИИ === */
// Основные функции управления
window.setMode = setMode;
window.updateView = updateView;
window.showBathInfo = showBathInfo;

// Функции попапов
window.openMySchedule = openMySchedule;
window.openStatsPopup = openStatsPopup;
window.openSchedulePopup = openSchedulePopup;
window.closeStatsPopup = closeStatsPopup;
window.closeSchedulePopup = closeSchedulePopup;
window.openRolesInfoPopup = openRolesInfoPopup;
window.closeRolesInfoPopup = closeRolesInfoPopup;
window.showRoleDetail = showRoleDetail;
window.closeRoleDetailPopup = closeRoleDetailPopup;
window.openDataEditPopup = openDataEditPopup;
window.shareSchedule = shareSchedule;

// Функции назначений
window.handleRoleSlotClick = handleRoleSlotClick;
window.selectParticipant = selectParticipant;
window.autoFillSession = autoFillSession;
window.closeParticipantPopup = closeParticipantPopup;

// Переменные состояния
window.currentMode = currentMode;
window.currentUser = currentUser;

/* === ЗАПУСК ПРИЛОЖЕНИЯ === */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запускаем инициализацию...');
    
    // Инициализируем Telegram WebApp если доступен
    const tg = window.Telegram?.WebApp;
    if (tg) {
        console.log('🤖 Инициализируем Telegram WebApp...');
        tg.ready();
        tg.expand();
    }
    
    // Запускаем основную инициализацию
    init().catch(error => {
        console.error('💥 Критическая ошибка при запуске:', error);
    });
});

// Обработчик ошибок для отладки
window.addEventListener('error', (event) => {
    console.error('🚨 Глобальная ошибка:', event.error);
});

console.log('🎯 Main.js загружен и готов к инициализации');
