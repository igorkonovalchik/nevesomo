// ui-renderer.js

/* === ФУНКЦИИ ФОРМАТИРОВАНИЯ === */
function formatDate(dateStr) {
    const months = ['января','февраля','марта','апреля','мая','июня',
                    'июля','августа','сентября','октября','ноября','декабря'];
    const weekdays = ['воскресенье','понедельник','вторник','среда',
                      'четверг','пятница','суббота'];

    const d = new Date(dateStr+'T00:00:00');
    const day   = d.getDate();
    const month = months[d.getMonth()];
    const wday  = weekdays[d.getDay()];

    return `${day} ${month}, ${wday}`;
}

/* === ОСНОВНЫЕ ФУНКЦИИ РЕНДЕРИНГА === */
function renderSchedule() {
    const scheduleDiv = document.getElementById('schedule');
    if (!scheduleDiv) return;
    
    scheduleDiv.innerHTML = '';
    
    // Сортируем дни по дате
    const sortedDays = Object.keys(schedule).sort((a, b) => {
        const dateA = new Date(a + 'T00:00:00');
        const dateB = new Date(b + 'T00:00:00'); 
        return dateA.getTime() - dateB.getTime();
    });
    
    sortedDays.forEach(day => {
        // Сортируем сессии внутри дня по времени
        const sortedSessions = schedule[day].sort((a, b) => a.time.localeCompare(b.time));
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'day-section';
        
        dayDiv.innerHTML = `
            <div class="day-header">${formatDate(day)}</div>
            ${sortedSessions.map(session => renderSession(day, session)).join('')}
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



function renderSessionRoles(sessionKey, filter) {
    let rolesToShow = allRoles;
    
    if (filter !== 'all') {
        rolesToShow = roleGroups[filter]?.roles || [];
    }
    
    // Сортируем роли
    const sortedRoles = rolesToShow.sort((a, b) => {
        const sessionAssignments = assignments[sessionKey];
        const aIsUser = sessionAssignments[a] === currentUser;
        const bIsUser = sessionAssignments[b] === currentUser;
        if (aIsUser && !bIsUser) return -1;
        if (!aIsUser && bIsUser) return 1;
        return a.localeCompare(b);
    });
    
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

function renderRoleSlot(sessionKey, role) {
    const assignedUser = assignments[sessionKey][role];
    const assignmentData = getAssignmentData(sessionKey, role);
    const comment = assignmentData?.comment || '';
    const isBlocked = isSlotBlocked(sessionKey, role);
    const isCurrentUser = currentMode === 'user' && assignedUser === currentUser;
    
    let className = 'role-slot';
    let userDisplay = 'Свободно';
    
    if (assignedUser) {
        className += ' occupied';
        // Обрезаем длинные имена
        userDisplay = assignedUser.length > 15 ? 
            assignedUser.substring(0, 13) + '...' : 
            assignedUser;
        
        if (isCurrentUser) {
            className += ' current-user';
        }
    } else if (isBlocked) {
        className += ' blocked';
        userDisplay = 'Занято';
    }
    
    // Обрезаем длинные названия ролей
    const roleDisplayName = comment ? `${role} (${comment})` : role;
    const shortRoleName = roleDisplayName.length > 25 ? 
        roleDisplayName.substring(0, 23) + '...' : 
        roleDisplayName;
    
    return `
        <div class="${className}" 
             onclick="handleRoleSlotClick('${sessionKey}', '${role}')"
             title="${roleDisplayName}${assignedUser ? ' - ' + assignedUser : ''}">
            <div class="role-name">${shortRoleName}</div>
            <div class="role-user">${userDisplay}</div>
            ${isCurrentUser ? '<div class="role-checkmark">✓</div>' : ''}
        </div>
    `;
}

// Добавь эти новые функции:
function getAssignmentData(sessionKey, role) {
    // Тут нужно будет сохранять полные данные assignments с комментариями
    return window.assignmentComments?.[sessionKey]?.[role] || null;
}

function editComment(event, sessionKey, role) {
    event.stopPropagation();
    const currentComment = getAssignmentData(sessionKey, role)?.comment || '';
    const newComment = prompt('Комментарий к шифту (макс 50 символов):', currentComment);
    
    if (newComment !== null) {
        const trimmedComment = newComment.substring(0, 50);
        updateAssignmentComment(sessionKey, role, trimmedComment);
    }
}

async function updateAssignmentComment(sessionKey, role, comment) {
    // Здесь обновляем комментарий в Airtable и локально
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

/* === ФУНКЦИИ ОБНОВЛЕНИЯ ТАБОВ === */
function getEmptyRolesCount(sessionKey, groupRoles) {
    const sessionAssignments = assignments[sessionKey];
    return groupRoles.filter(role => !sessionAssignments[role]).length;
}

function updateSessionTabs(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    const allTab = sessionElement.querySelector('[data-filter="all"]');
    if (allTab) {
        const totalEmpty = getEmptyRolesCount(sessionKey, allRoles);
        if (totalEmpty > 0) {
            allTab.innerHTML = `Все <span class="empty-count">${totalEmpty}</span>`;
        } else {
            allTab.innerHTML = 'Все';
        }
    }
    
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
function renderParticipantsList(currentAssignment) {
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
    participants.forEach(participant => {
        const isSelected = participant.name === currentAssignment;
        const selectedClass = isSelected ? ' selected' : '';
        
        html += `
            <div class="participant-item${selectedClass}" onclick="selectParticipant('${participant.name.replace(/'/g, "\\'")}')">
                <div class="participant-name">
                    ${participant.name}
                    ${isSelected ? ' ✓' : ''}
                </div>
                <div class="participant-telegram">${participant.telegram}</div>
            </div>
        `;
    });
    
    return html;
}

function renderUserStats(userStats) {
    let html = '';
    userStats.forEach(user => {
        const categoriesHtml = Object.entries(user.categories)
            .filter(([category, count]) => count > 0)
            .map(([category, count]) => `<div class="stats-category">${category}: ${count}</div>`)
            .join('');
        
        const telegramLink = user.telegram ? 
            `<a href="https://t.me/${user.telegram.replace('@', '')}" style="color: var(--accent-primary); text-decoration: none;">
                ${user.telegram}
            </a>` : '';
        
        html += `
            <div class="stats-user ${user.complete ? 'complete' : 'incomplete'}">
                <div class="stats-user-header">
                    <div>
                        <div class="stats-name">${user.name}</div>
                        ${telegramLink ? `<div style="font-size: 0.85em; margin-top: 4px;">${telegramLink}</div>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div class="stats-total ${user.complete ? 'complete' : 'incomplete'}">
                            ${user.shifts}/8 шифтов
                        </div>
                        <button class="user-schedule-btn" onclick="openUserScheduleFromStats('${user.name.replace(/'/g, "\\'")}'); event.stopPropagation();" title="Показать расписание ${user.name}">
                            📅
                        </button>
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

function renderUserSchedule(currentUser, userShiftsByDay, participant, shiftsCount, categoryStats) {
    let html = '';
    
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
    
    const sortedDays = Object.keys(userShiftsByDay).sort((a, b) => {
        const dateA = parseInt(a.split('-')[2]);
        const dateB = parseInt(b.split('-')[2]);
        return dateA - dateB;
    });
    
    if (sortedDays.length === 0) {
        html += '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">У вас пока нет назначенных шифтов</div>';
    } else {
        sortedDays.forEach(day => {
            html += `<h2 style="margin: 24px 0 16px 0; color: var(--accent-primary); font-size: 1.4em;">${formatDate(day)}</h2>`;
            
            userShiftsByDay[day].sort((a, b) => a.time.localeCompare(b.time));
            
            userShiftsByDay[day].forEach(shift => {
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

function renderRolesList() {
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

function renderSession(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionAssignments = assignments[sessionKey];
    
    let sessionRoles = [];
    if (session.availableRoles && session.availableRoles.trim()) {
        sessionRoles = session.availableRoles.split(',').map(r => r.trim()).filter(r => r);
    } else {
        // Если нет ролей в базе - возвращаем пустой массив
        sessionRoles = [];
    }
    
    // Если нет ролей - показываем сессию без возможности взаимодействия
    if (sessionRoles.length === 0) {
        return `
            <div class="session" data-session="${sessionKey}">
                <div class="session-compact">
                    <div class="session-info">
                        <div class="session-basic-info">
                            <div class="session-time">${session.time} - ${session.endTime}</div>
                            <div class="session-details">${session.type}</div>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 0.9em;">Нет доступных ролей</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    const filledRoles = sessionRoles.filter(role => sessionAssignments[role] !== null && sessionAssignments[role] !== undefined).length;
    const totalRoles = sessionRoles.length;
    const percentage = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;
    const emptyRoles = totalRoles - filledRoles; // Количество пустых ролей
    
    const userRoles = currentMode === 'user' && currentUser ? 
        getUserRolesInSession(sessionKey, currentUser) : [];
    const hasUserAssignment = userRoles && userRoles.length > 0;
    
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
                            ${session.slotLink ? `
                                <a href="${session.slotLink}" target="_blank" class="slot-link-btn" title="Перейти по ссылке">
                                    🔗
                                </a>
                            ` : ''}

                            ${percentage < 100 && currentMode === 'admin' && session.status !== 'кухня' ? 
                                `<button class="auto-fill-btn-circle" onclick="event.stopPropagation(); autoFillSession('${sessionKey}')" title="Автозаполнение">⚡</button>` : 
                                ''}
                            
                             <div class="progress-display">
                                    <div class="progress-circle ${progressClass}"
                                         onclick="event.stopPropagation(); showProgressTooltip(this, ${emptyRoles})"
                                         ${percentage>0&&percentage<100?`style="--progress-percent:${percentage}"`:''}>
                                        <span class="progress-text">${emptyRoles}</span>   <!-- NEW -->
                                    </div>
                                </div>
                            
                     </div>
                </div>
            </div>
            ${session.status !== 'кухня' ? `
            <div class="session-expanded">
                <div class="session-tabs-wrapper" id="tabs-wrapper-${sessionKey}">
                    <div class="session-tabs" onscroll="checkTabsScroll('${sessionKey}')">
                        <button class="session-tab active" data-filter="all" onclick="setSessionFilter('${sessionKey}', 'all')">Все</button>
                        ${Object.entries(roleGroups).map(([key, group]) => 
                            `<button class="session-tab" data-filter="${key}" onclick="setSessionFilter('${sessionKey}', '${key}')">${group.name}</button>`
                        ).join('')}
                    </div>
                </div>
                <div class="roles-container" id="roles-${sessionKey}">
                    ${renderSessionRoles(sessionKey, 'all')}
                </div>
            </div>
            ` : `
            <div class="session-expanded">
                <div class="roles-grid-compact">
                    ${sessionRoles.map(role => renderRoleSlot(sessionKey, role)).join('')}
                </div>
            </div>
            `}
        </div>
    `;
    
    return sessionHtml;
}

// Дополнительная функция для обновления прогресса в реальном времени
function updateProgressRing(element, percentage, emptyRoles) {
    const progressCircle = element.querySelector('.progress-circle');
    const progressLabel = element.querySelector('.progress-label');
    
    if (!progressCircle) return;
    
    // Убираем старые классы
    progressCircle.classList.remove('empty', 'partial', 'complete');
    
    if (percentage === 100) {
        progressCircle.classList.add('complete');
        progressCircle.textContent = '0';
        if (progressLabel) progressLabel.textContent = 'Все заполнено';
    } else if (percentage > 0) {
        progressCircle.classList.add('partial');
        progressCircle.style.setProperty('--progress-percent', percentage);
        progressCircle.textContent = emptyRoles || '0';
        if (progressLabel) progressLabel.textContent = `осталось ${emptyRoles || 0}`;
    } else {
        progressCircle.classList.add('empty');
        progressCircle.style.removeProperty('--progress-percent');
        progressCircle.textContent = emptyRoles || '0';
        if (progressLabel) progressLabel.textContent = `осталось ${emptyRoles || 0}`;
    }
}

// Обновленная функция для плавного обновления прогресса без полной перерисовки
function updateSessionProgress(sessionKey) {
    const sessionElement = document.querySelector(`[data-session="${sessionKey}"]`);
    if (!sessionElement) return;
    
    const sessionAssignments = assignments[sessionKey];
    const [day, time] = sessionKey.split('_');
    const session = schedule[day]?.find(s => s.time === time);
    
    if (!session) return;
    
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    const filledRoles = sessionRoles.filter(role => sessionAssignments[role] !== null && sessionAssignments[role] !== undefined).length;
    const totalRoles = sessionRoles.length;
    const percentage = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;
    
    // Обновляем прогресс с анимацией
    const emptyRoles = totalRoles - filledRoles;
    updateProgressRing(sessionElement, percentage, emptyRoles);
    
    // Обновляем индикатор пользовательского назначения
    const userRoles = currentMode === 'user' && currentUser ? 
        getUserRolesInSession(sessionKey, currentUser) : [];
    const hasUserAssignment = userRoles.length > 0;
    
    if (hasUserAssignment) {
        sessionElement.classList.add('user-assigned');
    } else {
        sessionElement.classList.remove('user-assigned');
    }
}

console.log('🎨 UI Renderer загружен');
