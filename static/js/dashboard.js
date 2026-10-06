/**
 * Manager Consolidation Dashboard Controller
 * Powered by Supabase client & ExcelJS in the browser.
 */

document.addEventListener('DOMContentLoaded', async function() {
    const periodTitleInput = document.getElementById('dashPeriodTitle');
    const startDateInput = document.getElementById('dashStartDate');
    const endDateInput = document.getElementById('dashEndDate');
    const yearLabelInput = document.getElementById('dashYearLabel');
    const btnFilter = document.getElementById('btnFilterPeriod');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const searchInput = document.getElementById('searchMember');

    // Default period calculation
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();
    const monthsShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const curMonthName = monthsShort[curMonth];

    let defStart, defEnd, defTitle;
    if (today.getDate() <= 15) {
        const mStr = String(curMonth + 1).padStart(2, '0');
        defStart = `${curYear}-${mStr}-01`;
        defEnd = `${curYear}-${mStr}-15`;
        defTitle = `${curMonthName} 01-15`;
    } else {
        const mStr = String(curMonth + 1).padStart(2, '0');
        defStart = `${curYear}-${mStr}-16`;
        const lastDay = new Date(curYear, curMonth + 1, 0).getDate();
        defEnd = `${curYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
        defTitle = `${curMonthName} 16-${lastDay}`;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const startDate = urlParams.get('start_date') || defStart;
    const endDate = urlParams.get('end_date') || defEnd;
    const periodTitle = urlParams.get('period_title') || defTitle;
    const yearLabel = urlParams.get('year_label') || String(curYear);

    if (startDateInput) startDateInput.value = startDate;
    if (endDateInput) endDateInput.value = endDate;
    if (periodTitleInput) periodTitleInput.value = periodTitle;
    if (yearLabelInput) yearLabelInput.value = yearLabel;

    // Load initial dashboard data
    await renderDashboard();

    // Event listeners
    if (btnFilter) {
        btnFilter.addEventListener('click', function(e) {
            e.preventDefault();
            renderDashboard();
        });
    }

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', handleExcelExport);
    }

    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            const rows = document.querySelectorAll('.member-row');
            rows.forEach(r => {
                const text = r.innerText.toLowerCase();
                r.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }

    async function renderDashboard() {
        const start = startDateInput.value;
        const end = endDateInput.value;
        const pTitle = periodTitleInput.value;

        const tableBody = document.querySelector('#memberSummaryTable tbody');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted" style="padding: 30px;">
                        Loading live team records...
                    </td>
                </tr>
            `;
        }

        try {
            const summary = await TaskJournalDB.getPeriodSummary(start, end);

            // Update KPI cards
            const elGrandTotal = document.getElementById('kpiGrandTotal');
            const elCompleted = document.getElementById('kpiCompleted');
            const elTarget = document.getElementById('kpiTarget');
            const elCompletionRate = document.getElementById('kpiCompletionRate');
            const elPeriodHeading = document.getElementById('dashPeriodHeading');

            if (elGrandTotal) elGrandTotal.innerHTML = `${summary.grand_total_hours} <small>hrs</small>`;
            if (elCompleted) elCompleted.innerHTML = `${summary.completed_members} <small>/ ${summary.total_members}</small>`;
            if (elTarget) elTarget.innerHTML = `${summary.total_members * 99} <small>hrs</small>`;

            if (elCompletionRate) {
                const rate = summary.total_members > 0 
                    ? ((summary.completed_members / summary.total_members) * 100).toFixed(1) 
                    : 0;
                elCompletionRate.textContent = `${rate}% ready for export`;
            }

            if (elPeriodHeading) {
                elPeriodHeading.textContent = `👥 Team Members Status (${pTitle})`;
            }

            // Render table
            if (tableBody) {
                tableBody.innerHTML = '';
                if (!summary.members || summary.members.length === 0) {
                    tableBody.innerHTML = `
                        <tr>
                            <td colspan="7" class="text-center text-muted" style="padding: 30px;">
                                No team members found.
                            </td>
                        </tr>
                    `;
                    return;
                }

                summary.members.forEach((m, idx) => {
                    const tr = document.createElement('tr');
                    tr.className = 'member-row';

                    let badgeClass = 'badge-danger';
                    let badgeText = '✖ Not Started';
                    let fillClass = 'fill-empty';

                    if (m.status === 'Complete') {
                        badgeClass = 'badge-success';
                        badgeText = '✔ Complete';
                        fillClass = 'fill-success';
                    } else if (m.status === 'In Progress') {
                        badgeClass = 'badge-warning';
                        badgeText = '⏳ In Progress';
                        fillClass = 'fill-warning';
                    }

                    const progressPct = Math.min(((m.total_hours / 99.0) * 100), 100);

                    tr.innerHTML = `
                        <td>${idx + 1}</td>
                        <td><strong>${m.name}</strong></td>
                        <td><span class="badge badge-mp">${m.mp_number}</span></td>
                        <td>
                            <strong>${m.total_hours}</strong> hrs
                            <div class="mini-progress-bg">
                                <div class="mini-progress-fill ${fillClass}" style="width: ${progressPct}%;"></div>
                            </div>
                        </td>
                        <td>99.0 hrs</td>
                        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                        <td>
                            <a href="index.html?member_id=${m.member_id}&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}&period_title=${encodeURIComponent(pTitle)}" 
                               class="btn btn-sm btn-outline">
                                ✏️ Open Sheet
                            </a>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center text-danger" style="padding: 30px;">
                            Error loading dashboard summary.
                        </td>
                    </tr>
                `;
            }
        }
    }

    async function handleExcelExport() {
        const btn = btnExportExcel;
        const originalText = btn.innerHTML;
        btn.innerHTML = '⏳ Generating Master Excel...';
        btn.disabled = true;

        try {
            const start = startDateInput.value;
            const end = endDateInput.value;
            const pTitle = periodTitleInput.value || "Period";
            const yr = yearLabelInput.value || String(curYear);

            const members = await TaskJournalDB.getMembers();
            const allTasks = await TaskJournalDB.getAllTasksForPeriod(start, end);

            // Group tasks by member_id
            const tasksByMember = {};
            allTasks.forEach(t => {
                const mId = t.member_id;
                if (!tasksByMember[mId]) tasksByMember[mId] = [];
                tasksByMember[mId].push(t);
            });

            await TaskJournalExporter.downloadMasterReport({
                periodTitle: pTitle,
                yearLabel: yr,
                members: members,
                tasksByMember: tasksByMember
            });
        } catch (e) {
            console.error('Export failed:', e);
            alert('Failed to export Excel report. Please check the console for details.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
});
