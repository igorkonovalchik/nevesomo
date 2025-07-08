/**
 * NEVESOMO Шифты 2025 - Главный файл инициализации
 * @author Igor Konovalchik
 * @version 2.0
 */

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

const CONFIG = {
    DEADLINE: '2025-07-08T23:59:59',
    LOADING_DELAYS: {
        LOGO_DISPLAY: 2000,
        CONTENT_FADE: 500,
        TEXT_CHANGE: 1000,
        SCREEN_HIDE: 500
    },
    LOADING_TEXTS: [
        'Грузим участников...',
        'Загружаем шифты...',
        'Тупим...'
    ],
    TOOLTIP_TIMEOUT: 3000,
    SCROLL_THRESHOLD: 10
};

// ============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ СОСТОЯНИЯ
// ============================================================================

/** @type {Object.<string, string>} Фильтры сессий */
let sessionFilters = {};

/** @type {string} Текущий пользователь */
let currentUser = '';

/** @type {string} Текущий режим (user/admin) */
let currentMode = 'user';

// ============================================================================
// ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ============================================================================

/**
 * Основная функция инициализации приложения
 * @async
 * @returns {Promise<void>}
 */
async function init() {
    try {
        console.log('🚀 Запуск приложения NEVESOMO...');
        
        // Показываем заставку загрузки
        await showLoadingScreen();
        
        // Загружаем данные из Airtable
        await loadAirtableData();
        
        // Инициализируем глобальные переменные состояния
        initializeGlobalState();
        
        // Инициализируем компоненты приложения
        initializeComponents();
        
        // Загружаем пользовательские настройки
        loadUserPreferences();
        
        // Запускаем фоновые процессы
        startBackgroundProcesses();
        
        // Инициализируем обработчики событий
        initializeEventHandlers();
        
        // Обновляем интерфейс
        updateInterface();
        
        updateFooterVersion();
        
        // Скрываем заставку
        hideLoadingScreen();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showLoadingError();
    }
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ СОСТОЯНИЯ
// ============================================================================

/**
 * Инициализирует глобальные переменные состояния
 */
function initializeGlobalState() {
    // Инициализируем глобальные переменные состояния
    if (typeof window.currentUser === 'undefined') {
        window.currentUser = '';
    }
    if (typeof window.currentMode === 'undefined') {
        window.currentMode = 'user';
    }
    
    // Устанавливаем локальные переменные
    currentUser = window.currentUser;
    currentMode = window.currentMode;
    
    console.log('🔧 Инициализированы переменные состояния:', {
        currentUser,
        currentMode
    });
}

/**
 * Инициализирует компоненты приложения
 */
function initializeComponents() {
    // Инициализируем селектор участников
    initializeParticipantsSelector();
    
    // Инициализируем фильтры сессий
    initializeSessionFilters();
}

/**
 * Загружает пользовательские настройки
 */
function loadUserPreferences() {
    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

/**
 * Запускает фоновые процессы
 */
function startBackgroundProcesses() {
    // Запускаем обратный отсчет
    startCountdown();
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ И КОМПОНЕНТОВ
// ============================================================================

/**
 * Инициализирует фильтры сессий
 */
function initializeSessionFilters() {
    sessionFilters = {};
    
    if (schedule) {
        Object.keys(schedule).forEach(day => {
            schedule[day].forEach(session => {
                const sessionKey = `${day}_${session.time}`;
                sessionFilters[sessionKey] = 'all';
            });
        });
    }
    
    // Делаем доступными глобально
    window.sessionFilters = sessionFilters;
}

/**
 * Инициализирует все обработчики событий
 */
function initializeEventHandlers() {
    initializeSessionHandlers();
    initializeMenuHandlers();
    initializeThemeHandlers();
    initializePopupHandlers();
    initializeUserHandlers();
    initializeTouchHandlers();
}

// ============================================================================
// ОБРАБОТЧИКИ СЕССИЙ
// ============================================================================

/**
 * Инициализирует обработчики сессий
 */
function initializeSessionHandlers() {
    // Глобальные функции для работы с сессиями
    window.toggleSession = toggleSession;
    window.setSessionFilter = setSessionFilter;
}

/**
 * Переключает состояние сессии (развернута/свернута)
 * @param {string} sessionKey - Ключ сессии
 */
function toggleSession(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    const isCurrentlyExpanded = sessionElement.classList.contains('expanded');
    
    // Закрываем все открытые сессии
    document.querySelectorAll('.session.expanded').forEach(session => {
        session.classList.remove('expanded');
    });
    
    // Если текущая сессия была закрыта, открываем её
    if (!isCurrentlyExpanded) {
        sessionElement.classList.add('expanded');
    }
}

/**
 * Устанавливает фильтр для сессии
 * @param {string} sessionKey - Ключ сессии
 * @param {string} filter - Фильтр (all, banking, care, etc.)
 */
function setSessionFilter(sessionKey, filter) {
    sessionFilters[sessionKey] = filter;
    
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (sessionElement) {
        // Обновляем активную вкладку
        sessionElement.querySelectorAll('.session-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
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
}

// ============================================================================
// ОБРАБОТЧИКИ МЕНЮ
// ============================================================================

/**
 * Инициализирует обработчики меню
 */
function initializeMenuHandlers() {
    window.toggleMenu = toggleMenu;
    window.closeMenu = closeMenu;
}

/**
 * Переключает состояние меню
 */
function toggleMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        menuOverlay.classList.toggle('show');
    }
}

/**
 * Закрывает меню
 */
function closeMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        menuOverlay.classList.remove('show');
    }
}

// ============================================================================
// ОБРАБОТЧИКИ ТЕМЫ
// ============================================================================

/**
 * Инициализирует обработчики темы
 */
function initializeThemeHandlers() {
    window.toggleTheme = toggleTheme;
}

/**
 * Переключает тему приложения
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

/**
 * Устанавливает тему приложения
 * @param {string} theme - Название темы (light/dark)
 */
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// ============================================================================
// ОБРАБОТЧИКИ ПОПАПОВ
// ============================================================================

/**
 * Инициализирует обработчики попапов
 */
function initializePopupHandlers() {
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
    window.openUserScheduleFromStats = openUserScheduleFromStats;
    window.openCommentPopup = openCommentPopup;
    window.closeCommentPopup = closeCommentPopup;
    window.skipComment = skipComment;
    window.saveComment = saveComment;
    window.showConfirmation = showConfirmation;
    window.closeConfirmPopup = closeConfirmPopup;
    window.showNotification = showNotification;
    window.completeAssignment = completeAssignment;
}

// ============================================================================
// ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЕЙ
// ============================================================================

/**
 * Инициализирует обработчики пользователей
 */
function initializeUserHandlers() {
    // Функции назначений
    window.handleRoleSlotClick = handleRoleSlotClick;
    window.selectParticipant = selectParticipant;
    window.autoFillSession = autoFillSession;
    window.closeParticipantPopup = closeParticipantPopup;
    
    // Основные функции управления
    window.setMode = setMode;
    window.updateView = updateView;
    window.showBathInfo = showBathInfo;
    
    // Переменные состояния
    window.currentMode = currentMode;
    window.currentUser = currentUser;
}

// ============================================================================
// ОБРАБОТЧИКИ TOUCH И СКРОЛЛА
// ============================================================================

/**
 * Инициализирует обработчики touch событий
 */
function initializeTouchHandlers() {
    // Включаем momentum scrolling для всех горизонтальных списков
    const scrollableElements = document.querySelectorAll('.session-tabs, .roles-grid-compact');
    
    scrollableElements.forEach(element => {
        setupTouchScrolling(element);
    });
}

/**
 * Настраивает touch скроллинг для элемента
 * @param {HTMLElement} element - Элемент для настройки скроллинга
 */
function setupTouchScrolling(element) {
    let isDown = false;
    let startX;
    let scrollLeft;
    
    element.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - element.offsetLeft;
        scrollLeft = element.scrollLeft;
    });
    
    element.addEventListener('mouseleave', () => {
        isDown = false;
    });
    
    element.addEventListener('mouseup', () => {
        isDown = false;
    });
    
    element.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - element.offsetLeft;
        const walk = (x - startX) * 2;
        element.scrollLeft = scrollLeft - walk;
    });
}

// ============================================================================
// ОБРАТНЫЙ ОТСЧЕТ
// ============================================================================

/**
 * Запускает обратный отсчет до дедлайна
 */
function startCountdown() {
    const deadline = new Date(CONFIG.DEADLINE);
    
    function updateCountdown() {
        const now = new Date();
        const timeLeft = deadline - now;
        
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;
        
        if (timeLeft > 0) {
            const { days, hours, minutes, seconds } = calculateTimeLeft(timeLeft);
            countdownElement.textContent = 
                `⏰ ${days}д ${hours}ч ${minutes}м ${seconds}с до дедлайна`;
        } else {
            countdownElement.textContent = '🔴 ДЕДЛАЙН ИСТЕК!';
        }
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

/**
 * Вычисляет оставшееся время
 * @param {number} timeLeft - Оставшееся время в миллисекундах
 * @returns {Object} Объект с днями, часами, минутами и секундами
 */
function calculateTimeLeft(timeLeft) {
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
}

// ============================================================================
// УПРАВЛЕНИЕ ЗАСТАВКОЙ ЗАГРУЗКИ
// ============================================================================

/**
 * Показывает заставку загрузки
 * @async
 * @returns {Promise<void>}
 */
async function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingLogo = document.querySelector('.loading-logo');
    const loadingContent = document.querySelector('.loading-content');
    const loadingText = document.getElementById('loadingText');
    
    if (!loadingScreen) return;
    
    // Показываем заставку
    loadingScreen.classList.remove('hidden');
    
    // Показываем логотип на заданное время
    await new Promise(resolve => setTimeout(resolve, CONFIG.LOADING_DELAYS.LOGO_DISPLAY));
    
    // Блюрим логотип и показываем лоадер
    loadingLogo.classList.add('blurred');
    loadingContent.style.display = 'block';
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.LOADING_DELAYS.CONTENT_FADE));
    loadingContent.classList.add('visible');
    
    // Запускаем смену текстов
    startLoadingTextAnimation(loadingText);
}

/**
 * Запускает анимацию смены текстов загрузки
 * @param {HTMLElement} textElement - Элемент для отображения текста
 */
function startLoadingTextAnimation(textElement) {
    if (!textElement) return;
    
    let currentIndex = 0;
    
    const updateText = () => {
        if (textElement && currentIndex < CONFIG.LOADING_TEXTS.length) {
            textElement.textContent = CONFIG.LOADING_TEXTS[currentIndex];
            textElement.style.animation = 'none';
            
            setTimeout(() => {
                if (textElement) {
                    textElement.style.animation = 'fadeInText 0.5s ease';
                }
            }, 10);
            
            currentIndex++;
            
            if (currentIndex < CONFIG.LOADING_TEXTS.length) {
                setTimeout(updateText, CONFIG.LOADING_DELAYS.TEXT_CHANGE);
            } else {
                // Остаемся на последнем тексте если загрузка затянулась
                textElement.textContent = CONFIG.LOADING_TEXTS[CONFIG.LOADING_TEXTS.length - 1];
            }
        }
    };
    
    updateText();
}

/**
 * Скрывает заставку загрузки
 */
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        
        // Полностью удаляем через заданное время после анимации
        setTimeout(() => {
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.style.display = 'none';
            }
        }, CONFIG.LOADING_DELAYS.SCREEN_HIDE);
    }
}

/**
 * Показывает ошибку загрузки
 */
function showLoadingError() {
    const loadingText = document.getElementById('loadingText');
    const loadingError = document.getElementById('loadingError');
    const spinner = document.querySelector('.loading-spinner');
    
    if (loadingText) loadingText.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (loadingError) loadingError.style.display = 'block';
}

// ============================================================================
// УТИЛИТЫ ИНТЕРФЕЙСА
// ============================================================================

/**
 * Показывает тултип прогресса
 * @param {HTMLElement} element - Элемент для позиционирования тултипа
 * @param {number} emptySlots - Количество свободных слотов
 */
window.showProgressTooltip = function(element, emptySlots) {
    // Удаляем существующий тултип
    const existingTooltip = document.querySelector('.progress-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Создаем новый тултип
    const tooltip = document.createElement('div');
    tooltip.className = 'progress-tooltip';
    tooltip.textContent = `Осталось ${emptySlots} свободных слотов`;
    
    // Позиционируем относительно элемента
    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) + 'px';
    tooltip.style.top = (rect.top - 40) + 'px';
    
    document.body.appendChild(tooltip);
    
    // Удаляем через заданное время
    setTimeout(() => {
        tooltip.remove();
    }, CONFIG.TOOLTIP_TIMEOUT);
    
    // Удаляем при клике в любом месте
    document.addEventListener('click', function removeTooltip() {
        tooltip.remove();
        document.removeEventListener('click', removeTooltip);
    });
};

/**
 * Проверяет прокрутку табов
 * @param {string} sessionKey - Ключ сессии
 */
window.checkTabsScroll = function(sessionKey) {
    const wrapper = document.getElementById(`tabs-wrapper-${sessionKey}`);
    const tabs = wrapper?.querySelector('.session-tabs');
    
    if (!tabs) return;
    
    const isScrollable = tabs.scrollWidth > tabs.clientWidth;
    const isAtEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - CONFIG.SCROLL_THRESHOLD;
    
    if (isScrollable && !isAtEnd) {
        wrapper.classList.add('scrollable');
    } else {
        wrapper.classList.remove('scrollable');
    }
};

// ============================================================================
// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
// ============================================================================

/**
 * Обновляет интерфейс приложения
 */
function updateInterface() {
    updateMenu();
    renderSchedule();
    updateProgress();
}

// ============================================================================
// ИНТЕГРАЦИЯ С TELEGRAM
// ============================================================================

/**
 * Обработчик события загрузки данных
 */
window.addEventListener('dataLoaded', () => {
    handleTelegramIntegration();
});

/**
 * Обрабатывает интеграцию с Telegram
 */
function handleTelegramIntegration() {
    const telegramUser = window.telegramUtils?.telegramUser;
    if (!telegramUser || participants.length === 0) return;
    
    console.log('🤖 Обнаружен Telegram пользователь:', telegramUser);
    
    // Ищем участника по Telegram ID или username
    const match = findParticipantByTelegram(telegramUser);
    
    if (match) {
        console.log('✅ Участник найден:', match.name);
        setupTelegramUser(match);
    } else {
        console.log('❌ Участник не найден в базе');
    }
}

/**
 * Ищет участника по Telegram данным
 * @param {Object} telegramUser - Данные пользователя Telegram
 * @returns {Object|null} Найденный участник или null
 */
function findParticipantByTelegram(telegramUser) {
    return participants.find(p => {
        const idMatch = p.telegramId && p.telegramId.toString() === telegramUser.id.toString();
        const userMatch = p.telegram && telegramUser.username && 
                         p.telegram.replace('@', '').toLowerCase() === telegramUser.username.toLowerCase();
        return idMatch || userMatch;
    });
}

/**
 * Настраивает пользователя Telegram
 * @param {Object} match - Найденный участник
 */
function setupTelegramUser(match) {
    // Устанавливаем currentUser правильно
    window.currentUser = match.name;
    currentUser = match.name;
    
    // Инициализируем Telegram пользователя
    if (typeof initializeTelegramUser === 'function') {
        initializeTelegramUser(match.name);
    }
    
    // Определяем и устанавливаем режим
    const userMode = determineUserMode(match);
    setMode(userMode);
    
    console.log(`👤 Режим пользователя: ${userMode}, currentUser: ${window.currentUser}`);
}

// ============================================================================
// ОБРАБОТКА ОШИБОК
// ============================================================================

/**
 * Показывает сообщение об ошибке
 * @param {string} message - Текст ошибки
 */
function showErrorMessage(message) {
    const container = document.getElementById('schedule');
    if (!container) return;
    
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

// ============================================================================
// ОТЛАДКА И ДИАГНОСТИКА
// ============================================================================

/**
 * Функция отладки системы бронирования
 * @returns {Object} Объект с данными для отладки
 */
window.debugBookingSystem = function() {
    console.log('🔍 === ОТЛАДКА СИСТЕМЫ БРОНИРОВАНИЯ ===');
    
    console.log('👤 Текущий пользователь:');
    console.log('  window.currentUser:', window.currentUser);
    console.log('  currentUser (локальный):', typeof currentUser !== 'undefined' ? currentUser : 'не определен');
    
    console.log('🎯 Переменные попапа:');
    console.log('  window.currentPopupSession:', window.currentPopupSession);
    console.log('  window.currentPopupRole:', window.currentPopupRole);
    console.log('  window.pendingAssignment:', window.pendingAssignment);
    
    console.log('🔧 Функции:');
    console.log('  openBookShiftPopup:', typeof window.openBookShiftPopup);
    console.log('  confirmBookShift:', typeof window.confirmBookShift);
    console.log('  completeAssignment:', typeof window.completeAssignment);
    console.log('  handleRoleSlotClick:', typeof window.handleRoleSlotClick);
    
    console.log('📊 Данные:');
    console.log('  assignments keys:', Object.keys(window.assignments || {}));
    console.log('  participants:', window.participants?.length || 0);
    
    return {
        currentUser: window.currentUser,
        popupSession: window.currentPopupSession,
        popupRole: window.currentPopupRole,
        pendingAssignment: window.pendingAssignment
    };
};

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ DOM
// ============================================================================

/**
 * Обработчик загрузки DOM
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запускаем инициализацию...');
    
    // Инициализируем Telegram WebApp если доступен
    initializeTelegramWebApp();
    
    // Показываем заставку сразу и запускаем инициализацию
    init().catch(error => {
        console.error('💥 Критическая ошибка при запуске:', error);
        showLoadingError();
    });
});

/**
 * Инициализирует Telegram WebApp
 */
function initializeTelegramWebApp() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        console.log('🤖 Инициализируем Telegram WebApp...');
        tg.ready();
        tg.expand();
    }
}

/**
 * Обновляет версию в футере
 */
function updateFooterVersion() {
    const versionSpan = document.getElementById('appVersion');
    if (versionSpan) {
        versionSpan.textContent = window.appVersion;
    }
}

// ============================================================================
// ГЛОБАЛЬНЫЕ ОБРАБОТЧИКИ ОШИБОК
// ============================================================================

/**
 * Глобальный обработчик ошибок
 */
window.addEventListener('error', (event) => {
    console.error('🚨 Глобальная ошибка:', event.error);
});

// ============================================================================
// ЭКСПОРТ И ЗАВЕРШЕНИЕ
// ============================================================================

console.log('🎯 Main.js загружен и готов к инициализации');
