/**
 * NEVESOMO Шифты 2025 - Рендерер интерфейса
 * @author Igor Konovalchik
 * @version 2.0
 */

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

const DISPLAY_CONFIG = {
    MAX_ROLE_NAME_LENGTH: 25,
    MAX_USER_NAME_LENGTH: 15,
    MAX_COMMENT_LENGTH: 50,
    PROGRESS_RING_SIZE: 60,
    PROGRESS_STROKE_WIDTH: 4
};

// ============================================================================
// ФУНКЦИИ ФОРМАТИРОВАНИЯ
// ============================================================================

/**
 * Форматирует дату в читаемый вид
 * @param {string} dateStr - Строка даты
 * @returns {string} Отформатированная дата
 */
function formatDate(dateStr) {
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    const weekdays = [
        'воскресенье', 'понедельник', 'вторник', 'среда',
        'четверг', 'пятница', 'суббота'
    ];

    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = months[date.getMonth()];
    const weekday = weekdays[date.getDay()];

    return `${day} ${month}, ${weekday}`;
}

/**
 * Обрезает текст до указанной длины
 * @param {string} text - Исходный текст
 * @param {number} maxLength - Максимальная длина
 * @returns {string} Обрезанный текст
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 2) + '...';
}

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ РЕНДЕРИНГА
// ============================================================================

/**
 * Рендерит основное расписание
 */
function renderSchedule() {
    const scheduleDiv = document.getElementById('schedule');
    if (!scheduleDiv) return;
    
    scheduleDiv.innerHTML = '';
    
    // Сортируем дни по дате
    const sortedDays = getSortedDays();
    
    sortedDays.forEach(day => {
        const daySection = createDaySection(day);
        scheduleDiv.appendChild(daySection);
    });
    
    // Обновляем все табы после полной отрисовки
    updateAllSessionTabs();
}

/**
 * Получает отсортированные дни
 * @returns {Array<string>} Массив отсортированных дней
 */
function getSortedDays() {
    return Object.keys(schedule).sort((a, b) => {
        const dateA = new Date(a + 'T00:00:00');
        const dateB = new Date(b + 'T00:00:00'); 
        return dateA.getTime() - dateB.getTime();
    });
}

/**
 * Создает секцию дня
 * @param {string} day - День
 * @returns {HTMLElement} Элемент секции дня
 */
function createDaySection(day) {
    // Сортируем сессии внутри дня по времени
    const sortedSessions = schedule[day].sort((a, b) => a.time.localeCompare(b.time));
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day-section';
    
    dayDiv.innerHTML = `
        <div class="day-header">${formatDate(day)}</div>
        ${sortedSessions.map(session => renderSession(day, session)).join('')}
    `;
    
    return dayDiv;
}

/**
 * Обновляет все табы сессий
 */
function updateAllSessionTabs() {
    setTimeout(() => {
        Object.keys(schedule).forEach(day => {
            schedule[day].forEach(session => {
                const sessionKey = `${day}_${session.time}`;
                updateSessionTabs(sessionKey);
            });
        });
    }, 0);
}

// ============================================================================
// РЕНДЕРИНГ РОЛЕЙ
// ============================================================================

/**
 * Рендерит роли для сессии
 * @param {string} sessionKey - Ключ сессии
 * @param {string} filter - Фильтр ролей
 * @returns {string} HTML ролей
 */
function renderSessionRoles(sessionKey, filter) {
    const rolesToShow = getRolesToShow(filter);
    const sortedRoles = sortRolesByAssignment(rolesToShow, sessionKey);
    
    const rolesHtml = `
        <div class="roles-grid">
            ${sortedRoles.map(role => renderRoleSlot(sessionKey, role)).join('')}
        </div>
    `;
    
    const container = document.getElementById(`roles-${sessionKey}`);
    if (container) {
        container.innerHTML = rolesHtml;
    }
    
    return rolesHtml;
}

/**
 * Получает роли для отображения
 * @param {string} filter - Фильтр ролей
 * @returns {Array<string>} Массив ролей
 */
function getRolesToShow(filter) {
    if (filter === 'all') {
        return allRoles;
    }
    return roleGroups[filter]?.roles || [];
}

/**
 * Сортирует роли по назначениям
 * @param {Array<string>} roles - Роли для сортировки
 * @param {string} sessionKey - Ключ сессии
 * @returns {Array<string>} Отсортированные роли
 */
function sortRolesByAssignment(roles, sessionKey) {
    return roles.sort((a, b) => {
        const sessionAssignments = assignments[sessionKey];
        const aIsUser = sessionAssignments[a] === currentUser;
        const bIsUser = sessionAssignments[b] === currentUser;
        
        if (aIsUser && !bIsUser) return -1;
        if (!aIsUser && bIsUser) return 1;
        return a.localeCompare(b);
    });
}

/**
 * Рендерит слот роли
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 * @returns {string} HTML слота роли
 */
function renderRoleSlot(sessionKey, role) {
    const slotData = getRoleSlotData(sessionKey, role);
    const className = getRoleSlotClassName(slotData);
    const userDisplay = getRoleSlotUserDisplay(slotData);
    const roleDisplayName = getRoleDisplayName(role, slotData);
    
    return `
        <div class="${className}" 
             onclick="handleRoleSlotClick('${sessionKey}', '${role}')"
             title="${roleDisplayName}${slotData.assignedUser ? ' - ' + slotData.assignedUser : ''}">
            <div class="role-name">${roleDisplayName}</div>
            <div class="role-user">${userDisplay}</div>
            ${slotData.isCurrentUser ? '<div class="role-checkmark">✓</div>' : ''}
        </div>
    `;
}

/**
 * Получает данные слота роли
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 * @returns {Object} Данные слота
 */
function getRoleSlotData(sessionKey, role) {
    const assignedUser = assignments[sessionKey]?.[role];
    const assignmentData = getAssignmentData(sessionKey, role);
    const comment = assignmentData?.comment || '';
    const isBlocked = isSlotBlocked(sessionKey, role);
    const isCurrentUser = currentMode === 'user' && assignedUser === (window.currentUser || currentUser);
    
    return {
        assignedUser,
        comment,
        isBlocked,
        isCurrentUser
    };
}

/**
 * Получает CSS класс для слота роли
 * @param {Object} slotData - Данные слота
 * @returns {string} CSS класс
 */
function getRoleSlotClassName(slotData) {
    let className = 'role-slot';
    
    if (slotData.assignedUser) {
        className += ' occupied';
        if (slotData.isCurrentUser) {
            className += ' current-user';
        }
    } else if (slotData.isBlocked) {
        className += ' blocked';
    }
    
    return className;
}

/**
 * Получает отображаемое имя пользователя для слота
 * @param {Object} slotData - Данные слота
 * @returns {string} Отображаемое имя
 */
function getRoleSlotUserDisplay(slotData) {
    if (slotData.assignedUser) {
        return truncateText(slotData.assignedUser, DISPLAY_CONFIG.MAX_USER_NAME_LENGTH);
    } else if (slotData.isBlocked) {
        return 'Занято';
    }
    return 'Свободно';
}

/**
 * Получает отображаемое название роли
 * @param {string} role - Название роли
 * @param {Object} slotData - Данные слота
 * @returns {string} Отображаемое название
 */
function getRoleDisplayName(role, slotData) {
    let roleDisplayName = role;
    
    if (slotData.comment && slotData.isCurrentUser) {
        roleDisplayName = `${role} (${slotData.comment})`;
    }
    
    return truncateText(roleDisplayName, DISPLAY_CONFIG.MAX_ROLE_NAME_LENGTH);
}

// ============================================================================
// РАБОТА С КОММЕНТАРИЯМИ
// ============================================================================

/**
 * Получает данные назначения
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 * @returns {Object|null} Данные назначения
 */
function getAssignmentData(sessionKey, role) {
    return window.assignmentComments?.[sessionKey]?.[role] || null;
}

/**
 * Редактирует комментарий
 * @param {Event} event - Событие клика
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 */
function editComment(event, sessionKey, role) {
    event.stopPropagation();
    
    const currentComment = getAssignmentData(sessionKey, role)?.comment || '';
    const newComment = prompt('Комментарий к шифту (макс 50 символов):', currentComment);
    
    if (newComment !== null) {
        const trimmedComment = newComment.substring(0, DISPLAY_CONFIG.MAX_COMMENT_LENGTH);
        updateAssignmentComment(sessionKey, role, trimmedComment);
    }
}

/**
 * Обновляет комментарий назначения
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 * @param {string} comment - Комментарий
 * @async
 * @returns {Promise<void>}
 */
async function updateAssignmentComment(sessionKey, role, comment) {
    const [day, time] = sessionKey.split('_');
    
    try {
        // Находим существующее назначение и обновляем его
        const assignments = await window.airtableService.getAssignments();
        const assignment = assignments.find(a => 
            a.participantName === currentUser && 
            a.roleName === role && 
            a.slotDate === day && 
            a.slotTime === time
        );
        
        if (assignment) {
            await window.airtableService.updateAssignment(assignment.id, { Comment: comment });
        }
        
        // Обновляем локально
        if (!window.assignmentComments) window.assignmentComments = {};
        if (!window.assignmentComments[sessionKey]) window.assignmentComments[sessionKey] = {};
        window.assignmentComments[sessionKey][role] = { comment };
        
        renderSchedule();
    } catch (error) {
        console.error('Ошибка обновления комментария:', error);
        alert('Ошибка сохранения комментария');
    }
}

// ============================================================================
// ОБНОВЛЕНИЕ ТАБОВ
// ============================================================================

/**
 * Получает количество пустых ролей
 * @param {string} sessionKey - Ключ сессии
 * @param {Array<string>} groupRoles - Роли группы
 * @returns {number} Количество пустых ролей
 */
function getEmptyRolesCount(sessionKey, groupRoles) {
    const sessionAssignments = assignments[sessionKey];
    return groupRoles.filter(role => !sessionAssignments[role]).length;
}

/**
 * Обновляет табы сессии
 * @param {string} sessionKey - Ключ сессии
 */
function updateSessionTabs(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    updateAllTab(sessionElement, sessionKey);
    updateCategoryTabs(sessionElement, sessionKey);
}

/**
 * Обновляет таб "Все"
 * @param {HTMLElement} sessionElement - Элемент сессии
 * @param {string} sessionKey - Ключ сессии
 */
function updateAllTab(sessionElement, sessionKey) {
    const allTab = sessionElement.querySelector('[data-filter="all"]');
    if (!allTab) return;
    
    const totalEmpty = getEmptyRolesCount(sessionKey, allRoles);
    if (totalEmpty > 0) {
        allTab.innerHTML = `Все <span class="empty-count">${totalEmpty}</span>`;
    } else {
        allTab.innerHTML = 'Все';
    }
}

/**
 * Обновляет табы категорий
 * @param {HTMLElement} sessionElement - Элемент сессии
 * @param {string} sessionKey - Ключ сессии
 */
function updateCategoryTabs(sessionElement, sessionKey) {
    Object.entries(roleGroups).forEach(([category, group]) => {
        const categoryTab = sessionElement.querySelector(`[data-filter="${category}"]`);
        if (!categoryTab) return;
        
        const emptyCount = getEmptyRolesCount(sessionKey, group.roles);
        if (emptyCount > 0) {
            categoryTab.innerHTML = `${group.name} <span class="empty-count">${emptyCount}</span>`;
        } else {
            categoryTab.innerHTML = group.name;
        }
    });
}

// ============================================================================
// РЕНДЕРИНГ СПИСКОВ
// ============================================================================

/**
 * Рендерит список участников
 * @param {Object} currentAssignment - Текущее назначение
 * @returns {string} HTML списка участников
 */
function renderParticipantsList(currentAssignment) {
    const sortedParticipants = participants.sort((a, b) => a.name.localeCompare(b.name));
    
    return sortedParticipants.map(participant => {
        const isSelected = currentAssignment === participant.name;
        const isBusy = isUserBusyInSession(window.currentPopupSession, participant.name);
        
        let className = 'participant-item';
        if (isSelected) className += ' selected';
        if (isBusy) className += ' busy';
        
        return `
            <div class="${className}" onclick="selectParticipant('${participant.name}')">
                <div class="participant-name">${participant.name}</div>
                ${participant.telegram ? `<div class="participant-telegram">${participant.telegram}</div>` : ''}
                ${isBusy ? '<div class="participant-busy">Занят в это время</div>' : ''}
            </div>
        `;
    }).join('');
}

/**
 * Рендерит статистику пользователей
 * @param {Array<Object>} userStats - Статистика пользователей
 * @returns {string} HTML статистики
 */
function renderUserStats(userStats) {
    const sortedStats = userStats.sort((a, b) => {
        if (a.complete !== b.complete) return b.complete - a.complete;
        return b.shifts - a.shifts;
    });
    
    return sortedStats.map(user => {
        const statusIcon = user.complete ? '✅' : '⏳';
        const statusClass = user.complete ? 'complete' : 'incomplete';
        
        return `
            <div class="user-stat ${statusClass}">
                <div class="user-stat-header">
                    <div class="user-name">${user.name}</div>
                    <div class="user-status">
                        ${statusIcon} ${user.shifts}/8 шифтов
                    </div>
                </div>
                <div class="user-categories">
                    ${renderUserCategories(user.categories)}
                </div>
                ${user.telegram ? `<div class="user-telegram">${user.telegram}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Рендерит категории пользователя
 * @param {Object} categories - Категории пользователя
 * @returns {string} HTML категорий
 */
function renderUserCategories(categories) {
    return Object.entries(categories)
        .filter(([category, count]) => count > 0)
        .map(([category, count]) => {
            const categoryName = CATEGORY_NAMES[category] || category;
            return `<span class="category-tag">${categoryName}: ${count}</span>`;
        })
        .join('');
}

// ============================================================================
// РЕНДЕРИНГ РАСПИСАНИЯ ПОЛЬЗОВАТЕЛЯ
// ============================================================================

/**
 * Рендерит расписание пользователя
 * @param {string} currentUser - Текущий пользователь
 * @param {Object} userShiftsByDay - Шифты пользователя по дням
 * @param {Object} participant - Данные участника
 * @param {number} shiftsCount - Количество шифтов
 * @param {Object} categoryStats - Статистика по категориям
 * @returns {string} HTML расписания пользователя
 */
function renderUserSchedule(currentUser, userShiftsByDay, participant, shiftsCount, categoryStats) {
    const statusIcon = shiftsCount >= 8 ? '✅' : '⏳';
    const statusClass = shiftsCount >= 8 ? 'complete' : 'incomplete';
    
    return `
        <div class="user-schedule-header ${statusClass}">
            <div class="user-info">
                <h2>${currentUser}</h2>
                <div class="user-status">
                    ${statusIcon} ${shiftsCount}/8 шифтов выполнено
                </div>
                ${participant.telegram ? `<div class="user-telegram">${participant.telegram}</div>` : ''}
            </div>
            <div class="user-categories">
                ${renderUserCategories(categoryStats)}
            </div>
        </div>
        <div class="user-shifts">
            ${renderUserShiftsByDay(userShiftsByDay)}
        </div>
    `;
}

/**
 * Рендерит шифты пользователя по дням
 * @param {Object} userShiftsByDay - Шифты по дням
 * @returns {string} HTML шифтов
 */
function renderUserShiftsByDay(userShiftsByDay) {
    const sortedDays = Object.keys(userShiftsByDay).sort((a, b) => {
        const dateA = new Date(a + 'T00:00:00');
        const dateB = new Date(b + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
    });
    
    return sortedDays.map(day => {
        const shifts = userShiftsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
        
        return `
            <div class="day-shifts">
                <div class="day-header">${formatDate(day)}</div>
                ${shifts.map(shift => renderUserShift(shift)).join('')}
            </div>
        `;
    }).join('');
}

/**
 * Рендерит один шифт пользователя
 * @param {Object} shift - Данные шифта
 * @returns {string} HTML шифта
 */
function renderUserShift(shift) {
    return `
        <div class="user-shift">
            <div class="shift-time">${shift.time} - ${shift.endTime}</div>
            <div class="shift-info">
                ${shift.sessionNum ? `Баня #${shift.sessionNum}` : 'Кухня'} • ${shift.type}
            </div>
            <div class="shift-role">${shift.role}</div>
        </div>
    `;
}

// ============================================================================
// РЕНДЕРИНГ ИНФОРМАЦИИ О РОЛЯХ
// ============================================================================

/**
 * Рендерит список ролей
 * @returns {string} HTML списка ролей
 */
function renderRolesList() {
    return Object.entries(roleGroups).map(([category, group]) => `
        <div class="role-category">
            <h3>${group.name}</h3>
            <div class="roles-grid">
                ${group.roles.map(role => renderRoleInfo(role)).join('')}
            </div>
        </div>
    `).join('');
}

/**
 * Рендерит информацию о роли
 * @param {string} role - Название роли
 * @returns {string} HTML информации о роли
 */
function renderRoleInfo(role) {
    const roleInfo = rolesInfo[role];
    if (!roleInfo) return '';
    
    return `
        <div class="role-info" onclick="showRoleDetail('${role}')">
            <div class="role-icon">${roleInfo.icon}</div>
            <div class="role-name">${role}</div>
            <div class="role-description">${roleInfo.description}</div>
        </div>
    `;
}

// ============================================================================
// УТИЛИТЫ
// ============================================================================

/**
 * Проверяет, заблокирован ли слот
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 * @returns {boolean} True если слот заблокирован
 */
function isSlotBlocked(sessionKey, role) {
    // Здесь можно добавить логику блокировки слотов
    return false;
}

// ============================================================================
// РЕНДЕРИНГ СЕССИЙ
// ============================================================================

/**
 * Рендерит сессию
 * @param {string} day - День
 * @param {Object} session - Данные сессии
 * @returns {string} HTML сессии
 */
function renderSession(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionRoles = getSessionRoles(session);
    const progressData = calculateSessionProgress(sessionKey, sessionRoles);
    
    return `
        <div class="session" data-session="${sessionKey}">
            <div class="session-header" onclick="toggleSession('${sessionKey}')">
                <div class="session-time">
                    <div class="time-main">${session.time}</div>
                    <div class="time-end">- ${session.endTime}</div>
                </div>
                <div class="session-info">
                    <div class="session-number">${session.sessionNum ? `Баня #${session.sessionNum}` : 'Кухня'}</div>
                    <div class="session-type">${session.type}</div>
                </div>
                <div class="session-progress">
                    ${renderProgressRing(progressData.percentage, progressData.emptyRoles)}
                </div>
            </div>
            <div class="session-content">
                <div class="session-tabs-wrapper" id="tabs-wrapper-${sessionKey}">
                    <div class="session-tabs">
                        ${renderSessionTabs(sessionKey)}
                    </div>
                </div>
                <div class="session-roles" id="roles-${sessionKey}">
                    ${renderSessionRoles(sessionKey, 'all')}
                </div>
            </div>
        </div>
    `;
}

/**
 * Получает роли для сессии
 * @param {Object} session - Данные сессии
 * @returns {Array<string>} Массив ролей
 */
function getSessionRoles(session) {
    if (session.availableRoles && session.availableRoles.trim()) {
        return session.availableRoles.split(',').map(r => r.trim()).filter(r => r);
    }
    return allRoles;
}

/**
 * Вычисляет прогресс сессии
 * @param {string} sessionKey - Ключ сессии
 * @param {Array<string>} sessionRoles - Роли сессии
 * @returns {Object} Данные прогресса
 */
function calculateSessionProgress(sessionKey, sessionRoles) {
    const sessionAssignments = assignments[sessionKey] || {};
    const filledRoles = sessionRoles.filter(role => sessionAssignments[role]);
    const percentage = sessionRoles.length > 0 ? (filledRoles.length / sessionRoles.length) * 100 : 0;
    const emptyRoles = sessionRoles.length - filledRoles.length;
    
    return { percentage, emptyRoles };
}

/**
 * Рендерит табы сессии
 * @param {string} sessionKey - Ключ сессии
 * @returns {string} HTML табов
 */
function renderSessionTabs(sessionKey) {
    const tabs = [
        { filter: 'all', name: 'Все' },
        ...Object.entries(roleGroups).map(([category, group]) => ({
            filter: category,
            name: group.name
        }))
    ];
    
    return tabs.map(tab => `
        <div class="session-tab ${tab.filter === 'all' ? 'active' : ''}" 
             data-filter="${tab.filter}"
             onclick="setSessionFilter('${sessionKey}', '${tab.filter}')">
            ${tab.name}
        </div>
    `).join('');
}

/**
 * Рендерит кольцо прогресса
 * @param {number} percentage - Процент заполнения
 * @param {number} emptyRoles - Количество пустых ролей
 * @returns {string} HTML кольца прогресса
 */
function renderProgressRing(percentage, emptyRoles) {
    const radius = (DISPLAY_CONFIG.PROGRESS_RING_SIZE - DISPLAY_CONFIG.PROGRESS_STROKE_WIDTH) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    return `
        <div class="progress-ring" 
             onclick="showProgressTooltip(this, ${emptyRoles})"
             title="Осталось ${emptyRoles} свободных слотов">
            <svg width="${DISPLAY_CONFIG.PROGRESS_RING_SIZE}" height="${DISPLAY_CONFIG.PROGRESS_RING_SIZE}">
                <circle class="progress-ring-bg"
                        cx="${DISPLAY_CONFIG.PROGRESS_RING_SIZE / 2}"
                        cy="${DISPLAY_CONFIG.PROGRESS_RING_SIZE / 2}"
                        r="${radius}"
                        stroke-width="${DISPLAY_CONFIG.PROGRESS_STROKE_WIDTH}"/>
                <circle class="progress-ring-fill"
                        cx="${DISPLAY_CONFIG.PROGRESS_RING_SIZE / 2}"
                        cy="${DISPLAY_CONFIG.PROGRESS_RING_SIZE / 2}"
                        r="${radius}"
                        stroke-width="${DISPLAY_CONFIG.PROGRESS_STROKE_WIDTH}"
                        stroke-dasharray="${strokeDasharray}"
                        stroke-dashoffset="${strokeDashoffset}"/>
            </svg>
            <div class="progress-text">${Math.round(percentage)}%</div>
        </div>
    `;
}

// ============================================================================
// ОБНОВЛЕНИЕ ПРОГРЕССА
// ============================================================================

/**
 * Обновляет кольцо прогресса
 * @param {HTMLElement} element - Элемент кольца
 * @param {number} percentage - Процент заполнения
 * @param {number} emptyRoles - Количество пустых ролей
 */
function updateProgressRing(element, percentage, emptyRoles) {
    const svg = element.querySelector('svg');
    const circle = svg.querySelector('.progress-ring-fill');
    const text = element.querySelector('.progress-text');
    
    const radius = (DISPLAY_CONFIG.PROGRESS_RING_SIZE - DISPLAY_CONFIG.PROGRESS_STROKE_WIDTH) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDashoffset = strokeDashoffset;
    text.textContent = `${Math.round(percentage)}%`;
    
    element.title = `Осталось ${emptyRoles} свободных слотов`;
}

/**
 * Обновляет прогресс сессии
 * @param {string} sessionKey - Ключ сессии
 */
function updateSessionProgress(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    const progressRing = sessionElement.querySelector('.progress-ring');
    if (!progressRing) return;
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day]?.find(s => s.time === time);
    if (!session) return;
    
    const sessionRoles = getSessionRoles(session);
    const progressData = calculateSessionProgress(sessionKey, sessionRoles);
    
    updateProgressRing(progressRing, progressData.percentage, progressData.emptyRoles);
}

// ============================================================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================================================

// Делаем функции доступными глобально
window.renderSchedule = renderSchedule;
window.renderSessionRoles = renderSessionRoles;
window.renderParticipantsList = renderParticipantsList;
window.renderUserStats = renderUserStats;
window.renderUserSchedule = renderUserSchedule;
window.renderRolesList = renderRolesList;
window.updateSessionTabs = updateSessionTabs;
window.updateSessionProgress = updateSessionProgress;
window.editComment = editComment;
window.updateAssignmentComment = updateAssignmentComment;
