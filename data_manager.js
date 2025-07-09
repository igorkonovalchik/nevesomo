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
// ИСПРАВЛЕНО: Обновленная функция загрузки данных с лучшей обработкой ролей
async function loadAirtableData() {
    if (isDataLoading) return;

    // --- ОФЛАЙН-РЕЖИМ ---
    if (window.isOfflineMode) {
        if (window.loadOfflineData) {
            await window.loadOfflineData();
            isDataLoaded = true;
            window.dispatchEvent(new CustomEvent('dataLoaded'));
            return;
        }
    }
    // --- /ОФЛАЙН-РЕЖИМ ---

    isDataLoading = true;
   // showLoadingState();
    
    try {
        console.log('Загружаем данные из Airtable...');
        
        if (!window.airtableService) {
            throw new Error('Airtable service не загружен');
        }
        
        const data = await window.airtableService.getAllData();
        
        // Обрабатываем участников
        participants.length = 0;
        participants.push(...data.participants.map(p => ({
            id            : p.id, // обязательно сохраняем record.id для PATCH
            name          : p.name,
            telegram      : p.telegram,
            telegramId    : p.telegramId,
            isAdmin       : p.isAdmin,
            isNew       : p.isNew,
            bathExperience: p.bathExperience
        })));
        
        // ИСПРАВЛЕНО: Обрабатываем роли с улучшенной логикой
        Object.keys(rolesInfo).forEach(key => delete rolesInfo[key]);
        const validRoles = [];
        
        data.roles.forEach(role => {
            if (role.isActive && role.name) {
                rolesInfo[role.name] = {
                    icon: role.icon || '🔥',
                    description: role.description || '',
                    instructionUrl: role.instructionUrl || '',
                    category: role.category || 'other'
                };
                validRoles.push(role.name);
                console.log(`✅ Загружена роль: "${role.name}" (${role.category})`);
            }
        });
        
        // ИСПРАВЛЕНО: Группируем роли по категориям с fallback
        Object.keys(roleGroups).forEach(key => delete roleGroups[key]);
        const rolesByCategory = {};
        
        // Сначала группируем по категориям из данных
        data.roles.forEach(role => {
            if (role.isActive && role.name) {
                const category = role.category || 'other';
                if (!rolesByCategory[category]) {
                    rolesByCategory[category] = [];
                }
                rolesByCategory[category].push(role.name);
            }
        });
        
        // Если нет ролей из БД, используем статичный fallback
        if (Object.keys(rolesByCategory).length === 0) {
            console.warn('⚠️ Роли не загружены из Airtable, используем fallback');
            rolesByCategory.banking = ['Главный банный мастер', 'Пармастер 2', 'Источник/Водовоз/Тех.гид'];
            rolesByCategory.care = ['Гриттер 1', 'Гостевая Забота'];
            rolesByCategory.lounge = ['Любовь+Забота - 1', 'Любовь+Забота+Мастер класс'];
            rolesByCategory.kitchen = ['Поваренок'];
            rolesByCategory.other = ['Музыка, ритм, голос', 'Страхующий/Уют'];
        }
        
        // Создаем roleGroups с красивыми названиями
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
            
            console.log(`📂 Группа "${categoryNames[category] || category}": ${roles.length} ролей`);
        });
        
        // ИСПРАВЛЕНО: allRoles из всех групп
        allRoles.length = 0;
        Object.values(roleGroups).forEach(group => {
            allRoles.push(...group.roles);
        });
        
        console.log(`📋 Всего ролей: ${allRoles.length}`);
        console.log('🔍 Список всех ролей:', allRoles);
        
        // Обрабатываем расписание
        Object.keys(schedule).forEach(key => delete schedule[key]);
        data.schedule.forEach(session => {
            const dateKey = session.date;
            if (!schedule[dateKey]) {
                schedule[dateKey] = [];
            }
            
           // НОВЫЙ блок - без fallback и без лишних полей:
            schedule[dateKey].push({
                time: session.startTime,
                endTime: session.endTime,
                sessionNum: session.sessionNumber,
                status: session.status,
                type: session.type,
                availableRoles: session.availableRoles, // Сохраняем как есть из базы
                slotLink: session.slotLink || null  
            });
            
            console.log(`📅 Сессия ${session.startTime} ${dateKey}: роли из базы: "${session.availableRoles}"`);
        });
        
        // Сохраняем настройки
        Object.keys(appSettings).forEach(key => delete appSettings[key]);
        Object.assign(appSettings, data.settings);
        
        // ИСПРАВЛЕНО: Загружаем назначения после того, как все роли готовы
        await loadAssignments(data.assignments);
        
        isDataLoaded = true;
        window.participants = participants; // для telegram.js
        
        console.log('✅ Данные успешно загружены:', {
            participants: participants.length,
            roles: Object.keys(rolesInfo).length,
            roleGroups: Object.keys(roleGroups).length,
            schedule: Object.keys(schedule).length,
            assignments: Object.keys(assignments).length
        });
        
        // Уведомляем о загрузке данных
        window.dispatchEvent(new CustomEvent('dataLoaded'));
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
       // showErrorState(error.message);
        throw error;
    } finally {
        isDataLoading = false;
    }
}

async function loadAssignments(assignmentsData) {
    // Очищаем все существующие assignments
    Object.keys(assignments).forEach(key => delete assignments[key]);
    
    // Создаем assignments только для сессий с ролями в базе данных
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            
            // Проверяем есть ли роли в базе данных для этой сессии
            if (!session.availableRoles || !session.availableRoles.trim()) {
                console.log(`⚠️ Сессия ${sessionKey} не имеет ролей в базе данных - пропускаем`);
                return; // Пропускаем сессии без ролей
            }
            
            // Парсим роли из базы данных
            const sessionRoles = session.availableRoles.split(',').map(r => r.trim()).filter(r => r);
            
            if (sessionRoles.length === 0) {
                console.log(`⚠️ Сессия ${sessionKey} имеет пустой список ролей - пропускаем`);
                return;
            }
            
            console.log(`📝 Сессия ${sessionKey} роли из базы:`, sessionRoles);
            
            // Инициализируем assignments для этой сессии
            assignments[sessionKey] = {};
            
            // Инициализируем только роли из базы данных
            sessionRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });
    
    console.log('📦 Инициализированы assignments:', Object.keys(assignments).length, 'сессий');
    
    // Применяем назначения из Airtable
    assignmentsData.forEach(assignment => {
        const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
        
        if (!assignments[sessionKey]) {
            console.warn(`⚠️ Сессия ${sessionKey} не найдена в assignments (нет ролей в базе)`);
            return;
        }
        
        if (assignments[sessionKey][assignment.roleName] === undefined) {
            console.error(`❌ Роль "${assignment.roleName}" не найдена в сессии ${sessionKey}`);
            console.log('Доступные роли в сессии:', Object.keys(assignments[sessionKey]));
            return;
        }
        
        assignments[sessionKey][assignment.roleName] = assignment.participantName;
        console.log(`✅ Назначение: ${assignment.participantName} → ${assignment.roleName} в ${sessionKey}`);
    });
    
    console.log('📋 Загружены назначения из Airtable:', assignmentsData.length);
}

/* === СОХРАНЕНИЕ ДАННЫХ В AIRTABLE === */
async function saveAssignmentToAirtable(participantName, roleName, slotDate, slotTime, comment = '') {
    try {
        console.log('Сохраняем в Airtable:', { participantName, roleName, slotDate, slotTime, comment });
        
        if (!window.airtableService) {
            throw new Error('Airtable service не доступен');
        }
        
        await window.airtableService.createAssignment(participantName, roleName, slotDate, slotTime, comment);
        console.log('Назначение сохранено в Airtable:', { participantName, roleName, slotDate, slotTime, comment });
    } catch (error) {
        console.error('Ошибка сохранения назначения:', error);
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
        showNotification('Ошибка удаления. Попробуйте еще раз.');
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
    const session = schedule[day]?.find(s => s.time === time);
    
    if (!session) return [];
    
    const sessionAssignments = assignments[sessionKey];
    if (!sessionAssignments) return [];
    
    let sessionRoles = [];
    if (session.availableRoles && session.availableRoles.trim()) {
        sessionRoles = session.availableRoles.split(',').map(r => r.trim()).filter(r => r);
    } else {
        return [];
    }
    
    return sessionRoles.filter(role => sessionAssignments[role] === userName);
}

async function reloadData() {
    isDataLoaded = false;
    return await loadAirtableData();
}

console.log('📦 Data Manager загружен');

