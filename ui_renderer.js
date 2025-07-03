// ui-renderer.js - Отрисовка интерфейса приложения NEVESOMO
// Отвечает за все функции рендеринга и отображения данных

import { 
    participants,
    rolesInfo,
    roleGroups,
    schedule,
    allRoles,
    assignments,
    getUserRolesInSession
} from './core/data-manager.js';

/* === ФУНКЦИИ ФОРМАТИРОВАНИЯ === */

/**
 * Форматирует дату в читаемый вид
 * @param {string} dateStr - дата в формате YYYY-MM-DD
 * @returns {string} - отформатированная дата
 */
export function formatDate(dateStr) {
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

/* === ОСНОВНЫЕ ФУНКЦИИ РЕНДЕРИНГА === */

/**
 * Отрисовывает все расписание
 * @param {string} currentMode - текущий режим (user/admin)
 * @param {string} currentUser - имя текущего пользователя
 * @param {Object} sessionFilters - фильтры сессий
 */
export function renderSchedule(currentMode, currentUser, sessionFilters) {
    const scheduleDiv = document.getElementById('schedule');
    if (!scheduleDiv) return;
    
    scheduleDiv.innerHTML = '';
    
    Object.keys(schedule).forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-section';
        
        // Форматируем дату в заголовке
        dayDiv.innerHTML = `
            <div class="day-header">${formatDate(day)}</div>
            ${schedule[day].map(session => renderSession(day, session, currentMode, currentUser)).join('')}
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

/**
 * Отрисовывает одну сессию
 * @param {string} day - день сессии
 * @param {Object} session - объект сессии
 * @param {string} currentMode - текущий режим
 * @param {string} currentUser - текущий пользователь
 * @returns {string} - HTML код сессии
 */
export function renderSession(day, session, currentMode, currentUser) {
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
                    ${renderSessionRoles(sessionKey, 'all', currentMode, currentUser)}
                </div>
            </div>
            ` : `
            <div class="session-expanded">
                <div class="roles-grid">
                    ${sessionRoles.map(role => renderRoleSlot(sessionKey, role, currentMode, currentUser)).join('')}
                </div>
            </div>
            `}
        </div>
    `;
    
    return sessionHtml;
}

/**
 * Отрисовывает роли сессии с учетом фильтра
 * @param {string} sessionKey - ключ сессии
 * @param {string} filter - текущий фильтр
 * @param {string} currentMode - текущий режим
 * @param {string} currentUser - текущий пользователь
 * @returns {string} - HTML код ролей
 */
export function renderSessionRoles(sessionKey, filter, currentMode, currentUser) {
    let rolesToShow = allRoles;
    
    if (filter !== 'all') {
        rolesToShow = roleGroups[filter]?.roles || [];
    }
    
    const rolesHtml = `
        <div class="roles-grid">
            ${rolesToShow.map(role => renderRoleSlot(sessionKey, role, currentMode, currentUser)).join('')}
        </div>
    `;
    
    const container = document.getElementById(`roles-${sessionKey}`);
    if (container) {
        container.innerHTML = rolesHtml;
    }
    
    return rolesHtml;
}

/**
 * Отрисовывает один слот роли
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - название роли
 * @param {string} currentMode - текущий режим
 * @param {string} currentUser - текущий пользователь
 * @returns {string} - HTML код слота роли
 */
export function renderRoleSlot(sessionKey, role, currentMode, currentUser) {
    const assignedUser = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role, currentMode, currentUser);
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

/* === ФУНКЦИИ ОБНОВЛЕНИЯ ТАБОВ И ФИЛЬТРОВ === */

/**
 * Получает количество свободных ролей в группе
 * @param {string} sessionKey - ключ сессии
 * @param {Array<string>} groupRoles - роли группы
 * @returns {number} - количество свободных ролей
 */
export function getEmptyRolesCount(sessionKey, groupRoles) {
    const sessionAssignments = assignments[sessionKey];
    return groupRoles.filter(role => !sessionAssignments[role]).length;
}

/**
 * Обновляет табы с количеством свободных ролей
 * @param {string} sessionKey - ключ сессии
 */
export function updateSessionTabs(sessionKey) {
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

/* === ФУНКЦИИ РЕНДЕРИНГА ПОПАПОВ === */

/**
 * Рендерит список участников для попапа админа
 * @param {string} currentAssignment - текущее назначение
 * @returns {string} - HTML код списка участников
 */
export function renderParticipantsList(currentAssignment) {
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
    
    return html;
}

/**
 * Рендерит статистику пользователей
 * @param {Array} userStats - статистика пользователей
 * @returns {string} - HTML код статистики
 */
export function renderUserStats(userStats) {
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
    
    return html;
}

/**
 * Рендерит пользовательское расписание
 * @param {string} currentUser - текущий пользователь
 * @param {Object} userShiftsByDay - шифты пользователя по дням
 * @param {Object} participant - данные участника
 * @param {number} shiftsCount - общее количество шифтов
 * @param {Object} categoryStats - статистика по категориям
 * @returns {string} - HTML код расписания
 */
export function renderUserSchedule(currentUser, userShiftsByDay, participant, shiftsCount, categoryStats) {
    let html = '';
    
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
    
    return html;
}

/**
 * Рендерит список ролей для информационного попапа
 * @returns {string} - HTML код списка ролей
 */
export function renderRolesList() {
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
    
    return html;
}

/* === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ === */

/**
 * Проверяет блокировку слота для пользователя
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - роль
 * @param {string} currentMode - текущий режим
 * @param {string} currentUser - текущий пользователь
 * @returns {boolean} - заблокирован ли слот
 */
function isSlotBlocked(sessionKey, role, currentMode, currentUser) {
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

console.log('🎨 UI Renderer загружен');