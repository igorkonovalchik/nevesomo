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
function formatDate(dateStr) {
    const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                   'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[2]);
        const month = parseInt(parts[1]) - 1;
        return `${day} ${months[month]}`;
    }
    return dateStr;
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
    const burgerBtn = document.querySelector('.burger-btn');
    if (menuOverlay) {
        menuOverlay.classList.toggle('show');
        burgerBtn.classList.toggle('active');
    }
}

window.closeMenu = function() {
    const menuOverlay = document.getElementById('menuOverlay');
    const burgerBtn = document.querySelector('.burger-btn');
    if (menuOverlay) {
        menuOverlay.classList.remove('show');
        burgerBtn.classList.remove('active');
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
    if (!statsList) return;

    const userStats = participants.map(participant => {
        let shiftsCount = 0;
        const categoryStats = getUserCategoryStats(participant.name);
        Object.values(assignments).forEach(session => {
            Object.values(session).forEach(user => {
                if (user === participant.name) shiftsCount++;
            });
        });
        return { name: participant.name, telegram: participant.telegram, shifts: shiftsCount, complete: shiftsCount >= 8, categories: categoryStats };
    });

    userStats.sort((a, b) => b.shifts - a.shifts);

    let html = '';
    userStats.forEach(user => {
        const categoriesHtml = Object.entries(user.categories).filter(([, count]) => count > 0).map(([category, count]) => `<div class="stats-category">${category}: ${count}</div>`).join('');
        const telegramLink = user.telegram ? `<a href="https://t.me/${user.telegram.replace('@', '')}" target="_blank">${user.telegram}</a>` : '';
        const completionClass = user.shifts >= 8 ? 'complete' : 'incomplete';
        html += `
            <div class="stats-user ${completionClass}">
                <div class="stats-user-header">
                    <div>
                        <div class="stats-name">${user.name}</div>
                        ${telegramLink ? `<div class="stats-telegram">${telegramLink}</div>` : ''}
                    </div>
                    <div class="stats-total">
                        ${user.shifts}/8 шифтов
                    </div>
                </div>
                <div class="stats-categories">${categoriesHtml || '<div class="stats-category" style="opacity: 0.7;">Нет шифтов</div>'}</div>
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
    Object.entries(roleGroups).forEach(([, group]) => {
        html += `<h3 class="roles-group-title">${group.name}</h3>`;
        group.roles.forEach(role => {
            const roleInfo = rolesInfo[role];
            if(roleInfo) {
                html += `
                    <div class="roles-list-item" onclick="showRoleDetail('${role}', 'roles')">
                        <div>
                            <div class="roles-list-item-name">${roleInfo.icon} ${role}</div>
                            <div class="roles-list-item-desc">${roleInfo.description.substring(0, 60)}...</div>
                        </div>
                        <div class="roles-list-item-arrow">›</div>
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
    document.getElementById('rolesInfoPopup').classList.remove('show');
    document.getElementById('schedulePopup').classList.remove('show');
    document.getElementById('roleDetailPopup').classList.add('show');
}

window.updateView = updateView;
window.setMode = setMode;

// Инициализация
async function init() {
    try {
        await loadAirtableData();
        const userSelect = document.getElementById('currentUser');
        userSelect.innerHTML = '<option value="">Выберите участника</option>';
        participants.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.name;
            option.textContent = participant.name;
            userSelect.appendChild(option);
        });
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        startCountdown();
        updateMenu();
        renderSchedule();
        updateProgress();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showErrorState('Не удалось загрузить данные. Проверьте подключение к интернету.');
    }
}

// Загрузка данных
async function loadAirtableData() {
    if (isDataLoading) return;
    isDataLoading = true;
    showLoadingState();
    try {
        if (!window.airtableService) throw new Error('Airtable service не загружен');
        const data = await window.airtableService.getAllData();
        participants = data.participants.map(p => ({ name: p.name, telegram: p.telegram, telegramId: p.telegramId, isAdmin: p.isAdmin, bathExperience: p.bathExperience }));
        rolesInfo = {};
        const rolesByCategory = {};
        data.roles.forEach(role => {
            if (role.isActive) {
                rolesInfo[role.name] = { icon: role.icon, description: role.description, instructionUrl: role.instructionUrl, category: role.category || 'other' };
                const category = role.category || 'other';
                if (!rolesByCategory[category]) rolesByCategory[category] = [];
                rolesByCategory[category].push(role.name);
            }
        });
        const categoryNames = { 'banking': 'Банные', 'care': 'Забота', 'lounge': 'Лаунж', 'kitchen': 'Кухня', 'other': 'Прочее' };
        roleGroups = {};
        Object.entries(rolesByCategory).forEach(([category, roles]) => {
            roleGroups[category] = { name: categoryNames[category] || category, roles: roles };
        });
        ['lounge', 'banking', 'care', 'kitchen', 'other'].forEach(cat => {
            if (!roleGroups[cat]) roleGroups[cat] = { name: categoryNames[cat] || cat, roles: [] };
        });
        allRoles = Object.keys(rolesInfo);
        schedule = {};
        data.schedule.forEach(session => {
            const dateKey = session.date;
            if (!schedule[dateKey]) schedule[dateKey] = [];
            let availableRoles = session.availableRoles ? session.availableRoles.split(',').map(r => r.trim()) : [];
            schedule[dateKey].push({ time: session.startTime, endTime: session.endTime, type: session.type, roles: availableRoles.length > 0 ? availableRoles : undefined });
            schedule[dateKey].sort((a, b) => a.time.localeCompare(b.time));
        });
        await loadAssignments(data.assignments);
        isDataLoaded = true;
        window.participants = participants;
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showErrorState(error.message);
    } finally {
        isDataLoading = false;
        hideLoader();
    }
}

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
            assignments[sessionKey][assignment.roleName] = assignment.participantName || null;
        }
    });
}

// Функции рендера
function renderSchedule() {
    const scheduleDiv = document.getElementById('schedule');
    scheduleDiv.innerHTML = '';
    const sortedDays = Object.keys(schedule).sort((a,b) => new Date(a.split('-').reverse().join('-')) - new Date(b.split('-').reverse().join('-')));
    sortedDays.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-section';
        dayDiv.innerHTML = `<div class="day-header">${formatDate(day)}</div>${schedule[day].map(session => renderSession(day, session)).join('')}`;
        scheduleDiv.appendChild(dayDiv);
    });
    Object.keys(assignments).forEach(updateSessionTabs);
}

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
    const availableCategories = new Set(sessionRoles.map(role => rolesInfo[role]?.category || 'other'));
    const tabsHtml = Array.from(availableCategories).map(key => `<button class="session-tab" data-filter="${key}" onclick="setSessionFilter('${sessionKey}', '${key}')">${roleGroups[key].name}</button>`).join('');
    return `
        <div class="session ${hasUserAssignment ? 'user-assigned' : ''}" data-session="${sessionKey}">
            <div class="session-compact" onclick="toggleSession('${sessionKey}')">
                <div class="session-info">
                    <div class="session-basic-info">
                        <div class="session-time">${session.time} - ${session.endTime}</div>
                        <div class="session-details">${session.type}</div>
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
                <div class="roles-container" id="roles-${sessionKey}">${renderSessionRoles(sessionKey)}</div>
            </div>
        </div>`;
}

function renderSessionRoles(sessionKey) {
    const filter = sessionFilters[sessionKey] || 'all';
    const session = schedule[sessionKey.split('_')[0]].find(s => s.time === sessionKey.split('_')[1]);
    let allSessionRoles = session.roles || allRoles;
    let rolesToShow = (filter !== 'all' && roleGroups[filter]) ? allSessionRoles.filter(role => new Set(roleGroups[filter].roles).has(role)) : allSessionRoles;
    const rolesHtml = `<div class="roles-grid">${rolesToShow.map(role => renderRoleSlot(sessionKey, role)).join('')}</div>`;
    const container = document.getElementById(`roles-${sessionKey}`);
    if (container) container.innerHTML = rolesHtml;
    return rolesHtml;
}

function renderRoleSlot(sessionKey, role) {
    const assignedUser = assignments[sessionKey]?.[role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    const isCurrentUser = currentMode === 'user' && assignedUser === currentUser;
    let className = 'role-slot';
    let userDisplay = 'Свободно';
    if (assignedUser) {
        className += ' occupied';
        userDisplay = assignedUser;
        if (isCurrentUser) className += ' current-user';
    } else if (isBlocked) {
        className += ' blocked';
        userDisplay = 'Время занято';
    }
    return `
        <div class="${className}" onclick="handleRoleSlotClick('${sessionKey}', '${role}')">
            <div class="role-name">${rolesInfo[role]?.icon || ''} ${role}</div>
            <div class="role-user">${userDisplay}</div>
            ${isCurrentUser ? '<div class="role-checkmark">✓</div>' : ''}
        </div>`;
}

// Логика работы с шифтами
function handleRoleSlotClick(sessionKey, role) {
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        if (!currentUser) { alert('Сначала выберите себя в списке участников наверху!'); return; }
        toggleUserAssignment(sessionKey, role);
    }
}

async function toggleUserAssignment(sessionKey, role) {
    const currentAssignment = assignments[sessionKey][role];
    if (isSlotBlocked(sessionKey, role) && !currentAssignment) {
        alert('У вас уже есть другая несовместимая роль в это время!');
        return;
    }
    const [day, time] = sessionKey.split('_');
    showLoader(currentAssignment === currentUser ? 'Удаляю шифт...' : 'Сохраняю шифт...');
    try {
        if (currentAssignment === currentUser) {
            await removeAssignmentFromAirtable(currentUser, role, day, time);
            assignments[sessionKey][role] = null;
        } else if (currentAssignment === null) {
            await saveAssignmentToAirtable(currentUser, role, day, time);
            assignments[sessionKey][role] = currentUser;
        } else {
            alert('Этот слот уже занят другим участником.');
        }
    } catch (error) {
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

function startCountdown() {
    const deadline = new Date('2025-07-08T23:59:59');
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    function updateCountdown() {
        const timeLeft = deadline - new Date();
        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000*60*60*24));
            const hours = Math.floor((timeLeft % (1000*60*60*24)) / (1000*60*60));
            const minutes = Math.floor((timeLeft % (1000*60*60)) / (1000*60));
            countdownEl.textContent = `До дедлайна: ${days}д ${hours}ч ${minutes}м`;
        } else {
            countdownEl.textContent = '🔴 Дедлайн прошел!';
        }
    }
    updateCountdown();
    setInterval(updateCountdown, 60000);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

function updateMenu() {
    const menuItems = document.getElementById('menuItems');
    let html = '';
    if (currentMode === 'admin') {
        html = `
      <div class="menu-item" onclick="openStatsPopup(); closeMenu();"><span>📊 Статистика</span></div>
      <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();"><span>❓ О шифтах</span></div>
      <div class="menu-item" onclick="setMode('user'); closeMenu();"><span>👤 Режим участника</span></div>`;
    } else {
        html = `
      <div class="menu-item" onclick="openMySchedule(); closeMenu();"><span>📅 Мое расписание</span></div>
      <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();"><span>❓ О шифтах</span></div>`;
        if (!window.telegramUtils?.telegramUser) {
            html += `<div class="menu-item" onclick="setMode('admin'); closeMenu();"><span>👑 Режим админа</span></div>`;
        }
    }
    menuItems.innerHTML = html;
}

// ИСПРАВЛЕНО: Логика для кнопки "Режим участника" у админа
function setMode(mode) {
    currentMode = mode;
    const userSelectorContainer = document.getElementById('userSelector');
    const userSelect = document.getElementById('currentUser');
    
    userSelectorContainer.style.display = (mode === 'admin' || !window.telegramUtils?.telegramUser) ? 'block' : 'none';
    document.getElementById('deadlineWarning').style.display = mode === 'user' ? 'block' : 'none';
    document.getElementById('myScheduleBtn').style.display = mode === 'user' ? 'block' : 'none';
    
    if (mode === 'user') {
        if (!currentUser && participants.length > 0) {
            // Если админ переключается в режим юзера, выбираем первого участника для отображения
            currentUser = participants[0].name;
            userSelect.value = currentUser;
        }
        document.getElementById('progressBar').style.display = 'block';
        document.getElementById('progressText').style.display = 'block';
    } else { // admin mode
        document.getElementById('progressBar').style.display = 'none';
        document.getElementById('progressText').style.display = 'none';
    }
    
    updateMenu();
    updateView();
}


function updateView() {
    if (currentMode === 'user' || !window.telegramUtils?.telegramUser) {
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
    const userShifts = Object.values(assignments).flatMap(Object.values).filter(user => user === currentUser).length;
    const minShifts = 8;
    const progress = Math.min((userShifts / minShifts) * 100, 100);
    document.getElementById('progressFill').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${userShifts} / ${minShifts}`;
    if (progress >= 100) {
        document.getElementById('deadlineWarning').style.display = 'none';
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
    updateSessionTabs(sessionKey);
}

function updateSessionTabs(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    const getEmptyCount = (roleList) => roleList.filter(role => !assignments[sessionKey][role]).length;
    sessionElement.querySelectorAll('.session-tab').forEach(tab => {
        const filter = tab.dataset.filter;
        let count = 0;
        if (filter === 'all') {
            const allSessionRoles = schedule[sessionKey.split('_')[0]].find(s => s.time === sessionKey.split('_')[1]).roles || allRoles;
            count = getEmptyCount(allSessionRoles);
        } else if (roleGroups[filter]) {
            count = getEmptyCount(roleGroups[filter].roles);
        }
        const countEl = tab.querySelector('.empty-count');
        if (count > 0) {
            if (countEl) countEl.textContent = count;
            else tab.innerHTML += ` <span class="empty-count">${count}</span>`;
        } else {
            if (countEl) countEl.remove();
        }
    });
}

// ИСПРАВЛЕНО: Восстановлена логика для открытия "Мое расписание"
function openSchedulePopup() {
    if (!currentUser) {
        alert("Сначала выберите себя в списке участников.");
        return;
    }
    previousPopup = null;
    const scheduleBody = document.getElementById('scheduleBody');
    const userAssignments = [];

    Object.entries(assignments).forEach(([sessionKey, roles]) => {
        Object.entries(roles).forEach(([role, user]) => {
            if (user === currentUser) {
                const [day, time] = sessionKey.split('_');
                const sessionInfo = schedule[day].find(s => s.time === time);
                userAssignments.push({ day, time, role, type: sessionInfo.type });
            }
        });
    });

    userAssignments.sort((a, b) => new Date(a.day.split('-').reverse().join('-')) - new Date(b.day.split('-').reverse().join('-')) || a.time.localeCompare(b.time));

    let html = `<div class="user-profile">
                  <div class="user-name">${currentUser}</div>
                  <div class="user-stats">
                    <div class="stat-item">
                      <div class="stat-number">${userAssignments.length}</div>
                      <div class="stat-label">Шифтов</div>
                    </div>
                  </div>
                </div>`;

    if (userAssignments.length === 0) {
        html += '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">У вас пока нет назначенных шифтов.</div>';
    } else {
        const groupedByDay = userAssignments.reduce((acc, curr) => {
            (acc[curr.day] = acc[curr.day] || []).push(curr);
            return acc;
        }, {});

        Object.entries(groupedByDay).forEach(([day, shifts]) => {
            html += `<div class="day-header-popup">${formatDate(day)}</div>`;
            shifts.forEach(shift => {
                html += `
                <div class="schedule-item-compact" onclick="showRoleDetail('${shift.role}', 'schedule')">
                    <div class="schedule-compact-info">
                         <div class="schedule-compact-time">${shift.time}</div>
                         <div class="schedule-compact-details">
                            <div class="schedule-compact-role">${rolesInfo[shift.role].icon} ${shift.role}</div>
                            <div class="schedule-compact-type">${shift.type}</div>
                         </div>
                    </div>
                    <div class="schedule-compact-arrow">›</div>
                </div>`;
            });
        });
    }

    scheduleBody.innerHTML = html;
    document.getElementById('schedulePopup').classList.add('show');
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    init().catch(error => {
        console.error('Критическая ошибка инициализации:', error);
    });
});
