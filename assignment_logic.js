// assignment-logic.js - Логика назначений ролей в приложении NEVESOMO
// Отвечает за всю бизнес-логику работы с назначениями пользователей на роли

import { 
    participants,
    roleGroups,
    schedule,
    allRoles,
    assignments,
    saveAssignmentToAirtable,
    removeAssignmentFromAirtable,
    isUserBusyInSession,
    getUserRolesInSession,
    reloadData
} from './core/data-manager.js';

import { 
    renderSchedule,
    renderParticipantsList
} from './ui/ui-renderer.js';

/* === ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ЛОГИКИ === */
let currentPopupSession = null;
let currentPopupRole = null;

/* === ОСНОВНЫЕ ФУНКЦИИ НАЗНАЧЕНИЙ === */

/**
 * Обрабатывает клик по слоту роли
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - название роли
 * @param {string} currentMode - режим (admin/user)
 * @param {string} currentUser - текущий пользователь
 */
export function handleRoleSlotClick(sessionKey, role, currentMode, currentUser) {
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        // Проверяем специальные правила для мастер-класса
        if (role === 'Мастер класс') {
            if (!hasLoungeRole(currentUser)) {
                alert('Мастер-класс может быть выбран только участниками, которые уже записались в категорию "Лаунж". Сначала выберите себе шифт в лаунже!');
                return;
            }
        }
        
        toggleUserAssignment(sessionKey, role, currentUser);
    }
}

/**
 * Переключает назначение пользователя на роль
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - название роли
 * @param {string} currentUser - текущий пользователь
 */
export async function toggleUserAssignment(sessionKey, role, currentUser) {
    if (!currentUser) {
        alert('Выберите участника');
        return;
    }
    
    const currentAssignment = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role, currentUser);
    
    if (isBlocked && currentAssignment !== currentUser) {
        alert('У вас уже есть другая роль в это время!');
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    
    // Запоминаем состояние раскрытых сессий
    const expandedSessions = Array.from(document.querySelectorAll('.session.expanded'))
        .map(el => el.getAttribute('data-session'));
    
    showLoader(currentAssignment === currentUser ? 'Удаление шифта...' : 'Сохранение шифта...');
    
    try {
        if (currentAssignment === currentUser) {
            // Снимаем назначение
            await removeAssignmentFromAirtable(currentUser, role, day, time);
            
            if (role === 'Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await removeAssignmentFromAirtable(currentUser, role, pairDay, pairTime);
                    assignments[pairSlot][role] = null;
                }
            }
            assignments[sessionKey][role] = null;
            
        } else if (currentAssignment === null) {
            // Назначаем
            await saveAssignmentToAirtable(currentUser, role, day, time);
            
            if (role === 'Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await saveAssignmentToAirtable(currentUser, role, pairDay, pairTime);
                    assignments[pairSlot][role] = currentUser;
                }
            }
            assignments[sessionKey][role] = currentUser;
            
        } else {
            alert('Этот слот уже занят. Обратитесь к администратору.');
            hideLoader();
            return;
        }
        
        // Уведомляем другие модули об изменении
        window.dispatchEvent(new CustomEvent('assignmentsChanged', {
            detail: { sessionKey, role, user: currentUser }
        }));
        
        // Восстанавливаем раскрытые сессии
        setTimeout(() => {
            expandedSessions.forEach(sessionKey => {
                const element = document.querySelector(`[data-session="${sessionKey}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            });
        }, 50);
        
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        await reloadData();
        window.dispatchEvent(new CustomEvent('dataReloaded'));
    } finally {
        hideLoader();
    }
}

/**
 * Выбор участника админом
 * @param {string} participantName - имя участника (или null для очистки)
 * @param {string} currentMode - текущий режим
 * @param {string} currentUser - текущий пользователь
 */
export async function selectParticipant(participantName, currentMode, currentUser) {
    if (!currentPopupSession || !currentPopupRole) return;
    
    const role = currentPopupRole;
    const sessionKey = currentPopupSession;
    const [day, time] = sessionKey.split('_');
    const currentAssignment = assignments[sessionKey][role];
    
    // Запоминаем состояние раскрытых сессий
    const expandedSessions = Array.from(document.querySelectorAll('.session.expanded'))
        .map(el => el.getAttribute('data-session'));
    
    showLoader('Обновление назначения...');
    
    try {
        // Удаляем старое назначение если было
        if (currentAssignment && currentAssignment !== participantName) {
            await removeAssignmentFromAirtable(currentAssignment, role, day, time);
        }
        
        // Добавляем новое назначение если указан участник
        if (participantName) {
            await saveAssignmentToAirtable(participantName, role, day, time);
        }
        
        assignments[sessionKey][role] = participantName;
        
        // Уведомляем другие модули об изменении
        window.dispatchEvent(new CustomEvent('assignmentsChanged', {
            detail: { sessionKey, role, user: participantName }
        }));
        
        // Восстанавливаем раскрытые сессии
        setTimeout(() => {
            expandedSessions.forEach(sessionKey => {
                const element = document.querySelector(`[data-session="${sessionKey}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            });
        }, 50);
        
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        await reloadData();
        window.dispatchEvent(new CustomEvent('dataReloaded'));
    } finally {
        hideLoader();
    }
    
    closeParticipantPopup();
}

/**
 * Автоматическое заполнение сессии (только для админа)
 * @param {string} sessionKey - ключ сессии
 */
export async function autoFillSession(sessionKey) {
    if (!confirm('Вы уверены, что хотите автоматически заполнить эту сессию?')) {
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day].find(s => s.time === time);
    const sessionAssignments = assignments[sessionKey];
    
    // Определяем роли для сессии
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    const emptyRoles = sessionRoles.filter(role => !sessionAssignments[role]);
    
    if (emptyRoles.length === 0) {
        alert('Все роли уже заполнены!');
        return;
    }
    
    showLoader('Автозаполнение сессии...');
    
    try {
        const userShiftCount = {};
        participants.forEach(p => userShiftCount[p.name] = 0);
        
        // Подсчитываем текущие назначения
        Object.values(assignments).forEach(sessionData => {
            Object.values(sessionData).forEach(user => {
                if (user && userShiftCount.hasOwnProperty(user)) {
                    userShiftCount[user]++;
                }
            });
        });
        
        // Назначаем роли
        for (const role of emptyRoles) {
            const availableUsers = participants.filter(p => 
                !isUserBusyInSession(sessionKey, p.name) &&
                (role !== 'Главный банный мастер' || p.bathExperience)
            );
            
            if (availableUsers.length > 0) {
                const minShifts = Math.min(...availableUsers.map(u => userShiftCount[u.name]));
                const leastBusyUsers = availableUsers.filter(u => userShiftCount[u.name] === minShifts);
                const selectedUser = leastBusyUsers[Math.floor(Math.random() * leastBusyUsers.length)];
                
                // Сохраняем в Airtable
                await saveAssignmentToAirtable(selectedUser.name, role, day, time);
                
                assignments[sessionKey][role] = selectedUser.name;
                userShiftCount[selectedUser.name]++;
            }
        }
        
        // Уведомляем другие модули об изменении
        window.dispatchEvent(new CustomEvent('assignmentsChanged', {
            detail: { sessionKey, type: 'autoFill' }
        }));
        
        alert('Сессия автоматически заполнена!');
        
    } catch (error) {
        console.error('Ошибка автозаполнения:', error);
        alert('Ошибка при автозаполнении. Попробуйте еще раз.');
        // Перезагружаем данные в случае ошибки
        await reloadData();
        window.dispatchEvent(new CustomEvent('dataReloaded'));
    } finally {
        hideLoader();
    }
}

/* === ФУНКЦИИ ПРОВЕРОК И ВАЛИДАЦИИ === */

/**
 * Проверяет блокировку слота для пользователя
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - роль
 * @param {string} currentUser - текущий пользователь
 * @returns {boolean} - заблокирован ли слот
 */
export function isSlotBlocked(sessionKey, role, currentUser) {
    if (!currentUser) return false;
    
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

/**
 * Проверяет, есть ли у пользователя роли в лаунже
 * @param {string} userName - имя пользователя
 * @returns {boolean}
 */
export function hasLoungeRole(userName) {
    for (const [sessionKey, sessionRoles] of Object.entries(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.lounge?.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Получает парный слот для мастер-класса (предыдущий или следующий час)
 * @param {string} sessionKey - ключ сессии
 * @returns {string|null} - ключ парного слота или null
 */
export function getMasterClassPairSlot(sessionKey) {
    const [day, time] = sessionKey.split('_');
    const currentHour = parseInt(time.split(':')[0]);
    
    // Ищем соседний слот (предыдущий или следующий час)
    const prevTime = `${currentHour - 1}:00`;
    const nextTime = `${currentHour + 1}:00`;
    
    const prevKey = `${day}_${prevTime}`;
    const nextKey = `${day}_${nextTime}`;
    
    if (assignments[prevKey]) return prevKey;
    if (assignments[nextKey]) return nextKey;
    
    return null;
}

/* === ФУНКЦИИ УПРАВЛЕНИЯ ПОПАПАМИ === */

/**
 * Открывает попап выбора участника для админа
 * @param {string} sessionKey - ключ сессии
 * @param {string} role - роль
 */
export function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];
    
    const html = renderParticipantsList(currentAssignment);
    participantsList.innerHTML = html;
    document.getElementById('participantPopup').classList.add('show');
}

/**
 * Закрывает попап выбора участника
 */
export function closeParticipantPopup() {
    document.getElementById('participantPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

/* === ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ONCLICK === */

// Экспортируем функции в глобальную область для onclick
window.handleRoleSlotClick = (sessionKey, role) => {
    const currentMode = window.currentMode || 'user';
    const currentUser = window.currentUser || '';
    handleRoleSlotClick(sessionKey, role, currentMode, currentUser);
};

window.selectParticipant = (participantName) => {
    const currentMode = window.currentMode || 'user';
    const currentUser = window.currentUser || '';
    selectParticipant(participantName, currentMode, currentUser);
};

window.autoFillSession = autoFillSession;

window.closeParticipantPopup = closeParticipantPopup;

/* === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ === */

/**
 * Показывает лоадер
 * @param {string} text - текст загрузки
 */
function showLoader(text = 'Загрузка...') {
    let loader = document.getElementById('loadingOverlay');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loadingOverlay';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    loader.querySelector('.loading-text').textContent = text;
    loader.classList.add('show');
}

/**
 * Скрывает лоадер
 */
function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.remove('show');
    }
}

console.log('⚙️ Assignment Logic загружен');