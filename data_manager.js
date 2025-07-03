// data-manager.js - Управление данными (без ES6 модулей)

/* === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДАННЫХ === */
let participants = [];
let rolesInfo = {};
let roleGroups = {};
let schedule = {};
let allRoles = [];
let appSettings = {};
let assignments = {};

// Состояние загрузки
let isDataLoaded = false;
let isDataLoading = false;

/* === ФУНКЦИИ СОСТОЯНИЯ ЗАГРУЗКИ === */
function showLoadingState() {
    const container = document.getElementById('schedule');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 2em; margin-bottom: 16px;">⏳</div>
                <div style="font-size: 1.2em; color: var(--text-secondary);">Загружаем данные из Airtable...</div>
            </div>
        `;
    }
}

function showErrorState(errorMessage) {
    const container = document.getElementById('schedule');
    if (container) {
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
}

/* === ЗАГРУЗКА ДАННЫХ ИЗ AIRTABLE === */
async function loadAirtableData() {
    if (isDataLoading) return;
    
    isDataLoading = true;
    showLoadingState();
    
    try {
        console.log('Загружаем данные из Airtable...');
        
        if (!window.airtableService) {
            throw new Error('Airtable service не загружен');
        }
        
        const data = await window.airtableService.getAllData();
        
        // Обрабатываем участников
        participants.length = 0;
        participants.push(...data.participants.map(p => ({
            name          : p.name,
            telegram      : p.telegram,
            telegramId    : p.telegramId,
            isAdmin       : p.isAdmin,
            bathExperience: p.bathExperience
        })));
        
        // Обрабатываем роли
        Object.keys(rolesInfo).forEach(key => delete rolesInfo[key]);
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
        Object.keys(roleGroups).forEach(key => delete roleGroups[key]);
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
        
        allRoles.length = 0;
        allRoles.push(...Object.values(roleGroups).flatMap(group => group.roles));
        
        // Обрабатываем расписание
        Object.keys(schedule).forEach(key => delete schedule[key]);
        data.schedule.forEach(session => {
            const dateKey = session.date;
            if (!schedule[dateKey]) {
                schedule[dateKey] = [];
            }
            
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
        Object.keys(appSettings).forEach(key => delete appSettings[key]);
        Object.assign(appSettings, data.settings);
        
        // Обрабатываем назначения
        await loadAssignments(data.assignments);
        
        isDataLoaded = true;
        window.participants = participants; // для telegram.js
        
        console.log('Данные успешно загружены:', {
            participants: participants.length,
            roles: Object.keys(rolesInfo).length,
            schedule: Object.keys(schedule).length,
            assignments: Object.keys(assignments).length
        });
        
        // Уведомляем о загрузке данных
        window.dispatchEvent(new CustomEvent('dataLoaded'));
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showErrorState(error.message);
        throw error;
    } finally {
        isDataLoading = false;
    }
}

async function loadAssignments(assignmentsData) {
    Object.keys(assignments).forEach(key => delete assignments[key]);
    
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            assignments[sessionKey] = {};
            
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });
    
    assignmentsData.forEach(assignment => {
        const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
        if (assignments[sessionKey] && assignments[sessionKey][assignment.roleName] !== undefined) {
            assignments[sessionKey][assignment.roleName] = assignment.participantName;
        }
    });
}

/* === СОХРАНЕНИЕ ДАННЫХ В AIRTABLE === */
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

/* === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ === */
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

function getUserRolesInSession(sessionKey, userName) {
    const [day, time] = sessionKey.split('_');
    const session = schedule[day].find(s => s.time === time);
    const sessionAssignments = assignments[sessionKey];
    
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    return sessionRoles.filter(role => sessionAssignments[role] === userName);
}

async function reloadData() {
    isDataLoaded = false;
    return await loadAirtableData();
}

console.log('📦 Data Manager загружен');
