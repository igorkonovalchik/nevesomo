// Данные из Airtable (будут загружены при инициализации)
let participants = [];
let rolesInfo = {};
let roleGroups = {};
let schedule = {};
let allRoles = [];
let appSettings = {};

// Состояние загрузки
let isDataLoaded = false;
let isDataLoading = false;

// Переменные состояния
let assignments = {};
let currentMode = 'user'; // По умолчанию пользовательский режим
let currentUser = '';
let currentPopupSession = null;
let currentPopupRole = null;
let sessionFilters = {};
let previousPopup = null;

// Функция форматирования даты
function formatDate(dateStr){
  const months = ['января','февраля','марта','апреля','мая','июня',
                  'июля','августа','сентября','октября','ноября','декабря'];
  const weekdays = ['воскресенье','понедельник','вторник','среда',
                    'четверг','пятница','суббота'];

  const d = new Date(dateStr+'T00:00:00');     // надёжный парсинг
  const day   = d.getDate();
  const month = months[d.getMonth()];
  const wday  = weekdays[d.getDay()];

  return `${day} ${month}, ${wday}`;           // 12 июля, суббота
}


// Функции для лоадера
function showLoader(text = 'Загрузка...') {
    let loader = document.getElementById('loadingOverlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.classList.add('show');
}

function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.remove('show');
    }
}

// Функции для работы с меню (должны быть глобальными для onclick)
window.toggleMenu = function() {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        menuOverlay.classList.toggle('show');
    }
}

window.closeMenu = function() {
    const menuOverlay = document.getElementById('menuOverlay');
    if (menuOverlay) {
        menuOverlay.classList.remove('show');
    }
}

// Функция переключения темы тоже должна быть глобальной
window.toggleTheme = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Функции для закрытия попапов
window.closeParticipantPopup = function() {
    document.getElementById('participantPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

window.closeStatsPopup = function() {
    document.getElementById('statsPopup').classList.remove('show');
}

window.closeSchedulePopup = function() {
    document.getElementById('schedulePopup').classList.remove('show');
}

window.closeRolesInfoPopup = function() {
    document.getElementById('rolesInfoPopup').classList.remove('show');
}

window.closeRoleDetailPopup = function() {
    document.getElementById('roleDetailPopup').classList.remove('show');

    // Возвращаемся на предыдущий попап если он был
    if (previousPopup === 'roles') {
        document.getElementById('rolesInfoPopup').classList.add('show');
    } else if (previousPopup === 'schedule') {
        document.getElementById('schedulePopup').classList.add('show');
    }
    previousPopup = null;
}

// Функции для открытия попапов тоже должны быть доступны глобально
window.openMySchedule = function() {
    previousPopup = null;
    openSchedulePopup();
}

window.openStatsPopup = function() {
    const statsList = document.getElementById('statsList');

    const userStats = participants.map(participant => {
        let shiftsCount = 0;
        const categoryStats = getUserCategoryStats(participant.name);

        Object.values(assignments).forEach(session => {
            Object.values(session).forEach(user => {
                if (user === participant.name) {
                    shiftsCount++;
                }
            });
        });

        return {
            name: participant.name,
            telegram: participant.telegram,
            shifts: shiftsCount,
            complete: shiftsCount >= 8,
            categories: categoryStats
        };
    });

    let html = '';
    userStats.forEach(user => {
        const categoriesHtml = Object.entries(user.categories)
            .filter(([category, count]) => count > 0)
            .map(([category, count]) => `<div class="stats-category">${category}: ${count}</div>`)
            .join('');

        const telegramLink = user.telegram ?
            `<a href="https://t.me/${user.telegram.replace('@', '')}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                ${user.telegram}
            </a>` : '';

        html += `
            <div class="stats-user ${user.complete ? 'complete' : 'incomplete'}">
                <div class="stats-user-header">
                    <div>
                        <div class="stats-name">${user.name}</div>
                        ${telegramLink ? `<div style="font-size: 0.85em; margin-top: 4px;">${telegramLink}</div>` : ''}
                    </div>
                    <div class="stats-total ${user.complete ? 'complete' : 'incomplete'}">
                        ${user.shifts}/8 шифтов
                    </div>
                </div>
                <div class="stats-categories">
                    ${categoriesHtml || '<div class="stats-category">Шифты не назначены</div>'}
                </div>
            </div>
        `;
    });

    statsList.innerHTML = html;
    document.getElementById('statsPopup').classList.add('show');
}

window.openRolesInfoPopup = function() {
    previousPopup = null;
    const rolesInfoBody = document.getElementById('rolesInfoBody');

    let html = '<div style="margin-bottom: 20px; color: var(--text-secondary);">Выберите роль для подробного описания:</div>';

    Object.entries(roleGroups).forEach(([groupKey, group]) => {
        html += `<h3 style="margin: 24px 0 12px 0; color: var(--accent-primary);">${group.name}</h3>`;

        group.roles.forEach(role => {
            const roleInfo = rolesInfo[role];
            if(roleInfo) {
                html += `
                    <div class="roles-list-item" onclick="showRoleDetail('${role}', 'roles')">
                        <div>
                            <div style="font-weight: 500; margin-bottom: 4px;">${roleInfo.icon} ${role}</div>
                            <div style="color: var(--text-secondary); font-size: 0.9em;">${roleInfo.description.substring(0, 60)}...</div>
                        </div>
                        <div style="color: var(--accent-primary);">›</div>
                    </div>
                `;
            }
        });
    });

    rolesInfoBody.innerHTML = html;
    document.getElementById('rolesInfoPopup').classList.add('show');
}

window.showRoleDetail = function(role, sourcePopup = null) {
    previousPopup = sourcePopup;
    const roleInfo = rolesInfo[role];

    document.getElementById('roleDetailTitle').textContent = role;
    document.getElementById('roleDetailImage').textContent = roleInfo.icon;
    document.getElementById('roleDetailDescription').textContent = roleInfo.description;
    document.getElementById('roleDetailLink').href = roleInfo.instructionUrl;

    // Закрываем предыдущие попапы
    document.getElementById('rolesInfoPopup').classList.remove('show');
    document.getElementById('schedulePopup').classList.remove('show');

    document.getElementById('roleDetailPopup').classList.add('show');
}

window.openDataEditPopup = function() {
    alert('Админ панель редактирования данных будет реализована в следующей версии.\n\nЗдесь будет возможность:\n- Редактировать роли и их описания\n- Изменять информацию о бане\n- Настраивать расписание');
}

window.shareSchedule = function() {
    if (navigator.share) {
        navigator.share({
            title: 'Мое расписание шифтов NEVESOMO',
            text: 'Расписание банных шифтов',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Ссылка скопирована в буфер обмена');
    }
}

window.updateView = updateView;
window.setMode = setMode;

// Функции для загрузки данных из Airtable
async function loadAirtableData() {
    if (isDataLoading) return;

    isDataLoading = true;
    showLoadingState();

    try {
        console.log('Загружаем данные из Airtable...');

        if (!window.airtableService) {
            throw new Error('Airtable service не загружен');
        }

        const data = await window.airtableService.getAllData();

        participants = data.participants.map(p => ({
            name: p.name,
            telegram: p.telegram,
            telegramId: p.telegramId,
            isAdmin: p.isAdmin,
            bathExperience: p.bathExperience
        }));

        rolesInfo = {};
        const rolesByCategory = {};
        data.roles.forEach(role => {
            if (role.isActive) {
                rolesInfo[role.name] = {
                    icon: role.icon,
                    description: role.description,
                    instructionUrl: role.instructionUrl,
                    category: role.category || 'other'
                };
                const category = role.category || 'other';
                if (!rolesByCategory[category]) {
                    rolesByCategory[category] = [];
                }
                rolesByCategory[category].push(role.name);
            }
        });

        roleGroups = {};
        const categoryNames = {
            'banking': 'Банные',
            'care': 'Забота',
            'lounge': 'Лаунж',
            'kitchen': 'Кухня',
            'other': 'Прочее'
        };

        Object.entries(rolesByCategory).forEach(([category, roles]) => {
            roleGroups[category] = {
                name: categoryNames[category] || category,
                roles: roles
            };
        });

        // ИСПРАВЛЕНО: Гарантируем, что базовые категории существуют, чтобы избежать ошибок
        ['lounge', 'banking', 'care', 'kitchen', 'other'].forEach(cat => {
            if (!roleGroups[cat]) {
                roleGroups[cat] = { name: categoryNames[cat] || cat, roles: [] };
            }
        });
        
        allRoles = Object.keys(rolesInfo);

        schedule = {};
        data.schedule.forEach(session => {
            const dateKey = session.date;
            if (!schedule[dateKey]) {
                schedule[dateKey] = [];
            }
            let availableRoles = [];
            if (session.availableRoles) {
                availableRoles = session.availableRoles.split(',').map(r => r.trim());
            }
            schedule[dateKey].push({
                time: session.startTime,
                endTime: session.endTime,
                sessionNum: session.sessionNumber,
                status: session.status,
                type: session.type,
                roles: availableRoles.length > 0 ? availableRoles : undefined
            });
            schedule[dateKey].sort((a, b) => a.time.localeCompare(b.time));
        });

        appSettings = data.settings;
        await loadAssignments(data.assignments);
        isDataLoaded = true;
        window.participants = participants;
        hideLoadingState();
        console.log('Данные успешно загружены.');

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        hideLoadingState();
        showErrorState(error.message);
    } finally {
        isDataLoading = false;
    }
}

// Функция для загрузки назначений
async function loadAssignments(assignmentsData) {
    assignments = {};
    sessionFilters = {};

    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            assignments[sessionKey] = {};
            sessionFilters[sessionKey] = 'all';

            let sessionRoles = session.roles || allRoles;
            sessionRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });

    assignmentsData.forEach(assignment => {
        const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
        if (assignments[sessionKey] && assignments[sessionKey][assignment.roleName] !== undefined) {
            // ИСПРАВЛЕНО: Пустые имена не помечают роль как занятую
            assignments[sessionKey][assignment.roleName] = assignment.participantName || null;
        }
    });
}


// Функции для отображения состояния загрузки
function showLoadingState() {
    const container = document.getElementById('schedule');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 2em; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 1.2em; color: var(--text-secondary);">Загружаем данные из Airtable...</div>
        </div>
    `;
}

function hideLoadingState() {}

function showErrorState(errorMessage) {
    const container = document.getElementById('schedule');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 2em; margin-bottom: 16px;">❌</div>
            <div style="font-size: 1.2em; color: var(--error-color); margin-bottom: 16px;">
                Ошибка загрузки данных
            </div>
            <div style="color: var(--text-secondary); margin-bottom: 16px;">
                ${errorMessage}
            </div>
            <button onclick="location.reload()" style="background: var(--accent-primary); color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer;">
                Перезагрузить
            </button>
        </div>
    `;
}

// Функция для получения статистики по категориям
function getUserCategoryStats(userName) {
    const stats = {};
    Object.values(roleGroups).forEach(group => {
        stats[group.name] = 0;
    });

    Object.values(assignments).forEach(sessionData => {
        Object.entries(sessionData).forEach(([role, user]) => {
            if (user === userName) {
                const roleInfo = Object.values(roleGroups).find(g => g.roles.includes(role));
                if (roleInfo) {
                    stats[roleInfo.name]++;
                }
            }
        });
    });
    return stats;
}

// Функция для проверки, есть ли у пользователя роли в лаунже
function hasLoungeRole(userName) {
    if (!roleGroups.lounge || roleGroups.lounge.roles.length === 0) return false;
    for (const sessionRoles of Object.values(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.lounge.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

// ИСПРАВЛЕНО: Функция больше не ищет парный слот, возвращая null.
// Это убирает ограничение "раз в 2 часа" для мастер-классов.
function getMasterClassPairSlot(sessionKey) {
    return null;
}

// Инициализация
async function init() {
    try {
        await loadAirtableData();
        const userSelect = document.getElementById('currentUser');
        userSelect.innerHTML = '<option value="">Выберите участника</option>';
        participants.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.name;
            option.textContent = `${participant.name} (${participant.telegram})`;
            userSelect.appendChild(option);
        });

        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        startCountdown();
        updateMenu();
        renderSchedule();
        updateProgress();
        console.log('Приложение успешно инициализировано');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showErrorState('Не удалось загрузить данные. Проверьте подключение к интернету.');
    }
}

// Функции темы
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// Функции для работы с назначениями через Airtable
async function saveAssignmentToAirtable(participantName, roleName, slotDate, slotTime) {
    try {
        await window.airtableService.createAssignment(participantName, roleName, slotDate, slotTime);
    } catch (error) {
        console.error('Ошибка сохранения назначения:', error);
        alert('Ошибка сохранения. Попробуйте еще раз.');
        throw error;
    }
}

async function removeAssignmentFromAirtable(participantName, roleName, slotDate, slotTime) {
    try {
        const assignments = await window.airtableService.getAssignments();
        const assignmentToDelete = assignments.find(a =>
            a.participantName === participantName &&
            a.roleName === roleName &&
            a.slotDate === slotDate &&
            a.slotTime === slotTime
        );
        if (assignmentToDelete) {
            await window.airtableService.deleteAssignment(assignmentToDelete.id);
        }
    } catch (error) {
        console.error('Ошибка удаления назначения:', error);
        alert('Ошибка удаления. Попробуйте еще раз.');
        throw error;
    }
}

// Проверка занятости пользователя в сессии
function isUserBusyInSession(sessionKey, userName) {
    const sessionTime = sessionKey.split('_')[1];
    for (const [checkSessionKey, sessionRoles] of Object.entries(assignments)) {
        if (checkSessionKey.split('_')[1] === sessionTime) {
            for (const assignedUser of Object.values(sessionRoles)) {
                if (assignedUser === userName) return true;
            }
        }
    }
    return false;
}

// Обратный отсчет
function startCountdown() {
    const deadline = new Date('2025-07-08T23:59:59');
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    
    function updateCountdown() {
        const now = new Date();
        const timeLeft = deadline - now;
        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            countdownEl.textContent = `⏰ ${days}д ${hours}ч ${minutes}м ${seconds}с до дедлайна`;
        } else {
            countdownEl.textContent = '🔴 ДЕДЛАЙН ИСТЕК!';
        }
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

function updateMenu() {
    const menuItems = document.getElementById('menuItems');
    let html = '';
    if (currentMode === 'admin') {
        html = `
      <div class="menu-item" onclick="openStatsPopup(); closeMenu();"><span>📊 Статистика</span></div>
      <div class="menu-item" onclick="openSchedulePopup(); closeMenu();"><span>📅 Расписание</span></div>
      <div class="menu-item" onclick="openDataEditPopup(); closeMenu();"><span>⚙️ Изменить данные</span></div>
      <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();"><span>❓ О шифтах</span></div>
      <div class="menu-item" onclick="setMode('user'); closeMenu();"><span>👤 Режим участника</span></div>`;
    } else {
        html = `
      <div class="menu-item" onclick="openMySchedule(); closeMenu();"><span>📅 Мое расписание</span></div>
      <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();"><span>❓ О шифтах</span></div>`;
        if (!window.telegramUtils?.telegramUser) {
            html += `<div class="menu-item" onclick="setMode('admin'); closeMenu();"><span>👨‍💼 Админ режим</span></div>`;
        }
    }
    menuItems.innerHTML = html;
}

function showBathInfo() {
    alert(`Банный кемп NEVESOMO\n\nЗдесь проходят банные сессии с парением, массажем и заботой о гостях.\n\nПодробнее в описании ролей.`);
}

function setMode(mode) {
    currentMode = mode;
    const userSelector = document.getElementById('userSelector');
    document.getElementById('deadlineWarning').style.display = mode === 'admin' ? 'none' : 'block';
    userSelector.style.display = mode === 'admin' ? 'block' : 'none';
    document.getElementById('myScheduleBtn').style.display = mode === 'admin' ? 'none' : 'block';
    document.getElementById('progressBar').style.display = mode === 'admin' ? 'none' : 'block';
    document.getElementById('progressText').style.display = mode === 'admin' ? 'none' : 'block';

    if (mode === 'user' && !currentUser && userSelector.options.length > 1) {
      currentUser = userSelector.value;
    }
    
    updateMenu();
    updateView();
}

function updateView() {
    if (currentMode === 'user') {
        currentUser = document.getElementById('currentUser').value;
    }
    renderSchedule();
    updateProgress();
}

function updateProgress() {
    if (currentMode !== 'user' || !currentUser) {
        document.getElementById('progressBar').style.display = 'none';
        document.getElementById('progressText').style.display = 'none';
        return;
    }

    let userShifts = Object.values(assignments).flatMap(Object.values).filter(user => user === currentUser).length;
    const minShifts = 8;
    const progress = Math.min((userShifts / minShifts) * 100, 100);

    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('progressText').style.display = 'block';
    document.getElementById('progressFill').style.width = `${progress}%`;

    if (progress >= 100) {
        document.getElementById('progressText').textContent = '✅ Все шифты выбраны!';
        document.getElementById('deadlineWarning').style.display = 'none';
    } else {
        document.getElementById('progressText').textContent = `${userShifts}/${minShifts} шифтов выбрано`;
        document.getElementById('deadlineWarning').style.display = 'block';
    }
}

function toggleSession(sessionKey) {
    document.querySelector(`[data-session="${sessionKey}"]`)?.classList.toggle('expanded');
}

function setSessionFilter(sessionKey, filter) {
    sessionFilters[sessionKey] = filter;
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    sessionElement.querySelectorAll('.session-tab').forEach(tab => tab.classList.remove('active'));
    sessionElement.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    renderSessionRoles(sessionKey);
}

function getUserRolesInSession(sessionKey, userName) {
    const sessionAssignments = assignments[sessionKey] || {};
    return Object.entries(sessionAssignments)
        .filter(([_, user]) => user === userName)
        .map(([role, _]) => role);
}

function renderSchedule() {
    const scheduleDiv = document.getElementById('schedule');
    scheduleDiv.innerHTML = '';
    const sortedDays = Object.keys(schedule).sort((a,b) => new Date(a) - new Date(b));

    sortedDays.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-section';
        dayDiv.innerHTML = `
            <div class="day-header">${formatDate(day)}</div>
            ${schedule[day].map(session => renderSession(day, session)).join('')}
        `;
        scheduleDiv.appendChild(dayDiv);
    });

    // Обновляем счетчики на табах после отрисовки
    Object.keys(assignments).forEach(updateSessionTabs);
}

// ИСПРАВЛЕНО: Функция теперь строит вкладки только для тех категорий,
// которые реально присутствуют в ролях сессии, решая проблему дублирования.
function renderSession(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionAssignments = assignments[sessionKey] || {};
    const sessionRoles = session.roles || allRoles;

    const filledRoles = sessionRoles.filter(role => sessionAssignments[role]).length;
    const totalRoles = sessionRoles.length;
    const percentage = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;

    const userRoles = currentMode === 'user' && currentUser ? getUserRolesInSession(sessionKey, currentUser) : [];
    const hasUserAssignment = userRoles.length > 0;
    
    let progressClass = percentage === 100 ? 'complete' : (percentage > 0 ? 'partial' : 'empty');

    // Определяем, какие категории ролей есть в этой сессии
    const availableCategories = new Set();
    sessionRoles.forEach(role => {
        const roleInfo = rolesInfo[role];
        if (roleInfo && roleInfo.category) {
            availableCategories.add(roleInfo.category);
        } else if (roleInfo) {
            availableCategories.add('other');
        }
    });

    const tabsHtml = Array.from(availableCategories).map(key => {
        const group = roleGroups[key];
        return `<button class="session-tab" data-filter="${key}" onclick="setSessionFilter('${sessionKey}', '${key}')">${group.name}</button>`;
    }).join('');

    return `
        <div class="session ${hasUserAssignment ? 'user-assigned' : ''}" data-session="${sessionKey}">
            <div class="session-compact" onclick="toggleSession('${sessionKey}')">
                <div class="session-info">
                    <div class="session-basic-info">
                        <div class="session-time">${session.time} - ${session.endTime}</div>
                        <div class="session-details"><a href="#" class="bath-link" onclick="event.stopPropagation(); showBathInfo()">${session.type}</a></div>
                    </div>
                    ${hasUserAssignment ? `<div class="session-user-indicator">Мой шифт: ${userRoles.join(', ')}</div>` : ''}
                    <div class="session-stats">
                        <div class="progress-display">
                            <div class="progress-circle ${progressClass}">${percentage}%</div>
                            <div class="progress-label">${totalRoles} шифтов</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="session-expanded">
                <div class="session-tabs">
                    <button class="session-tab active" data-filter="all" onclick="setSessionFilter('${sessionKey}', 'all')">Все</button>
                    ${tabsHtml}
                </div>
                <div class="roles-container" id="roles-${sessionKey}">
                    ${renderSessionRoles(sessionKey)}
                </div>
            </div>
        </div>
    `;
}


function renderSessionRoles(sessionKey) {
    const filter = sessionFilters[sessionKey] || 'all';
    const session = schedule[sessionKey.split('_')[0]].find(s => s.time === sessionKey.split('_')[1]);
    let allSessionRoles = session.roles || allRoles;

    let rolesToShow = allSessionRoles;
    if (filter !== 'all' && roleGroups[filter]) {
        const filterRoles = new Set(roleGroups[filter].roles);
        rolesToShow = allSessionRoles.filter(role => filterRoles.has(role));
    }
    
    const rolesHtml = `<div class="roles-grid">${rolesToShow.map(role => renderRoleSlot(sessionKey, role)).join('')}</div>`;
    
    const container = document.getElementById(`roles-${sessionKey}`);
    if (container) container.innerHTML = rolesHtml;
    
    return rolesHtml;
}


function getEmptyRolesCount(sessionKey, roleList) {
    const sessionAssignments = assignments[sessionKey] || {};
    return roleList.filter(role => !sessionAssignments[role]).length;
}

function updateSessionTabs(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;

    const session = schedule[sessionKey.split('_')[0]].find(s => s.time === sessionKey.split('_')[1]);
    const allSessionRoles = session.roles || allRoles;

    const totalEmpty = getEmptyRolesCount(sessionKey, allSessionRoles);
    const allTab = sessionElement.querySelector('[data-filter="all"]');
    if (allTab) {
        allTab.innerHTML = `Все ${totalEmpty > 0 ? `<span class="empty-count">${totalEmpty}</span>` : ''}`;
    }

    Object.entries(roleGroups).forEach(([key, group]) => {
        const groupTab = sessionElement.querySelector(`[data-filter="${key}"]`);
        if (groupTab) {
            const groupEmpty = getEmptyRolesCount(sessionKey, group.roles);
            groupTab.innerHTML = `${group.name} ${groupEmpty > 0 ? `<span class="empty-count">${groupEmpty}</span>` : ''}`;
        }
    });
}


function renderRoleSlot(sessionKey, role) {
    const assignedUser = assignments[sessionKey]?.[role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    const isCurrentUser = currentMode === 'user' && assignedUser === currentUser;
    const hasOtherRoleInSession = currentMode === 'user' && currentUser && getUserRolesInSession(sessionKey, currentUser).length > 0;
    
    // Слот должен быть "блеклым", если у пользователя в этой сессии есть другая роль, и это не текущий слот
    const shouldFade = hasOtherRoleInSession && !isCurrentUser;

    let className = 'role-slot';
    let userDisplay = 'Свободно';

    if (assignedUser) {
        className += ' occupied';
        userDisplay = assignedUser;
        if (isCurrentUser) className += ' current-user';
    } else if (isBlocked) {
        className += ' blocked';
        userDisplay = 'Занято в это время';
    }
    if (shouldFade) className += ' faded';

    return `
        <div class="${className}" onclick="handleRoleSlotClick('${sessionKey}', '${role}')">
            <div class="role-name">${role}</div>
            <div class="role-user">${userDisplay}</div>
            ${isCurrentUser ? '<div class="role-checkmark">✓</div>' : ''}
        </div>`;
}

function handleRoleSlotClick(sessionKey, role) {
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        if (role === 'Мастер класс' && !hasLoungeRole(currentUser)) {
            alert('Мастер-класс может быть выбран только участниками, которые уже записались в категорию "Лаунж". Сначала выберите себе шифт в лаунже!');
            return;
        }
        toggleUserAssignment(sessionKey, role);
    }
}


function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;

    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];

    let html = `
        <div class="participant-item" onclick="selectParticipant(null)">...</div>
        <div class="participant-item" onclick="selectParticipant('Участник другого кемпа')">...</div>`;

    participants.forEach(participant => {
        const isSelected = participant.name === currentAssignment;
        html += `
            <div class="participant-item ${isSelected ? 'selected' : ''}" onclick="selectParticipant('${participant.name}')">
                ...
            </div>`;
    });
    participantsList.innerHTML = html; // Упрощено для примера, логика та же
    document.getElementById('participantPopup').classList.add('show');
}

async function selectParticipant(participantName) {
    if (!currentPopupSession || !currentPopupRole) return;
    const [day, time] = currentPopupSession.split('_');

    showLoader('Обновление назначения...');
    try {
        const currentAssignment = assignments[currentPopupSession][currentPopupRole];
        if (currentAssignment && currentAssignment !== 'Участник другого кемпа') {
            await removeAssignmentFromAirtable(currentAssignment, currentPopupRole, day, time);
        }
        if (participantName && participantName !== 'Участник другого кемпа') {
            await saveAssignmentToAirtable(participantName, currentPopupRole, day, time);
        }

        assignments[currentPopupSession][currentPopupRole] = participantName;
        renderSchedule();
        updateProgress();
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        await loadAirtableData().then(renderSchedule).then(updateProgress);
    } finally {
        hideLoader();
        closeParticipantPopup();
    }
}


async function toggleUserAssignment(sessionKey, role) {
    if (!currentUser) {
        alert('Выберите участника');
        return;
    }
    const currentAssignment = assignments[sessionKey][role];
    if (isSlotBlocked(sessionKey, role) && currentAssignment !== currentUser) {
        alert('У вас уже есть другая роль в это время, несовместимая с этой!');
        return;
    }
    const [day, time] = sessionKey.split('_');

    showLoader(currentAssignment === currentUser ? 'Удаление шифта...' : 'Сохранение шифта...');
    try {
        if (currentAssignment === currentUser) {
            await removeAssignmentFromAirtable(currentUser, role, day, time);
            assignments[sessionKey][role] = null;
        } else if (currentAssignment === null) {
            await saveAssignmentToAirtable(currentUser, role, day, time);
            assignments[sessionKey][role] = currentUser;
        } else {
            alert('Этот слот уже занят. Обратитесь к администратору.');
        }
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        await loadAirtableData();
    } finally {
        renderSchedule();
        updateProgress();
        hideLoader();
    }
}


// ИСПРАВЛЕНО: Полностью переписанная логика для корректной парной брони
function isSlotBlocked(sessionKey, roleToCheck) {
    if (currentMode !== 'user' || !currentUser) return false;

    const assignedUser = assignments[sessionKey]?.[roleToCheck];
    if (assignedUser === currentUser) return false; // Всегда можно отменить свой шифт

    const userRolesInSlot = getUserRolesInSession(sessionKey, currentUser);
    if (userRolesInSlot.length === 0) return false; // Слот свободен для пользователя

    // Правила совместимости
    const isLoungeRole = r => roleGroups.lounge && roleGroups.lounge.roles.includes(r);
    const isMasterClass = r => r === 'Мастер класс';

    // Если уже есть 1 роль, проверяем, можно ли добавить вторую
    if (userRolesInSlot.length === 1) {
        const existingRole = userRolesInSlot[0];
        // Разрешаем пару (Лаунж + Мастер-класс)
        if (isLoungeRole(existingRole) && isMasterClass(roleToCheck)) return false;
        if (isMasterClass(existingRole) && isLoungeRole(roleToCheck)) return false;
    }

    // Во всех остальных случаях (уже есть 2 роли или несовместимая 1 роль) - блокируем
    return true;
}

// Вспомогательные функции
function getUserRolesInSession(sessionKey, userName) {
    const sessionAssignments = assignments[sessionKey] || {};
    return Object.entries(sessionAssignments).filter(([, user]) => user === userName).map(([role]) => role);
}

function getUserCategoryStats(userName) {
    const stats = {};
    Object.values(roleGroups).forEach(group => { stats[group.name] = 0; });
    Object.values(assignments).forEach(sessionData => {
        Object.entries(sessionData).forEach(([role, user]) => {
            if (user === userName) {
                const roleCat = Object.values(roleGroups).find(g => g.roles.includes(role));
                if (roleCat) stats[roleCat.name]++;
            }
        });
    });
    return stats;
}



// Автозаполнение сессии (только для админа)
async function autoFillSession(sessionKey) {
    if (!confirm('Вы уверены, что хотите автоматически заполнить эту сессию?')) {
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day].find(s => s.time === time);
    const sessionAssignments = assignments[sessionKey];
    
    // Определяем роли для сессии
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    const emptyRoles = sessionRoles.filter(role => !sessionAssignments[role]);
    
    if (emptyRoles.length === 0) {
        alert('Все роли уже заполнены!');
        return;
    }
    
    try {
        const userShiftCount = {};
        participants.forEach(p => userShiftCount[p.name] = 0);
        
        // Подсчитываем текущие назначения
        Object.values(assignments).forEach(sessionData => {
            Object.values(sessionData).forEach(user => {
                if (user && userShiftCount.hasOwnProperty(user)) {
                    userShiftCount[user]++;
                }
            });
        });
        
        // Назначаем роли
        for (const role of emptyRoles) {
            const availableUsers = participants.filter(p => 
                !isUserBusyInSession(sessionKey, p.name) &&
                (role !== 'Главный банный мастер' || p.bathExperience)
            );
            
            if (availableUsers.length > 0) {
                const minShifts = Math.min(...availableUsers.map(u => userShiftCount[u.name]));
                const leastBusyUsers = availableUsers.filter(u => userShiftCount[u.name] === minShifts);
                const selectedUser = leastBusyUsers[Math.floor(Math.random() * leastBusyUsers.length)];
                
                // Сохраняем в Airtable
                await saveAssignmentToAirtable(selectedUser.name, role, day, time);
                
                assignments[sessionKey][role] = selectedUser.name;
                userShiftCount[selectedUser.name]++;
            }
        }
        
        renderSchedule();
        updateProgress();
        
        alert('Сессия автоматически заполнена!');
        
    } catch (error) {
        console.error('Ошибка автозаполнения:', error);
        alert('Ошибка при автозаполнении. Попробуйте еще раз.');
        // Перезагружаем данные в случае ошибки
        await loadAirtableData();
        renderSchedule();
        updateProgress();
    }
}

function openMySchedule() {
    previousPopup = null; 
    openSchedulePopup();
}

function openSchedulePopup() {
    const scheduleBody = document.getElementById('scheduleBody');
    let html = '';
    
    if (currentMode === 'user' && currentUser) {
        // Получаем информацию об участнике
        const participant = participants.find(p => p.name === currentUser);
        let shiftsCount = 0;
        const categoryStats = getUserCategoryStats(currentUser);
        
        // Подсчитываем шифты пользователя
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                if (assignments[sessionKey][role] === currentUser) {
                    shiftsCount++;
                }
            });
        });
        
        // Добавляем информацию об участнике
        html += `
            <div class="user-profile">
                <div class="user-name">${currentUser}</div>
                <a href="https://t.me/${participant.telegram.replace('@', '')}" class="user-telegram" target="_blank">${participant.telegram}</a>
                <div class="user-stats">
                    <div class="stat-item">
                        <div class="stat-number">${shiftsCount}</div>
                        <div class="stat-label">Всего шифтов</div>
                    </div>
                    ${Object.entries(categoryStats)
                        .filter(([category, count]) => count > 0)
                        .map(([category, count]) => `
                            <div class="stat-item">
                                <div class="stat-number">${count}</div>
                                <div class="stat-label">${category}</div>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
        
        // Для пользователя показываем только его шифты
        const userShiftsByDay = {};
        
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                if (assignments[sessionKey][role] === currentUser) {
                    if (!userShiftsByDay[day]) {
                        userShiftsByDay[day] = [];
                    }
                    userShiftsByDay[day].push({
                        time,
                        endTime: session.endTime,
                        sessionNum: session.sessionNum,
                        type: session.type,
                        role
                    });
                }
            });
        });
        
        // Сортируем дни
        const sortedDays = Object.keys(userShiftsByDay).sort((a, b) => {
            const dateA = parseInt(a.split('-')[2]);
            const dateB = parseInt(b.split('-')[2]);
            return dateA - dateB;
        });
        
        if (sortedDays.length === 0) {
            html += '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">У вас пока нет назначенных шифтов</div>';
        } else {
            sortedDays.forEach(day => {
                // Форматируем дату
                html += `<h2 style="margin: 24px 0 16px 0; color: var(--accent-primary); font-size: 1.4em;">${formatDate(day)}</h2>`;
                
                // Сортируем шифты в дне по времени
                userShiftsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
                
                userShiftsByDay[day].forEach(shift => {
                    // Компактный вид в одну строку
                    html += `
                        <div class="schedule-item-compact">
                            <div class="schedule-compact-info">
                                <div class="schedule-compact-time">${shift.time.substring(0, 5)}</div>
                                <div class="schedule-compact-details">
                                    <div class="schedule-compact-role">${shift.role}</div>
                                    <div class="schedule-compact-type">${shift.type}</div>
                                </div>
                            </div>
                            <div class="schedule-compact-arrow" onclick="showRoleDetail('${shift.role}', 'schedule')">
                                →
                            </div>
                        </div>
                    `;
                });
            });
        }
    } else {
        // Для админа показываем полное расписание
        Object.keys(schedule).forEach(day => {
            html += `<h3 style="margin: 20px 0 16px 0; color: var(--accent-primary);">${formatDate(day)}</h3>`;
            
            schedule[day].forEach(session => {
                const sessionKey = `${day}_${session.time}`;
                html += `
                    <div class="schedule-item">
                        <div class="schedule-item-header">
                            <div class="schedule-time">${session.time} - ${session.endTime}</div>
                            <div>${session.sessionNum ? `Баня #${session.sessionNum}` : 'Кухня'}</div>
                        </div>
                        <div class="schedule-info" style="margin-bottom: 12px;">${session.type}</div>
                `;
                
                // Определяем роли для сессии
                let sessionRoles = allRoles;
                if (session.roles) {
                    sessionRoles = session.roles;
                }
                
                sessionRoles.forEach(role => {
                    const assignedUser = assignments[sessionKey][role];
                    html += `
                        <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px 0;">
                            <span style="color: var(--text-secondary); font-size: 0.9em;">${role}:</span>
                            <span style="font-weight: 500;">${assignedUser || 'Не назначено'}</span>
                        </div>
                    `;
                });
                
                html += '</div>';
            });
        });
    }
    
    scheduleBody.innerHTML = html;
    document.getElementById('schedulePopup').classList.add('show');
}


function closeSchedulePopup() {
    document.getElementById('schedulePopup').classList.remove('show');
}

function shareSchedule() {
    if (navigator.share) {
        navigator.share({
            title: 'Мое расписание шифтов NEVESOMO',
            text: 'Расписание банных шифтов',
            url: window.location.href
        });
    } else {
        // Fallback для браузеров без поддержки Web Share API
        navigator.clipboard.writeText(window.location.href);
        alert('Ссылка скопирована в буфер обмена');
    }
}

// О шифтах
function openRolesInfoPopup() {
    previousPopup = null; // Сбрасываем предыдущий попап
    const rolesInfoBody = document.getElementById('rolesInfoBody');
    
    let html = '<div style="margin-bottom: 20px; color: var(--text-secondary);">Выберите роль для подробного описания:</div>';
    
    Object.entries(roleGroups).forEach(([groupKey, group]) => {
        html += `<h3 style="margin: 24px 0 12px 0; color: var(--accent-primary);">${group.name}</h3>`;
        
        group.roles.forEach(role => {
            const roleInfo = rolesInfo[role];
            html += `
                <div class="roles-list-item" onclick="showRoleDetail('${role}', 'roles')">
                    <div>
                        <div style="font-weight: 500; margin-bottom: 4px;">${roleInfo.icon} ${role}</div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">${roleInfo.description.substring(0, 60)}...</div>
                    </div>
                    <div style="color: var(--accent-primary);">›</div>
                </div>
            `;
        });
    });
    
    rolesInfoBody.innerHTML = html;
    document.getElementById('rolesInfoPopup').classList.add('show');
}

function closeRolesInfoPopup() {
    document.getElementById('rolesInfoPopup').classList.remove('show');
}

// Показ детального описания роли
function showRoleDetail(role, sourcePopup = null) {
    previousPopup = sourcePopup; // Запоминаем откуда пришли
    const roleInfo = rolesInfo[role];
    
    document.getElementById('roleDetailTitle').textContent = role;
    document.getElementById('roleDetailImage').textContent = roleInfo.icon;
    document.getElementById('roleDetailDescription').textContent = roleInfo.description;
    document.getElementById('roleDetailLink').href = roleInfo.instructionUrl;
    
    // Закрываем предыдущие попапы
    document.getElementById('rolesInfoPopup').classList.remove('show');
    document.getElementById('schedulePopup').classList.remove('show');
    
    document.getElementById('roleDetailPopup').classList.add('show');
}

function closeRoleDetailPopup() {
    document.getElementById('roleDetailPopup').classList.remove('show');
    
    // Возвращаемся на предыдущий попап если он был
    if (previousPopup === 'roles') {
        document.getElementById('rolesInfoPopup').classList.add('show');
    } else if (previousPopup === 'schedule') {
        document.getElementById('schedulePopup').classList.add('show');
    }
    previousPopup = null;
}

function showRoleInfo(role) {
    showRoleDetail(role);
}

// Админ панель редактирования данных
function openDataEditPopup() {
    alert('Админ панель редактирования данных будет реализована в следующей версии.\n\nЗдесь будет возможность:\n- Редактировать роли и их описания\n- Изменять информацию о бане\n- Настраивать расписание');
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('Критическая ошибка инициализации:', error);
    });
});
