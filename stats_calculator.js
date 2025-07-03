// stats-calculator.js - Подсчет статистики и аналитики приложения NEVESOMO
// Отвечает за все расчеты статистики, проверки ролей и анализ данных

import { 
    participants,
    roleGroups,
    schedule,
    allRoles,
    assignments
} from './core/data-manager.js';

/* === СТАТИСТИКА ПО КАТЕГОРИЯМ === */

/**
 * Получает статистику пользователя по категориям ролей
 * @param {string} userName - имя пользователя
 * @returns {Object} - объект со статистикой по категориям
 */
export function getUserCategoryStats(userName) {
    const stats = {};
    
    // Инициализируем счетчики для всех категорий
    Object.values(roleGroups).forEach(group => {
        stats[group.name] = 0;
    });
    
    // Подсчитываем назначения пользователя по категориям
    Object.keys(assignments).forEach(sessionKey => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day]?.find(s => s.time === time);
        
        if (!session) return;
        
        let sessionRoles = allRoles;
        if (session.roles) {
            sessionRoles = session.roles;
        }
        
        sessionRoles.forEach(role => {
            if (assignments[sessionKey][role] === userName) {
                // Находим к какой категории принадлежит роль
                Object.entries(roleGroups).forEach(([groupKey, group]) => {
                    if (group.roles.includes(role)) {
                        stats[group.name]++;
                    }
                });
            }
        });
    });
    
    return stats;
}

/**
 * Получает общую статистику всех участников
 * @returns {Array} - массив объектов со статистикой участников
 */
export function getAllUsersStats() {
    return participants.map(participant => {
        let shiftsCount = 0;
        const categoryStats = getUserCategoryStats(participant.name);
        
        // Подсчитываем общее количество шифтов
        Object.keys(assignments).forEach(sessionKey => {
            const [day, time] = sessionKey.split('_');
            const session = schedule[day]?.find(s => s.time === time);
            
            if (!session) return;
            
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
            categories: categoryStats,
            participant: participant
        };
    });
}

/* === ПРОВЕРКИ РОЛЕЙ === */

/**
 * Проверяет, есть ли у пользователя роли в лаунже
 * @param {string} userName - имя пользователя
 * @returns {boolean}
 */
export function hasLoungeRole(userName) {
    if (!userName || !roleGroups.lounge) return false;
    
    for (const [sessionKey, sessionRoles] of Object.entries(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.lounge.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Проверяет, есть ли у пользователя банные роли
 * @param {string} userName - имя пользователя
 * @returns {boolean}
 */
export function hasBankingRole(userName) {
    if (!userName || !roleGroups.banking) return false;
    
    for (const [sessionKey, sessionRoles] of Object.entries(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.banking.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Получает все роли пользователя
 * @param {string} userName - имя пользователя
 * @returns {Array} - массив объектов с информацией о ролях
 */
export function getUserAllRoles(userName) {
    const userRoles = [];
    
    Object.entries(assignments).forEach(([sessionKey, sessionRoles]) => {
        const [day, time] = sessionKey.split('_');
        const session = schedule[day]?.find(s => s.time === time);
        
        if (!session) return;
        
        Object.entries(sessionRoles).forEach(([role, assignedUser]) => {
            if (assignedUser === userName) {
                // Определяем категорию роли
                let category = 'Прочее';
                Object.entries(roleGroups).forEach(([groupKey, group]) => {
                    if (group.roles.includes(role)) {
                        category = group.name;
                    }
                });
                
                userRoles.push({
                    role,
                    category,
                    sessionKey,
                    day,
                    time,
                    endTime: session.endTime,
                    sessionType: session.type,
                    sessionNum: session.sessionNum
                });
            }
        });
    });
    
    // Сортируем по дню и времени
    userRoles.sort((a, b) => {
        const dayA = new Date(a.day + 'T00:00:00');
        const dayB = new Date(b.day + 'T00:00:00');
        if (dayA.getTime() !== dayB.getTime()) {
            return dayA.getTime() - dayB.getTime();
        }
        return a.time.localeCompare(b.time);
    });
    
    return userRoles;
}

/* === ЛОГИКА ПАРНЫХ СЛОТОВ === */

/**
 * Получает парный слот для мастер-класса (предыдущий или следующий час)
 * @param {string} sessionKey - ключ сессии
 * @returns {string|null} - ключ парного слота или null
 */
export function getMasterClassPairSlot(sessionKey) {
    const [day, time] = sessionKey.split('_');
    const currentHour = parseInt(time.split(':')[0]);
    
    // Ищем соседний слот (предыдущий или следующий час)
    const prevTime = `${String(currentHour - 1).padStart(2, '0')}:00`;
    const nextTime = `${String(currentHour + 1).padStart(2, '0')}:00`;
    
    const prevKey = `${day}_${prevTime}`;
    const nextKey = `${day}_${nextTime}`;
    
    if (assignments[prevKey]) return prevKey;
    if (assignments[nextKey]) return nextKey;
    
    return null;
}

/**
 * Проверяет, является ли роль парной (требует соседний слот)
 * @param {string} role - название роли
 * @returns {boolean}
 */
export function isPairRole(role) {
    const pairRoles = ['Мастер класс'];
    return pairRoles.includes(role);
}

/* === АНАЛИЗ ЗАПОЛНЕННОСТИ === */

/**
 * Получает статистику заполненности по дням
 * @returns {Object} - статистика по дням
 */
export function getFillStatsByDay() {
    const dayStats = {};
    
    Object.keys(schedule).forEach(day => {
        let totalSlots = 0;
        let filledSlots = 0;
        
        schedule[day].forEach(session => {
            const sessionKey = `${day}_${session.time}`;
            const sessionAssignments = assignments[sessionKey];
            
            let sessionRoles = allRoles;
            if (session.roles) {
                sessionRoles = session.roles;
            }
            
            sessionRoles.forEach(role => {
                totalSlots++;
                if (sessionAssignments[role]) {
                    filledSlots++;
                }
            });
        });
        
        dayStats[day] = {
            totalSlots,
            filledSlots,
            percentage: totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0,
            sessionsCount: schedule[day].length
        };
    });
    
    return dayStats;
}

/**
 * Получает статистику заполненности по категориям ролей
 * @returns {Object} - статистика по категориям
 */
export function getFillStatsByCategory() {
    const categoryStats = {};
    
    // Инициализируем счетчики
    Object.entries(roleGroups).forEach(([groupKey, group]) => {
        categoryStats[group.name] = {
            totalSlots: 0,
            filledSlots: 0,
            percentage: 0
        };
    });
    
    // Подсчитываем статистику
    Object.values(assignments).forEach(sessionAssignments => {
        Object.entries(sessionAssignments).forEach(([role, assignedUser]) => {
            // Находим категорию роли
            Object.entries(roleGroups).forEach(([groupKey, group]) => {
                if (group.roles.includes(role)) {
                    categoryStats[group.name].totalSlots++;
                    if (assignedUser) {
                        categoryStats[group.name].filledSlots++;
                    }
                }
            });
        });
    });
    
    // Вычисляем проценты
    Object.values(categoryStats).forEach(stats => {
        if (stats.totalSlots > 0) {
            stats.percentage = Math.round((stats.filledSlots / stats.totalSlots) * 100);
        }
    });
    
    return categoryStats;
}

/* === АНАЛИЗ НАГРУЗКИ === */

/**
 * Получает топ самых загруженных участников
 * @param {number} limit - количество участников в топе
 * @returns {Array} - массив участников с количеством шифтов
 */
export function getTopBusiestParticipants(limit = 5) {
    const userStats = getAllUsersStats();
    
    return userStats
        .sort((a, b) => b.shifts - a.shifts)
        .slice(0, limit)
        .map(user => ({
            name: user.name,
            shifts: user.shifts,
            categories: user.categories
        }));
}

/**
 * Получает участников с недостаточным количеством шифтов
 * @param {number} minShifts - минимальное количество шифтов
 * @returns {Array} - массив участников
 */
export function getUnderworkedParticipants(minShifts = 8) {
    const userStats = getAllUsersStats();
    
    return userStats
        .filter(user => user.shifts < minShifts)
        .sort((a, b) => a.shifts - b.shifts)
        .map(user => ({
            name: user.name,
            shifts: user.shifts,
            needed: minShifts - user.shifts,
            categories: user.categories
        }));
}

/**
 * Анализирует распределение ролей среди участников
 * @returns {Object} - анализ распределения
 */
export function analyzeRoleDistribution() {
    const roleStats = {};
    
    // Инициализируем счетчики для всех ролей
    allRoles.forEach(role => {
        roleStats[role] = {
            totalSlots: 0,
            filledSlots: 0,
            uniqueUsers: new Set(),
            percentage: 0
        };
    });
    
    // Подсчитываем статистику
    Object.values(assignments).forEach(sessionAssignments => {
        Object.entries(sessionAssignments).forEach(([role, assignedUser]) => {
            if (roleStats[role]) {
                roleStats[role].totalSlots++;
                if (assignedUser) {
                    roleStats[role].filledSlots++;
                    roleStats[role].uniqueUsers.add(assignedUser);
                }
            }
        });
    });
    
    // Вычисляем проценты и конвертируем Set в число
    Object.values(roleStats).forEach(stats => {
        if (stats.totalSlots > 0) {
            stats.percentage = Math.round((stats.filledSlots / stats.totalSlots) * 100);
        }
        stats.uniqueUsersCount = stats.uniqueUsers.size;
        delete stats.uniqueUsers; // Удаляем Set для чистоты данных
    });
    
    return roleStats;
}

/* === ВРЕМЕННАЯ АНАЛИТИКА === */

/**
 * Находит самые популярные временные слоты
 * @returns {Array} - отсортированный массив временных слотов
 */
export function getPopularTimeSlots() {
    const timeStats = {};
    
    Object.entries(assignments).forEach(([sessionKey, sessionAssignments]) => {
        const [day, time] = sessionKey.split('_');
        
        if (!timeStats[time]) {
            timeStats[time] = {
                time,
                totalSlots: 0,
                filledSlots: 0,
                percentage: 0
            };
        }
        
        Object.values(sessionAssignments).forEach(assignedUser => {
            timeStats[time].totalSlots++;
            if (assignedUser) {
                timeStats[time].filledSlots++;
            }
        });
    });
    
    // Вычисляем проценты и сортируем
    Object.values(timeStats).forEach(stats => {
        if (stats.totalSlots > 0) {
            stats.percentage = Math.round((stats.filledSlots / stats.totalSlots) * 100);
        }
    });
    
    return Object.values(timeStats).sort((a, b) => b.percentage - a.percentage);
}

/* === ЭКСПОРТ ФУНКЦИИ В ГЛОБАЛЬНУЮ ОБЛАСТЬ === */

// Делаем функцию getUserCategoryStats доступной глобально для других модулей
window.getUserCategoryStats = getUserCategoryStats;

console.log('📊 Stats Calculator загружен');