/**
 * Client-Side Excel Exporter for Task Journal using ExcelJS
 * Generates identical Master Task Journal spreadsheet matching company template.
 * Includes both:
 * 1) 'Master Task Journal' Tab (Navy banners, 3 blank rows, AutoFilter, clean borders)
 * 2) 'Summary Dashboard' Tab (KPI metrics, status badges, totals)
 */

const TaskJournalExporter = (function() {

    function formatDateMDY(dateVal) {
        if (!dateVal) return "";
        try {
            const parts = String(dateVal).split('-');
            if (parts.length === 3) {
                const y = parts[0];
                const m = parseInt(parts[1], 10);
                const d = parseInt(parts[2], 10);
                return `${m}/${d}/${y}`;
            }
            const dt = new Date(dateVal);
            if (!isNaN(dt.getTime())) {
                return `${dt.getMonth() + 1}/${dt.getDate()}/${dt.getFullYear()}`;
            }
        } catch (e) {}
        return String(dateVal);
    }

    async function generateAndDownloadExcel(options) {
        const {
            periodTitle = "SEP 16-30",
            yearLabel = new Date().getFullYear().toString(),
            members = [],
            tasksByMember = {}
        } = options;

        if (typeof ExcelJS === 'undefined') {
            alert('ExcelJS library is loading. Please check your internet connection and try again.');
            return;
        }

        const wb = new ExcelJS.Workbook();
        wb.creator = "Task Journal BIM Portal";
        wb.created = new Date();

        const NAVY_COLOR = "0A1931";
        const WHITE_COLOR = "FFFFFF";
        const BORDER_COLOR = "E5E7EB";

        const borderStyle = {
            top: { style: 'thin', color: { argb: BORDER_COLOR } },
            left: { style: 'thin', color: { argb: BORDER_COLOR } },
            bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
            right: { style: 'thin', color: { argb: BORDER_COLOR } }
        };

        // -----------------------------------------------------------------
        // TAB 1: Master Task Journal (Exact layout from company template)
        // -----------------------------------------------------------------
        const ws = wb.addWorksheet("Master Task Journal", {
            views: [{ showGridLines: true }]
        });

        // Row 1: Report Title Banner
        const row1 = ws.addRow([`Report_${yearLabel}`, "", "", "", "", "", ""]);
        row1.height = 26;
        for (let col = 1; col <= 7; col++) {
            const cell = row1.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_COLOR } };
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE_COLOR } };
            cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
        }

        // Row 2: Period Label Banner
        const row2 = ws.addRow([String(periodTitle).toUpperCase(), "", "", "", "", "", ""]);
        row2.height = 22;
        for (let col = 1; col <= 7; col++) {
            const cell = row2.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_COLOR } };
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE_COLOR } };
            cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'center' };
        }

        // Row 3: Headers
        const headers = ["Name", "Task", "Description", "Date", "General hours", "Executor", "MP#"];
        const row3 = ws.addRow(headers);
        row3.height = 24;
        for (let col = 1; col <= 7; col++) {
            const cell = row3.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_COLOR } };
            cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE_COLOR } };
            cell.alignment = {
                vertical: 'middle',
                horizontal: [1, 4, 5, 7].includes(col) ? 'center' : 'left'
            };
        }

        let grandTotalHours = 0.0;

        // Data rows grouped by Executor
        members.forEach(member => {
            const mId = member.id;
            const mTasks = tasksByMember[mId] || [];
            if (!mTasks || mTasks.length === 0) return;

            mTasks.forEach(t => {
                const proj = t.project_code || '';
                const taskType = t.task_type || '';
                const desc = t.description || '';
                const dateDisplay = formatDateMDY(t.date);
                const hrsVal = t.hours;
                const isSpecial = t.is_special || 'Work';

                const descClean = desc.trim().toLowerCase();
                const isLeaveOrWeekend = (
                    ['Weekend', 'Holiday', 'Vacation', 'Sick', 'Emergency', 'Other'].includes(isSpecial) ||
                    ['weekend', 'holiday', 'vacation', 'vaccation', 'sick', 'emergency', 'other leave'].some(k => descClean.includes(k)) ||
                    String(hrsVal).trim() === '-'
                );

                let rowData;
                let isHoursNumeric = false;
                let numHours = 0;

                if (isLeaveOrWeekend) {
                    let leaveLabel = desc;
                    if (!leaveLabel) {
                        if (isSpecial === 'Weekend') leaveLabel = "Weekend";
                        else if (isSpecial === 'Vacation') leaveLabel = "Vacation";
                        else if (isSpecial === 'Sick') leaveLabel = "Sick Leave";
                        else if (isSpecial === 'Emergency') leaveLabel = "Emergency Leave";
                        else leaveLabel = "Leave";
                    }
                    rowData = ["", "", leaveLabel, dateDisplay, "-", member.name, member.mp_number];
                } else {
                    let hrsDisplay = "";
                    if (hrsVal !== null && hrsVal !== undefined && hrsVal !== "" && hrsVal !== "-") {
                        const parsed = parseFloat(hrsVal);
                        if (!isNaN(parsed)) {
                            numHours = parsed;
                            grandTotalHours += numHours;
                            hrsDisplay = Number.isInteger(numHours) ? numHours : parseFloat(numHours.toFixed(2));
                            isHoursNumeric = true;
                        } else {
                            hrsDisplay = hrsVal;
                        }
                    }
                    rowData = [proj, taskType, desc, dateDisplay, hrsDisplay, member.name, member.mp_number];
                }

                const dataRow = ws.addRow(rowData);
                dataRow.height = 20;

                for (let col = 1; col <= 7; col++) {
                    const cell = dataRow.getCell(col);
                    cell.font = { name: 'Arial', size: 10 };
                    cell.border = borderStyle;

                    if ([1, 4, 7].includes(col)) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (col === 5) {
                        cell.alignment = {
                            horizontal: isHoursNumeric ? 'right' : 'center',
                            vertical: 'middle'
                        };
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    }
                }
            });

            // 3 blank rows between executors as shown in company master template
            for (let b = 0; b < 3; b++) {
                const blankRow = ws.addRow(["", "", "", "", "", "", ""]);
                blankRow.height = 18;
            }
        });

        // Set column widths matching template proportions
        ws.getColumn(1).width = 14; // Name / Proj
        ws.getColumn(2).width = 14; // Task
        ws.getColumn(3).width = 48; // Description
        ws.getColumn(4).width = 13; // Date
        ws.getColumn(5).width = 14; // General hours
        ws.getColumn(6).width = 15; // Executor
        ws.getColumn(7).width = 10; // MP#

        const lastRow = Math.max(ws.rowCount, 3);
        ws.autoFilter = {
            from: { row: 3, column: 1 },
            to: { row: lastRow, column: 7 }
        };

        // -----------------------------------------------------------------
        // TAB 2: Summary Dashboard
        // -----------------------------------------------------------------
        const wsSummary = wb.addWorksheet("Summary Dashboard", {
            views: [{ showGridLines: true }]
        });

        const sTitleRow = wsSummary.addRow(["TASK JOURNAL 15-DAY SUMMARY DASHBOARD"]);
        sTitleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: NAVY_COLOR } };

        const sMetaRow = wsSummary.addRow([
            `Period: ${periodTitle} (${yearLabel})`,
            `Grand Total Hours: ${grandTotalHours.toFixed(2)} hrs`
        ]);
        sMetaRow.getCell(1).font = { name: 'Arial', size: 11, bold: true };
        sMetaRow.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: '16A34A' } };

        wsSummary.addRow([]); // Blank spacer

        const sumHeaders = ["#", "Executor", "MP Number", "Logged Hours", "Target Hours (15-Day)", "Status"];
        const sHdrRow = wsSummary.addRow(sumHeaders);
        sHdrRow.height = 22;

        const hdrFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
        for (let col = 1; col <= 6; col++) {
            const cell = sHdrRow.getCell(col);
            cell.font = { name: 'Arial', size: 10, bold: true };
            cell.fill = hdrFill;
            cell.border = borderStyle;
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        let idx = 1;
        members.forEach(member => {
            const mId = member.id;
            const mTasks = tasksByMember[mId] || [];
            let mHours = 0.0;
            mTasks.forEach(t => {
                if (t.hours !== null && t.hours !== undefined && t.hours !== '-' && t.hours !== '') {
                    const parsed = parseFloat(t.hours);
                    if (!isNaN(parsed)) mHours += parsed;
                }
            });

            const status = mHours >= 99.0 ? 'Complete' : (mHours > 0 ? 'In Progress' : 'Not Started');
            let statusColor = 'FCE4D6'; // Reddish for Not Started
            if (status === 'Complete') statusColor = 'E2EFDA'; // Light green
            else if (status === 'In Progress') statusColor = 'FFF2CC'; // Light yellow

            const r = wsSummary.addRow([
                idx,
                member.name,
                member.mp_number,
                parseFloat(mHours.toFixed(2)),
                99.0,
                status
            ]);
            r.height = 20;

            for (let col = 1; col <= 6; col++) {
                const cell = r.getCell(col);
                cell.font = { name: 'Arial', size: 10 };
                cell.border = borderStyle;
                if ([1, 3, 4, 5].includes(col)) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                } else if (col === 6) {
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
                } else {
                    cell.alignment = { horizontal: 'left', vertical: 'middle' };
                }
            }
            idx++;
        });

        // Summary Total Row
        const totRow = wsSummary.addRow([
            "",
            "TOTAL",
            "",
            parseFloat(grandTotalHours.toFixed(2)),
            members.length * 99.0,
            ""
        ]);
        totRow.height = 22;
        const totalFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
        const totalBorder = {
            top: { style: 'thin', color: { argb: '000000' } },
            bottom: { style: 'double', color: { argb: '000000' } }
        };

        for (let col = 1; col <= 6; col++) {
            const cell = totRow.getCell(col);
            cell.font = { name: 'Arial', size: 10, bold: true };
            cell.fill = totalFill;
            cell.border = totalBorder;
            if (col === 2) cell.alignment = { horizontal: 'center', vertical: 'middle' };
            if (col === 4 || col === 5) cell.alignment = { horizontal: 'right', vertical: 'middle' };
        }

        // Adjust summary widths
        wsSummary.getColumn(1).width = 8;
        wsSummary.getColumn(2).width = 24;
        wsSummary.getColumn(3).width = 16;
        wsSummary.getColumn(4).width = 18;
        wsSummary.getColumn(5).width = 22;
        wsSummary.getColumn(6).width = 18;

        // Generate buffer and trigger browser download
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const cleanPeriod = String(periodTitle).replace(/\s+/g, '_');
        const filename = `Master_Report_${cleanPeriod}_${yearLabel}.xlsx`;

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    }

    return {
        downloadMasterReport: generateAndDownloadExcel
    };
})();

window.TaskJournalExporter = TaskJournalExporter;
