// Данные участников
const participants = [
    { name: 'Саша Безруков', telegram: '@Artbit17', bathExperience: false },
    { name: 'Юра Стрелков', telegram: '@nt3f5h', bathExperience: false },
    { name: 'Ляйсан Санжапова', telegram: '@ponysun', bathExperience: false },
    { name: 'Иван Дрожжин', telegram: '@mpil5', bathExperience: true },
    { name: 'Марьяна Бажан', telegram: '@bazhanka', bathExperience: true },
    { name: 'Дима Кудряшов', telegram: '@', bathExperience: false },
    { name: 'Алена Соколова', telegram: '@iadoreuall', bathExperience: false },
    { name: 'Стефан Прокопенко', telegram: '@steve_procore', bathExperience: false },
    { name: 'Кирюша Рябков', telegram: '@brutsky', bathExperience: false },
    { name: 'Костя Новаковский', telegram: '@kostya_keper', bathExperience: false },
    { name: 'Катя Авдеева', telegram: '@e_avdeeva', bathExperience: false },
    { name: 'Игорь Коновальчик', telegram: '@konovalchik', bathExperience: false },
    { name: 'Таня Розенцвит', telegram: '@captain_shadow', bathExperience: false },
    { name: 'Уля Белка', telegram: '@reelsulya', bathExperience: false },
    { name: 'Ваня Кусакин', telegram: '@un1maf', bathExperience: false },
    { name: 'Океан', telegram: '@Ocean_so_be_it', bathExperience: false },
    { name: 'Серёжа Лучакин', telegram: '@', bathExperience: true },
    { name: 'Марина Беляева', telegram: '@', bathExperience: false },
    { name: 'Илья Чередников', telegram: '@ilya_ch', bathExperience: false },
    { name: 'Александра Никифорова', telegram: '@coreference', bathExperience: false },
    { name: 'Света Скобликова', telegram: '@skoblikovas', bathExperience: false },
    { name: 'Игорь Каменев', telegram: '@mrjamesbond', bathExperience: false },
    { name: 'Ольга Ермолаева', telegram: '@for_j_in_range', bathExperience: false }
];

// Роли с описаниями
const rolesInfo = {
    'Главный банный мастер': {
        icon: '👑',
        description: 'Ведет всю группу, отвечает за процесс и набор команды на парение. Управляет температурой и влажностью в парной. Координирует работу всех пармастеров и следит за безопасностью процесса.',
        instructionUrl: 'https://example.com/master-guide'
    },
    'Ассистент пармейстера': {
        icon: '🌿',
        description: 'Проводит парение, работает с вениками и травами. Помогает главному мастеру в создании правильной атмосферы и температурного режима. Владеет техниками массажа вениками.',
        instructionUrl: 'https://example.com/parmaster-guide'
    },
    'Источник/Водовоз/Тех.гид': {
        icon: '💧',
        description: 'Топит печь в бане, помогает с уборкой бань, следит за наличием воды в бочках и питья для банщиков. Поддерживает техническое состояние парной и обеспечивает безопасность.',
        instructionUrl: 'https://example.com/tech-guide'
    },
    'Гриттер 1': {
        icon: '👋',
        description: 'Встречает гостей в сенях, записывает в баню, организует приходящих, провожает гостей в лаунж после бани. Первая точка контакта с посетителями.',
        instructionUrl: 'https://example.com/gritter-guide'
    },
    'Любовь+Забота - 1': {
        icon: '💆',
        description: 'Заботится об уюте и комфорте в лежачей зоне отдыха, укладывает и укутывает, делает легкий массаж. Создает атмосферу релакса и восстановления.',
        instructionUrl: 'https://example.com/care-guide'
    },
    'Любовь+Забота': {
        icon: '🧘',
        description: 'Заботится об уюте и комфорте в лежачей зоне отдыха, укладывает и укутывает, делает легкий массаж. Создает атмосферу релакса и восстановления.',
        instructionUrl: 'https://example.com/care-masterclass-guide'
    },
    'Гостевая Забота': {
        icon: '🤝',
        description: 'Волонтеры от других кемпов ветерка на роль заботы. Представляют дружественные кемпы и обеспечивают гостеприимство для всех участников фестиваля.',
        instructionUrl: 'https://example.com/guest-care-guide'
    },
    'Мастер класс': {
        icon: '🎓',
        description: 'Проводит мастер-класс для гостей в течение двух часов подряд. Может быть выбран только участниками, которые уже записались в категорию "Лаунж".',
        instructionUrl: 'https://example.com/masterclass-guide'
    },
    'Страхующий/Уют': {
        icon: '🛡️',
        description: 'Заменяет не вышедшего на шифт, встречает людей в раздевалке и заонбордит, наводит порядок в раздевалке. Универсальный помощник и координатор.',
        instructionUrl: 'https://example.com/backup-guide'
    },
    'Поваренок': {
        icon: '👨‍🍳',
        description: 'Готовит легкие закуски и напитки для гостей перед банными процедурами. Обеспечивает комфорт и питание участников.',
        instructionUrl: 'https://example.com/cook-guide'
    }
};

const roleGroups = {
    banking: {
        name: 'Банные',
        roles: ['Главный банный мастер', 'Ассистент пармейстера', 'Источник/Водовоз/Тех.гид']
    },
    care: {
        name: 'Забота', 
        roles: ['Гриттер 1', 'Гостевая Забота']
    },
    lounge: {
        name: 'Лаунж',
        roles: ['Любовь+Забота - 1', 'Любовь+Забота']
    },
    kitchen: {
        name: 'Кухня',
        roles: ['Поваренок']
    },
    other: {
        name: 'Прочее',
        roles: ['Мастер класс', 'Страхующий/Уют']
    }
};

const allRoles = Object.values(roleGroups).flatMap(group => group.roles);

// Расписание сессий
const schedule = {
    '13 июля': [
        { time: '15:00', endTime: '16:00', sessionNum: 1, status: 'для своих', type: 'Баня для своих' },
        { time: '17:00', endTime: '18:00', sessionNum: 2, status: 'для своих', type: 'Баня для своих' },
        { time: '18:00', endTime: '19:00', sessionNum: 3, status: 'для своих', type: 'Баня для своих' },
        { time: '19:00', endTime: '20:00', sessionNum: 4, status: 'для своих', type: 'Баня для своих' },
        { time: '20:00', endTime: '21:00', sessionNum: 5, status: 'для своих', type: 'Баня для своих' }
    ],
    '14 июля': [
        { time: '11:00', endTime: '12:00', sessionNum: 6, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '12:00', endTime: '13:00', sessionNum: 7, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '13:00', endTime: '14:00', sessionNum: 8, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '14:00', endTime: '15:00', sessionNum: null, status: 'кухня', type: 'Обед', roles: ['Поваренок'] },
        { time: '15:00', endTime: '16:00', sessionNum: 10, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '16:00', endTime: '17:00', sessionNum: 11, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '17:00', endTime: '18:00', sessionNum: 12, status: 'для участников ветерка', type: 'Баня для гостей' }
    ],
    '15 июля': [
        { time: '11:00', endTime: '12:00', sessionNum: 13, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '12:00', endTime: '13:00', sessionNum: 14, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '13:00', endTime: '14:00', sessionNum: 15, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '14:00', endTime: '15:00', sessionNum: null, status: 'кухня', type: 'Обед', roles: ['Поваренок'] },
        { time: '15:00', endTime: '16:00', sessionNum: 17, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '16:00', endTime: '17:00', sessionNum: 18, status: 'для участников ветерка', type: 'Баня для гостей' },
        { time: '17:00', endTime: '18:00', sessionNum: 19, status: 'для участников ветерка', type: 'Баня для гостей' }
    ],
    '16 июля': [
        { time: '11:00', endTime: '12:00', sessionNum: 20, status: 'для своих', type: 'Баня для своих' }
    ]
};

// Переменные состояния
let assignments = {};
let currentMode = 'user'; // По умолчанию пользовательский режим
let currentUser = '';
let currentPopupSession = null;
let currentPopupRole = null;
let sessionFilters = {};
let previousPopup = null;

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
function init() {
    // Заполняем селектор участников
    const userSelect = document.getElementById('currentUser');
    participants.forEach(participant => {
        const option = document.createElement('option');
        option.value = participant.name;
        option.textContent = `${participant.name} (${participant.telegram})`;
        userSelect.appendChild(option);
    });
    
    // Создаем пустые назначения
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            assignments[sessionKey] = {};
            sessionFilters[sessionKey] = 'all';
            
            // Определяем роли для сессии
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles; // Для кухонных слотов
            }
            
            sessionRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });
    
    // Автоматическое начальное распределение
    autoDistributeInitially();
    
    // Загрузка темы из localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    startCountdown();
    updateMenu();
    renderSchedule();
    updateProgress();
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

// Автоматическое начальное распределение
function autoDistributeInitially() {
    const experiencedBathMasters = participants.filter(p => p.bathExperience);
    
    // Подсчитываем нагрузку участников
    const userShiftCount = {};
    participants.forEach(p => userShiftCount[p.name] = 0);
    
    // Сначала назначаем главных банных мастеров из опытных для банных сессий
    Object.keys(assignments).forEach((sessionKey, index) => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day].find(s => s.time === time);
        
        // Пропускаем кухонные слоты
        if (session.status === 'кухня') return;
        
        const masterRole = 'Главный банный мастер';
        if (experiencedBathMasters.length > 0 && assignments[sessionKey][masterRole] !== undefined) {
            const masterIndex = index % experiencedBathMasters.length;
            const selectedMaster = experiencedBathMasters[masterIndex];
            assignments[sessionKey][masterRole] = selectedMaster.name;
            userShiftCount[selectedMaster.name]++;
        }
    });
    
    // Затем распределяем остальные роли
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day].find(s => s.time === time);
        
        // Определяем роли для сессии
        let sessionRoles = allRoles;
        if (session.roles) {
            sessionRoles = session.roles;
        }
        
        sessionRoles.forEach(role => {
            if (role !== 'Главный банный мастер' && !assignments[sessionKey][role]) {
                const minShifts = Math.min(...Object.values(userShiftCount));
                const availableUsers = Object.keys(userShiftCount).filter(user => {
                    return userShiftCount[user] === minShifts && !isUserBusyInSession(sessionKey, user);
                });
                
                if (availableUsers.length > 0) {
                    const selectedUser = availableUsers[Math.floor(Math.random() * availableUsers.length)];
                    assignments[sessionKey][role] = selectedUser;
                    userShiftCount[selectedUser]++;
                }
            }
        });
    });
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

// Обновление меню в зависимости от режима
function updateMenu() {
    const menuItems = document.getElementById('menuItems');
    let html = '';
    
    if (currentMode === 'admin') {
        html = `
            <div class="menu-item" onclick="setMode('user'); closeMenu();">
                👤 Режим участника
            </div>
            <div class="menu-item" onclick="openStatsPopup(); closeMenu();">
                📊 Статистика
            </div>
            <div class="menu-item" onclick="openSchedulePopup(); closeMenu();">
                📅 Расписание
            </div>
            <div class="menu-item" onclick="openDataEditPopup(); closeMenu();">
                ⚙️ Изменить данные
            </div>
            <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();">
                ❓ О шифтах
            </div>
        `;
    } else {
        html = `
            <div class="menu-item" onclick="setMode('admin'); closeMenu();">
                👨‍💼 Админ режим
            </div>
            <div class="menu-item" onclick="openMySchedule(); closeMenu();">
                📅 Мое расписание
            </div>
            <div class="menu-item" onclick="openRolesInfoPopup(); closeMenu();">
                ❓ О шифтах
            </div>
        `;
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

// Выбор участника
function selectParticipant(participantName) {
    if (currentPopupSession && currentPopupRole) {
        const role = currentPopupRole;
        const sessionKey = currentPopupSession;
        
        // Обработка мастер-класса
        if (role === 'Мастер класс') {
            const pairSlot = getMasterClassPairSlot(sessionKey);
            if (pairSlot && participantName) {
                // Назначаем на оба слота
                assignments[sessionKey][role] = participantName;
                assignments[pairSlot][role] = participantName;
            } else if (pairSlot && !participantName) {
                // Очищаем оба слота
                assignments[sessionKey][role] = null;
                assignments[pairSlot][role] = null;
            } else {
                assignments[sessionKey][role] = participantName;
            }
        } else {
            assignments[sessionKey][role] = participantName;
        }
        
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
function toggleUserAssignment(sessionKey, role) {
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
    
    if (currentAssignment === currentUser) {
        // Снимаем назначение
        if (role === 'Мастер класс') {
            const pairSlot = getMasterClassPairSlot(sessionKey);
            if (pairSlot) {
                assignments[pairSlot][role] = null;
            }
        }
        assignments[sessionKey][role] = null;
    } else if (currentAssignment === null) {
        // Назначаем
        if (role === 'Мастер класс') {
            const pairSlot = getMasterClassPairSlot(sessionKey);
            if (pairSlot) {
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

// Автозаполнение сессии
function autoFillSession(sessionKey) {
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
    
    const userShiftCount = {};
    participants.forEach(p => userShiftCount[p.name] = 0);
    
    Object.values(assignments).forEach(sessionData => {
        Object.values(sessionData).forEach(user => {
            if (user && userShiftCount.hasOwnProperty(user)) {
                userShiftCount[user]++;
            }
        });
    });
    
    emptyRoles.forEach(role => {
        const availableUsers = participants.filter(p => 
            !isUserBusyInSession(sessionKey, p.name) &&
            (role !== 'Главный банный мастер' || p.bathExperience)
        );
        
        if (availableUsers.length > 0) {
            const minShifts = Math.min(...availableUsers.map(u => userShiftCount[u.name]));
            const leastBusyUsers = availableUsers.filter(u => userShiftCount[u.name] === minShifts);
            const selectedUser = leastBusyUsers[Math.floor(Math.random() * leastBusyUsers.length)];
            
            assignments[sessionKey][role] = selectedUser.name;
            userShiftCount[selectedUser.name]++;
        }
    });
    
    renderSchedule();
    updateProgress();
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
init();