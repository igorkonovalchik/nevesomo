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
        navigator.clipboard.writeText(window.location.href);
        alert('Ссылка скопирована в буфер обмена');
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
    alert('Админ панель редактирования данных будет реализована в следующей версии.\n\nЗдесь будет возможность:\n- Редактировать роли и их описания\n- Изменять информацию о бане\n- Настраивать расписание');
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

console.log('🪟 Popup Manager загружен');
