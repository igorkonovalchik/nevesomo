// main.js - Главный файл инициализации (без ES6 модулей)

/* === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ === */
let sessionFilters = {};

/* === ОСНОВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ === */
async function init() {
    try {
        console.log('🚀 Запуск приложения NEVESOMO...');
        
        // Показываем заставку
        await showLoadingScreen();
        
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
        
        // Скрываем заставку
        hideLoadingScreen();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации:', error);
        showLoadingError();
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
        if (!sessionElement) return;
        
        const isCurrentlyExpanded = sessionElement.classList.contains('expanded');
        
        // Закрываем все открытые сессии
        document.querySelectorAll('.session.expanded').forEach(session => {
            session.classList.remove('expanded');
        });
        
        // Если текущая сессия была закрыта, открываем её
        // Если была открыта - оставляем закрытой (поведение toggle)
        if (!isCurrentlyExpanded) {
            sessionElement.classList.add('expanded');
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
            
           // console.log(`👤 Режим пользователя: ${userMode}`);
        } else {
          //  console.log('❌ Участник не найден в базе');
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
window.openUserScheduleFromStats = openUserScheduleFromStats;
window.openCommentPopup = openCommentPopup;
window.closeCommentPopup = closeCommentPopup;
window.skipComment = skipComment;
window.saveComment = saveComment;
window.showConfirmation = showConfirmation;
window.closeConfirmPopup = closeConfirmPopup;
window.showNotification = showNotification;
window.completeAssignment = completeAssignment;

// Функции назначений
window.handleRoleSlotClick = handleRoleSlotClick;
window.selectParticipant = selectParticipant;
window.autoFillSession = autoFillSession;
window.closeParticipantPopup = closeParticipantPopup;

// Переменные состояния
window.currentMode = currentMode;
window.currentUser = currentUser;

/* === ФУНКЦИИ УПРАВЛЕНИЯ ЗАСТАВКОЙ === */
async function showLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    const loadingLogo = document.querySelector('.loading-logo');
    const loadingContent = document.querySelector('.loading-content');
    const loadingText = document.getElementById('loadingText');
    
    if (!loadingScreen) return;
    
    // Показываем заставку
    loadingScreen.classList.remove('hidden');
    
    // Показываем логотип на 2 секунды
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Блюрим логотип и показываем лоадер
    loadingLogo.classList.add('blurred');
    loadingContent.style.display = 'block';
    
    await new Promise(resolve => setTimeout(resolve, 500));
    loadingContent.classList.add('visible');
    
    // Запускаем смену текстов
    startLoadingTextAnimation(loadingText);
}

function startLoadingTextAnimation(textElement) {
    if (!textElement) return;
    
    const texts = [
        'Грузим участников...',
        'Загружаем шифты...',
        'Тупим...'
    ];
    
    let currentIndex = 0;
    
    const updateText = () => {
        if (textElement && currentIndex < texts.length) {
            textElement.textContent = texts[currentIndex];
            textElement.style.animation = 'none';
            setTimeout(() => {
                if (textElement) {
                    textElement.style.animation = 'fadeInText 0.5s ease';
                }
            }, 10);
            currentIndex++;
            
            if (currentIndex < texts.length) {
                setTimeout(updateText, 1000);
            } else {
                // Остаемся на "Тупим..." если загрузка затянулась
                textElement.textContent = 'Тупим...';
            }
        }
    };
    
    updateText();
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        // Полностью удаляем через 500мс после анимации
        setTimeout(() => {
            if (loadingScreen && loadingScreen.parentNode) {
                loadingScreen.style.display = 'none';
            }
        }, 500);
    }
}

function showLoadingError() {
    const loadingText = document.getElementById('loadingText');
    const loadingError = document.getElementById('loadingError');
    const spinner = document.querySelector('.loading-spinner');
    
    if (loadingText) loadingText.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (loadingError) loadingError.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, запускаем инициализацию...');
    
    // Инициализируем Telegram WebApp если доступен
    const tg = window.Telegram?.WebApp;
    if (tg) {
        console.log('🤖 Инициализируем Telegram WebApp...');
        tg.ready();
        tg.expand();
    }
    
    // Показываем заставку сразу и запускаем инициализацию
    init().catch(error => {
        console.error('💥 Критическая ошибка при запуске:', error);
        showLoadingError();
    });
});

// Функция для показа тултипа
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
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        tooltip.remove();
    }, 3000);
    
    // Удаляем при клике в любом месте
    document.addEventListener('click', function removeTooltip() {
        tooltip.remove();
        document.removeEventListener('click', removeTooltip);
    });
};

// Функция для проверки прокрутки табов
window.checkTabsScroll = function(sessionKey) {
    const wrapper = document.getElementById(`tabs-wrapper-${sessionKey}`);
    const tabs = wrapper?.querySelector('.session-tabs');
    
    if (!tabs) return;
    
    const isScrollable = tabs.scrollWidth > tabs.clientWidth;
    const isAtEnd = tabs.scrollLeft + tabs.clientWidth >= tabs.scrollWidth - 10;
    
    if (isScrollable && !isAtEnd) {
        wrapper.classList.add('scrollable');
    } else {
        wrapper.classList.remove('scrollable');
    }
};

// Touch swipe для табов и ролей
document.addEventListener('DOMContentLoaded', () => {
    // Включаем momentum scrolling для всех горизонтальных списков
    const scrollableElements = document.querySelectorAll('.session-tabs, .roles-grid-compact');
    
    scrollableElements.forEach(element => {
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
    });
});

// Обработчик ошибок для отладки
window.addEventListener('error', (event) => {
    console.error('🚨 Глобальная ошибка:', event.error);
});

console.log('🎯 Main.js загружен и готов к инициализации');
