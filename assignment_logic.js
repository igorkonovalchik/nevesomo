// assignment-logic.js - Логика назначений (без ES6 модулей)

/* === ПЕРЕМЕННЫЕ СОСТОЯНИЯ === */
let currentPopupSession = null;
let currentPopupRole = null;

/* === ОСНОВНЫЕ ФУНКЦИИ НАЗНАЧЕНИЙ === */
function handleRoleSlotClick(sessionKey, role) {
    console.log('🔍 Клик по роли:', { sessionKey, role, currentMode, currentUser });
    
    if (currentMode === 'admin') {
        openParticipantPopup(sessionKey, role);
    } else {
        // Проверяем, что роль существует в assignments
        if (!assignments[sessionKey] || assignments[sessionKey][role] === undefined) {
            console.error(`❌ Роль "${role}" не найдена в сессии ${sessionKey}`);
            alert(`Ошибка: роль "${role}" недоступна в этой сессии. Обратитесь к администратору.`);
            return;
        }
        
        // Проверяем правило мастер-класса
        if (role === 'Любовь+Забота+Мастер класс' && !hasLoungeRole(currentUser)) {
            alert('Мастер-класс может быть выбран только участниками, которые уже записались в категорию "Лаунж". Сначала выберите себе шифт в лаунже!');
            return;
        }
        
        toggleUserAssignment(sessionKey, role);
    }
}

// ИСПРАВЛЕНО: Улучшенная функция проверки блокировки
function isSlotBlocked(sessionKey, roleToCheck) {
    if (currentMode !== 'user' || !currentUser) return false;
    
    const sessionTime = sessionKey.split('_')[1];
    const userRolesInTime = [];
    
    // Собираем все роли пользователя в это время
    for (const [checkSessionKey, sessionRoles] of Object.entries(assignments)) {
        const checkTime = checkSessionKey.split('_')[1];
        if (checkTime === sessionTime) {
            for (const [role, assignedUser] of Object.entries(sessionRoles)) {
                if (assignedUser === currentUser) {
                    userRolesInTime.push(role);
                }
            }
        }
    }
    
    // Если у пользователя нет ролей в это время - не блокируем
    if (userRolesInTime.length === 0) {
        return false;
    }
    
    // Проверяем правила совместимости
    const isLoungeRole = role => roleGroups.lounge?.roles.includes(role);
    const isMasterClass = role => role === 'Любовь+Забота+Мастер класс';
    
    const wantsLounge = isLoungeRole(roleToCheck);
    const wantsMaster = isMasterClass(roleToCheck);
    
    const hasLounge = userRolesInTime.some(isLoungeRole);
    const hasMaster = userRolesInTime.some(isMasterClass);
    
    // Разрешаем комбинацию Лаунж + Мастер класс
    if ((wantsLounge && hasMaster) || (wantsMaster && hasLounge)) {
        return false;
    }
    
    // Во всех остальных случаях блокируем если уже есть роль в это время
    return userRolesInTime.length > 0;
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
        alert('Выберите участника');
        return;
    }
    
    // ДОБАВЛЕНО: отладка
    debugRoleAssignment(sessionKey, role);
    
    // ИСПРАВЛЕНО: проверяем, что роль существует в assignments
    if (!assignments[sessionKey] || assignments[sessionKey][role] === undefined) {
        console.error(`❌ Роль "${role}" не найдена в сессии ${sessionKey}`);
        alert(`Ошибка: роль "${role}" не найдена в этой сессии. Обратитесь к администратору.`);
        return;
    }
    
    const currentAssignment = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    
    if (isBlocked && currentAssignment !== currentUser) {
        alert('У вас уже есть другая роль в это время!');
        return;
    }
    
    const [day, time] = sessionKey.split('_');
    
    // Запоминаем ТОЛЬКО ОДНУ раскрытую сессию (аккордеон)
    const expandedSession = document.querySelector('.session.expanded')?.getAttribute('data-session');
    
    showLoader(currentAssignment === currentUser ? 'Удаление шифта...' : 'Сохранение шифта...');
    
    try {
        if (currentAssignment === currentUser) {
            // Снимаем назначение
            await removeAssignmentFromAirtable(currentUser, role, day, time);
            
            // ИСПРАВЛЕНО: проверка для правильного названия роли
            if (role === 'Любовь+Забота+Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await removeAssignmentFromAirtable(currentUser, role, pairDay, pairTime);
                    if (assignments[pairSlot]) {
                        assignments[pairSlot][role] = null;
                    }
                }
            }
            assignments[sessionKey][role] = null;
            
        } else if (currentAssignment === null) {
            // Назначаем
            await saveAssignmentToAirtable(currentUser, role, day, time);
            
            // ИСПРАВЛЕНО: проверка для правильного названия роли
            if (role === 'Любовь+Забота+Мастер класс') {
                const pairSlot = getMasterClassPairSlot(sessionKey);
                if (pairSlot) {
                    const [pairDay, pairTime] = pairSlot.split('_');
                    await saveAssignmentToAirtable(currentUser, role, pairDay, pairTime);
                    if (assignments[pairSlot]) {
                        assignments[pairSlot][role] = currentUser;
                    }
                }
            }
            assignments[sessionKey][role] = currentUser;
            
        } else {
            alert('Этот слот уже занят. Обратитесь к администратору.');
            hideLoader();
            return;
        }
        
        console.log('✅ Назначение обновлено:', {
            sessionKey,
            role,
            newAssignment: assignments[sessionKey][role]
        });
        
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
    
    // Проверяем assignments
    Object.entries(assignments).forEach(([sessionKey, sessionRoles]) => {
        const availableRoles = Object.keys(sessionRoles);
        const missingRoles = allRoles.filter(role => !availableRoles.includes(role));
        if (missingRoles.length > 0) {
            console.warn(`⚠️ В сессии ${sessionKey} отсутствуют роли:`, missingRoles);
        }
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
        alert('Все роли уже заполнены!');
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
        
        alert('Сессия автоматически заполнена!');
        
    } catch (error) {
        console.error('Ошибка автозаполнения:', error);
        alert('Ошибка при автозаполнении. Попробуйте еще раз.');
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

console.log('⚙️ Assignment Logic загружен');

// Функция для диагностики и исправления проблем
window.fixRoleIssues = function() {
    console.log('🔧 === ИСПРАВЛЕНИЕ ПРОБЛЕМ С РОЛЯМИ ===');
    
    let fixedSessions = 0;
    const essentialRoles = ['Гостевая Забота', 'Поваренок', 'Страхующий/Уют'];
    
    Object.entries(assignments).forEach(([sessionKey, sessionRoles]) => {
        let addedRoles = 0;
        
        essentialRoles.forEach(role => {
            if (allRoles.includes(role) && sessionRoles[role] === undefined) {
                sessionRoles[role] = null;
                addedRoles++;
                console.log(`✅ Добавлена роль "${role}" в сессию ${sessionKey}`);
            }
        });
        
        if (addedRoles > 0) {
            fixedSessions++;
        }
    });
    
    console.log(`🔧 Исправлено ${fixedSessions} сессий`);
    
    if (fixedSessions > 0) {
        renderSchedule();
        updateProgress();
      //  alert(`Исправлено ${fixedSessions} сессий. Попробуйте выбрать роли снова!`);
    } else {
        alert('Проблем не найдено или уже исправлены.');
    }
};

// Автоматическая проверка и исправление при загрузке
window.addEventListener('dataLoaded', () => {
    setTimeout(() => {
        console.log('🔍 Автоматическая проверка ролей...');
        
        // Проверяем проблемные роли
        const problematicRoles = ['Гостевая Забота', 'Поваренок'];
        let needsFix = false;
        
        problematicRoles.forEach(role => {
            let foundInSessions = 0;
            Object.values(assignments).forEach(sessionRoles => {
                if (sessionRoles[role] !== undefined) {
                    foundInSessions++;
                }
            });
            
            const totalSessions = Object.keys(assignments).length;
            console.log(`📊 Роль "${role}": найдена в ${foundInSessions}/${totalSessions} сессий`);
            
            if (foundInSessions < totalSessions * 0.8) { // Если роль отсутствует в >20% сессий
                needsFix = true;
            }
        });
        
        if (needsFix) {
            console.log('🔧 Обнаружены проблемы, автоматически исправляем...');
            window.fixRoleIssues();
        }
    }, 2000);
});
