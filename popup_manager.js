/**
 * NEVESOMO Шифты 2025 - Менеджер попапов
 * @author Igor Konovalchik
 * @version 2.0
 */

// ============================================================================
// ПЕРЕМЕННЫЕ СОСТОЯНИЯ ПОПАПОВ
// ============================================================================

/** @type {string|null} Предыдущий открытый попап */
let previousPopup = null;

/** @type {string|null} Текущая сессия в попапе */
let currentPopupSession = null;

/** @type {string|null} Текущая роль в попапе */
let currentPopupRole = null;

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

const POPUP_CONFIG = {
    ANIMATION_DURATION: 300,
    NOTIFICATION_TIMEOUT: 3000,
    SEARCH_DELAY: 300
};

// ============================================================================
// ПОПАП СТАТИСТИКИ
// ============================================================================

/**
 * Открывает попап статистики
 */
function openStatsPopup() {
    const statsList = document.getElementById('statsList');
    const userStats = calculateUserStats();
    const html = renderUserStats(userStats);
    
    statsList.innerHTML = html;
    document.getElementById('statsPopup').classList.add('show');
}

/**
 * Закрывает попап статистики
 */
function closeStatsPopup() {
    document.getElementById('statsPopup').classList.remove('show');
}

/**
 * Вычисляет статистику пользователей
 * @returns {Array<Object>} Статистика пользователей
 */
function calculateUserStats() {
    return participants.map(participant => {
        const shiftsCount = countUserShifts(participant.name);
        const categoryStats = getUserCategoryStats(participant.name);
        
        return {
            name: participant.name,
            telegram: participant.telegram,
            shifts: shiftsCount,
            complete: shiftsCount >= 8,
            categories: categoryStats
        };
    });
}

/**
 * Подсчитывает количество шифтов пользователя
 * @param {string} userName - Имя пользователя
 * @returns {number} Количество шифтов
 */
function countUserShifts(userName) {
    let shiftsCount = 0;
    
    Object.keys(assignments).forEach(sessionKey => {
        const sessionAssignments = assignments[sessionKey];
        Object.values(sessionAssignments).forEach(assignedUser => {
            if (assignedUser === userName) {
                shiftsCount++;
            }
        });
    });
    
    return shiftsCount;
}

/**
 * Получает статистику по категориям для пользователя
 * @param {string} userName - Имя пользователя
 * @returns {Object} Статистика по категориям
 */
function getUserCategoryStats(userName) {
    const categoryStats = {};
    
    Object.keys(assignments).forEach(sessionKey => {
        const sessionAssignments = assignments[sessionKey];
        
        Object.entries(sessionAssignments).forEach(([role, assignedUser]) => {
            if (assignedUser === userName) {
                const roleInfo = rolesInfo[role];
                const category = roleInfo?.category || 'other';
                categoryStats[category] = (categoryStats[category] || 0) + 1;
            }
        });
    });
    
    return categoryStats;
}

// ============================================================================
// ПОПАП РАСПИСАНИЯ
// ============================================================================

/**
 * Открывает мое расписание
 */
function openMySchedule() {
    previousPopup = null;
    openSchedulePopup();
}

/**
 * Открывает попап расписания
 */
function openSchedulePopup() {
    const scheduleBody = document.getElementById('scheduleBody');
    let html = '';
    
    if (currentMode === 'user' && currentUser) {
        html = renderUserScheduleContent();
    } else {
        html = renderAdminScheduleContent();
    }
    
    scheduleBody.innerHTML = html;
    document.getElementById('schedulePopup').classList.add('show');
}

/**
 * Рендерит содержимое расписания пользователя
 * @returns {string} HTML содержимого
 */
function renderUserScheduleContent() {
    const participant = participants.find(p => p.name === currentUser);
    const shiftsCount = countUserShifts(currentUser);
    const categoryStats = getUserCategoryStats(currentUser);
    const userShiftsByDay = getUserShiftsByDay(currentUser);
    
    return renderUserSchedule(currentUser, userShiftsByDay, participant, shiftsCount, categoryStats);
}

/**
 * Рендерит содержимое расписания администратора
 * @returns {string} HTML содержимого
 */
function renderAdminScheduleContent() {
    let html = '';
    
    Object.keys(schedule).forEach(day => {
        html += `
            <div class="schedule-date-sticky">
                <h2 style="margin: 0; color: var(--accent-primary); font-size: 1.4em; padding: 16px 0;">${formatDate(day)}</h2>
            </div>
        `;
        
        schedule[day].forEach(session => {
            html += renderAdminSessionItem(day, session);
        });
    });
    
    return html;
}

/**
 * Рендерит элемент сессии для администратора
 * @param {string} day - День
 * @param {Object} session - Данные сессии
 * @returns {string} HTML элемента сессии
 */
function renderAdminSessionItem(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionRoles = getSessionRoles(session);
    
    let html = `
        <div class="schedule-item">
            <div class="schedule-item-header">
                <div class="schedule-time">${session.time} - ${session.endTime}</div>
                <div>${session.sessionNum ? `Баня #${session.sessionNum}` : 'Кухня'}</div>
            </div>
            <div class="schedule-info" style="margin-bottom: 12px;">${session.type}</div>
    `;
    
    sessionRoles.forEach(role => {
        const assignedUser = assignments[sessionKey]?.[role];
        html += `
            <div style="display: flex; justify-content: space-between; margin: 4px 0; padding: 4px 0;">
                <span style="color: var(--text-secondary); font-size: 0.9em;">${role}:</span>
                <span style="font-weight: 500;">${assignedUser || 'Не назначено'}</span>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Получает шифты пользователя по дням
 * @param {string} userName - Имя пользователя
 * @returns {Object} Шифты по дням
 */
function getUserShiftsByDay(userName) {
    const userShiftsByDay = {};
    
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day]?.find(s => s.time === time);
        
        if (!session) return;
        
        const sessionRoles = getSessionRoles(session);
        
        sessionRoles.forEach(role => {
            if (assignments[sessionKey][role] === userName) {
                if (!userShiftsByDay[day]) {
                    userShiftsByDay[day] = [];
                }
                userShiftsByDay[day].push({
                    time,
                    endTime: session.endTime,
                    sessionNum: session.sessionNumber,
                    type: session.type,
                    role
                });
            }
        });
    });
    
    return userShiftsByDay;
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
 * Закрывает попап расписания
 */
function closeSchedulePopup() {
    document.getElementById('schedulePopup').classList.remove('show');
}

/**
 * Делится расписанием
 */
function shareSchedule() {
    if (navigator.share) {
        navigator.share({
            title: 'Мое расписание шифтов NEVESOMO',
            text: 'Расписание банных шифтов',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href);
        showNotification('Ссылка скопирована в буфер обмена');
    }
}

// ============================================================================
// ПОПАП ИНФОРМАЦИИ О РОЛЯХ
// ============================================================================

/**
 * Открывает попап информации о ролях
 */
function openRolesInfoPopup() {
    previousPopup = null;
    const rolesInfoBody = document.getElementById('rolesInfoBody');
    
    const html = renderRolesList();
    rolesInfoBody.innerHTML = html;
    document.getElementById('rolesInfoPopup').classList.add('show');
}

/**
 * Закрывает попап информации о ролях
 */
function closeRolesInfoPopup() {
    document.getElementById('rolesInfoPopup').classList.remove('show');
}

// ============================================================================
// ПОПАП ДЕТАЛЬНОГО ОПИСАНИЯ РОЛИ
// ============================================================================

/**
 * Показывает детальное описание роли
 * @param {string} role - Название роли
 * @param {string} sourcePopup - Источник попапа
 */
function showRoleDetail(role, sourcePopup = null) {
    previousPopup = sourcePopup;
    const roleInfo = rolesInfo[role];
    
    if (!roleInfo) {
        console.error(`Информация о роли "${role}" не найдена`);
        return;
    }
    
    document.getElementById('roleDetailTitle').textContent = role;
    document.getElementById('roleDetailImage').textContent = roleInfo.icon;
    document.getElementById('roleDetailDescription').textContent = roleInfo.description;
    document.getElementById('roleDetailLink').href = roleInfo.instructionUrl;
    
    document.getElementById('roleDetailPopup').classList.add('show');
}

/**
 * Закрывает попап детального описания роли
 */
function closeRoleDetailPopup() {
    document.getElementById('roleDetailPopup').classList.remove('show');
    
    if (previousPopup) {
        document.getElementById(previousPopup).classList.add('show');
        previousPopup = null;
    }
}

// ============================================================================
// ПОПАП РЕДАКТИРОВАНИЯ ДАННЫХ
// ============================================================================

/**
 * Открывает попап редактирования данных
 */
function openDataEditPopup() {
    // Реализация попапа редактирования данных
    console.log('Открытие попапа редактирования данных');
}

// ============================================================================
// УПРАВЛЕНИЕ ПОПАПАМИ
// ============================================================================

/**
 * Закрывает все попапы
 */
function closeAllPopups() {
    const popups = [
        'statsPopup',
        'schedulePopup',
        'rolesInfoPopup',
        'roleDetailPopup',
        'participantPopup',
        'commentPopup',
        'confirmPopup',
        'bookShiftPopup',
        'editShiftPopup'
    ];
    
    popups.forEach(popupId => {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.remove('show');
        }
    });
    
    previousPopup = null;
    currentPopupSession = null;
    currentPopupRole = null;
    // pendingAssignment = null; // Удалено для устранения конфликта
}

/**
 * Проверяет, открыт ли какой-либо попап
 * @returns {boolean} True если попап открыт
 */
function isAnyPopupOpen() {
    return document.querySelector('.popup-overlay.show') !== null;
}

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ ПОПАПОВ
// ============================================================================

/**
 * Инициализирует обработчики попапов
 */
function initPopupHandlers() {
    // Обработчики закрытия по клику вне попапа
    document.querySelectorAll('.popup-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('show');
            }
        });
    });
    
    // Обработчики клавиши Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isAnyPopupOpen()) {
            closeAllPopups();
        }
    });
}

// ============================================================================
// ПОПАП ВЫБОРА УЧАСТНИКА
// ============================================================================

/**
 * Открывает попап выбора участника
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 */
function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const currentAssignment = assignments[sessionKey]?.[role] || null;
    const participantsList = document.getElementById('participantsList');
    
    participantsList.innerHTML = renderParticipantsListEnhanced(currentAssignment);
    document.getElementById('participantPopup').classList.add('show');
}

/**
 * Рендерит улучшенный список участников
 * @param {string|null} currentAssignment - Текущее назначение
 * @returns {string} HTML списка участников
 */
function renderParticipantsListEnhanced(currentAssignment) {
    let html = '';
    
    // Кнопка очистки слота
    html += `
        <div class="participant-item special" onclick="selectParticipant(null)" style="margin-bottom: 12px;">
            <div class="participant-name">🗑️ Очистить слот</div>
            <div class="participant-telegram">Убрать назначение</div>
        </div>
    `;
    
    // Кнопка для внешнего участника
    html += `
        <div class="participant-item special" onclick="selectParticipant('Участник другого кемпа')" style="margin-bottom: 16px;">
            <div class="participant-name">👤 Участник другого кемпа</div>
            <div class="participant-telegram">Внешний участник</div>
        </div>
    `;
    
    // Список участников
    const sortedParticipants = participants.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedParticipants.forEach(participant => {
        const isSelected = participant.name === currentAssignment;
        const isBusy = isUserBusyInSession(currentPopupSession, participant.name);
        
        let className = 'participant-item';
        if (isSelected) className += ' selected';
        if (isBusy) className += ' busy';
        
        html += `
            <div class="${className}" onclick="selectParticipant('${participant.name.replace(/'/g, "\\'")}')">
                <div class="participant-name">
                    ${participant.name}
                    ${isSelected ? ' ✓' : ''}
                </div>
                <div class="participant-telegram">${participant.telegram}</div>
                ${isBusy ? '<div class="participant-busy">Занят в это время</div>' : ''}
            </div>
        `;
    });
    
    return html;
}

/**
 * Добавляет поиск участников
 */
function addParticipantSearch() {
    const participantsList = document.getElementById('participantsList');
    const searchInput = document.createElement('input');
    
    searchInput.type = 'text';
    searchInput.placeholder = 'Поиск участников...';
    searchInput.className = 'participant-search';
    searchInput.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 16px;
        background: var(--bg-primary);
        color: var(--text-primary);
    `;
    
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const searchTerm = e.target.value.toLowerCase();
            const participantItems = participantsList.querySelectorAll('.participant-item:not(.special)');
            
            participantItems.forEach(item => {
                const name = item.querySelector('.participant-name').textContent.toLowerCase();
                const telegram = item.querySelector('.participant-telegram')?.textContent.toLowerCase() || '';
                
                if (name.includes(searchTerm) || telegram.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        }, POPUP_CONFIG.SEARCH_DELAY);
    });
    
    participantsList.insertBefore(searchInput, participantsList.firstChild);
}

/**
 * Открывает попап выбора участника с поиском
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 */
function openParticipantPopupWithSearch(sessionKey, role) {
    openParticipantPopup(sessionKey, role);
    
    setTimeout(() => {
        addParticipantSearch();
    }, 100);
}

/**
 * Закрывает попап выбора участника
 */
function closeParticipantPopup() {
    document.getElementById('participantPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

// ============================================================================
// ПОПАП РАСПИСАНИЯ ИЗ СТАТИСТИКИ
// ============================================================================

/**
 * Открывает расписание пользователя из статистики
 * @param {string} userName - Имя пользователя
 */
function openUserScheduleFromStats(userName) {
    // Временно закрываем попап статистики
    const statsPopup = document.getElementById('statsPopup');
    const originalCloseHandler = () => {
        statsPopup.classList.remove('show');
        statsPopup.removeEventListener('transitionend', originalCloseHandler);
    };
    
    statsPopup.addEventListener('transitionend', originalCloseHandler);
    statsPopup.classList.remove('show');
    
    // Открываем расписание пользователя
    setTimeout(() => {
        const participant = participants.find(p => p.name === userName);
        const shiftsCount = countUserShifts(userName);
        const categoryStats = getUserCategoryStats(userName);
        const userShiftsByDay = getUserShiftsByDay(userName);
        
        const scheduleBody = document.getElementById('scheduleBody');
        const html = renderUserSchedule(userName, userShiftsByDay, participant, shiftsCount, categoryStats);
        
        scheduleBody.innerHTML = html;
        document.getElementById('schedulePopup').classList.add('show');
    }, POPUP_CONFIG.ANIMATION_DURATION);
}

// ============================================================================
// ПОПАП ПОЛНОГО РАСПИСАНИЯ
// ============================================================================

/**
 * Открывает попап полного расписания
 */
function openFullSchedulePopup() {
    const scheduleBody = document.getElementById('scheduleBody');
    const html = renderFullScheduleWithTabs();
    
    scheduleBody.innerHTML = html;
    document.getElementById('schedulePopup').classList.add('show');
}

/**
 * Рендерит полное расписание с табами
 * @returns {string} HTML полного расписания
 */
function renderFullScheduleWithTabs() {
    const sortedDays = Object.keys(schedule).sort((a, b) => {
        const dateA = new Date(a + 'T00:00:00');
        const dateB = new Date(b + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
    });
    
    let html = `
        <div class="full-schedule-tabs">
            ${sortedDays.map(day => `
                <div class="schedule-day-tab" onclick="switchScheduleDay('${day}')">
                    ${formatDate(day)}
                </div>
            `).join('')}
        </div>
        <div class="full-schedule-content">
            ${sortedDays.map(day => `
                <div class="schedule-day-content" id="day-${day}">
                    ${schedule[day].map(session => renderCompactSessionForFullSchedule(day, session)).join('')}
                </div>
            `).join('')}
        </div>
    `;
    
    return html;
}

/**
 * Рендерит компактную сессию для полного расписания
 * @param {string} day - День
 * @param {Object} session - Данные сессии
 * @returns {string} HTML сессии
 */
function renderCompactSessionForFullSchedule(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionRoles = getSessionRoles(session);
    
    return `
        <div class="compact-session">
            <div class="compact-session-header">
                <div class="compact-time">${session.time} - ${session.endTime}</div>
                <div class="compact-type">${session.type}</div>
            </div>
            <div class="compact-roles">
                ${sessionRoles.map(role => {
                    const assignedUser = assignments[sessionKey]?.[role];
                    return `
                        <div class="compact-role">
                            <span class="role-name">${role}:</span>
                            <span class="assigned-user">${assignedUser || 'Не назначено'}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

/**
 * Переключает день в расписании
 * @param {string} day - День для переключения
 */
function switchScheduleDay(day) {
    // Скрываем все дни
    document.querySelectorAll('.schedule-day-content').forEach(content => {
        content.style.display = 'none';
    });
    
    // Показываем выбранный день
    const selectedDay = document.getElementById(`day-${day}`);
    if (selectedDay) {
        selectedDay.style.display = 'block';
    }
    
    // Обновляем активную вкладку
    document.querySelectorAll('.schedule-day-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[onclick="switchScheduleDay('${day}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
}

// ============================================================================
// ПОПАП КОММЕНТАРИЕВ
// ============================================================================

/**
 * Открывает попап комментариев
 */
function openCommentPopup() {
    document.getElementById('commentPopup').classList.add('show');
}

/**
 * Закрывает попап комментариев
 */
function closeCommentPopup() {
    document.getElementById('commentPopup').classList.remove('show');
}

/**
 * Пропускает комментарий
 */
function skipComment() {
    closeCommentPopup();
    completeAssignment();
}

/**
 * Сохраняет комментарий
 */
function saveComment() {
    const commentInput = document.getElementById('commentInput');
    const comment = commentInput.value.trim();
    
    if (pendingAssignment) {
        pendingAssignment.comment = comment;
    }
    
    closeCommentPopup();
    completeAssignment();
}

// ============================================================================
// ПОПАП ПОДТВЕРЖДЕНИЯ
// ============================================================================

/**
 * Показывает попап подтверждения
 * @param {string} title - Заголовок
 * @param {string} message - Сообщение
 * @param {Function} onConfirm - Функция подтверждения
 */
function showConfirmation(title, message, onConfirm) {
    const confirmPopup = document.getElementById('confirmPopup');
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmButton = document.getElementById('confirmButton');
    
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    
    confirmButton.onclick = () => {
        closeConfirmPopup();
        onConfirm();
    };
    
    confirmPopup.classList.add('show');
}

/**
 * Закрывает попап подтверждения
 */
function closeConfirmPopup() {
    document.getElementById('confirmPopup').classList.remove('show');
}

// ============================================================================
// УВЕДОМЛЕНИЯ
// ============================================================================

/**
 * Показывает уведомление
 * @param {string} message - Сообщение
 */
function showNotification(message) {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--accent-primary);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем через заданное время
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, POPUP_CONFIG.NOTIFICATION_TIMEOUT);
}

// ============================================================================
// ПОПАП БРОНИРОВАНИЯ ШИФТА
// ============================================================================

/**
 * Открывает попап бронирования шифта
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 */
function openBookShiftPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day]?.find(s => s.time === time);
    
    if (!session) return;
    
    document.getElementById('bookShiftTitle').textContent = `Забронировать шифт`;
    document.getElementById('bookShiftInfo').textContent = `${formatDate(day)} • ${time} • ${role}`;
    
    document.getElementById('bookShiftPopup').classList.add('show');
}

/**
 * Закрывает попап бронирования шифта
 */
function closeBookShiftPopup() {
    document.getElementById('bookShiftPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

/**
 * Подтверждает бронирование шифта
 */
function confirmBookShift() {
    if (!currentPopupSession || !currentPopupRole || !currentUser) {
        showNotification('Ошибка: не удалось забронировать шифт');
        return;
    }
    
    const [day, time] = currentPopupSession.split('_');
    
    pendingAssignment = {
        participantName: currentUser,
        roleName: currentPopupRole,
        slotDate: day,
        slotTime: time,
        comment: ''
    };
    
    closeBookShiftPopup();
    
    // Спрашиваем комментарий
    const wantComment = confirm('Хотите добавить комментарий к шифту?');
    
    if (wantComment) {
        openCommentPopup();
    } else {
        completeAssignment();
    }
}

// ============================================================================
// ПОПАП РЕДАКТИРОВАНИЯ ШИФТА
// ============================================================================

/**
 * Открывает попап редактирования шифта
 * @param {string} sessionKey - Ключ сессии
 * @param {string} role - Название роли
 */
function openEditShiftPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day]?.find(s => s.time === time);
    const currentComment = getAssignmentData(sessionKey, role)?.comment || '';
    
    if (!session) return;
    
    document.getElementById('editShiftTitle').textContent = `Редактировать шифт`;
    document.getElementById('editShiftInfo').textContent = `${formatDate(day)} • ${time} • ${role}`;
    
    const commentInput = document.getElementById('editCommentInput');
    commentInput.value = currentComment;
    
    document.getElementById('editShiftPopup').classList.add('show');
}

/**
 * Закрывает попап редактирования шифта
 */
function closeEditShiftPopup() {
    document.getElementById('editShiftPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

/**
 * Обработчик изменения комментария в попапе редактирования
 */
function onEditCommentChange() {
    const commentInput = document.getElementById('editCommentInput');
    const currentComment = getAssignmentData(currentPopupSession, currentPopupRole)?.comment || '';
    const commentChanged = commentInput.value !== currentComment;
    
    updateEditButtons(commentChanged);
}

/**
 * Обновляет кнопки редактирования
 * @param {boolean} commentChanged - Изменен ли комментарий
 */
function updateEditButtons(commentChanged) {
    const saveButton = document.getElementById('saveEditButton');
    const releaseButton = document.getElementById('releaseEditButton');
    
    if (commentChanged) {
        saveButton.style.display = 'inline-block';
        releaseButton.style.display = 'none';
    } else {
        saveButton.style.display = 'none';
        releaseButton.style.display = 'inline-block';
    }
}

/**
 * Сохраняет комментарий шифта
 * @async
 * @returns {Promise<void>}
 */
async function saveShiftComment() {
    if (!currentPopupSession || !currentPopupRole) {
        showNotification('Ошибка: не удалось сохранить комментарий');
        return;
    }
    
    const commentInput = document.getElementById('editCommentInput');
    const comment = commentInput.value.trim();
    
    try {
        await updateAssignmentComment(currentPopupSession, currentPopupRole, comment);
        showNotification('Комментарий сохранен');
        closeEditShiftPopup();
    } catch (error) {
        console.error('Ошибка сохранения комментария:', error);
        showNotification('Ошибка сохранения комментария');
    }
}

/**
 * Освобождает шифт
 * @async
 * @returns {Promise<void>}
 */
async function releaseShift() {
    if (!currentPopupSession || !currentPopupRole || !currentUser) {
        showNotification('Ошибка: не удалось освободить шифт');
        return;
    }
    
    const [day, time] = currentPopupSession.split('_');
    
    try {
        await removeAssignmentFromAirtable(currentUser, currentPopupRole, day, time);
        
        // Обновляем локально
        if (assignments[currentPopupSession]) {
            assignments[currentPopupSession][currentPopupRole] = null;
        }
        
        // Удаляем комментарий
        if (window.assignmentComments?.[currentPopupSession]?.[currentPopupRole]) {
            delete window.assignmentComments[currentPopupSession][currentPopupRole];
        }
        
        showNotification('Шифт освобожден');
        closeEditShiftPopup();
        renderSchedule();
        updateProgress();
    } catch (error) {
        console.error('Ошибка освобождения шифта:', error);
        showNotification('Ошибка освобождения шифта');
    }
}

// ============================================================================
// ЗАВЕРШЕНИЕ НАЗНАЧЕНИЯ
// ============================================================================

/**
 * Завершает назначение
 * @async
 * @returns {Promise<void>}
 */
async function completeAssignment() {
    if (!pendingAssignment) {
        showNotification('Ошибка: нет ожидающего назначения');
        return;
    }
    
    try {
        await saveAssignmentToAirtable(
            pendingAssignment.participantName,
            pendingAssignment.roleName,
            pendingAssignment.slotDate,
            pendingAssignment.slotTime,
            pendingAssignment.comment || ''
        );
        
        // Обновляем локально
        const sessionKey = `${pendingAssignment.slotDate}_${pendingAssignment.slotTime}`;
        if (!assignments[sessionKey]) {
            assignments[sessionKey] = {};
        }
        assignments[sessionKey][pendingAssignment.roleName] = pendingAssignment.participantName;
        
        // Сохраняем комментарий локально
        if (pendingAssignment.comment) {
            if (!window.assignmentComments) window.assignmentComments = {};
            if (!window.assignmentComments[sessionKey]) window.assignmentComments[sessionKey] = {};
            window.assignmentComments[sessionKey][pendingAssignment.roleName] = {
                comment: pendingAssignment.comment
            };
        }
        
        showNotification('Шифт забронирован!');
        pendingAssignment = null;
        
        renderSchedule();
        updateProgress();
    } catch (error) {
        console.error('Ошибка завершения назначения:', error);
        showNotification('Ошибка бронирования шифта');
        pendingAssignment = null;
    }
}

// ============================================================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================================================

// Делаем функции доступными глобально
window.openStatsPopup = openStatsPopup;
window.closeStatsPopup = closeStatsPopup;
window.openMySchedule = openMySchedule;
window.openSchedulePopup = openSchedulePopup;
window.closeSchedulePopup = closeSchedulePopup;
window.shareSchedule = shareSchedule;
window.openRolesInfoPopup = openRolesInfoPopup;
window.closeRolesInfoPopup = closeRolesInfoPopup;
window.showRoleDetail = showRoleDetail;
window.closeRoleDetailPopup = closeRoleDetailPopup;
window.openDataEditPopup = openDataEditPopup;
window.openUserScheduleFromStats = openUserScheduleFromStats;
window.openFullSchedulePopup = openFullSchedulePopup;
window.switchScheduleDay = switchScheduleDay;
window.openCommentPopup = openCommentPopup;
window.closeCommentPopup = closeCommentPopup;
window.skipComment = skipComment;
window.saveComment = saveComment;
window.showConfirmation = showConfirmation;
window.closeConfirmPopup = closeConfirmPopup;
window.showNotification = showNotification;
window.openParticipantPopup = openParticipantPopup;
window.openParticipantPopupWithSearch = openParticipantPopupWithSearch;
window.closeParticipantPopup = closeParticipantPopup;
window.openBookShiftPopup = openBookShiftPopup;
window.closeBookShiftPopup = closeBookShiftPopup;
window.confirmBookShift = confirmBookShift;
window.openEditShiftPopup = openEditShiftPopup;
window.closeEditShiftPopup = closeEditShiftPopup;
window.onEditCommentChange = onEditCommentChange;
window.saveShiftComment = saveShiftComment;
window.releaseShift = releaseShift;
window.completeAssignment = completeAssignment;
