// user-manager.js - Управление пользователями (без ES6 модулей)

/* === СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ === */
// let currentMode = 'user'; // Удалено для устранения конфликта
// let currentUser = ''; // Удалено, используем только window.currentUser

/* === УПРАВЛЕНИЕ РЕЖИМАМИ === */
function setMode(mode) {
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
}
function setCurrentUser(userName) {
    console.log('🔧 setCurrentUser вызван с:', userName);
    
    // Избегаем рекурсии - проверяем, нужно ли обновление
    if (window.currentUser === userName) {
        console.log('👤 Пользователь уже установлен:', userName);
        return; // Ничего не делаем, если значение не изменилось
    }
    
    window.currentUser = userName;
    console.log('✅ Установлен currentUser:', window.currentUser);
    
    // Обновляем селектор
    const userSelect = document.getElementById('currentUser');
    if (userSelect && userSelect.value !== userName) {
        userSelect.value = userName;
        console.log('📝 Обновлен селектор пользователя');
    }
    
    // Сохраняем в глобальной области
    window.currentUser = currentUser;
    
    // Вызываем рендеринг НАПРЯМУЮ, а не через updateView
    if (typeof renderSchedule === 'function') {
        renderSchedule();
        console.log('🎨 Расписание перерисовано');
    }
    
    if (typeof updateProgress === 'function') {
        updateProgress();
        console.log('📊 Прогресс обновлен');
    }
}

// Экспортируем setCurrentUser глобально
window.setCurrentUser = setCurrentUser;

/* === ОБНОВЛЕНИЕ ИНТЕРФЕЙСА === */
function updateView() {
    if (currentMode === 'user') {
        const userSelectValue = document.getElementById('currentUser')?.value || '';
        
        // Избегаем рекурсии - обновляем currentUser напрямую, без вызова setCurrentUser
        if (userSelectValue !== window.currentUser) {
            window.currentUser = userSelectValue;
            window.currentUser = userSelectValue;
        }
    }
    
    // Отрисовываем расписание с новыми параметрами
    renderSchedule();
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

function updateMenu() {
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
            <div class="menu-item" onclick="openFullSchedulePopup(); closeMenu();">
                <span>📋 Общее расписание</span>
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

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    const deadlineWarning = document.getElementById('deadlineWarning');
    
    if (currentMode !== 'user' || !window.currentUser || !progressBar || !progressText || !progressFill) {
        if (progressBar) progressBar.style.display = 'none';
        if (progressText) progressText.style.display = 'none';
        return;
    }
    
    let userShifts = 0;
    Object.values(assignments).forEach(session => {
        Object.values(session).forEach(user => {
            if (user === window.currentUser) {
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
function initializeParticipantsSelector() {
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

function initializeTelegramUser(userName) {
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

function determineUserMode(participant) {
    // Для Игоря проверяем только поле isAdmin из таблицы
    return participant.isAdmin === true ? 'admin' : 'user';
}

/* === ОБРАБОТЧИКИ СОБЫТИЙ === */
function initUserHandlers() {    
    // Обработчик события загрузки данных
    window.addEventListener('dataLoaded', () => {
        initializeParticipantsSelector();
        updateView();
    });
}

/* === ГЕТТЕРЫ === */
function getCurrentUser() {
    return window.currentUser;
}

function getCurrentMode() {
    return currentMode;
}

function isCurrentUserAdmin() {
    if (!window.currentUser) return false;
    const participant = participants.find(p => p.name === window.currentUser);
    return participant?.isAdmin === true;
}

function getCurrentUserData() {
    if (!window.currentUser) return null;
    return participants.find(p => p.name === window.currentUser) || null;
}

/* === ИНФОРМАЦИОННЫЕ ФУНКЦИИ === */
function showBathInfo() {
    showNotification(`Банный кемп NEVESOMO\n\nЗдесь проходят банные сессии с парением, массажем и заботой о гостях.\n\nПодробнее в описании ролей.`);
}

console.log('👤 User Manager загружен');
