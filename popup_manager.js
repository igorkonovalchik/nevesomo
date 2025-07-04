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
        alert('Участник не найден');
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

// Делаем функции доступными глобально
window.openParticipantPopup = openParticipantPopup;
window.renderParticipantsList = renderParticipantsList;

console.log('🪟 Popup Manager загружен');
