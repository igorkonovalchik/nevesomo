// user-manager.js - Управление пользователями (без ES6 модулей)

/* === СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЯ === */
let currentMode = 'user'; // По умолчанию пользовательский режим
let currentUser = '';

/* === УПРАВЛЕНИЕ РЕЖИМАМИ === */
function setMode(mode) {
    currentMode = mode;
    
    // deadlineWarning logic removed
    const userSelector = document.getElementById('userSelector');
    const myScheduleBtn = document.getElementById('myScheduleBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const bigGreeting = document.getElementById('bigGreeting');
    
    if (mode === 'admin') {
        // Админ режим
        if (userSelector) userSelector.style.display = 'block'; // Селектор показываем только админу
        if (myScheduleBtn) myScheduleBtn.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        if (progressText) progressText.style.display = 'none';
        if (bigGreeting) bigGreeting.style.display = 'none'; // Прячем приветствие в админ режиме
    } else {
        // Пользовательский режим
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
    if (currentUser === userName) {
        console.log('👤 Пользователь уже установлен:', userName);
        return; // Ничего не делаем, если значение не изменилось
    }
    
    currentUser = userName;
    console.log('✅ Установлен currentUser:', currentUser);
    
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
        if (userSelectValue !== currentUser) {
            currentUser = userSelectValue;
            window.currentUser = currentUser;
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

    // Свитчер офлайн-режима (iPhone-style)
    html += `
        <div class="menu-item" style="display: flex; align-items: center; gap: 12px;">
            <label class="toggle-switch">
                <input type="checkbox" id="offlineModeSwitch" onchange="toggleOfflineMode(this.checked)" />
                <span class="slider"></span>
                <span style="margin-left: 12px;">Офлайн режим</span>
            </label>
        </div>
    `;

    if (currentMode === 'admin') {
        html += `
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
        html += `
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

    // Установить состояние свитчера по window.isOfflineMode
    setTimeout(() => {
        const offlineSwitch = document.getElementById('offlineModeSwitch');
        if (offlineSwitch) {
            offlineSwitch.checked = !!window.isOfflineMode;
        }
    }, 0);
}

// Глобальный обработчик переключения офлайн-режима
window.toggleOfflineMode = function(isOn) {
    if (isOn) {
        // Включить офлайн-режим (реализация далее)
        if (window.enableOfflineMode) window.enableOfflineMode();
    } else {
        // Выключить офлайн-режим (реализация далее)
        if (window.disableOfflineMode) window.disableOfflineMode();
    }
};

function updateProgress() {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressFill = document.getElementById('progressFill');
    // deadlineWarning logic removed
    
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
        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
            if (progressText) progressText.style.display = 'none';
        }, 3000);
    } else {
        progressText.textContent = `${userShifts}/${minShifts} шифтов выбрано`;
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
    return currentUser;
}

function getCurrentMode() {
    return currentMode;
}

function isCurrentUserAdmin() {
    if (!currentUser) return false;
    const participant = participants.find(p => p.name === currentUser);
    return participant?.isAdmin === true;
}

function getCurrentUserData() {
    if (!currentUser) return null;
    return participants.find(p => p.name === currentUser) || null;
}

/* === ИНФОРМАЦИОННЫЕ ФУНКЦИИ === */
function showBathInfo() {
    showNotification(`Банный кемп NEVESOMO\n\nЗдесь проходят банные сессии с парением, массажем и заботой о гостях.\n\nПодробнее в описании ролей.`);
}

// === ОФЛАЙН-РЕЖИМ ===
window.enableOfflineMode = async function() {
    if (window.isOfflineMode) return;
    try {
        // Показываем прогресс-бар
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        if (progressBar) progressBar.style.display = '';
        if (progressText) progressText.style.display = '';
        if (progressFill) progressFill.style.width = '0%';
        if (progressText) progressText.textContent = 'Скачиваем данные для офлайн-режима...';

        // Скачиваем все данные
        let percent = 0;
        if (progressFill) progressFill.style.width = '10%';
        const allData = await window.airtableService.getAllData();
        percent = 80;
        if (progressFill) progressFill.style.width = percent + '%';

        // Сохраняем в localStorage
        localStorage.setItem('offlineData', JSON.stringify(allData));
        percent = 100;
        if (progressFill) progressFill.style.width = percent + '%';
        if (progressText) progressText.textContent = 'Данные успешно сохранены!';

        // Устанавливаем флаг
        window.isOfflineMode = true;
        showNotification('Офлайн режим включен!');

        // Перезагружаем данные из localStorage
        if (window.loadOfflineData) {
            await window.loadOfflineData();
        }

        // Скрываем прогресс через 1.5 сек
        setTimeout(() => {
            if (progressBar) progressBar.style.display = 'none';
            if (progressText) progressText.style.display = 'none';
        }, 1500);
    } catch (e) {
        showNotification('Ошибка при скачивании данных для офлайн-режима');
        window.isOfflineMode = false;
    }
    // Обновить меню (чекбокс)
    if (typeof updateMenu === 'function') updateMenu();
};

window.disableOfflineMode = function() {
    // Удаляем offlineData
    localStorage.removeItem('offlineData');
    window.isOfflineMode = false;
    showNotification('Офлайн режим выключен');
    // Перезагружаем данные из Airtable
    if (window.loadAirtableData) {
        window.loadAirtableData();
    }
    // Обновить меню (чекбокс)
    if (typeof updateMenu === 'function') updateMenu();
};

// === Загрузка данных из offlineData ===
window.loadOfflineData = async function() {
    try {
        const offlineData = JSON.parse(localStorage.getItem('offlineData'));
        if (!offlineData) throw new Error('Нет сохранённых офлайн-данных');
        // Импортируем данные в глобальные переменные (как в data_manager.js)
        if (Array.isArray(offlineData.participants)) {
            window.participants = offlineData.participants;
        }
        if (Array.isArray(offlineData.roles)) {
            window.rolesInfo = {};
            offlineData.roles.forEach(role => {
                window.rolesInfo[role.name] = {
                    icon: role.icon || '🔥',
                    description: role.description || '',
                    instructionUrl: role.instructionUrl || '',
                    category: role.category || 'other'
                };
            });
        }
        if (Array.isArray(offlineData.schedule)) {
            window.schedule = {};
            offlineData.schedule.forEach(session => {
                const dateKey = session.date;
                if (!window.schedule[dateKey]) window.schedule[dateKey] = [];
                window.schedule[dateKey].push({
                    time: session.startTime,
                    endTime: session.endTime,
                    sessionNum: session.sessionNumber,
                    status: session.status,
                    type: session.type,
                    availableRoles: session.availableRoles,
                    slotLink: session.slotLink || null
                });
            });
        }
        if (Array.isArray(offlineData.assignments)) {
            window.assignments = {};
            offlineData.assignments.forEach(assignment => {
                const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
                if (!window.assignments[sessionKey]) window.assignments[sessionKey] = {};
                window.assignments[sessionKey][assignment.roleName] = assignment.participantName;
            });
        }
        if (offlineData.settings) {
            window.appSettings = offlineData.settings;
        }
        // Обновить интерфейс
        if (typeof updateView === 'function') updateView();
        if (typeof updateMenu === 'function') updateMenu();
    } catch (e) {
        showNotification('Ошибка загрузки офлайн-данных');
    }
};

console.log('👤 User Manager загружен');
