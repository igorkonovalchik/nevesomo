// popup-manager.js - Управление попапами (без ES6 модулей)

/* === ПЕРЕМЕННЫЕ СОСТОЯНИЯ ПОПАПОВ === */
let previousPopup = null;

/* === ПОПАП СТАТИСТИКИ === */
function openStatsPopup() {
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
            telegram: participant.telegram,
            shifts: shiftsCount,
            complete: shiftsCount >= 8,
            categories: categoryStats
        };
    });
    
    const html = renderUserStats(userStats);
    statsList.innerHTML = html;
    document.getElementById('statsPopup').classList.add('show');
}

function closeStatsPopup() {
    document.getElementById('statsPopup').classList.remove('show');
}

/* === ПОПАП РАСПИСАНИЯ === */
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
        
        // Собираем шифты пользователя по дням
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
                        sessionNum: session.sessionNumber,
                        type: session.type,
                        role
                    });
                }
            });
        });
        
        html = renderUserSchedule(currentUser, userShiftsByDay, participant, shiftsCount, categoryStats);
        
    } else {
        // Для админа показываем полное расписание
        Object.keys(schedule).forEach(day => {
            hhtml += `
                <div class="schedule-date-sticky">
                    <h2 style="margin: 0; color: var(--accent-primary); font-size: 1.4em; padding: 16px 0;">${formatDate(day)}</h2>
                </div>
            `;
            
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
        navigator.clipboard.writeText(window.location.href);
        showNotification('Ссылка скопирована в буфер обмена');
    }
}

/* === ПОПАП ИНФОРМАЦИИ О РОЛЯХ === */
function openRolesInfoPopup() {
    previousPopup = null;
    const rolesInfoBody = document.getElementById('rolesInfoBody');
    
    const html = renderRolesList();
    rolesInfoBody.innerHTML = html;
    document.getElementById('rolesInfoPopup').classList.add('show');
}

function closeRolesInfoPopup() {
    document.getElementById('rolesInfoPopup').classList.remove('show');
}

/* === ПОПАП ДЕТАЛЬНОГО ОПИСАНИЯ РОЛИ === */
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

/* === ПОПАП АДМИН ПАНЕЛИ === */
function openDataEditPopup() {
    showNotification('Админ панель редактирования данных будет реализована в следующей версии.\n\nЗдесь будет возможность:\n- Редактировать роли и их описания\n- Изменять информацию о бане\n- Настраивать расписание');
}

/* === ОБЩИЕ ФУНКЦИИ === */
function closeAllPopups() {
    const popups = [
        'statsPopup',
        'schedulePopup', 
        'rolesInfoPopup',
        'roleDetailPopup',
        'participantPopup'
    ];
    
    popups.forEach(popupId => {
        const popup = document.getElementById(popupId);
        if (popup) {
            popup.classList.remove('show');
        }
    });
    
    previousPopup = null;
}

function isAnyPopupOpen() {
    const popups = document.querySelectorAll('.popup-overlay.show');
    return popups.length > 0;
}

/* === ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ === */
function initPopupHandlers() {
    // Обработчик для закрытия попапов по клику на оверлей
    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('popup-overlay')) {
            const popupId = event.target.id;
            switch(popupId) {
                case 'statsPopup':
                    closeStatsPopup();
                    break;
                case 'schedulePopup':
                    closeSchedulePopup();
                    break;
                case 'rolesInfoPopup':
                    closeRolesInfoPopup();
                    break;
                case 'roleDetailPopup':
                    closeRoleDetailPopup();
                    break;
            }
        }
    });
    
    // Обработчик для закрытия попапов по Escape
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && isAnyPopupOpen()) {
            closeAllPopups();
        }
    });
}

/* новое */ 

// Обновленная функция openParticipantPopup
function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];
    
    const html = renderParticipantsList(currentAssignment);
    participantsList.innerHTML = html;
    
    document.getElementById('participantPopup').classList.add('show');
}

// Альтернативный вариант с иконками и статусами
function renderParticipantsListEnhanced(currentAssignment) {
    let html = '';
    
    // Специальные действия
    html += `
        <div class="participant-item special" onclick="selectParticipant(null)">
            <div class="participant-name">
                <span style="font-size: 1.2em; margin-right: 8px;">🗑️</span>
                Очистить слот
            </div>
            <div class="participant-telegram">Убрать текущее назначение</div>
        </div>
        
        <div class="participant-item special" onclick="selectParticipant('Участник другого кемпа')" style="margin-bottom: 20px;">
            <div class="participant-name">
                <span style="font-size: 1.2em; margin-right: 8px;">👤</span>
                Участник другого кемпа
            </div>
            <div class="participant-telegram">Гость из другого кемпа</div>
        </div>
    `;
    
    // Группируем участников
    const sortedParticipants = participants.sort((a, b) => a.name.localeCompare(b.name));
    
    sortedParticipants.forEach(participant => {
        const isSelected = participant.name === currentAssignment;
        const selectedClass = isSelected ? ' selected' : '';
        
        // Определяем статус участника
        let statusIcon = '';
        if (participant.bathExperience) {
            statusIcon = '<span style="color: #34a853; margin-left: 4px;" title="Опытный банщик">⭐</span>';
        }
        if (participant.isAdmin) {
            statusIcon += '<span style="color: #1a73e8; margin-left: 4px;" title="Администратор">👑</span>';
        }
        
        html += `
            <div class="participant-item${selectedClass}" onclick="selectParticipant('${participant.name.replace(/'/g, "\\'")}')">
                <div class="participant-name">
                    ${participant.name}
                    ${statusIcon}
                    ${isSelected ? ' <span style="color: var(--success-color); margin-left: 8px;">✓</span>' : ''}
                </div>
                <div class="participant-telegram">
                    <a href="https://t.me/${participant.telegram.replace('@', '')}" target="_blank" onclick="event.stopPropagation();">
                        ${participant.telegram}
                    </a>
                </div>
            </div>
        `;
    });
    
    return html;
}

// Функция для поиска участников
function addParticipantSearch() {
    const searchHtml = `
        <div style="margin-bottom: 16px; position: sticky; top: 0; background: var(--bg-primary); padding: 8px 0; z-index: 10;">
            <input 
                type="text" 
                id="participantSearch" 
                placeholder="Поиск участника..." 
                style="
                    width: 100%; 
                    padding: 12px; 
                    border: 1px solid var(--border-color); 
                    border-radius: 8px; 
                    background: var(--bg-secondary); 
                    color: var(--text-primary);
                    font-size: 1rem;
                "
                oninput="filterParticipants(this.value)"
            >
        </div>
    `;
    
    return searchHtml;
}

// Функция фильтрации участников
window.filterParticipants = function(searchTerm) {
    const items = document.querySelectorAll('.participant-item:not(.special)');
    const term = searchTerm.toLowerCase();
    
    items.forEach(item => {
        const name = item.querySelector('.participant-name').textContent.toLowerCase();
        const telegram = item.querySelector('.participant-telegram').textContent.toLowerCase();
        
        if (name.includes(term) || telegram.includes(term)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
};

// Обновленная функция с поиском
function openParticipantPopupWithSearch(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];
    
    let html = '';
    
    // Добавляем поиск если участников много
    if (participants.length > 10) {
        html += addParticipantSearch();
    }
    
    html += renderParticipantsListEnhanced(currentAssignment);
    
    participantsList.innerHTML = html;
    document.getElementById('participantPopup').classList.add('show');
    
    // Фокус на поиск если есть
    setTimeout(() => {
        const searchInput = document.getElementById('participantSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }, 300);
}

function openUserScheduleFromStats(userName) {
    // Получаем информацию об участнике
    const participant = participants.find(p => p.name === userName);
    if (!participant) {
        showNotification('Участник не найден');
        return;
    }
    
    let shiftsCount = 0;
    const categoryStats = getUserCategoryStats(userName);
    
    // Подсчитываем шифты пользователя
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day].find(s => s.time === time);
        
        let sessionRoles = allRoles;
        if (session.roles) {
            sessionRoles = session.roles;
        }
        
        sessionRoles.forEach(role => {
            if (assignments[sessionKey][role] === userName) {
                shiftsCount++;
            }
        });
    });
    
    // Собираем шифты пользователя по дням
    const userShiftsByDay = {};
    
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day].find(s => s.time === time);
        
        let sessionRoles = allRoles;
        if (session.roles) {
            sessionRoles = session.roles;
        }
        
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
    
    // Отрисовываем расписание
    const scheduleBody = document.getElementById('scheduleBody');
    const html = renderUserSchedule(userName, userShiftsByDay, participant, shiftsCount, categoryStats);
    scheduleBody.innerHTML = html;
    
    // Обновляем заголовок
    const scheduleTitle = document.querySelector('#schedulePopup .popup-title');
    if (scheduleTitle) {
        scheduleTitle.textContent = `Расписание: ${userName}`;
    }
    
    // Закрываем статистику и открываем расписание
    closeStatsPopup();
    document.getElementById('schedulePopup').classList.add('show');
    
    // Добавляем обработчик для возврата к статистике при закрытии
    const originalCloseHandler = () => {
        // Возвращаем заголовок обратно
        if (scheduleTitle) {
            scheduleTitle.textContent = 'Мое расписание';
        }
        // Открываем обратно статистику
        setTimeout(() => {
            openStatsPopup();
        }, 100);
    };
    
    // Заменяем обработчики закрытия временно
    const backBtn = schedulePopup.querySelector('.popup-back');
    const closeBtn = schedulePopup.querySelector('.popup-close');
    
    if (backBtn) {
        backBtn.onclick = () => {
            closeSchedulePopup();
            originalCloseHandler();
        };
    }
    
    if (closeBtn) {
        closeBtn.onclick = () => {
            closeSchedulePopup();
            originalCloseHandler();
        };
    }
}

function openFullSchedulePopup() {
    const scheduleBody = document.getElementById('scheduleBody');
    let html = renderFullScheduleWithTabs();
    scheduleBody.innerHTML = html;
    
    // Обновляем заголовок
    const scheduleTitle = document.querySelector('#schedulePopup .popup-title');
    if (scheduleTitle) {
        scheduleTitle.textContent = 'Общее расписание';
    }
    
    document.getElementById('schedulePopup').classList.add('show');
}

function renderFullScheduleWithTabs() {
    const sortedDays = Object.keys(schedule).sort((a, b) => {
        const dateA = new Date(a + 'T00:00:00');
        const dateB = new Date(b + 'T00:00:00');
        return dateA.getTime() - dateB.getTime();
    });
    
    let html = `
        <div class="schedule-tabs-container">
            <div class="schedule-date-tabs">
                ${sortedDays.map((day, index) => `
                    <div class="schedule-date-tab ${index === 0 ? 'active' : ''}" 
                         data-day="${day}" onclick="switchScheduleDay('${day}')">
                        <div class="tab-day">${new Date(day + 'T00:00:00').getDate()}</div>
                        <div class="tab-month">${formatDate(day).split(' ')[1].substring(0, 3)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="schedule-days-container">
    `;
    
    sortedDays.forEach((day, index) => {
        const sortedSessions = schedule[day].sort((a, b) => a.time.localeCompare(b.time));
        
        html += `
            <div class="schedule-day-content ${index === 0 ? 'active' : ''}" data-day="${day}">
                ${sortedSessions.map(session => renderCompactSessionForFullSchedule(day, session)).join('')}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

function renderCompactSessionForFullSchedule(day, session) {
    const sessionKey = `${day}_${session.time}`;
    const sessionAssignments = assignments[sessionKey];
    
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    const filledRoles = sessionRoles.filter(role => sessionAssignments[role] !== null && sessionAssignments[role] !== undefined).length;
    const totalRoles = sessionRoles.length;
    const percentage = totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0;
    const emptyRoles = totalRoles - filledRoles;
    
    const userRoles = currentMode === 'user' && currentUser ? 
        getUserRolesInSession(sessionKey, currentUser) : [];
    const hasUserAssignment = userRoles.length > 0;
    
    let progressClass = 'empty';
    if (percentage === 100) {
        progressClass = 'complete';
    } else if (percentage > 0) {
        progressClass = 'partial';
    }
    
    let html = `
        <div class="compact-session-card">
            <div class="compact-session-header">
                <div class="compact-session-time">${session.time} - ${session.endTime}</div>
                <div class="compact-session-type">${session.type}</div>
                <div class="progress-circle ${progressClass}" style="width: 32px; height: 32px; font-size: 0.7rem;">
                    <span class="progress-text">${emptyRoles}</span>
                </div>
            </div>
            <div class="compact-roles-grid">
    `;
    
    // Сортируем роли: роли текущего пользователя наверх
    const sortedRoles = sessionRoles.sort((a, b) => {
        const aIsUser = sessionAssignments[a] === currentUser;
        const bIsUser = sessionAssignments[b] === currentUser;
        if (aIsUser && !bIsUser) return -1;
        if (!aIsUser && bIsUser) return 1;
        return 0;
    });
    
    sortedRoles.forEach(role => {
        const assignedUser = sessionAssignments[role];
        const isCurrentUser = assignedUser === currentUser;
        
        html += `
            <div class="compact-role-slot ${isCurrentUser ? 'current-user' : ''}">
                <div class="compact-role-name">${role}</div>
                <div class="compact-role-user">${assignedUser || 'Свободно'}</div>
            </div>
        `;
    });
    
    html += '</div></div>';
    return html;
}

// ЗАМЕНИТЬ функцию switchScheduleDay:
function switchScheduleDay(day) {
    // Переключаем активный таб
    document.querySelectorAll('.schedule-date-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-day="${day}"]`).classList.add('active');
    
    // Переключаем содержимое
    document.querySelectorAll('.schedule-day-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelector(`.schedule-day-content[data-day="${day}"]`).classList.add('active');
}

/* === ПОПАП КОММЕНТАРИЯ === */
function openCommentPopup() {
    document.getElementById('shiftComment').value = '';
    document.getElementById('commentPopup').classList.add('show');
}

function closeCommentPopup() {
    document.getElementById('commentPopup').classList.remove('show');
    pendingAssignment = null;
}

function skipComment() {
    closeCommentPopup();
    if (pendingAssignment) {
        completeAssignment('');
    }
}

function saveComment() {
    const comment = document.getElementById('shiftComment').value.trim();
    closeCommentPopup();
    if (pendingAssignment) {
        completeAssignment(comment);
    }
}

/* === ПОПАП ПОДТВЕРЖДЕНИЯ === */
let confirmCallback = null;

function showConfirmation(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmPopup').classList.add('show');
}

function closeConfirmPopup() {
    document.getElementById('confirmPopup').classList.remove('show');
    confirmCallback = null;
}

// Обработчик кнопки подтверждения
document.addEventListener('DOMContentLoaded', () => {
    const confirmBtn = document.getElementById('confirmAction');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (confirmCallback) {
                confirmCallback();
            }
            closeConfirmPopup();
        });
    }
});

/* === УВЕДОМЛЕНИЯ === */
function showNotification(message) {
    // Создаем временный попап для уведомления
    const notification = document.createElement('div');
    notification.className = 'notification-toast';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        z-index: 9999;
        animation: slideUp 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Добавить в конец файла:

/* === ПОПАП БРОНИРОВАНИЯ ШИФТА === */
function openBookShiftPopup(sessionKey, role) {
    console.log('📝 openBookShiftPopup вызван:', { sessionKey, role });
    
    // Устанавливаем глобальные переменные
    window.currentPopupSession = sessionKey;
    window.currentPopupRole = role;
    
    document.getElementById('bookTitle').textContent = 'Занять шифт?';
    document.getElementById('bookRoleInfo').textContent = role;
    document.getElementById('bookComment').value = '';
    
    document.getElementById('bookShiftPopup').classList.add('show');
    console.log('👁️ Попап бронирования показан');
}

function closeBookShiftPopup() {
    console.log('❌ Закрываем попап бронирования');
    document.getElementById('bookShiftPopup').classList.remove('show');
}

function confirmBookShift() {
    console.log('🎯 confirmBookShift вызван');
    
    const comment = document.getElementById('bookComment').value.trim();
    console.log('💬 Получен комментарий:', comment);
    
    closeBookShiftPopup();
    
    if (window.currentPopupSession && window.currentPopupRole) {
        console.log('✅ Переменные попапа установлены, создаем pendingAssignment');
        
        // Создаем pendingAssignment
        window.pendingAssignment = {
            sessionKey: window.currentPopupSession,
            role: window.currentPopupRole,
            day: window.currentPopupSession.split('_')[0],
            time: window.currentPopupSession.split('_')[1]
        };
        
        console.log('📦 Создан pendingAssignment:', window.pendingAssignment);
        
        // Вызываем completeAssignment
        if (typeof window.completeAssignment === 'function') {
            console.log('🚀 Вызываем completeAssignment...');
            window.completeAssignment(comment);
        } else {
            console.error('❌ window.completeAssignment не найден');
            showNotification('Ошибка: функция завершения назначения недоступна');
        }
    } else {
        console.error('❌ Переменные попапа не установлены');
        showNotification('Ошибка: данные о шифте не найдены');
    }
}

/* === ПОПАП РЕДАКТИРОВАНИЯ ШИФТА === */
function openEditShiftPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    // Получаем текущий комментарий
    const currentComment = getAssignmentData(sessionKey, role)?.comment || '';
    
    document.getElementById('editTitle').textContent = 'Данные шифта';
    document.getElementById('editRoleInfo').textContent = role;
    document.getElementById('editComment').value = currentComment;
    document.getElementById('editOriginalComment').value = currentComment; // Сохраняем оригинал
    
    updateEditButtons(false); // Изначально кнопка "Освободить шифт"
    
    document.getElementById('editShiftPopup').classList.add('show');
}

function closeEditShiftPopup() {
    document.getElementById('editShiftPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

function onEditCommentChange() {
    const currentComment = document.getElementById('editComment').value.trim();
    const originalComment = document.getElementById('editOriginalComment').value.trim();
    const changed = currentComment !== originalComment;
    updateEditButtons(changed);
}

function updateEditButtons(commentChanged) {
    const actionBtn = document.getElementById('editActionBtn');
    if (commentChanged) {
        actionBtn.textContent = 'Сохранить';
        actionBtn.onclick = saveShiftComment;
    } else {
        actionBtn.textContent = 'Освободить шифт';
        actionBtn.onclick = releaseShift;
    }
}

async function saveShiftComment() {
    const comment = document.getElementById('editComment').value.trim();
    closeEditShiftPopup();
    
    if (currentPopupSession && currentPopupRole) {
        const [day, time] = currentPopupSession.split('_');
        
        try {
            // Обновляем комментарий в базе
            await updateAssignmentComment(currentPopupSession, currentPopupRole, comment);
            showNotification('Комментарий сохранен!');
        } catch (error) {
            console.error('Ошибка сохранения комментария:', error);
            showNotification('Ошибка сохранения комментария');
        }
    }
}

async function releaseShift() {
    if (!confirm('Вы уверены, что хотите освободить этот шифт?')) {
        return;
    }
    
    closeEditShiftPopup();
    
    if (currentPopupSession && currentPopupRole) {
        await removeUserAssignment(currentPopupSession, currentPopupRole);
    }
}

/* === ЭКСПОРТ ГЛОБАЛЬНЫХ ФУНКЦИЙ === */
// Экспортируем все функции попапов в глобальную область
window.openBookShiftPopup = openBookShiftPopup;
window.closeBookShiftPopup = closeBookShiftPopup;
window.confirmBookShift = confirmBookShift;
window.openEditShiftPopup = openEditShiftPopup;
window.closeEditShiftPopup = closeEditShiftPopup;
window.onEditCommentChange = onEditCommentChange;
window.saveShiftComment = saveShiftComment;
window.releaseShift = releaseShift;
window.openParticipantPopup = openParticipantPopup;
window.renderParticipantsList = renderParticipantsList;
window.openCommentPopup = openCommentPopup;
window.closeCommentPopup = closeCommentPopup;
window.skipComment = skipComment;
window.saveComment = saveComment;
window.showConfirmation = showConfirmation;
window.closeConfirmPopup = closeConfirmPopup;
window.showNotification = showNotification;

console.log('📤 Функции попапов экспортированы глобально');
