// assignment-logic.js - Логика назначений (без ES6 модулей)

let pendingAssignment = null; // Для хранения данных о назначении в ожидании комментария

// Делаем переменные глобальными для синхронизации между модулями
window.pendingAssignment = null;
window.currentPopupSession = null;
window.currentPopupRole = null;

if (typeof window.pendingAssignment === 'undefined') {
    window.pendingAssignment = null;
}
if (typeof window.currentPopupSession === 'undefined') {
    window.currentPopupSession = null; 
}
if (typeof window.currentPopupRole === 'undefined') {
    window.currentPopupRole = null;
}

// Функция синхронизации глобальных переменных
function syncGlobalState() {
    window.pendingAssignment = pendingAssignment;
    window.currentPopupSession = currentPopupSession;
    window.currentPopupRole = currentPopupRole;
}

/* === ОСНОВНЫЕ ФУНКЦИИ НАЗНАЧЕНИЙ === */
function handleRoleSlotClick(sessionKey, role) {
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        const assignedUser = assignments[sessionKey][role];
        
        if (assignedUser === currentUser) {
            // Пользователь кликнул на свой слот - открываем попап редактирования
            openEditShiftPopup(sessionKey, role);
        } else if (assignedUser === null) {
            // Свободный слот - открываем попап бронирования
            openBookShiftPopup(sessionKey, role);
        } else {
            showNotification('Этот слот уже занят другим участником');
        }
    }
}


function isSlotBlocked(sessionKey, roleToCheck) {
    if (currentMode !== 'user' || !currentUser) return false;
    
    const sessionTime = sessionKey.split('_')[1];
    
    // Проверяем все сессии в это же время
    for (const [checkSessionKey, sessionRoles] of Object.entries(assignments)) {
        const checkTime = checkSessionKey.split('_')[1];
        if (checkTime === sessionTime && checkSessionKey !== sessionKey) {
            // Проверяем есть ли у пользователя роли в других сессиях в это время
            for (const [role, assignedUser] of Object.entries(sessionRoles)) {
                if (assignedUser === currentUser) {
                    return true; // Блокируем - пользователь уже занят в это время
                }
            }
        }
    }
    
    return false;
}

// ИСПРАВЛЕНО: Улучшенная проверка лаунж-ролей
function hasLoungeRole(userName) {
    if (!userName || !roleGroups.lounge) {
        return false;
    }
    
    for (const sessionRoles of Object.values(assignments)) {
        for (const [role, assignedUser] of Object.entries(sessionRoles)) {
            if (assignedUser === userName && roleGroups.lounge.roles.includes(role)) {
                return true;
            }
        }
    }
    return false;
}

// Отладочная функция для проверки ролей
function debugRoleAssignment(sessionKey, role) {
    console.log('🔍 Debug роли:', {
        sessionKey,
        role,
        currentUser,
        assignments: assignments[sessionKey],
        allRoles,
        roleGroups
    });
    
    // Проверяем, есть ли роль в allRoles
    if (!allRoles.includes(role)) {
        console.error(`❌ Роль "${role}" не найдена в allRoles:`, allRoles);
    }
    
    // Проверяем, есть ли роль в assignments для этой сессии
    if (!assignments[sessionKey] || assignments[sessionKey][role] === undefined) {
        console.error(`❌ Роль "${role}" не найдена в assignments для сессии ${sessionKey}`);
        console.log('Доступные роли в сессии:', Object.keys(assignments[sessionKey] || {}));
    }
    
    // Проверяем, в какой группе роль
    for (const [groupKey, group] of Object.entries(roleGroups)) {
        if (group.roles.includes(role)) {
            console.log(`✅ Роль "${role}" найдена в группе "${group.name}"`);
            break;
        }
    }
}

async function toggleUserAssignment(sessionKey, role) {
    if (!currentUser) {
        showNotification('Выберите участника');
        return;
    }
    
    const currentAssignment = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    
    if (isBlocked && currentAssignment !== currentUser) {
        showNotification('У вас уже есть другая роль в это время!');
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    
    if (currentAssignment === currentUser) {
        // Удаление - показываем подтверждение
        showConfirmation(
            'Удалить шифт?',
            `Вы уверены, что хотите отменить шифт "${role}"?`,
            async () => {
                await removeUserAssignment(sessionKey, role);
            }
        );
    } else if (currentAssignment === null) {
        // Назначение - сохраняем данные и показываем попап комментария
        pendingAssignment = { sessionKey, role, day, time };
        openCommentPopup();
    } else {
        showNotification('Этот слот уже занят. Обратитесь к администратору.');
    }
}

async function completeAssignment(comment = '') {
    if (window.isOfflineMode) {
        showNotification('В офлайн-режиме запись на шифт недоступна!');
        window.pendingAssignment = null;
        return;
    }
    console.log('🚀 completeAssignment вызван:', {
        comment,
        pendingAssignment: window.pendingAssignment,
        currentUser: window.currentUser || currentUser
    });
    
    if (!window.pendingAssignment) {
        console.error('❌ Нет данных о назначении для завершения');
        showNotification('Ошибка: нет данных о назначении');
        return;
    }
    
    const { sessionKey, role, day, time } = window.pendingAssignment;
    const user = window.currentUser || currentUser;
    
    console.log('📝 Завершаем назначение:', { sessionKey, role, day, time, user, comment });
    
    if (!user) {
        console.error('❌ Не выбран пользователь');
        showNotification('Не выбран пользователь');
        window.pendingAssignment = null;
        return;
    }
    
    showLoader('Сохранение шифта...');
    
    try {
        // Сохраняем в Airtable с комментарием
        await saveAssignmentToAirtable(user, role, day, time, comment);
        
        // Обновляем локальные assignments
        assignments[sessionKey][role] = user;
        
        // Сохраняем комментарий локально если есть
        if (comment) {
            if (!window.assignmentComments) window.assignmentComments = {};
            if (!window.assignmentComments[sessionKey]) window.assignmentComments[sessionKey] = {};
            window.assignmentComments[sessionKey][role] = { comment };
        }
        
        renderSchedule();
        updateProgress();
        
        showNotification('Шифт успешно добавлен!');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        showNotification('Ошибка при сохранении. Попробуйте еще раз.');
    } finally {
        hideLoader();
        window.pendingAssignment = null;
    }
}

// ЭКСПОРТИРУЕМ функцию глобально СРАЗУ
// window.completeAssignment = completeAssignment;

async function removeUserAssignment(sessionKey, role) {
    if (window.isOfflineMode) {
        showNotification('В офлайн-режиме удаление шифтов недоступно!');
        return;
    }
    const [day, time] = sessionKey.split('_');
    const expandedSession = document.querySelector('.session.expanded')?.getAttribute('data-session');
    
    showLoader('Удаление шифта...');
    
    try {
        await removeAssignmentFromAirtable(currentUser, role, day, time);
        assignments[sessionKey][role] = null;
        
        // Удаляем комментарий
        if (window.assignmentComments?.[sessionKey]?.[role]) {
            delete window.assignmentComments[sessionKey][role];
        }
        
        renderSchedule();
        updateProgress();
        
        // Восстанавливаем раскрытую сессию
        setTimeout(() => {
            if (expandedSession) {
                const element = document.querySelector(`[data-session="${expandedSession}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            }
        }, 50);
        
        showNotification('Шифт успешно удален!');
        
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification('Ошибка при удалении. Попробуйте еще раз.');
    } finally {
        hideLoader();
    }
}

// Дополнительная функция для проверки загруженных данных
function validateRolesData() {
    console.log('🔍 Проверка загруженных ролей:');
    console.log('allRoles:', allRoles);
    console.log('roleGroups:', roleGroups);
    console.log('assignments keys:', Object.keys(assignments));
    
    // Проверяем, что все роли из групп есть в allRoles
    Object.entries(roleGroups).forEach(([groupKey, group]) => {
        group.roles.forEach(role => {
            if (!allRoles.includes(role)) {
                console.error(`❌ Роль "${role}" из группы "${group.name}" не найдена в allRoles`);
            }
        });
    });
}

// Добавляем вызов проверки после загрузки данных
window.addEventListener('dataLoaded', () => {
    setTimeout(validateRolesData, 1000);
});

async function selectParticipant(participantName) {
    if (!currentPopupSession || !currentPopupRole) return;
    
    const role = currentPopupRole;
    const sessionKey = currentPopupSession;
    const [day, time] = sessionKey.split('_');
    const currentAssignment = assignments[sessionKey][role];
    
    // Запоминаем ТОЛЬКО ОДНУ раскрытую сессию (аккордеон)
    const expandedSession = document.querySelector('.session.expanded')?.getAttribute('data-session');
    
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
        
        renderSchedule();
        updateProgress();
        
        // Восстанавливаем раскрытую сессию (только одну)
        setTimeout(() => {
            if (expandedSession) {
                const element = document.querySelector(`[data-session="${expandedSession}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            }
        }, 50);
        
    } catch (error) {
        console.error('Ошибка обновления назначения:', error);
        await reloadData();
        renderSchedule();
        updateProgress();
    } finally {
        hideLoader();
    }
    
    closeParticipantPopup();
}

async function autoFillSession(sessionKey) {
    if (!confirm('Вы уверены, что хотите автоматически заполнить эту сессию?')) {
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    const session = schedule[day].find(s => s.time === time);
    const sessionAssignments = assignments[sessionKey];
    
    let sessionRoles = allRoles;
    if (session.roles) {
        sessionRoles = session.roles;
    }
    
    const emptyRoles = sessionRoles.filter(role => !sessionAssignments[role]);
    
    if (emptyRoles.length === 0) {
        showNotification('Все роли уже заполнены!');
        return;
    }
    
    // Запоминаем ТОЛЬКО ОДНУ раскрытую сессию (аккордеон)
    const expandedSession = document.querySelector('.session.expanded')?.getAttribute('data-session');
    
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
        
        renderSchedule();
        updateProgress();
        
        // Восстанавливаем раскрытую сессию (только одну)
        setTimeout(() => {
            if (expandedSession) {
                const element = document.querySelector(`[data-session="${expandedSession}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            }
        }, 50);
        
        showNotification('Сессия автоматически заполнена!');
        
    } catch (error) {
        console.error('Ошибка автозаполнения:', error);
        showNotification('Ошибка при автозаполнении. Попробуйте еще раз.');
        await reloadData();
        renderSchedule();
        updateProgress();
    } finally {
        hideLoader();
    }
}

/* === ФУНКЦИИ УПРАВЛЕНИЯ ПОПАПАМИ === */
function openParticipantPopup(sessionKey, role) {
    currentPopupSession = sessionKey;
    currentPopupRole = role;
    
    const participantsList = document.getElementById('participantsList');
    const currentAssignment = assignments[sessionKey][role];
    
    const html = renderParticipantsList(currentAssignment);
    participantsList.innerHTML = html;
    document.getElementById('participantPopup').classList.add('show');
}

function closeParticipantPopup() {
    document.getElementById('participantPopup').classList.remove('show');
    currentPopupSession = null;
    currentPopupRole = null;
}

/* === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ === */
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

function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.remove('show');
    }
}

// Функция получения данных о назначении (включая комментарий)
function getAssignmentData(sessionKey, role) {
    console.log('📖 getAssignmentData вызван:', { sessionKey, role });
    
    // Проверяем есть ли комментарий в локальном хранилище
    if (window.assignmentComments && 
        window.assignmentComments[sessionKey] && 
        window.assignmentComments[sessionKey][role]) {
        
        const data = window.assignmentComments[sessionKey][role];
        console.log('💬 Найден комментарий:', data);
        return data;
    }
    
    console.log('📝 Комментарий не найден, возвращаем пустой');
    return { comment: '' };
}

// Функция удаления назначения пользователя
async function removeUserAssignment(sessionKey, role) {
    console.log('🗑️ removeUserAssignment вызван:', { sessionKey, role });
    
    const [day, time] = sessionKey.split('_');
    const expandedSession = document.querySelector('.session.expanded')?.getAttribute('data-session');
    const currentUserToRemove = window.currentUser || currentUser;
    
    console.log('👤 Удаляем назначение для пользователя:', currentUserToRemove);
    
    showLoader('Удаление шифта...');
    
    try {
        // Удаляем из Airtable
        console.log('💾 Удаляем из Airtable...');
        await removeAssignmentFromAirtable(currentUserToRemove, role, day, time);
        
        // Удаляем из локальных assignments
        assignments[sessionKey][role] = null;
        console.log('✅ Локальное назначение удалено');
        
        // Удаляем комментарий
        if (window.assignmentComments?.[sessionKey]?.[role]) {
            delete window.assignmentComments[sessionKey][role];
            console.log('💬 Комментарий удален');
        }
        
        // Перерисовываем интерфейс
        renderSchedule();
        updateProgress();
        
        // Восстанавливаем раскрытую сессию
        setTimeout(() => {
            if (expandedSession) {
                const element = document.querySelector(`[data-session="${expandedSession}"]`);
                if (element) {
                    element.classList.add('expanded');
                }
            }
        }, 50);
        
        showNotification('Шифт успешно удален!');
        console.log('✅ Шифт успешно удален');
        
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        showNotification('Ошибка при удалении. Попробуйте еще раз.');
    } finally {
        hideLoader();
    }
}

// Функция обновления комментария
async function updateAssignmentComment(sessionKey, role, comment) {
    console.log('💬 updateAssignmentComment вызван:', { sessionKey, role, comment });
    
    // ИСПРАВЛЕНИЕ: Добавляем проверку на null/undefined
    if (!sessionKey || !role) {
        console.error('❌ Некорректные параметры:', { sessionKey, role });
        showNotification('Ошибка: некорректные данные шифта');
        return;
    }
    
    // ИСПРАВЛЕНИЕ: Проверяем что sessionKey содержит '_'
    if (typeof sessionKey !== 'string' || !sessionKey.includes('_')) {
        console.error('❌ Некорректный формат sessionKey:', sessionKey);
        showNotification('Ошибка: некорректный формат данных');
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    
    // ИСПРАВЛЕНИЕ: Проверяем что day и time получены корректно
    if (!day || !time) {
        console.error('❌ Не удалось извлечь день и время:', { day, time, sessionKey });
        showNotification('Ошибка: некорректные данные времени');
        return;
    }
    
    const currentUserForComment = window.currentUser || currentUser;
    
    // ИСПРАВЛЕНИЕ: Проверяем что пользователь установлен
    if (!currentUserForComment) {
        console.error('❌ Пользователь не установлен');
        showNotification('Ошибка: пользователь не определен');
        return;
    }
    
    console.log('👤 Обновляем комментарий для пользователя:', currentUserForComment);
    console.log('📅 День и время:', { day, time });
    
    try {
        console.log('💾 Обновляем комментарий в Airtable...');
        
        // Находим существующее назначение и обновляем его
        const assignments = await window.airtableService.getAssignments();
        const assignment = assignments.find(a => 
            a.participantName === currentUserForComment && 
            a.roleName === role && 
            a.slotDate === day && 
            a.slotTime === time
        );
        
        if (assignment) {
            await window.airtableService.updateAssignment(assignment.id, { Comment: comment });
            console.log('✅ Комментарий обновлен в Airtable');
        } else {
            console.warn('⚠️ Назначение не найдено в Airtable:', {
                participantName: currentUserForComment,
                roleName: role,
                slotDate: day,
                slotTime: time
            });
            showNotification('Предупреждение: назначение не найдено в базе, но комментарий сохранен локально');
        }
        
        // Обновляем локально в любом случае
        if (!window.assignmentComments) window.assignmentComments = {};
        if (!window.assignmentComments[sessionKey]) window.assignmentComments[sessionKey] = {};
        window.assignmentComments[sessionKey][role] = { comment };
        
        console.log('💾 Комментарий сохранен локально');
        
        // Перерисовываем интерфейс для обновления отображения
        renderSchedule();
        
    } catch (error) {
        console.error('❌ Ошибка обновления комментария:', error);
        throw error;
    }
}

// Экспортируем функции глобально
window.getAssignmentData = getAssignmentData;
window.removeUserAssignment = removeUserAssignment;
window.updateAssignmentComment = updateAssignmentComment;

console.log('⚙️ Assignment Logic загружен');
