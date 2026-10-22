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

    // Instant local cache population (0ms - opens immediately with zero network delay)
    allMembersCache = TaskJournalDB.getLocalMembers();
    populateMemberDropdowns(allMembersCache);

    let activeMemberId = paramMemberId || localStorage.getItem('current_executor_id');
    let activeMember = allMembersCache.find(m => String(m.id) === String(activeMemberId));

    if (activeMember) {
        setSystemExecutor(activeMember);
        if (memberSelect) {
            memberSelect.value = activeMember.id;
            updateMemberInfo();
        }
        loadMemberTasks(true);
    } else {
        // No executor chosen yet -> show Entry Modal immediately
        window.openEnterSystemModal(false);
    }

    // Refresh cloud members in background
    loadMembers().then(() => {
        const fresh = allMembersCache.find(m => String(m.id) === String(activeMemberId));
        if (fresh) {
            setSystemExecutor(fresh);
            if (memberSelect) memberSelect.value = fresh.id;
        }
    });

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
            const allDateInputs = document.querySelectorAll('.row-date');
            let defaultDate = startDateInput ? startDateInput.value : '';
            if (allDateInputs.length > 0) {
                const lastDate = allDateInputs[allDateInputs.length - 1].value;
                if (lastDate) defaultDate = lastDate;
            }
            addRow({
                date: defaultDate,
                hours: ''
            });
            calculateTotalHours();
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
                // Enforce FIFO order: Earliest date first, then earliest created task first
                tasks.sort((a, b) => a.date.localeCompare(b.date) || ((Number(a.id) || 0) - (Number(b.id) || 0)));
                tasks.forEach(task => addRow(task));
                if (saveStatus) saveStatus.textContent = `Loaded ${tasks.length} task entries.`;
            } else if (autoPrefillIfEmpty) {
                // Auto-fill period on first visit (Day 1 to 15 in FIFO order)
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

    // =========================================================
    // Strict Project Code Validation Helpers (e.g. 1880-01, -02)
    // =========================================================
    function isRowLeaveOrWeekend(tr) {
        if (!tr) return false;
        if (tr.classList.contains('weekend-row') ||
            tr.classList.contains('leave-vacation-row') ||
            tr.classList.contains('leave-sick-row') ||
            tr.classList.contains('leave-emergency-row') ||
            tr.classList.contains('leave-other-row')) {
            return true;
        }
        const hoursInput = tr.querySelector('.row-hours');
        const descInput = tr.querySelector('.row-desc');
        const hours = hoursInput ? hoursInput.value.trim() : '';
        const desc = descInput ? descInput.value.trim().toLowerCase() : '';
        return (hours === '-' || desc.includes('weekend') || desc.includes('holiday') || desc.includes('vacation') || desc.includes('vaccation') || desc.includes('sick') || desc.includes('emergency'));
    }

    function checkProjectCodeStatus(val, isLeave = false) {
        if (isLeave) return { valid: true };
        const clean = (val || '').trim();
        if (!clean) {
            return { valid: false, message: '⚠️ Project number is required' };
        }
        if (clean === '-') {
            return { valid: false, message: '⚠️ Enter project # (e.g. 1880-01) or pick Leave' };
        }
        // Must contain hyphen e.g. 1880-01
        if (!clean.includes('-')) {
            return { valid: false, message: `⚠️ Missing sub-number: write e.g. ${clean}-01` };
        }
        // Check prefix and suffix after hyphen
        const parts = clean.split('-');
        const prefix = parts[0].trim();
        const suffix = parts.slice(1).join('-').trim();
        if (!suffix) {
            return { valid: false, message: '⚠️ Missing number after hyphen (e.g. -01, -02)' };
        }
        // Sub-number MUST be exactly two digits (e.g. -01, -02, -00)
        if (!/^\d{2}$/.test(suffix)) {
            if (/^\d$/.test(suffix)) {
                return { valid: false, message: `⚠️ Must be exactly 2 digits: write ${prefix}-0${suffix}` };
            }
            return { valid: false, message: `⚠️ Sub-number must be exactly 2 digits (e.g. ${prefix}-01)` };
        }
        return { valid: true };
    }

    function validateProjectInput(projInput, isStrict = false) {
        if (!projInput) return true;
        const tr = projInput.closest('tr');
        if (!tr) return true;

        const isLeave = isRowLeaveOrWeekend(tr);
        const msgEl = tr.querySelector('.proj-validation-msg');

        if (isLeave) {
            projInput.classList.remove('is-invalid-proj');
            if (msgEl) {
                msgEl.style.display = 'none';
                msgEl.textContent = '';
            }
            return true;
        }

        // Never auto-mutate or inject characters into projInput.value!
        // Allow the user to type and delete completely freely.
        const status = checkProjectCodeStatus(projInput.value, isLeave);

        if (!status.valid) {
            if (isStrict || projInput.value.trim() !== '') {
                projInput.classList.add('is-invalid-proj');
                if (msgEl) {
                    msgEl.style.display = 'block';
                    msgEl.textContent = status.message;
                }
            } else {
                projInput.classList.remove('is-invalid-proj');
                if (msgEl) {
                    msgEl.style.display = 'none';
                    msgEl.textContent = '';
                }
            }
            return false;
        } else {
            projInput.classList.remove('is-invalid-proj');
            if (msgEl) {
                msgEl.style.display = 'none';
                msgEl.textContent = '';
            }
            return true;
        }
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
                <div class="proj-input-wrap">
                    <input type="text" class="row-proj form-control" placeholder="e.g. 1880-01" value="${projVal}" autocomplete="off">
                    <div class="proj-validation-msg" style="display: none;"></div>
                </div>
            </td>
            <td>
                <input type="text" list="taskTypeList" class="row-task form-control" placeholder="e.g. Fixing" value="${taskVal}">
            </td>
            <td>
                <input type="text" class="row-desc form-control" placeholder="Work description..." value="${descVal}">
            </td>
            <td>
                <div class="hours-input-wrap">
                    <input type="text" class="row-hours form-control" placeholder="Hours" value="${hoursVal}">
                    <div class="hours-validation-msg" style="display: none;"></div>
                </div>
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

        const projInput = tr.querySelector('.row-proj');
        if (projInput) {
            projInput.addEventListener('input', function() {
                // Real-time validation: show red restriction & warning if incomplete, remove when completed
                validateProjectInput(projInput, false);
            });
            projInput.addEventListener('blur', function() {
                validateProjectInput(projInput, true);
            });
            projInput.addEventListener('change', function() {
                validateProjectInput(projInput, true);
            });

            // Initial check if pre-populated with data
            if (projVal.trim() !== '') {
                validateProjectInput(projInput, false);
            }
        }

        const dateInput = tr.querySelector('.row-date');
        if (dateInput) {
            dateInput.addEventListener('change', calculateTotalHours);
            dateInput.addEventListener('input', calculateTotalHours);
        }

        const hoursInput = tr.querySelector('.row-hours');
        if (hoursInput) {
            hoursInput.addEventListener('input', calculateTotalHours);
            hoursInput.addEventListener('change', calculateTotalHours);
            hoursInput.addEventListener('blur', calculateTotalHours);
        }

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

        // Clear project code validation error when leave tag is applied
        const projInput = tr.querySelector('.row-proj');
        if (projInput) {
            projInput.classList.remove('is-invalid-proj');
            const msgEl = tr.querySelector('.proj-validation-msg');
            if (msgEl) {
                msgEl.style.display = 'none';
                msgEl.textContent = '';
            }
        }
        const hoursInput = tr.querySelector('.row-hours');
        if (hoursInput) {
            hoursInput.classList.remove('is-invalid-hours');
            const hMsgEl = tr.querySelector('.hours-validation-msg');
            if (hMsgEl) {
                hMsgEl.style.display = 'none';
                hMsgEl.textContent = '';
            }
        }
    }

    function validateDailyHours() {
        const rows = document.querySelectorAll('#tableBody tr');
        const dayMap = {};

        rows.forEach(tr => {
            const dateInput = tr.querySelector('.row-date');
            const hoursInput = tr.querySelector('.row-hours');
            if (!dateInput || !hoursInput) return;

            const dateVal = dateInput.value.trim();
            if (!dateVal) return;

            const hVal = parseFloat(hoursInput.value.trim());
            const hoursNum = (!isNaN(hVal) && hVal > 0) ? hVal : 0;

            if (!dayMap[dateVal]) {
                dayMap[dateVal] = { total: 0, items: [] };
            }
            dayMap[dateVal].total += hoursNum;
            dayMap[dateVal].items.push({ tr, hoursInput, hoursNum });
        });

        let hasOverHours = false;
        const overHoursDays = [];

        Object.keys(dayMap).forEach(dateVal => {
            const data = dayMap[dateVal];
            const dayTotal = Math.round(data.total * 100) / 100;

            if (dayTotal > 9.0) {
                hasOverHours = true;
                overHoursDays.push({ date: dateVal, total: dayTotal, items: data.items });

                data.items.forEach(item => {
                    item.hoursInput.classList.add('is-invalid-hours');
                    const msgEl = item.tr.querySelector('.hours-validation-msg');
                    if (msgEl) {
                        msgEl.style.display = 'block';
                        msgEl.textContent = `⚠️ Day: ${dayTotal}h (>9:00)`;
                    }
                });
            } else {
                data.items.forEach(item => {
                    item.hoursInput.classList.remove('is-invalid-hours');
                    const msgEl = item.tr.querySelector('.hours-validation-msg');
                    if (msgEl) {
                        msgEl.style.display = 'none';
                        msgEl.textContent = '';
                    }
                });
            }
        });

        // Rows without date but with single row > 9 hrs
        rows.forEach(tr => {
            const dateInput = tr.querySelector('.row-date');
            const hoursInput = tr.querySelector('.row-hours');
            if (!dateInput || !hoursInput) return;
            if (!dateInput.value.trim()) {
                const hVal = parseFloat(hoursInput.value.trim());
                if (!isNaN(hVal) && hVal > 9.0) {
                    hoursInput.classList.add('is-invalid-hours');
                    const msgEl = tr.querySelector('.hours-validation-msg');
                    if (msgEl) {
                        msgEl.style.display = 'block';
                        msgEl.textContent = `⚠️ Max 9:00 hrs`;
                    }
                    hasOverHours = true;
                } else {
                    hoursInput.classList.remove('is-invalid-hours');
                    const msgEl = tr.querySelector('.hours-validation-msg');
                    if (msgEl) {
                        msgEl.style.display = 'none';
                        msgEl.textContent = '';
                    }
                }
            }
        });

        return { hasOverHours, overHoursDays };
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

        // Real-time daily hours check (9:00 max per day)
        validateDailyHours();
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
        const invalidRows = [];

        rows.forEach(r => {
            const dateInput = r.querySelector('.row-date');
            if (!dateInput) return;

            const projInput = r.querySelector('.row-proj');
            const date = dateInput.value;
            const projRaw = projInput ? projInput.value.trim() : '';
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

            const isLeave = (isSpecial !== 'Work');
            if (!isLeave) {
                // Must be fully written with sub-number like -01, -02...
                const isValid = validateProjectInput(projInput, true);
                if (!isValid) {
                    invalidRows.push({
                        row: r,
                        input: projInput,
                        date: date,
                        val: projRaw
                    });
                }
            } else if (projInput) {
                projInput.classList.remove('is-invalid-proj');
                const msgEl = r.querySelector('.proj-validation-msg');
                if (msgEl) msgEl.style.display = 'none';
            }

            tasks.push({
                date: date,
                project_code: projInput ? projInput.value.trim() : projRaw,
                task_type: task,
                description: desc,
                hours: hours,
                is_special: isSpecial
            });
        });

        if (invalidRows.length > 0) {
            const first = invalidRows[0];
            first.input.focus();
            first.input.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const missingHint = first.val ? `"${first.val}" must have exactly 2 digits after the hyphen (e.g. -01, -02)` : 'field is empty';
            const alertMsg = `⚠️ Project number is invalid on row for ${first.date} (${missingHint})!\n\nPlease write the complete project code with exactly two digits after the hyphen (e.g. 1880-01, 6049-01) before saving.`;
            
            if (saveStatus) {
                saveStatus.textContent = `❌ Cannot save: Incomplete project code on ${first.date}. Must have 2 digits after hyphen (e.g. -01, -02).`;
                saveStatus.style.color = '#DC2626';
            }
            alert(alertMsg);
            return;
        }

        // Validate Daily Hours limit (must not exceed 9:00 per day)
        const dailyCheck = validateDailyHours();
        if (dailyCheck.hasOverHours) {
            const first = dailyCheck.overHoursDays[0];
            const targetItem = first.items && first.items[first.items.length - 1];
            if (targetItem && targetItem.hoursInput) {
                targetItem.hoursInput.focus();
                targetItem.hoursInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const alertMsg = `⚠️ Daily Hours Warning!\n\nThe total hours for ${first.date} is ${first.total} hours, which exceeds the general work limit of 9:00 per day.\n\nPlease adjust the hours for ${first.date} so the daily total does not exceed 9:00 before saving.`;

            if (saveStatus) {
                saveStatus.textContent = `❌ Cannot save: Hours on ${first.date} total ${first.total}h (exceeds 9:00 daily max).`;
                saveStatus.style.color = '#DC2626';
            }
            alert(alertMsg);
            return;
        }

        // Enforce FIFO chronological sorting before saving
        tasks.sort((a, b) => a.date.localeCompare(b.date));

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
    const sortedMembers = [...(members || [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0)); // FIFO
    const modalSelect = document.getElementById('modalMemberSelect');
    const pageSelect = document.getElementById('memberSelect');

    if (modalSelect) {
        modalSelect.innerHTML = `
            <option value="" disabled selected>Select name...</option>
            ${sortedMembers.map(m => `<option value="${m.id}" data-name="${m.name}" data-mp="${m.mp_number}">${m.name} (MP# ${m.mp_number})</option>`).join('')}
            <option disabled>──────────────</option>
            <option value="__NEW__">➕ Add New Executor...</option>
            <option value="__RENAME__">✏️ Rename / Change Name for Member...</option>
        `;
    }

    if (pageSelect) {
        const currentVal = pageSelect.value;
        pageSelect.innerHTML = `
            <option value="">-- Choose Your Name --</option>
            ${sortedMembers.map(m => `<option value="${m.id}" data-mp="${m.mp_number}">${m.name} (MP# ${m.mp_number})</option>`).join('')}
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
