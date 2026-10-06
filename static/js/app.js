/**
 * Task Journal Web Application - Client-Side Controller
 * Direct Supabase Cloud DB Connection + Offline LocalStorage Fallback.
 * Features:
 * - Dynamic team executors (Robel, Abebech, Miki, etc.)
 * - 15-day period generation & auto-filling
 * - Hours progress tracker (99 hrs target)
 * - Multilingual System Entry Modal (Image 2)
 * - Cloud Supabase sync
 */

let allMembersCache = [];

document.addEventListener('DOMContentLoaded', async function() {
    const memberSelect = document.getElementById('memberSelect');
    const mpDisplay = document.getElementById('mpDisplay');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const periodTitleInput = document.getElementById('periodTitle');
    const tableBody = document.getElementById('tableBody');
    const btnPrefill = document.getElementById('btnPrefill');
    const btnAddRow = document.getElementById('btnAddRow');
    const btnSave = document.getElementById('btnSave');
    const saveStatus = document.getElementById('saveStatus');
    const totalHoursDisplay = document.getElementById('totalHoursDisplay');
    const totalHoursBottom = document.getElementById('totalHoursBottom');
    const hoursProgressBar = document.getElementById('hoursProgressBar');

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paramMemberId = urlParams.get('member_id');
    const paramStartDate = urlParams.get('start_date');
    const paramEndDate = urlParams.get('end_date');
    const paramPeriodTitle = urlParams.get('period_title');

    // Default period setup if inputs are empty
    setDefaultPeriodDates(paramStartDate, paramEndDate, paramPeriodTitle);

    // Initialize Supabase DB client and load members
    await loadMembers();

    let activeMemberId = paramMemberId || localStorage.getItem('current_executor_id');
    let activeMember = allMembersCache.find(m => String(m.id) === String(activeMemberId));

    if (activeMember) {
        setSystemExecutor(activeMember);
        if (memberSelect) {
            memberSelect.value = activeMember.id;
            updateMemberInfo();
            await loadMemberTasks(true); // auto-prefill if empty
        }
    } else {
        // No executor chosen yet -> show Entry Modal
        window.openEnterSystemModal(false);
    }

    if (memberSelect) {
        memberSelect.addEventListener('change', async function() {
            const mId = memberSelect.value;
            const m = allMembersCache.find(x => String(x.id) === String(mId));
            if (m) {
                setSystemExecutor(m);
                updateMemberInfo();
                await loadMemberTasks(true);
            } else {
                clearTimesheet();
            }
        });
    }

    if (startDateInput) startDateInput.addEventListener('change', () => loadMemberTasks(false));
    if (endDateInput) endDateInput.addEventListener('change', () => loadMemberTasks(false));

    // Auto-fill 15 days button
    if (btnPrefill) {
        btnPrefill.addEventListener('click', function() {
            if (!memberSelect || !memberSelect.value) {
                alert('Please select your name first!');
                window.openEnterSystemModal(true);
                return;
            }
            generatePeriodDays(true);
        });
    }

    // Add custom row
    if (btnAddRow) {
        btnAddRow.addEventListener('click', function() {
            addRow({
                date: startDateInput ? startDateInput.value : '',
                hours: '9'
            });
        });
    }

    // Save button
    if (btnSave) {
        btnSave.addEventListener('click', saveCurrentTasks);
    }

    function setDefaultPeriodDates(customStart, customEnd, customTitle) {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed

        const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const curMonthName = monthsShort[month];

        let sDateStr, eDateStr, pTitle;

        if (today.getDate() <= 15) {
            const mStr = String(month + 1).padStart(2, '0');
            sDateStr = `${year}-${mStr}-01`;
            eDateStr = `${year}-${mStr}-15`;
            pTitle = `${curMonthName} 01-15`;
        } else {
            const mStr = String(month + 1).padStart(2, '0');
            sDateStr = `${year}-${mStr}-16`;
            const lastDay = new Date(year, month + 1, 0).getDate();
            eDateStr = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;
            pTitle = `${curMonthName} 16-${lastDay}`;
        }

        if (startDateInput && !startDateInput.value) startDateInput.value = customStart || sDateStr;
        if (endDateInput && !endDateInput.value) endDateInput.value = customEnd || eDateStr;
        if (periodTitleInput && !periodTitleInput.value) periodTitleInput.value = customTitle || pTitle;
    }

    function updateMemberInfo() {
        if (!memberSelect) return;
        const selectedOpt = memberSelect.options[memberSelect.selectedIndex];
        if (selectedOpt && selectedOpt.dataset.mp && mpDisplay) {
            mpDisplay.value = selectedOpt.dataset.mp;
        } else if (mpDisplay) {
            mpDisplay.value = '';
        }
    }

    function clearTimesheet() {
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr id="emptyRowPlaceholder">
                <td colspan="7" class="text-center text-muted" style="padding: 40px; text-align: center;">
                    Please select your name above to view and enter your tasks.
                </td>
            </tr>
        `;
        calculateTotalHours();
    }

    async function loadMemberTasks(autoPrefillIfEmpty = false) {
        if (!memberSelect) return;
        const memberId = memberSelect.value;
        const start = startDateInput ? startDateInput.value : '';
        const end = endDateInput ? endDateInput.value : '';

        if (!memberId || !start || !end) return;

        if (saveStatus) {
            saveStatus.textContent = 'Loading existing tasks...';
            saveStatus.style.color = '#64748B';
        }

        try {
            const tasks = await TaskJournalDB.getTasksForMember(memberId, start, end);

            if (tableBody) tableBody.innerHTML = '';

            if (tasks && tasks.length > 0) {
                tasks.forEach(task => addRow(task));
                if (saveStatus) saveStatus.textContent = `Loaded ${tasks.length} task entries.`;
            } else if (autoPrefillIfEmpty) {
                // Auto-fill period on first visit
                generatePeriodDays(false);
                if (saveStatus) saveStatus.textContent = 'Auto-filled 15-day period layout.';
            } else {
                tableBody.innerHTML = `
                    <tr id="emptyRowPlaceholder">
                        <td colspan="7" class="text-center" style="padding: 30px; text-align: center; color: #64748B;">
                            No entries found for this period yet. Click <strong>"Auto-Fill Period Days"</strong> above to generate 15 days automatically!
                        </td>
                    </tr>
                `;
                if (saveStatus) saveStatus.textContent = '';
            }
            calculateTotalHours();
        } catch (err) {
            console.error('Error loading tasks:', err);
            if (saveStatus) {
                saveStatus.textContent = 'Error loading tasks.';
                saveStatus.style.color = '#DC2626';
            }
        }
    }

    function generatePeriodDays(forceOverwrite = false) {
        if (!startDateInput || !endDateInput || !tableBody) return;
        const startStr = startDateInput.value;
        const endStr = endDateInput.value;
        if (!startStr || !endStr) return;

        const startParts = startStr.split('-').map(Number);
        const endParts = endStr.split('-').map(Number);
        const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);

        if (start > end) {
            alert('Start date must be before end date.');
            return;
        }

        tableBody.innerHTML = '';

        let curr = new Date(start);
        while (curr <= end) {
            const yyyy = curr.getFullYear();
            const mm = String(curr.getMonth() + 1).padStart(2, '0');
            const dd = String(curr.getDate()).padStart(2, '0');
            const dateIso = `${yyyy}-${mm}-${dd}`;

            const dayOfWeek = curr.getDay(); // 0: Sun, 6: Sat
            const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

            if (isWeekend) {
                addRow({
                    date: dateIso,
                    project_code: '',
                    task_type: '',
                    description: 'Weekend',
                    hours: '-',
                    is_special: 'Weekend'
                });
            } else {
                addRow({
                    date: dateIso,
                    project_code: '',
                    task_type: 'Fixing',
                    description: '',
                    hours: '9',
                    is_special: 'Work'
                });
            }
            curr.setDate(curr.getDate() + 1);
        }
        calculateTotalHours();
    }

    function addRow(data = {}) {
        if (!tableBody) return;
        const placeholder = document.getElementById('emptyRowPlaceholder');
        if (placeholder) placeholder.remove();

        const tr = document.createElement('tr');
        const descLower = (data.description || '').toLowerCase();
        let isSpecial = data.is_special;
        if (!isSpecial || isSpecial === 'Work') {
            if (descLower.includes('weekend') || data.hours === '-') isSpecial = 'Weekend';
            else if (descLower.includes('holiday')) isSpecial = 'Holiday';
            else if (descLower.includes('vacation') || descLower.includes('vaccation')) isSpecial = 'Vacation';
            else if (descLower.includes('sick')) isSpecial = 'Sick';
            else if (descLower.includes('emergency')) isSpecial = 'Emergency';
            else if (descLower.includes('other')) isSpecial = 'Other';
            else isSpecial = 'Work';
        }

        if (isSpecial === 'Weekend' || isSpecial === 'Holiday') tr.classList.add('weekend-row');
        else if (isSpecial === 'Vacation') tr.classList.add('leave-vacation-row');
        else if (isSpecial === 'Sick') tr.classList.add('leave-sick-row');
        else if (isSpecial === 'Emergency') tr.classList.add('leave-emergency-row');
        else if (isSpecial === 'Other') tr.classList.add('leave-other-row');

        const dateVal = data.date || (startDateInput ? startDateInput.value : '');
        const projVal = data.project_code || '';
        const taskVal = data.task_type || '';
        const descVal = data.description || '';
        const hoursVal = (data.hours !== undefined && data.hours !== null) ? data.hours : '';

        tr.innerHTML = `
            <td>
                <input type="date" class="row-date form-control" value="${dateVal}">
            </td>
            <td>
                <input type="text" class="row-proj form-control" placeholder="e.g. 1880-01" value="${projVal}">
            </td>
            <td>
                <input type="text" list="taskTypeList" class="row-task form-control" placeholder="e.g. Fixing" value="${taskVal}">
            </td>
            <td>
                <input type="text" class="row-desc form-control" placeholder="Work description..." value="${descVal}">
            </td>
            <td>
                <input type="text" class="row-hours form-control" placeholder="Hours" value="${hoursVal}">
            </td>
            <td>
                <div class="tag-btn-group tag-btn-grid">
                    <button type="button" class="tag-btn btn-weekend" title="Mark as Weekend">🗓 Weekend</button>
                    <button type="button" class="tag-btn btn-holiday" title="Mark as Local Holiday">🏛 Holiday</button>
                    <button type="button" class="tag-btn btn-vacation tag-vacation" title="Mark as Vacation Leave">🏖 Vacation</button>
                    <button type="button" class="tag-btn btn-sick tag-sick" title="Mark as Sick Leave">🤒 Sick</button>
                    <button type="button" class="tag-btn btn-emergency tag-emergency" title="Mark as Emergency Leave">🚨 Emergency</button>
                    <button type="button" class="tag-btn btn-other-leave tag-other" title="Mark as Other Leave">📋 Other</button>
                </div>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn-delete" title="Delete Row">&times;</button>
            </td>
        `;

        const hoursInput = tr.querySelector('.row-hours');
        hoursInput.addEventListener('input', calculateTotalHours);

        tr.querySelector('.btn-delete').addEventListener('click', function() {
            tr.remove();
            calculateTotalHours();
        });

        tr.querySelector('.btn-weekend').addEventListener('click', function() {
            tr.querySelector('.row-proj').value = '';
            tr.querySelector('.row-task').value = '';
            tr.querySelector('.row-desc').value = 'Weekend';
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'weekend');
            calculateTotalHours();
        });

        tr.querySelector('.btn-holiday').addEventListener('click', function() {
            tr.querySelector('.row-proj').value = '';
            tr.querySelector('.row-task').value = '';
            tr.querySelector('.row-desc').value = 'LOCAL HOLIDAY';
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'holiday');
            calculateTotalHours();
        });

        tr.querySelector('.btn-vacation').addEventListener('click', function() {
            tr.querySelector('.row-proj').value = '-';
            tr.querySelector('.row-task').value = '-';
            tr.querySelector('.row-desc').value = 'Vacation';
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'vacation');
            calculateTotalHours();
        });

        tr.querySelector('.btn-sick').addEventListener('click', function() {
            tr.querySelector('.row-proj').value = '-';
            tr.querySelector('.row-task').value = '-';
            tr.querySelector('.row-desc').value = 'Sick Leave';
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'sick');
            calculateTotalHours();
        });

        tr.querySelector('.btn-emergency').addEventListener('click', function() {
            tr.querySelector('.row-proj').value = '-';
            tr.querySelector('.row-task').value = '-';
            tr.querySelector('.row-desc').value = 'Emergency Leave';
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'emergency');
            calculateTotalHours();
        });

        tr.querySelector('.btn-other-leave').addEventListener('click', function() {
            const reason = prompt('Enter leave reason (e.g. Personal, Family, etc.):') || 'Other Leave';
            tr.querySelector('.row-proj').value = '-';
            tr.querySelector('.row-task').value = '-';
            tr.querySelector('.row-desc').value = reason;
            tr.querySelector('.row-hours').value = '-';
            setLeaveRowStyle(tr, 'other');
            calculateTotalHours();
        });

        tableBody.appendChild(tr);
        calculateTotalHours();
    }

    function setLeaveRowStyle(tr, leaveType) {
        tr.classList.remove('weekend-row', 'leave-vacation-row', 'leave-sick-row', 'leave-emergency-row', 'leave-other-row');
        if (leaveType === 'weekend' || leaveType === 'holiday') {
            tr.classList.add('weekend-row');
        } else if (leaveType === 'vacation') {
            tr.classList.add('leave-vacation-row');
        } else if (leaveType === 'sick') {
            tr.classList.add('leave-sick-row');
        } else if (leaveType === 'emergency') {
            tr.classList.add('leave-emergency-row');
        } else if (leaveType === 'other') {
            tr.classList.add('leave-other-row');
        }
    }

    function calculateTotalHours() {
        let total = 0.0;
        const hourInputs = document.querySelectorAll('.row-hours');
        hourInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) total += val;
        });

        const formatted = total.toFixed(1);
        if (totalHoursDisplay) totalHoursDisplay.textContent = formatted;
        if (totalHoursBottom) totalHoursBottom.textContent = formatted;

        if (hoursProgressBar) {
            const pct = Math.min((total / 99.0) * 100, 100);
            hoursProgressBar.style.width = `${pct}%`;
            if (total >= 99.0) {
                hoursProgressBar.style.backgroundColor = '#16A34A';
            } else if (total > 0) {
                hoursProgressBar.style.backgroundColor = '#EA580C';
            } else {
                hoursProgressBar.style.backgroundColor = '#CBD5E1';
            }
        }
    }

    async function saveCurrentTasks() {
        if (!memberSelect || !memberSelect.value) {
            alert('Please select your name before saving.');
            window.openEnterSystemModal(true);
            return;
        }

        const memberId = memberSelect.value;
        const rows = document.querySelectorAll('#tableBody tr');
        const tasks = [];

        rows.forEach(r => {
            const dateInput = r.querySelector('.row-date');
            if (!dateInput) return;

            const date = dateInput.value;
            const proj = r.querySelector('.row-proj').value.trim();
            const task = r.querySelector('.row-task').value.trim();
            const desc = r.querySelector('.row-desc').value.trim();
            const hours = r.querySelector('.row-hours').value.trim();

            let isSpecial = 'Work';
            const descLower = desc.toLowerCase();
            if (descLower.includes('weekend') || hours === '-') isSpecial = 'Weekend';
            else if (descLower.includes('holiday')) isSpecial = 'Holiday';
            else if (descLower.includes('vacation') || descLower.includes('vaccation')) isSpecial = 'Vacation';
            else if (descLower.includes('sick')) isSpecial = 'Sick';
            else if (descLower.includes('emergency')) isSpecial = 'Emergency';
            else if (descLower.includes('other leave') || descLower.includes('leave')) isSpecial = 'Other';

            tasks.push({
                date: date,
                project_code: proj,
                task_type: task,
                description: desc,
                hours: hours,
                is_special: isSpecial
            });
        });

        if (saveStatus) {
            saveStatus.textContent = 'Saving to database...';
            saveStatus.style.color = '#1F4E78';
        }

        try {
            await TaskJournalDB.saveMemberTasks(
                memberId,
                startDateInput.value,
                endDateInput.value,
                tasks,
                periodTitleInput ? periodTitleInput.value : ''
            );

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (saveStatus) {
                saveStatus.textContent = `✔ Saved successfully at ${now}!`;
                saveStatus.style.color = '#16A34A';
            }
        } catch (err) {
            console.error('Save failed:', err);
            if (saveStatus) {
                saveStatus.textContent = 'Failed to save entries to database.';
                saveStatus.style.color = '#DC2626';
            }
        }
    }
});

// =========================================================
// Global Member & Modal Management (Image 2 System Entry)
// =========================================================

async function loadMembers() {
    try {
        allMembersCache = await TaskJournalDB.getMembers();
        populateMemberDropdowns(allMembersCache);
    } catch (e) {
        console.error('Failed to load members:', e);
    }
}

function populateMemberDropdowns(members) {
    const modalSelect = document.getElementById('modalMemberSelect');
    const pageSelect = document.getElementById('memberSelect');

    if (modalSelect) {
        modalSelect.innerHTML = `
            <option value="" disabled selected>Select name...</option>
            ${members.map(m => `<option value="${m.id}" data-name="${m.name}" data-mp="${m.mp_number}">${m.name} (MP# ${m.mp_number})</option>`).join('')}
            <option disabled>──────────────</option>
            <option value="__NEW__">➕ Add New Executor...</option>
            <option value="__RENAME__">✏️ Rename / Change Name for Member...</option>
        `;
    }

    if (pageSelect) {
        const currentVal = pageSelect.value;
        pageSelect.innerHTML = `
            <option value="">-- Choose Your Name --</option>
            ${members.map(m => `<option value="${m.id}" data-mp="${m.mp_number}">${m.name} (MP# ${m.mp_number})</option>`).join('')}
        `;
        if (currentVal) pageSelect.value = currentVal;
    }
}

function setSystemExecutor(member) {
    if (!member) return;
    localStorage.setItem('current_executor_id', member.id);
    localStorage.setItem('current_executor_name', member.name);
    localStorage.setItem('current_executor_mp', member.mp_number);

    const navName = document.getElementById('navExecutorNameText');
    if (navName) {
        navName.textContent = `${member.name} (${member.mp_number})`;
    }

    const modalSelect = document.getElementById('modalMemberSelect');
    if (modalSelect) modalSelect.value = member.id;
}

window.openEnterSystemModal = function(isCancelable = true) {
    const overlay = document.getElementById('enterSystemOverlay');
    const closeBtn = document.getElementById('btnCloseOverlayBtn');
    const errBox = document.getElementById('entryErrorNotice');
    if (errBox) errBox.style.display = 'none';

    if (overlay) overlay.style.display = 'flex';
    if (closeBtn) closeBtn.style.display = isCancelable ? 'block' : 'none';

    const currentId = localStorage.getItem('current_executor_id');
    const modalSelect = document.getElementById('modalMemberSelect');
    if (modalSelect && currentId) {
        modalSelect.value = currentId;
    }
    handleModalMemberChange();
};

window.closeEnterSystemModal = function() {
    const overlay = document.getElementById('enterSystemOverlay');
    if (overlay) overlay.style.display = 'none';
};

window.handleModalMemberChange = function() {
    const modalSelect = document.getElementById('modalMemberSelect');
    const newFields = document.getElementById('modalNewMemberFields');
    const renameRow = document.getElementById('renameOptionRow');
    const customName = document.getElementById('modalCustomName');
    const customMp = document.getElementById('modalCustomMp');
    const isRenameChk = document.getElementById('modalIsRenameCheckbox');

    if (!modalSelect || !newFields) return;
    const val = modalSelect.value;

    if (val === '__NEW__') {
        newFields.style.display = 'flex';
        renameRow.style.display = 'none';
        if (isRenameChk) isRenameChk.checked = false;
        customName.value = '';
        customMp.value = '';
        customName.placeholder = 'Enter new executor name...';
        customName.focus();
    } else if (val === '__RENAME__') {
        newFields.style.display = 'flex';
        renameRow.style.display = 'block';
        if (isRenameChk) isRenameChk.checked = true;

        const currentId = localStorage.getItem('current_executor_id');
        const currMem = allMembersCache.find(x => String(x.id) === String(currentId));
        customName.value = currMem ? currMem.name : '';
        customMp.value = currMem ? currMem.mp_number : '';
        customName.placeholder = 'Enter updated name...';
        customName.focus();
    } else {
        newFields.style.display = 'none';
    }
};

window.submitSystemEntry = async function() {
    const modalSelect = document.getElementById('modalMemberSelect');
    const customName = document.getElementById('modalCustomName');
    const customMp = document.getElementById('modalCustomMp');
    const isRenameChk = document.getElementById('modalIsRenameCheckbox');
    const errBox = document.getElementById('entryErrorNotice');

    if (!modalSelect) return;
    const val = modalSelect.value;

    function showErr(msg) {
        if (errBox) {
            errBox.textContent = msg;
            errBox.style.display = 'block';
        } else {
            alert(msg);
        }
    }

    if (!val) {
        showErr('Please select your name from the list or add a new executor.');
        return;
    }

    try {
        let member = null;

        if (val === '__NEW__') {
            const nameVal = customName.value.trim();
            if (!nameVal) {
                showErr('Please type the executor name.');
                customName.focus();
                return;
            }
            member = await TaskJournalDB.addOrGetMember(nameVal, customMp.value.trim());
        } else if (val === '__RENAME__' || (isRenameChk && isRenameChk.checked)) {
            const nameVal = customName.value.trim();
            if (!nameVal) {
                showErr('Please enter the updated name.');
                customName.focus();
                return;
            }
            const memberIdToRename = (val !== '__RENAME__' && val !== '__NEW__')
                ? val
                : localStorage.getItem('current_executor_id');

            if (!memberIdToRename) {
                showErr('Please pick which member you are renaming.');
                return;
            }
            member = await TaskJournalDB.updateMemberName(memberIdToRename, nameVal, customMp.value.trim());
        } else {
            member = allMembersCache.find(x => String(x.id) === String(val));
        }

        if (member) {
            await loadMembers();
            setSystemExecutor(member);
            closeEnterSystemModal();
            triggerTimesheetRefresh(member.id);
        } else {
            showErr('Failed to complete entry.');
        }
    } catch (e) {
        console.error(e);
        showErr('Error saving executor information.');
    }
};

function triggerTimesheetRefresh(memberId) {
    const pageSelect = document.getElementById('memberSelect');
    if (pageSelect) {
        pageSelect.value = memberId;
        pageSelect.dispatchEvent(new Event('change'));
    }
}

// Supabase Settings Modal Helpers
window.openSupabaseConfigModal = function() {
    const modal = document.getElementById('supabaseConfigModal');
    if (modal) {
        const urlInput = document.getElementById('modalSupabaseUrl');
        const keyInput = document.getElementById('modalSupabaseKey');
        if (urlInput) urlInput.value = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || localStorage.getItem('tj_supabase_url') || '';
        if (keyInput) keyInput.value = (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || localStorage.getItem('tj_supabase_key') || '';
        modal.style.display = 'flex';
    }
};

window.closeSupabaseConfigModal = function() {
    const modal = document.getElementById('supabaseConfigModal');
    if (modal) modal.style.display = 'none';
};

window.saveSupabaseConfigModal = function() {
    const url = (document.getElementById('modalSupabaseUrl').value || '').trim();
    const key = (document.getElementById('modalSupabaseKey').value || '').trim();

    TaskJournalDB.saveCredentials(url, key);
    closeSupabaseConfigModal();
    alert('Supabase settings saved! Reloading data...');
    window.location.reload();
};
