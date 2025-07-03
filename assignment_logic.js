// assignment-logic.js - Логика назначений (без ES6 модулей)

/* === ПЕРЕМЕННЫЕ СОСТОЯНИЯ === */
let currentPopupSession = null;
let currentPopupRole = null;

/* === ОСНОВНЫЕ ФУНКЦИИ НАЗНАЧЕНИЙ === */
function handleRoleSlotClick(sessionKey, role) {
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
        
        toggleUserAssignment(sessionKey, role);
    }
}

async function toggleUserAssignment(sessionKey, role) {
    if (!currentUser) {
        alert('Выберите участника');
        return;
    }
    
    const currentAssignment = assignments[sessionKey][role];
    const isBlocked = isSlotBlocked(sessionKey, role);
    
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
        
        renderSchedule();
        updateProgress();
        
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
        renderSchedule();
        updateProgress();
    } finally {
        hideLoader();
    }
}

async function selectParticipant(participantName) {
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
        
        renderSchedule();
        updateProgress();
        
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
