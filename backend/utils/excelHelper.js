const XLSX = require('xlsx');
const ExcelRow = require('../models/ExcelRow');

/**
 * Column headers for the sheet.
 */
const HEADERS = [
  'S.No',
  'Student Name',
  'Register No',
  'Year',
  'Department',
  'Event Name',
  'Host College',
  'Event Date',
  'Participation Type',
  'Team Name',
  'Result',
  'Certificate Drive Link',
  'Verified On',
];

/**
 * Saves achievement rows to MongoDB (ExcelRow collection).
 * This replaces writing to a physical .xlsx file.
 *
 * @param {string} department
 * @param {Array<Object>} rows
 */
const appendToExcel = async (department, rows) => {
  try {
    const docs = rows.map(r => ({
      department:             department,
      student_name:           r.student_name        || '',
      reg_no:                 r.reg_no              || '',
      year:                   String(r.year || ''),
      event_name:             r.event_name          || '',
      college_name:           r.college_name        || '',
      event_date:             r.event_date          ? new Date(r.event_date) : null,
      participation_type:     r.participation_type  || 'Individual',
      team_name:              r.team_name           || '',
      result:                 r.result              || '',
      certificate_drive_link: r.certificate_drive_link || '',
      verified_on:            new Date(),
    }));

    await ExcelRow.insertMany(docs);
    console.log(`[ExcelRow] Saved ${docs.length} row(s) to DB for dept: ${department}`);
  } catch (err) {
    console.error('[ExcelRow] Failed to save rows to DB:', err.message);
  }
};

/**
 * Generates an Excel workbook buffer from DB rows for a given department.
 * Drive links are stored as clickable Excel hyperlinks.
 *
 * @param {string} department
 * @returns {Buffer|null}
 */
const generateExcelBuffer = async (department) => {
  const rows = await ExcelRow.find({ department }).sort({ createdAt: 1 });
  if (!rows.length) return null;

  const wb = XLSX.utils.book_new();

  // Build data rows: header + data
  const dataRows = [HEADERS];
  rows.forEach((r, idx) => {
    dataRows.push([
      idx + 1,
      r.student_name,
      r.reg_no,
      r.year,
      r.department,
      r.event_name,
      r.college_name || '',
      r.event_date ? new Date(r.event_date).toLocaleDateString('en-IN') : '',
      r.participation_type || '',
      r.team_name || '',
      r.result || '',
      r.certificate_drive_link || '',   // col index 11 → Excel column L
      r.verified_on ? new Date(r.verified_on).toLocaleDateString('en-IN') : '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(dataRows);

  // ── Inject hyperlinks for drive link cells (column L, rows 2 onward) ──
  rows.forEach((r, idx) => {
    const link = r.certificate_drive_link;
    if (link && link.startsWith('http')) {
      const cellAddr = `L${idx + 2}`; // row 1 = header, data starts at row 2
      if (ws[cellAddr]) {
        ws[cellAddr].l = { Target: link, Tooltip: 'Open Certificate' };
        ws[cellAddr].v = 'View Certificate';
        ws[cellAddr].t = 's';
      }
    }
  });

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // S.No
    { wch: 22 },  // Student Name
    { wch: 16 },  // Register No
    { wch: 6 },   // Year
    { wch: 14 },  // Department
    { wch: 28 },  // Event Name
    { wch: 30 },  // Host College
    { wch: 14 },  // Event Date
    { wch: 16 },  // Participation Type
    { wch: 18 },  // Team Name
    { wch: 14 },  // Result
    { wch: 22 },  // Certificate Drive Link
    { wch: 14 },  // Verified On
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Achievements');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { appendToExcel, generateExcelBuffer };
