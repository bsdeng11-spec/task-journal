/**
 * Supabase Client & Data Access Layer for Task Journal
 * Works both with live Supabase and with a graceful offline/fallback mode.
 */

const TaskJournalDB = (function() {
    let client = null;
    let isConnected = false;

    const DEFAULT_MEMBERS = [
        { id: 1, name: "Robel", mp_number: "9826" },
        { id: 2, name: "Abebech", mp_number: "9790" },
        { id: 3, name: "Habesha", mp_number: "9783" },
        { id: 4, name: "Miki", mp_number: "9771" },
        { id: 5, name: "Henok", mp_number: "9772" },
        { id: 6, name: "Solomon", mp_number: "9773" },
        { id: 7, name: "Fanuel", mp_number: "9827" },
        { id: 8, name: "Tesfaye", mp_number: "9784" },
        { id: 9, name: "Etsubdink", mp_number: "9787" },
        { id: 10, name: "Abel", mp_number: "9788" },
        { id: 11, name: "Endris", mp_number: "9789" },
        { id: 12, name: "Temesgen", mp_number: "9791" },
        { id: 13, name: "Biruk/nardos", mp_number: "9806" },
        { id: 14, name: "Yemiserach", mp_number: "9807" },
        { id: 15, name: "Tekle", mp_number: "9808" },
        { id: 16, name: "Eyerusalem", mp_number: "9810" },
        { id: 17, name: "Ribka", mp_number: "9813" },
        { id: 18, name: "Alemu", mp_number: "9814" },
        { id: 19, name: "Dejen", mp_number: "9816" },
        { id: 20, name: "Yeabsira/Getnet.G", mp_number: "9817" },
        { id: 21, name: "Getnet.W", mp_number: "9818" },
        { id: 22, name: "Habtam", mp_number: "9819" },
        { id: 23, name: "Selam", mp_number: "9828" }
    ];

    function init() {
        const cfg = window.SUPABASE_CONFIG || {};
        const url = (cfg.url || '').trim();
        const key = (cfg.anonKey || '').trim();

        if (url && key && window.supabase && typeof window.supabase.createClient === 'function') {
            try {
                client = window.supabase.createClient(url, key);
                isConnected = true;
                console.log('⚡ Connected to Supabase:', url);
            } catch (err) {
                console.error('Failed to initialize Supabase client:', err);
                client = null;
                isConnected = false;
            }
        } else {
            client = null;
            isConnected = false;
        }

        updateConnectionUI();
    }

    function updateConnectionUI() {
        const badge = document.getElementById('supabaseStatusPill');
        if (badge) {
            if (isConnected) {
                badge.className = 'supabase-status-pill connected';
                badge.innerHTML = '<span class="status-dot"></span><span>Cloud DB: Supabase</span>';
                badge.title = 'Connected to online Supabase database';
            } else {
                badge.className = 'supabase-status-pill disconnected';
                badge.innerHTML = '<span class="status-dot"></span><span>⚙️ Connect Supabase</span>';
                badge.title = 'Click to connect your Supabase database';
            }
        }
    }

    // Local Storage Mock Helpers (used if Supabase is not configured yet)
    function getLocalMembers() {
        const raw = localStorage.getItem('tj_local_members');
        if (!raw) {
            localStorage.setItem('tj_local_members', JSON.stringify(DEFAULT_MEMBERS));
            return DEFAULT_MEMBERS;
        }
        try {
            return JSON.parse(raw);
        } catch(e) {
            return DEFAULT_MEMBERS;
        }
    }

    function saveLocalMembers(members) {
        localStorage.setItem('tj_local_members', JSON.stringify(members));
    }

    function getLocalTasks() {
        const raw = localStorage.getItem('tj_local_tasks');
        if (!raw) return [];
        try { return JSON.parse(raw); } catch(e) { return []; }
    }

    function saveLocalTasks(tasks) {
        localStorage.setItem('tj_local_tasks', JSON.stringify(tasks));
    }

    // Public API Methods

    function withTimeout(promise, ms = 3500) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('Network request timed out')), ms);
        });
        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    }

    async function getMembers() {
        if (client) {
            try {
                const query = client
                    .from('members')
                    .select('*')
                    .eq('active', 1)
                    .order('id', { ascending: true });

                const { data, error } = await withTimeout(query, 3500);

                if (!error && data && data.length > 0) {
                    saveLocalMembers(data);
                    return data;
                }
            } catch (e) {
                console.warn('Supabase getMembers error/timeout, falling back to local cache', e);
            }
        }
        return getLocalMembers();
    }

    async function addOrGetMember(name, mpNumber) {
        const cleanName = (name || '').trim();
        let cleanMp = (mpNumber || '').trim();

        if (client) {
            try {
                // Check if already exists
                const { data: existing } = await client
                    .from('members')
                    .select('*')
                    .eq('name', cleanName)
                    .maybeSingle();

                if (existing) return existing;

                if (!cleanMp) {
                    const { data: maxRow } = await client
                        .from('members')
                        .select('mp_number')
                        .order('id', { ascending: false })
                        .limit(1);
                    const lastMp = maxRow && maxRow[0] ? parseInt(maxRow[0].mp_number) : 9828;
                    cleanMp = isNaN(lastMp) ? '9830' : String(lastMp + 1);
                }

                const { data: inserted, error } = await client
                    .from('members')
                    .insert([{ name: cleanName, mp_number: cleanMp, active: 1 }])
                    .select()
                    .single();

                if (!error && inserted) return inserted;
            } catch (e) {
                console.warn('Supabase addMember error, using local fallback', e);
            }
        }

        // Local fallback
        const members = getLocalMembers();
        let found = members.find(m => m.name.toLowerCase() === cleanName.toLowerCase());
        if (found) return found;

        if (!cleanMp) {
            const lastMp = members.length > 0 ? parseInt(members[members.length - 1].mp_number) : 9828;
            cleanMp = isNaN(lastMp) ? '9830' : String(lastMp + 1);
        }
        const newMember = {
            id: Date.now(),
            name: cleanName,
            mp_number: cleanMp,
            active: 1
        };
        members.push(newMember);
        saveLocalMembers(members);
        return newMember;
    }

    async function updateMemberName(memberId, newName, newMpNumber) {
        const cleanName = (newName || '').trim();
        const cleanMp = (newMpNumber || '').trim();

        if (client) {
            try {
                const updatePayload = { name: cleanName };
                if (cleanMp) updatePayload.mp_number = cleanMp;

                const { data, error } = await client
                    .from('members')
                    .update(updatePayload)
                    .eq('id', memberId)
                    .select()
                    .single();

                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase updateMember error, fallback to local', e);
            }
        }

        // Local fallback
        const members = getLocalMembers();
        const mem = members.find(m => String(m.id) === String(memberId));
        if (mem) {
            mem.name = cleanName;
            if (cleanMp) mem.mp_number = cleanMp;
            saveLocalMembers(members);
            return mem;
        }
        return null;
    }

    async function getTasksForMember(memberId, startDate, endDate) {
        if (client) {
            try {
                const query = client
                    .from('tasks')
                    .select('*')
                    .eq('member_id', memberId)
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: true });

                const { data, error } = await withTimeout(query, 3500);

                if (!error) return data || [];
            } catch (e) {
                console.warn('Supabase getTasks error/timeout, fallback to local', e);
            }
        }

        // Local fallback
        const allTasks = getLocalTasks();
        return allTasks.filter(t => 
            String(t.member_id) === String(memberId) &&
            t.date >= startDate &&
            t.date <= endDate
        );
    }

    async function saveMemberTasks(memberId, startDate, endDate, tasksList, periodCode) {
        const tasksToInsert = (tasksList || []).map(t => {
            let numHours = null;
            if (t.hours !== null && t.hours !== undefined && t.hours !== '-' && t.hours !== '') {
                const parsed = parseFloat(t.hours);
                if (!isNaN(parsed)) numHours = parsed;
            }
            return {
                member_id: parseInt(memberId),
                date: t.date,
                project_code: t.project_code || '',
                task_type: t.task_type || '',
                description: t.description || '',
                hours: numHours,
                is_special: t.is_special || 'Work',
                period_code: periodCode || ''
            };
        });

        if (client) {
            try {
                // Delete previous entries for this period and member
                await client
                    .from('tasks')
                    .delete()
                    .eq('member_id', memberId)
                    .gte('date', startDate)
                    .lte('date', endDate);

                if (tasksToInsert.length > 0) {
                    const { error } = await client
                        .from('tasks')
                        .insert(tasksToInsert);
                    if (error) throw error;
                }
                return { success: true };
            } catch (e) {
                console.error('Supabase save error:', e);
                throw e;
            }
        }

        // Local fallback
        let allTasks = getLocalTasks();
        allTasks = allTasks.filter(t => 
            !(String(t.member_id) === String(memberId) && t.date >= startDate && t.date <= endDate)
        );
        allTasks.push(...tasksToInsert);
        saveLocalTasks(allTasks);
        return { success: true };
    }

    async function getAllTasksForPeriod(startDate, endDate) {
        if (client) {
            try {
                const { data, error } = await client
                    .from('tasks')
                    .select('*')
                    .gte('date', startDate)
                    .lte('date', endDate)
                    .order('date', { ascending: true });

                if (!error) return data || [];
            } catch (e) {
                console.warn('Supabase getAllTasks error, using local fallback', e);
            }
        }

        const allTasks = getLocalTasks();
        return allTasks.filter(t => t.date >= startDate && t.date <= endDate);
    }

    async function getPeriodSummary(startDate, endDate) {
        const members = await getMembers();
        const tasks = await getAllTasksForPeriod(startDate, endDate);

        // Group tasks by member_id
        const hoursByMember = {};
        members.forEach(m => { hoursByMember[m.id] = 0.0; });

        tasks.forEach(t => {
            const mId = t.member_id;
            if (hoursByMember[mId] !== undefined && t.hours) {
                const val = parseFloat(t.hours);
                if (!isNaN(val)) hoursByMember[mId] += val;
            }
        });

        let grandTotal = 0.0;
        let completedMembers = 0;

        const memberSummaries = members.map(m => {
            const totalHours = parseFloat((hoursByMember[m.id] || 0.0).toFixed(1));
            grandTotal += totalHours;

            let status = 'Not Started';
            if (totalHours >= 99.0) {
                status = 'Complete';
                completedMembers++;
            } else if (totalHours > 0) {
                status = 'In Progress';
            }

            return {
                member_id: m.id,
                name: m.name,
                mp_number: m.mp_number,
                total_hours: totalHours,
                status: status
            };
        });

        return {
            grand_total_hours: parseFloat(grandTotal.toFixed(1)),
            completed_members: completedMembers,
            total_members: members.length,
            members: memberSummaries
        };
    }

    function saveCredentials(url, anonKey) {
        localStorage.setItem('tj_supabase_url', url.trim());
        localStorage.setItem('tj_supabase_key', anonKey.trim());
        if (window.SUPABASE_CONFIG) {
            window.SUPABASE_CONFIG.url = url.trim();
            window.SUPABASE_CONFIG.anonKey = anonKey.trim();
        }
        init();
    }

    // Auto-initialize on load
    document.addEventListener('DOMContentLoaded', init);

    return {
        init,
        isConfigured: () => isConnected,
        getMembers,
        getLocalMembers,
        addOrGetMember,
        updateMemberName,
        getTasksForMember,
        saveMemberTasks,
        getAllTasksForPeriod,
        getPeriodSummary,
        saveCredentials
    };
})();

window.TaskJournalDB = TaskJournalDB;
