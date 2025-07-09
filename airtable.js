// Конфигурация Airtable
const AIRTABLE_CONFIG = {
    token: 'patMIW84FVqnXwnN6.d83a5e1106a79b8f9cb0bec4064eb558fc34954bcd2c839f9ec18e4ad233b4f7',
    baseId: 'appaC4Yvx4dPpTaER',
    apiUrl: 'https://api.airtable.com/v0'
};


// Названия таблиц
const TABLES = {
    PARTICIPANTS: 'participants',
    ROLES: 'roles', 
    SCHEDULE: 'schedule',
    ASSIGNMENTS: 'assignments',
    SETTINGS: 'settings'
};

// Класс для работы с Airtable API
class AirtableAPI {
    constructor() {
        this.baseUrl = `${AIRTABLE_CONFIG.apiUrl}/${AIRTABLE_CONFIG.baseId}`;
        this.headers = {
            'Authorization': `Bearer ${AIRTABLE_CONFIG.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Универсальный метод для GET запросов
    async get(tableName, params = {}) {
        try {
            const queryParams = new URLSearchParams(params);
            const url = `${this.baseUrl}/${tableName}?${queryParams}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.records || [];
        } catch (error) {
            console.error(`Error fetching ${tableName}:`, error);
            throw error;
        }
    }

    // Универсальный метод для POST запросов
    async create(tableName, fields) {
        try {
            const url = `${this.baseUrl}/${tableName}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    fields: fields
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error creating record in ${tableName}:`, error);
            throw error;
        }
    }

    // Универсальный метод для PATCH запросов
    async update(tableName, recordId, fields) {
        try {
            const url = `${this.baseUrl}/${tableName}/${recordId}`;
            
            const response = await fetch(url, {
                method: 'PATCH',
                headers: this.headers,
                body: JSON.stringify({
                    fields: fields
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error updating record in ${tableName}:`, error);
            throw error;
        }
    }

    // Универсальный метод для DELETE запросов
    async delete(tableName, recordId) {
        try {
            const url = `${this.baseUrl}/${tableName}/${recordId}`;
            
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.headers
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error deleting record from ${tableName}:`, error);
            throw error;
        }
    }
}

// Создаем экземпляр API
const airtableAPI = new AirtableAPI();

// Функции для работы с конкретными таблицами
class AirtableService {
    // Получить всех участников
    async getParticipants() {
        try {
            const records = await airtableAPI.get(TABLES.PARTICIPANTS);
            return records.map(record => ({
              id           : record.id,
              name         : record.fields.Name        || '',
              telegram     : record.fields.Telegram    || '',
              telegramId   : record.fields.Telegram_ID || '',   
              isAdmin      : record.fields.Is_Admin    || false,
              bathExperience : record.fields.Bath_Experience || false,
              createdDate  : record.fields.Created_Date || '',
              notes        : record.fields.Notes        || '',
              isNew       : record.fields.is_New || false
            }));
        } catch (error) {
            console.error('Error getting participants:', error);
            return [];
        }
    }

    // Получить все роли
    async getRoles() {
        try {
            const records = await airtableAPI.get(TABLES.ROLES);
            return records.map(record => ({
                id: record.id,
                name: record.fields.Name || '',
                icon: record.fields.Icon || '🔥',
                description: record.fields.Description || '',
                instructionUrl: record.fields.Instruction_URL || '',
                category: record.fields.Category || '',
                specialRules: record.fields.Special_Rules || '',
                isActive: record.fields.Is_Active !== false
            }));
        } catch (error) {
            console.error('Error getting roles:', error);
            return [];
        }
    }

    // Получить расписание
    async getSchedule() {
        try {
            const records = await airtableAPI.get(TABLES.SCHEDULE);
            return records.map(record => ({
                id: record.id,
                date: record.fields.Date || '',
                startTime: record.fields.Start_Time || '',
                endTime: record.fields.End_Time || '',
                sessionNumber: record.fields.Session_Number || null,
                status: record.fields.Status || '',
                type: record.fields.Type || '',
                availableRoles: record.fields.Available_Roles || '',
                maxParticipants: record.fields.Max_Participants || 0,
                slotLink: record.fields.slot_link || ''
            }));
        } catch (error) {
            console.error('Error getting schedule:', error);
            return [];
        }
    }

    // Получить назначения
    async getAssignments() {
        try {
            const records = await airtableAPI.get(TABLES.ASSIGNMENTS);
            return records.map(record => ({
                id: record.id,
                participantName: record.fields.Participant_Name || '',
                roleName: record.fields.Role_Name || '',
                slotDate: record.fields.Slot_Date || '',
                slotTime: record.fields.Slot_Time || '',
                assignedDate: record.fields.Assigned_Date || '',
                status: record.fields.Status || '',
                comment: record.fields.Comment || ''
            }));
        } catch (error) {
            console.error('Error getting assignments:', error);
            return [];
        }
    }

    // Получить настройки
    async getSettings() {
        try {
            const records = await airtableAPI.get(TABLES.SETTINGS);
            const settings = {};
            records.forEach(record => {
                const name = record.fields.Setting_Name;
                const value = record.fields.Setting_Value;
                if (name && value) {
                    settings[name] = value;
                }
            });
            return settings;
        } catch (error) {
            console.error('Error getting settings:', error);
            return {};
        }
    }

    // Создать новое назначение
   async createAssignment(participantName, roleName, slotDate, slotTime, comment = '') {
    try {
        const fields = {
            Participant_Name: participantName,
            Role_Name: roleName,
            Slot_Date: slotDate,
            Slot_Time: slotTime,
            Assigned_Date: new Date().toISOString().split('T')[0],
            Status: 'Active',
            Comment: comment
        };

        return await airtableAPI.create(TABLES.ASSIGNMENTS, fields);
    } catch (error) {
        console.error('Error creating assignment:', error);
        throw error;
    }
}

    // Удалить назначение
    async deleteAssignment(assignmentId) {
        try {
            return await airtableAPI.delete(TABLES.ASSIGNMENTS, assignmentId);
        } catch (error) {
            console.error('Error deleting assignment:', error);
            throw error;
        }
    }

    // Обновить назначение
    async updateAssignment(assignmentId, fields) {
        try {
            return await airtableAPI.update(TABLES.ASSIGNMENTS, assignmentId, fields);
        } catch (error) {
            console.error('Error updating assignment:', error);
            throw error;
        }
    }

    // Получить все данные разом
    async getAllData() {
        try {
            const [participants, roles, schedule, assignments, settings] = await Promise.all([
                this.getParticipants(),
                this.getRoles(),
                this.getSchedule(),
                this.getAssignments(),
                this.getSettings()
            ]);

            return {
                participants,
                roles,
                schedule,
                assignments,
                settings
            };
        } catch (error) {
            console.error('Error getting all data:', error);
            throw error;
        }
    }
}

// Создаем экземпляр сервиса
const airtableService = new AirtableService();

// Экспортируем для использования в других файлах
window.airtableService = airtableService;
window.airtableAPI = airtableAPI;

// Функция для отладки сырых данных из Airtable
window.debugAirtableData = async function() {
    console.log('🔍 === ОТЛАДКА СЫРЫХ ДАННЫХ ИЗ AIRTABLE ===');
    
    try {
        const data = await window.airtableService.getAllData();
        
        console.log('📊 Роли из Airtable:');
        data.roles.forEach(role => {
            if (role.isActive) {
                console.log(`  ✅ "${role.name}" (${role.category}) - активна`);
            } else {
                console.log(`  ❌ "${role.name}" (${role.category}) - неактивна`);
            }
        });
        
        console.log('\n📅 Расписание из Airtable:');
        data.schedule.forEach(session => {
            const roles = session.availableRoles ? 
                session.availableRoles.split(',').map(r => r.trim()) : 
                ['ВСЕ РОЛИ'];
            
            console.log(`  ${session.date} ${session.startTime}: ${session.type}`);
            console.log(`    Доступные роли: ${roles.join(', ')}`);
            
        });
        
        console.log('\n📋 Назначения из Airtable:');
        const assignmentsByRole = {};
        data.assignments.forEach(assignment => {
            if (!assignmentsByRole[assignment.roleName]) {
                assignmentsByRole[assignment.roleName] = 0;
            }
            assignmentsByRole[assignment.roleName]++;
        });
        
        Object.entries(assignmentsByRole).forEach(([role, count]) => {
            console.log(`  ${role}: ${count} назначений`);
        });
        
    } catch (error) {
        console.error('❌ Ошибка отладки Airtable:', error);
    }
};
