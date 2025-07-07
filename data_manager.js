/**
 * NEVESOMO Шифты 2025 - Менеджер данных
 * @author Igor Konovalchik
 * @version 2.0
 */

// ============================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ДАННЫХ
// ============================================================================

/** @type {Array<Object>} Список участников */
let participants = [];

/** @type {Object.<string, Object>} Информация о ролях */
let rolesInfo = {};

/** @type {Object.<string, Object>} Группы ролей */
let roleGroups = {};

/** @type {Object.<string, Array>} Расписание сессий */
let schedule = {};

/** @type {Array<string>} Все доступные роли */
let allRoles = [];

/** @type {Object} Настройки приложения */
let appSettings = {};

/** @type {Object.<string, Object>} Назначения участников на роли */
let assignments = {};

// ============================================================================
// СОСТОЯНИЕ ЗАГРУЗКИ
// ============================================================================

/** @type {boolean} Флаг загрузки данных */
let isDataLoaded = false;

/** @type {boolean} Флаг процесса загрузки */
let isDataLoading = false;

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

const ROLE_CATEGORIES = {
    BANKING: 'banking',
    CARE: 'care',
    LOUNGE: 'lounge',
    KITCHEN: 'kitchen',
    OTHER: 'other'
};

const CATEGORY_NAMES = {
    [ROLE_CATEGORIES.BANKING]: 'Банные',
    [ROLE_CATEGORIES.CARE]: 'Забота',
    [ROLE_CATEGORIES.LOUNGE]: 'Лаунж',
    [ROLE_CATEGORIES.KITCHEN]: 'Кухня',
    [ROLE_CATEGORIES.OTHER]: 'Прочее'
};

const FALLBACK_ROLES = {
    [ROLE_CATEGORIES.BANKING]: ['Главный банный мастер', 'Пармастер 2', 'Источник/Водовоз/Тех.гид'],
    [ROLE_CATEGORIES.CARE]: ['Гриттер 1', 'Гостевая Забота'],
    [ROLE_CATEGORIES.LOUNGE]: ['Любовь+Забота - 1', 'Любовь+Забота+Мастер класс'],
    [ROLE_CATEGORIES.KITCHEN]: ['Поваренок'],
    [ROLE_CATEGORIES.OTHER]: ['Музыка, ритм, голос', 'Страхующий/Уют']
};

// ============================================================================
// ФУНКЦИИ СОСТОЯНИЯ ЗАГРУЗКИ
// ============================================================================

/**
 * Показывает состояние загрузки
 */
function showLoadingState() {
    const container = document.getElementById('schedule');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="font-size: 2em; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 1.2em; color: var(--text-secondary);">Загружаем данные из Airtable...</div>
        </div>
    `;
}

/**
 * Показывает состояние ошибки
 * @param {string} errorMessage - Сообщение об ошибке
 */
function showErrorState(errorMessage) {
    const container = document.getElementById('schedule');
    if (!container) return;
    
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

// ============================================================================
// ЗАГРУЗКА ДАННЫХ ИЗ AIRTABLE
// ============================================================================

/**
 * Загружает все данные из Airtable
 * @async
 * @returns {Promise<void>}
 */
async function loadAirtableData() {
    if (isDataLoading) return;
    
    isDataLoading = true;
    
    try {
        console.log('Загружаем данные из Airtable...');
        
        if (!window.airtableService) {
            throw new Error('Airtable service не загружен');
        }
        
        const data = await window.airtableService.getAllData();
        
        // Обрабатываем данные
        processParticipants(data.participants);
        processRoles(data.roles);
        processSchedule(data.schedule);
        processSettings(data.settings);
        
        // Загружаем назначения после того, как все роли готовы
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
        throw error;
    } finally {
        isDataLoading = false;
    }
}

/**
 * Обрабатывает данные участников
 * @param {Array<Object>} participantsData - Данные участников
 */
function processParticipants(participantsData) {
    participants.length = 0;
    participants.push(...participantsData.map(p => ({
        name: p.name,
        telegram: p.telegram,
        telegramId: p.telegramId,
        isAdmin: p.isAdmin,
        bathExperience: p.bathExperience
    })));
}

/**
 * Обрабатывает данные ролей
 * @param {Array<Object>} rolesData - Данные ролей
 */
function processRoles(rolesData) {
    // Очищаем существующие роли
    Object.keys(rolesInfo).forEach(key => delete rolesInfo[key]);
    
    const validRoles = [];
    
    rolesData.forEach(role => {
        if (role.isActive && role.name) {
            rolesInfo[role.name] = {
                icon: role.icon || '🔥',
                description: role.description || '',
                instructionUrl: role.instructionUrl || '',
                category: role.category || ROLE_CATEGORIES.OTHER
            };
            validRoles.push(role.name);
            console.log(`✅ Загружена роль: "${role.name}" (${role.category})`);
        }
    });
    
    // Группируем роли по категориям
    createRoleGroups(rolesData);
    
    // Обновляем список всех ролей
    updateAllRoles();
}

/**
 * Создает группы ролей
 * @param {Array<Object>} rolesData - Данные ролей
 */
function createRoleGroups(rolesData) {
    // Очищаем существующие группы
    Object.keys(roleGroups).forEach(key => delete roleGroups[key]);
    
    const rolesByCategory = {};
    
    // Сначала группируем по категориям из данных
    rolesData.forEach(role => {
        if (role.isActive && role.name) {
            const category = role.category || ROLE_CATEGORIES.OTHER;
            if (!rolesByCategory[category]) {
                rolesByCategory[category] = [];
            }
            rolesByCategory[category].push(role.name);
        }
    });
    
    // Если нет ролей из БД, используем статичный fallback
    if (Object.keys(rolesByCategory).length === 0) {
        console.warn('⚠️ Роли не загружены из Airtable, используем fallback');
        Object.assign(rolesByCategory, FALLBACK_ROLES);
    }
    
    // Создаем roleGroups с красивыми названиями
    Object.entries(rolesByCategory).forEach(([category, roles]) => {
        roleGroups[category] = {
            name: CATEGORY_NAMES[category] || category,
            roles: roles
        };
        
        console.log(`📂 Группа "${CATEGORY_NAMES[category] || category}": ${roles.length} ролей`);
    });
}

/**
 * Обновляет список всех ролей
 */
function updateAllRoles() {
    allRoles.length = 0;
    Object.values(roleGroups).forEach(group => {
        allRoles.push(...group.roles);
    });
    
    console.log(`📋 Всего ролей: ${allRoles.length}`);
    console.log('🔍 Список всех ролей:', allRoles);
}

/**
 * Обрабатывает данные расписания
 * @param {Array<Object>} scheduleData - Данные расписания
 */
function processSchedule(scheduleData) {
    // Очищаем существующее расписание
    Object.keys(schedule).forEach(key => delete schedule[key]);
    
    scheduleData.forEach(session => {
        const dateKey = session.date;
        if (!schedule[dateKey]) {
            schedule[dateKey] = [];
        }
        
        schedule[dateKey].push({
            time: session.startTime,
            endTime: session.endTime,
            sessionNum: session.sessionNumber,
            status: session.status,
            type: session.type,
            availableRoles: session.availableRoles,
            slotLink: session.slotLink || null
        });
        
        console.log(`📅 Сессия ${session.startTime} ${dateKey}: роли из базы: "${session.availableRoles}"`);
    });
}

/**
 * Обрабатывает настройки приложения
 * @param {Object} settingsData - Данные настроек
 */
function processSettings(settingsData) {
    // Очищаем существующие настройки
    Object.keys(appSettings).forEach(key => delete appSettings[key]);
    Object.assign(appSettings, settingsData);
}

// ============================================================================
// ЗАГРУЗКА НАЗНАЧЕНИЙ
// ============================================================================

/**
 * Загружает назначения участников
 * @param {Array<Object>} assignmentsData - Данные назначений
 * @async
 * @returns {Promise<void>}
 */
async function loadAssignments(assignmentsData) {
    // Очищаем все существующие assignments
    Object.keys(assignments).forEach(key => delete assignments[key]);
    
    if (!assignmentsData || assignmentsData.length === 0) {
        console.log('📝 Назначений не найдено, инициализируем пустые слоты');
        initializeEmptyAssignments();
        return;
    }
    
    console.log(`📝 Загружаем ${assignmentsData.length} назначений...`);
    
    assignmentsData.forEach(assignment => {
        const sessionKey = `${assignment.slotDate}_${assignment.slotTime}`;
        
        if (!assignments[sessionKey]) {
            assignments[sessionKey] = {};
        }
        
        assignments[sessionKey][assignment.roleName] = assignment.participantName;
        
        // Сохраняем комментарии если есть
        if (assignment.comment) {
            if (!window.assignmentComments) window.assignmentComments = {};
            if (!window.assignmentComments[sessionKey]) window.assignmentComments[sessionKey] = {};
            window.assignmentComments[sessionKey][assignment.roleName] = {
                comment: assignment.comment
            };
        }
    });
    
    console.log(`✅ Загружено ${Object.keys(assignments).length} сессий с назначениями`);
}

/**
 * Инициализирует пустые назначения для всех сессий
 */
function initializeEmptyAssignments() {
    Object.keys(schedule).forEach(day => {
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            assignments[sessionKey] = {};
            
            // Инициализируем пустые слоты для всех ролей
            allRoles.forEach(role => {
                assignments[sessionKey][role] = null;
            });
        });
    });
}

// ============================================================================
// СОХРАНЕНИЕ НАЗНАЧЕНИЙ
// ============================================================================

/**
 * Сохраняет назначение в Airtable
 * @param {string} participantName - Имя участника
 * @param {string} roleName - Название роли
 * @param {string} slotDate - Дата слота
 * @param {string} slotTime - Время слота
 * @param {string} comment - Комментарий
 * @async
 * @returns {Promise<void>}
 */
async function saveAssignmentToAirtable(participantName, roleName, slotDate, slotTime, comment = '') {
    try {
        await window.airtableService.createAssignment({
            participantName,
            roleName,
            slotDate,
            slotTime,
            comment
        });
        
        console.log(`✅ Назначение сохранено: ${participantName} -> ${roleName} (${slotDate} ${slotTime})`);
    } catch (error) {
        console.error('❌ Ошибка сохранения назначения:', error);
        throw error;
    }
}

/**
 * Удаляет назначение из Airtable
 * @param {string} participantName - Имя участника
 * @param {string} roleName - Название роли
 * @param {string} slotDate - Дата слота
 * @param {string} slotTime - Время слота
 * @async
 * @returns {Promise<void>}
 */
async function removeAssignmentFromAirtable(participantName, roleName, slotDate, slotTime) {
    try {
        const assignments = await window.airtableService.getAssignments();
        const assignment = assignments.find(a => 
            a.participantName === participantName && 
            a.roleName === roleName && 
            a.slotDate === slotDate && 
            a.slotTime === slotTime
        );
        
        if (assignment) {
            await window.airtableService.deleteAssignment(assignment.id);
            console.log(`✅ Назначение удалено: ${participantName} -> ${roleName} (${slotDate} ${slotTime})`);
        }
    } catch (error) {
        console.error('❌ Ошибка удаления назначения:', error);
        throw error;
    }
}

// ============================================================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С НАЗНАЧЕНИЯМИ
// ============================================================================

/**
 * Проверяет, занят ли пользователь в сессии
 * @param {string} sessionKey - Ключ сессии
 * @param {string} userName - Имя пользователя
 * @returns {boolean} True если пользователь занят
 */
function isUserBusyInSession(sessionKey, userName) {
    const sessionAssignments = assignments[sessionKey];
    if (!sessionAssignments) return false;
    
    return Object.values(sessionAssignments).some(assignedUser => 
        assignedUser === userName
    );
}

/**
 * Получает роли пользователя в сессии
 * @param {string} sessionKey - Ключ сессии
 * @param {string} userName - Имя пользователя
 * @returns {Array<string>} Массив ролей пользователя
 */
function getUserRolesInSession(sessionKey, userName) {
    const sessionAssignments = assignments[sessionKey];
    if (!sessionAssignments) return [];
    
    return Object.entries(sessionAssignments)
        .filter(([role, assignedUser]) => assignedUser === userName)
        .map(([role]) => role);
}

// ============================================================================
// ПЕРЕЗАГРУЗКА ДАННЫХ
// ============================================================================

/**
 * Перезагружает все данные
 * @async
 * @returns {Promise<void>}
 */
async function reloadData() {
    console.log('🔄 Перезагружаем данные...');
    
    isDataLoaded = false;
    isDataLoading = false;
    
    try {
        await loadAirtableData();
        console.log('✅ Данные успешно перезагружены');
    } catch (error) {
        console.error('❌ Ошибка перезагрузки данных:', error);
        throw error;
    }
}

// ============================================================================
// ЭКСПОРТ ФУНКЦИЙ
// ============================================================================

// Делаем функции доступными глобально
window.loadAirtableData = loadAirtableData;
window.reloadData = reloadData;
window.saveAssignmentToAirtable = saveAssignmentToAirtable;
window.removeAssignmentFromAirtable = removeAssignmentFromAirtable;
window.isUserBusyInSession = isUserBusyInSession;
window.getUserRolesInSession = getUserRolesInSession;

// Экспортируем переменные для других модулей
window.participants = participants;
window.rolesInfo = rolesInfo;
window.roleGroups = roleGroups;
window.schedule = schedule;
window.allRoles = allRoles;
window.appSettings = appSettings;
window.assignments = assignments;
window.isDataLoaded = isDataLoaded;

