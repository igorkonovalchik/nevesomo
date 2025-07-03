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

// Добавить эти функции в начало script.js (после объявления переменных)

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
        
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                if (assignments[sessionKey][role] === participant.name) {
                    shiftsCount++;
                }
            });
        });
        
        return {
            name: participant.name,
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
        
        html += `
            <div class="stats-user ${user.complete ? 'complete' : 'incomplete'}">
                <div class="stats-user-header">
                    <div class="stats-name">${user.name}</div>
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
        
        // Проверяем доступность airtableService
        if (!window.airtableService) {
            throw new Error('Airtable service не загружен');
        }
        
        // Загружаем все данные
        const data = await window.airtableService.getAllData();
        
        // Обрабатываем участников
        participants = data.participants.map(p => ({
            name          : p.name,
              telegram      : p.telegram,
              telegramId    : p.telegramId,
              isAdmin       : p.isAdmin,
              bathExperience: p.bathExperience
        }));
        
        // Обрабатываем роли
        rolesInfo = {};
        data.roles.forEach(role => {
            if (role.isActive) {
                rolesInfo[role.name] = {
                    icon: role.icon,
                    description: role.description,
                    instructionUrl: role.instructionUrl
                };
            }
        });
        
        // Группируем роли по категориям
        roleGroups = {};
        const rolesByCategory = {};
        
        data.roles.forEach(role => {
            if (role.isActive) {
                const category = role.category || 'other';
                if (!rolesByCategory[category]) {
                    rolesByCategory[category] = [];
                }
                rolesByCategory[category].push(role.name);
            }
        });
        
        // Создаем группы ролей
        Object.entries(rolesByCategory).forEach(([category, roles]) => {
            const categoryNames = {
                'banking': 'Банные',
                'care': 'Забота',
                'lounge': 'Лаунж',
                'kitchen': 'Кухня',
                'other': 'Прочее'
            };
            
            roleGroups[category] = {
                name: categoryNames[category] || category,
                roles: roles
            };
        });
        
        allRoles = Object.values(roleGroups).flatMap(group => group.roles);
        
        // Обрабатываем расписание
        schedule = {};
        data.schedule.forEach(session => {
            const dateKey = session.date;
            if (!schedule[dateKey]) {
                schedule[dateKey] = [];
            }
            
            // Определяем доступные роли для сессии
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
        });
        
        // Сохраняем настройки
        appSettings = data.settings;
        
        // Обрабатываем назначения
        await loadAssignments(data.assignments);
        
        isDataLoaded = true;

        window.participants = participants; // нужно telegram.js
        
        hideLoadingState();
        
        console.log('Данные успешно загружены:', {
            participants: participants.length,
            roles: Object.keys(rolesInfo).length,
            schedule: Object.keys(schedule).length,
            assignments: Object.keys(assignments).length
        });
        
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
    // Сначала создаем пустые назначения
    assignments = {};
    sessionFilters = {};
    
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            assignments[sessionKey] = {};
            sessionFilters[sessionKey] = 'all';
            
            // Определяем роли для сессии
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });
    
    // Затем заполняем существующие назначения
    assignmentsData.forEach(assignment => {
        const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
        if (assignments[sessionKey] && assignments[sessionKey][assignment.roleName] !== undefined) {
            assignments[sessionKey][assignment.roleName] = assignment.participantName;
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

function hideLoadingState() {
    // Состояние загрузки будет скрыто при рендеринге основного контента
}

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
    
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day].find(s => s.time === time);
        
        let sessionRoles = allRoles;
        if (session.roles) {
            sessionRoles = session.roles;
        }
        
        sessionRoles.forEach(role => {
            if (assignments[sessionKey][role] === userName) {
                // Находим к какой категории принадлежит роль
                Object.entries(roleGroups).forEach(([groupKey, group]) => {
                    if (group.roles.includes(role)) {
                        stats[group.name]++;
                    }
                });
            }
        });
    });
    
    return stats;
}

// Функция для проверки, есть ли у пользователя роли в лаунже
function hasLoungeRole(userName) {
    for (const [sessionKey, sessionRoles] of Object.entries(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.lounge.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

// Функция для проверки соседних слотов мастер-класса
function getMasterClassPairSlot(sessionKey) {
    const [day, time] = sessionKey.split('_');
    const currentHour = parseInt(time.split(':')[0]);
    
    // Ищем соседний слот (предыдущий или следующий час)
    const prevTime = `${currentHour - 1}:00`;
    const nextTime = `${currentHour + 1}:00`;
    
    const prevKey = `${day}_${prevTime}`;
    const nextKey = `${day}_${nextTime}`;
    
    if (assignments[prevKey]) return prevKey;
    if (assignments[nextKey]) return nextKey;
    
    return null;
}

// Инициализация
async function init() {
    try {
        // Сначала загружаем данные из Airtable
        await loadAirtableData();
        
        // Заполняем селектор участников
        const userSelect = document.getElementById('currentUser');
        userSelect.innerHTML = '<option value="">Выберите участника</option>';
        participants.forEach(participant => {
            const option = document.createElement('option');
            option.value = participant.name;
            option.textContent = `${participant.name} (${participant.telegram})`;
            userSelect.appendChild(option);
        });
        
        // Загрузка темы из localStorage
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
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.querySelector('.theme-toggle');
    themeToggle.textContent = theme === 'light' ? '🌙' : '☀️';
}

// Функции для работы с назначениями через Airtable
async function saveAssignmentToAirtable(participantName, roleName, slotDate, slotTime) {
    try {
        await window.airtableService.createAssignment(participantName, roleName, slotDate, slotTime);
        console.log('Назначение сохранено в Airtable:', { participantName, roleName, slotDate, slotTime });
    } catch (error) {
        console.error('Ошибка сохранения назначения:', error);
        alert('Ошибка сохранения. Попробуйте еще раз.');
        throw error;
    }
}

async function removeAssignmentFromAirtable(participantName, roleName, slotDate, slotTime) {
    try {
        // Найти назначение по данным и удалить
        const assignments = await window.airtableService.getAssignments();
        const assignmentToDelete = assignments.find(a => 
            a.participantName === participantName && 
            a.roleName === roleName && 
            a.slotDate === slotDate && 
            a.slotTime === slotTime
        );
        
        if (assignmentToDelete) {
            await window.airtableService.deleteAssignment(assignmentToDelete.id);
            console.log('Назначение удалено из Airtable:', assignmentToDelete);
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
        const checkTime = checkSessionKey.split('_')[1];
        if (checkTime === sessionTime) {
            for (const assignedUser of Object.values(sessionRoles)) {
                if (assignedUser === userName) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Обратный отсчет
function startCountdown() {
    const deadline = new Date('2025-07-08T23:59:59');
    
    function updateCountdown() {
        const now = new Date();
        const timeLeft = deadline - now;
        
        if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').textContent = 
                `⏰ ${days}д ${hours}ч ${minutes}м ${seconds}с до дедлайна`;
        } else {
            document.getElementById('countdown').textContent = '🔴 ДЕДЛАЙН ИСТЕК!';
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


// Показ информации о бане
function showBathInfo() {
    alert(`Банный кемп NEVESOMO\n\nЗдесь проходят банные сессии с парением, массажем и заботой о гостях.\n\nПодробнее в описании ролей.`);
}

// Переключение режимов
function setMode(mode) {
    currentMode = mode;
    
    const deadlineWarning = document.getElementById('deadlineWarning');
    const userSelector = document.getElementById('userSelector');
    const myScheduleBtn = document.getElementById('myScheduleBtn');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (mode === 'admin') {
        deadlineWarning.style.display = 'none';
        userSelector.style.display = 'none';
        myScheduleBtn.style.display = 'none';
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
    } else {
        deadlineWarning.style.display = 'block';
        userSelector.style.display = 'block';
        myScheduleBtn.style.display = 'block';
        progressBar.style.display = 'block';
        progressText.style.display = 'block';
    }
    
    updateMenu();
    updateView();
}

// Обновление вида
function updateView() {
    if (currentMode === 'user') {
        currentUser = document.getElementById('currentUser').value;
    }
    renderSchedule();
    updateProgress();
}

// Обновление прогресс бара
function updateProgress() {
    if (currentMode !== 'user' || !currentUser) {
        document.getElementById('progressBar').style.display = 'none';
        document.getElementById('progressText').style.display = 'none';
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
    
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    if (progress >= 100) {
        document.getElementById('progressText').textContent = '✅ Все шифты выбраны!';
        document.getElementById('deadlineWarning').style.display = 'none';
        setTimeout(() => {
            document.getElementById('progressBar').style.display = 'none';
            document.getElementById('progressText').style.display = 'none';
        }, 3000);
    } else {
        document.getElementById('progressText').textContent = `${userShifts}/${minShifts} шифтов выбрано`;
        document.getElementById('deadlineWarning').style.display = 'block';
    }
}

// Меню
function toggleMenu() {
    const menuOverlay = document.getElementById('menuOverlay');
    menuOverlay.classList.toggle('show');
}

function closeMenu() {
    document.getElementById('menuOverlay').classList.remove('show');
}

// Переключение сессии
function toggleSession(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    sessionElement.classList.toggle('expanded');
}

// Переключение фильтра сессии
function setSessionFilter(sessionKey, filter) {
    sessionFilters[sessionKey] = filter;
    
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    sessionElement.querySelectorAll('.session-tab').forEach(tab => tab.classList.remove('active'));
    sessionElement.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    renderSessionRoles(sessionKey);
    updateSessionTabs(sessionKey);
}

// Получение ролей пользователя в сессии
function getUserRolesInSession(sessionKey, userName) {
    const [day, time] = sessionKey.split('_');
    const session = schedule[day].find(s => s.time === time);
    const sessionAssignments = assignments[sessionKey];
    
    // Определяем роли для сессии
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    return sessionRoles.filter(role => sessionAssignments[role] === userName);
}

// Отрисовка расписания
function renderSchedule() {
    const scheduleDiv = document.getElementById('schedule');
    scheduleDiv.innerHTML = '';
    
    Object.keys(schedule).forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-section';
        
        dayDiv.innerHTML = `
            <div class="day-header">${day}</div>
            ${schedule[day].map(session => renderSession(day, session)).join('')}
        `;
        
        scheduleDiv.appendChild(dayDiv);
    });
    
    // Обновляем все табы после полной отрисовки
    setTimeout(() => {
        Object.keys(schedule).forEach(day => {
            schedule[day].forEach(session => {
                const sessionKey = `${day}_${session.time}`;
                updateSessionTabs(sessionKey);
            });
        });
    }, 0);
}

// Отрисовка сессии
function renderSession(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionAssignments = assignments[sessionKey];
    
    // Определяем роли для сессии
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles; // Для кухонных слотов
    }
    
    const filledRoles = sessionRoles.filter(role => sessionAssignments[role] !== null && sessionAssignments[role] !== undefined).length;
    const totalRoles = sessionRoles.length;
    const percentage = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;
    
    // Проверяем, есть ли у пользователя роли в этой сессии
    const userRoles = currentMode === 'user' && currentUser ? 
        getUserRolesInSession(sessionKey, currentUser) : [];
    const hasUserAssignment = userRoles.length > 0;
    
    // Определяем класс для кружка прогресса
    let progressClass = 'empty';
    if (percentage === 100) {
        progressClass = 'complete';
    } else if (percentage > 0) {
        progressClass = 'partial';
    }
    
    const sessionHtml = `
        <div class="session ${hasUserAssignment ? 'user-assigned' : ''}" data-session="${sessionKey}">
            <div class="session-compact" onclick="toggleSession('${sessionKey}')">
                <div class="session-info">
                    <div class="session-basic-info">
                        <div class="session-time">${session.time} - ${session.endTime}</div>
                        <div class="session-details">
                            <a href="#" class="bath-link" onclick="event.stopPropagation(); showBathInfo()">${session.type}</a>
                        </div>
                    </div>
                    ${hasUserAssignment ? `<div class="session-user-indicator">Мой шифт: ${userRoles.join(', ')}</div>` : ''}
                    <div class="session-stats">
                        <div class="progress-display">
                            <div class="progress-circle ${progressClass}">${percentage}%</div>
                            <div class="progress-label">${totalRoles} шифтов</div>
                        </div>
                        ${percentage < 100 && currentMode === 'admin' && session.status !== 'кухня' ? `<button class="auto-fill-slot-btn" onclick="event.stopPropagation(); autoFillSession('${sessionKey}')">Автозаполнение</button>` : ''}
                    </div>
                </div>
            </div>
            ${session.status !== 'кухня' ? `
            <div class="session-expanded">
                <div class="session-tabs">
                    <button class="session-tab active" data-filter="all" onclick="setSessionFilter('${sessionKey}', 'all')">Все</button>
                    ${Object.entries(roleGroups).map(([key, group]) => 
                        `<button class="session-tab" data-filter="${key}" onclick="setSessionFilter('${sessionKey}', '${key}')">${group.name}</button>`
                    ).join('')}
                </div>
                <div class="roles-container" id="roles-${sessionKey}">
                    ${renderSessionRoles(sessionKey)}
                </div>
            </div>
            ` : `
            <div class="session-expanded">
                <div class="roles-grid">
                    ${sessionRoles.map(role => renderRoleSlot(sessionKey, role)).join('')}
                </div>
            </div>
            `}
        </div>
    `;
    
    // После отрисовки обновляем табы
    if (session.status !== 'кухня') {
        setTimeout(() => updateSessionTabs(sessionKey), 0);
    }
    
    return sessionHtml;
}

// Отрисовка ролей сессии
function renderSessionRoles(sessionKey) {
    const filter = sessionFilters[sessionKey];
    let rolesToShow = allRoles;
    
    if (filter !== 'all') {
        rolesToShow = roleGroups[filter].roles;
    }
    
    const rolesHtml = `
        <div class="roles-grid">
            ${rolesToShow.map(role => renderRoleSlot(sessionKey, role)).join('')}
        </div>
    `;
    
    const container = document.getElementById(`roles-${sessionKey}`);
    if (container) {
        container.innerHTML = rolesHtml;
    }
    
    return rolesHtml;
}

// Получение количества свободных ролей в группе
function getEmptyRolesCount(sessionKey, groupRoles) {
    const sessionAssignments = assignments[sessionKey];
    return groupRoles.filter(role => !sessionAssignments[role]).length;
}

// Обновление табов с количеством свободных ролей
function updateSessionTabs(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    // Обновляем таб "Все"
    const allTab = sessionElement.querySelector('[data-filter="all"]');
    if (allTab) {
        const totalEmpty = getEmptyRolesCount(sessionKey, allRoles);
        if (totalEmpty > 0) {
            allTab.innerHTML = `Все <span class="empty-count">${totalEmpty}</span>`;
        } else {
            allTab.innerHTML = 'Все';
        }
    }
    
    // Обновляем табы групп
    Object.entries(roleGroups).forEach(([key, group]) => {
        const groupTab = sessionElement.querySelector(`[data-filter="${key}"]`);
        if (groupTab) {
            const groupEmpty = getEmptyRolesCount(sessionKey, group.roles);
            if (groupEmpty > 0) {
                groupTab.innerHTML = `${group.name} <span class="empty-count">${groupEmpty}</span>`;
            } else {
                groupTab.innerHTML = group.name;
            }
        }
    });
}

// Отрисовка слота роли
function renderRoleSlot(sessionKey, role) {
    const assignedUser = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    const isCurrentUser = currentMode === 'user' && assignedUser === currentUser;
    const shouldFade = currentMode === 'user' && currentUser && 
                      getUserRolesInSession(sessionKey, currentUser).length > 0 && !isCurrentUser;
    
    let className = 'role-slot';
    let userDisplay = 'Свободно';
    
    if (assignedUser) {
        className += ' occupied';
        userDisplay = assignedUser;
        
        if (isCurrentUser) {
            className += ' current-user';
        }
    } else if (isBlocked) {
        className += ' blocked';
        userDisplay = 'Занято в это время';
    }
    
    if (shouldFade) {
        className += ' faded';
    }
    
    return `
        <div class="${className}" onclick="handleRoleSlotClick('${sessionKey}', '${role}')">
            <div class="role-name">${role}</div>
            <div class="role-user">${userDisplay}</div>
            ${isCurrentUser ? '<div class="role-checkmark">✓</div>' : ''}
        </div>
    `;
}

// Обработка клика по слоту роли
function handleRoleSlotClick(sessionKey, role) {
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        // Проверяем специальные правила для мастер-класса
        if (role === 'Мастер класс') {
            if (!hasLoungeRole(currentUser)) {
                alert('Мастер-класс может быть выбран только участниками, которые уже записались в категорию "Лаунж". Сначала выберите себе шифт в лаунже!');
                return;
            }
        }
        
        toggleUserAssignment(sessionKey, role);
    }
}

// Открытие попапа выбора участника
function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];
    
    let html = `
        <div class="participant-item" onclick="selectParticipant(null)" style="border-bottom: 1px solid #E0E0E0; margin-bottom: 12px; padding-bottom: 12px;">
            <div class="participant-name">🗑️ Очистить слот</div>
            <div class="participant-telegram">Убрать назначение</div>
        </div>
        <div class="participant-item" onclick="selectParticipant('Участник другого кемпа')" style="border-bottom: 1px solid #E0E0E0; margin-bottom: 12px; padding-bottom: 12px;">
            <div class="participant-name">👤 Участник другого кемпа</div>
            <div class="participant-telegram">Внешний участник</div>
        </div>
    `;
    
    participants.forEach(participant => {
        const isSelected = participant.name === currentAssignment;
        html += `
            <div class="participant-item ${isSelected ? 'selected' : ''}" onclick="selectParticipant('${participant.name}')" style="background: ${isSelected ? '#E8F5E8' : '#F7F7F7'}; margin-bottom: 8px; border-radius: 8px;">
                <div class="participant-name">${participant.name} ${isSelected ? '✓' : ''}</div>
                <div class="participant-telegram">${participant.telegram}</div>
            </div>
        `;
    });
    
    participantsList.innerHTML = html;
    document.getElementById('participantPopup').classList.add('show');
}

// Выбор участника (для админа)
async function selectParticipant(participantName) {
    if (!currentPopupSession || !currentPopupRole) return;
    
    const role = currentPopupRole;
    const sessionKey = currentPopupSession;
    const [day, time] = sessionKey.split('_');
    const currentAssignment = assignments[sessionKey][role];
    
    try {
        // Если было предыдущее назначение - удаляем его
        if (currentAssignment && currentAssignment !== 'Участник другого кемпа') {
            await removeAssignmentFromAirtable(currentAssignment, role, day, time);
        }
        
        // Если назначаем нового участника - создаем запись
        if (participantName && participantName !== 'Участник другого кемпа') {
            await saveAssignmentToAirtable(participantName, role, day, time);
        }
        
        // Обработка мастер-класса
        if (role === 'Мастер класс') {
            const pairSlot = getMasterClassPairSlot(sessionKey);
            if (pairSlot) {
                const [pairDay, pairTime] = pairSlot.split('_');
                
                // Удаляем старое назначение в парном слоте
                if (currentAssignment && currentAssignment !== 'Участник другого кемпа') {
                    await removeAssignmentFromAirtable(currentAssignment, role, pairDay, pairTime);
                }
                
                // Создаем новое назначение в парном слоте
                if (participantName && participantName !== 'Участник другого кемпа') {
                    await saveAssignmentToAirtable(participantName, role, pairDay, pairTime);
                }
                
                assignments[pairSlot][role] = participantName;
            }
        }
        
        assignments[sessionKey][role] = participantName;
        
        renderSchedule();
        updateProgress();
        
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        // В случае ошибки перезагружаем данные
        await loadAirtableData();
        renderSchedule();
        updateProgress();
    }
    
    closeParticipantPopup();
}

// Закрытие попапа участника
function closeParticipantPopup() {
    document.getElementById('participantPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

// Переключение назначения пользователя
async function toggleUserAssignment(sessionKey, role) {
    if (!currentUser) {
        alert('Выберите участника');
        return;
    }
    
    const currentAssignment = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    
    if (isBlocked && currentAssignment !== currentUser) {
        alert('У вас уже есть другая роль в это время!');
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    
    try {
        if (currentAssignment === currentUser) {
            // Снимаем назначение
            await removeAssignmentFromAirtable(currentUser, role, day, time);
            
            if (role === 'Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await removeAssignmentFromAirtable(currentUser, role, pairDay, pairTime);
                    assignments[pairSlot][role] = null;
                }
            }
            assignments[sessionKey][role] = null;
            
        } else if (currentAssignment === null) {
            // Назначаем
            await saveAssignmentToAirtable(currentUser, role, day, time);
            
            if (role === 'Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await saveAssignmentToAirtable(currentUser, role, pairDay, pairTime);
                    assignments[pairSlot][role] = currentUser;
                }
            }
            assignments[sessionKey][role] = currentUser;
            
        } else {
            alert('Этот слот уже занят. Обратитесь к администратору.');
            return;
        }
        
        renderSchedule();
        updateProgress();
        
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        // В случае ошибки перезагружаем данные
        await loadAirtableData();
        renderSchedule();
        updateProgress();
    }
}

// Проверка блокировки слота
function isSlotBlocked(sessionKey, role) {
    if (currentMode !== 'user' || !currentUser) return false;
    
    const sessionTime = sessionKey.split('_')[1];
    
    for (const [checkSessionKey, sessionRoles] of Object.entries(assignments)) {
        const checkTime = checkSessionKey.split('_')[1];
        if (checkTime === sessionTime) {
            for (const [checkRole, assignedUser] of Object.entries(sessionRoles)) {
                if (assignedUser === currentUser && checkRole !== role) {
                    return true;
                }
            }
        }
    }
    
    return false;
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

// Статистика
function openStatsPopup() {
    const statsList = document.getElementById('statsList');
    
    const userStats = participants.map(participant => {
        let shiftsCount = 0;
        const categoryStats = getUserCategoryStats(participant.name);
        
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            // Определяем роли для сессии
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                if (assignments[sessionKey][role] === participant.name) {
                    shiftsCount++;
                }
            });
        });
        
        return {
            name: participant.name,
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
        
        html += `
            <div class="stats-user ${user.complete ? 'complete' : 'incomplete'}">
                <div class="stats-user-header">
                    <div class="stats-name">${user.name}</div>
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

function closeStatsPopup() {
    document.getElementById('statsPopup').classList.remove('show');
}

// Мое расписание / Расписание
function openMySchedule() {
    previousPopup = null; // Сбрасываем предыдущий попап
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
        
        // Подсчитываем шифты пользователя с учетом новой структуры
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            // Определяем роли для сессии
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
        
        // Для пользователя показываем только его шифты, сгруппированные по дням
        const userShiftsByDay = {};
        
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day].find(s => s.time === time);
            
            // Определяем роли для сессии
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
            const dateA = parseInt(a.split(' ')[0]);
            const dateB = parseInt(b.split(' ')[0]);
            return dateA - dateB;
        });
        
        if (sortedDays.length === 0) {
            html += '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">У вас пока нет назначенных шифтов</div>';
        } else {
            sortedDays.forEach(day => {
                html += `<h2 style="margin: 24px 0 16px 0; color: var(--accent-primary); font-size: 1.4em;">${day}</h2>`;
                
                // Сортируем шифты в дне по времени
                userShiftsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
                
                userShiftsByDay[day].forEach(shift => {
                    html += `
                        <div class="schedule-item">
                            <div class="schedule-item-header">
                                <div class="schedule-time">${shift.time} - ${shift.endTime}</div>
                            </div>
                            <div class="schedule-role">${shift.role}</div>
                            <div class="schedule-info">${shift.sessionNum ? `Баня #${shift.sessionNum}` : 'Кухня'} • ${shift.type}</div>
                            <div class="schedule-actions">
                                <button class="info-btn" onclick="showRoleDetail('${shift.role}', 'schedule')">ℹ️ Подробнее</button>
                            </div>
                        </div>
                    `;
                });
            });
        }
    } else {
        // Для админа показываем полное расписание
        Object.keys(schedule).forEach(day => {
            html += `<h3 style="margin: 20px 0 16px 0; color: var(--accent-primary);">${day}</h3>`;
            
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
