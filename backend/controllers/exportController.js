const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');

const COLLEGE_NAME = 'SVHEC – Sri Venkateswara College of Engineering';
const PERIOD_LABELS = {
  1: '09:05 - 09:55', 2: '09:55 - 10:45', 3: '11:00 - 11:50',
  4: '11:50 - 12:40', 5: '01:40 - 02:30', 6: '02:30 - 03:20', 7: '03:35 - 04:25'
};

const pad2 = n => String(n).padStart(2, '0');

// Generic helper to format filters
const buildFilterDesc = (q) => {
  const parts = [];
  if (q.department) parts.push(`Dept: ${q.department}`);
  if (q.year)       parts.push(`Year: ${q.year}`);
  if (q.section)    parts.push(`Sec: ${q.section}`);
  if (q.date)       parts.push(`Date: ${q.date}`);
  if (q.from)       parts.push(`From: ${q.from}`);
  if (q.to)         parts.push(`To: ${q.to}`);
  return parts.length ? parts.join(' | ') : 'None';
};

// Fetch data logic mapping
const fetchExportData = async (type, q) => {
  const filter = {};
  if (q.department) filter.department = q.department;
  if (q.year)       filter.year = Number(q.year);
  if (q.section)    filter.section = q.section;

  const dateFilter = {};
  if (q.from || q.to) {
    dateFilter.date = {};
    if (q.from) dateFilter.date.$gte = q.from;
    if (q.to)   dateFilter.date.$lte = q.to;
  } else if (q.date) {
    dateFilter.date = q.date;
  }

  if (type === 'daily') {
    const targetDate = q.date || new Date().toISOString().split('T')[0];
    const students = await Student.find(filter).sort({ registerNumber: 1 });
    const records = await Attendance.find({ date: targetDate });
    const teachers = await Teacher.find({}).select('teacherId name');
    const teacherMap = {};
    teachers.forEach(t => { teacherMap[t.teacherId] = t.name; });

    const rows = [];
    students.forEach(s => {
      const sRecs = records.filter(r => r.studentRegisterNumber === s.registerNumber);
      if (sRecs.length === 0) {
        rows.push({
          'Register Number': s.registerNumber,
          'Student Name': s.name,
          'Department': s.department,
          'Section': s.section,
          'Period': '-',
          'Subject': '-',
          'Faculty': '-',
          'Status': '-'
        });
      } else {
        sRecs.forEach(r => {
          rows.push({
            'Register Number': s.registerNumber,
            'Student Name': s.name,
            'Department': s.department,
            'Section': s.section,
            'Period': `Hour ${r.period}`,
            'Subject': r.subject,
            'Faculty': teacherMap[r.teacherId] || r.teacherId,
            'Status': r.status
          });
        });
      }
    });
    return {
      title: 'Daily Attendance Report',
      fields: ['Register Number', 'Student Name', 'Department', 'Section', 'Period', 'Subject', 'Faculty', 'Status'],
      data: rows
    };
  }

  if (type === 'student') {
    const students = await Student.find(filter).sort({ registerNumber: 1 });
    const allRecords = await Attendance.find(dateFilter);

    const rows = students.map(s => {
      const recs = allRecords.filter(r => r.studentRegisterNumber === s.registerNumber);
      const total = recs.length;
      const present = recs.filter(r => ['Present', 'OD', 'Late'].includes(r.status)).length;
      const absent = total - present;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        'Register Number': s.registerNumber,
        'Student Name': s.name,
        'Department': s.department,
        'Section': s.section,
        'Total Classes': total,
        'Present': present,
        'Absent': absent,
        'Attendance Percentage': `${percentage}%`
      };
    }).filter(r => r['Total Classes'] > 0);

    return {
      title: 'Student Attendance Summary',
      fields: ['Register Number', 'Student Name', 'Department', 'Section', 'Total Classes', 'Present', 'Absent', 'Attendance Percentage'],
      data: rows
    };
  }

  if (type === 'faculty') {
    const teachers = await Teacher.find({}).select('-password');
    const allRecords = await Attendance.find(dateFilter);

    const rows = teachers.map(t => {
      const tRecs = allRecords.filter(r => r.teacherId === t.teacherId);
      const subjects = [...new Set(tRecs.map(r => r.subject))].join(', ') || '-';
      const hoursTaken = [...new Set(tRecs.map(r => `${r.date}-${r.period}`))].length;
      const present = tRecs.filter(r => ['Present', 'OD', 'Late'].includes(r.status)).length;
      const total = tRecs.length;
      const avgAttendance = total > 0 ? Math.round((present / total) * 100) : 0;

      return {
        'Faculty Name': t.name,
        'Faculty ID': t.teacherId,
        'Department': t.department,
        'Subjects Handled': subjects,
        'Hours Taken': hoursTaken,
        'Avg Attendance': `${avgAttendance}%`
      };
    });

    return {
      title: 'Faculty Attendance Summary',
      fields: ['Faculty Name', 'Faculty ID', 'Department', 'Subjects Handled', 'Hours Taken', 'Avg Attendance'],
      data: rows
    };
  }

  // Fallback default
  return { title: 'Attendance Report', fields: [], data: [] };
};

// Main controller function
exports.exportReport = async (req, res) => {
  const { type, format } = req.query;

  if (!type || !format) {
    return res.status(400).json({ message: 'Specify report type and format (excel|csv|pdf).' });
  }

  try {
    const { title, fields, data } = await fetchExportData(type, req.query);

    if (data.length === 0) {
      return res.status(404).json({ message: 'No records found to export.' });
    }

    const filename = `${title.replace(/\s+/g, '_')}_${Date.now()}`;
    const filterDesc = buildFilterDesc(req.query);
    const adminName = req.user?.name || 'Administrator';

    // ── Excel format ──────────────────────────────────────────────────────────
    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(title);

      ws.columns = fields.map(f => ({ header: f, key: f, width: 15 }));

      // Add styled header rows
      ws.mergeCells(1, 1, 1, fields.length);
      ws.getCell('A1').value = COLLEGE_NAME;
      ws.getCell('A1').font = { bold: true, size: 16, color: { argb: 'FF1B5E20' } }; // Corporate Green
      ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

      ws.mergeCells(2, 1, 2, fields.length);
      ws.getCell('A2').value = title;
      ws.getCell('A2').font = { bold: true, size: 12 };
      ws.getCell('A2').alignment = { horizontal: 'center' };

      ws.mergeCells(3, 1, 3, fields.length);
      ws.getCell('A3').value = `Filters: ${filterDesc} | Generated: ${new Date().toLocaleString()} | By: ${adminName}`;
      ws.getCell('A3').font = { italic: true, size: 10 };
      ws.getCell('A3').alignment = { horizontal: 'center' };

      ws.addRow([]); // Blank spacer

      // Header row
      const headerRow = ws.addRow(fields);
      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
        c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      // Data rows
      data.forEach(item => {
        const row = ws.addRow(fields.map(f => item[f]));
        row.eachCell(c => {
          c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
      });

      // Auto fit columns
      ws.columns.forEach(col => {
        let maxLen = 12;
        col.eachCell(c => {
          if (c.value && String(c.value).length > maxLen) maxLen = String(c.value).length;
        });
        col.width = Math.min(maxLen + 4, 30);
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return wb.xlsx.write(res).then(() => res.end());
    }

    // ── CSV format ────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send('\uFEFF' + csv);
    }

    // ── PDF format ────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      doc.pipe(res);

      // Title header
      doc.font('Helvetica-Bold').fontSize(16).fillColor('#1B5E20').text(COLLEGE_NAME, { align: 'center' });
      doc.fontSize(12).fillColor('#333333').text(title, { align: 'center' });
      doc.font('Helvetica-Oblique').fontSize(9).text(`Filters: ${filterDesc} | By: ${adminName}`, { align: 'center' });
      doc.moveDown(2);

      // Table layout calculation
      const tableTop = doc.y;
      const colWidth = (515 / fields.length);

      // Render Table Headers
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32');
      fields.forEach((f, idx) => {
        doc.text(f, 40 + (idx * colWidth), tableTop, { width: colWidth, align: 'left' });
      });

      doc.moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).strokeColor('#2E7D32').stroke();
      doc.moveDown(0.8);

      // Render Table Rows
      doc.font('Helvetica').fontSize(8).fillColor('#333333');
      data.forEach((row, rowIdx) => {
        const currentY = doc.y;
        if (currentY > 730) {
          doc.addPage();
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#2E7D32');
          fields.forEach((f, idx) => {
            doc.text(f, 40 + (idx * colWidth), 40, { width: colWidth, align: 'left' });
          });
          doc.moveTo(40, 54).lineTo(555, 54).strokeColor('#2E7D32').stroke();
          doc.font('Helvetica').fontSize(8).fillColor('#333333');
          doc.y = 65;
        }

        const yPos = doc.y;
        fields.forEach((f, colIdx) => {
          doc.text(String(row[f] || '-'), 40 + (colIdx * colWidth), yPos, { width: colWidth - 5, align: 'left' });
        });
        doc.moveTo(40, yPos + 12).lineTo(555, yPos + 12).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
        doc.y = yPos + 15;
      });

      // Signature Area
      doc.moveDown(3);
      const signatureY = doc.y;
      if (signatureY > 700) {
        doc.addPage();
      }
      doc.font('Helvetica-Bold').fontSize(9).text('Prepared By:', 40, doc.y);
      doc.text('Approved By:', 420, doc.y);
      doc.moveDown(2);
      doc.font('Helvetica').text('_____________________', 40, doc.y);
      doc.text('_____________________', 420, doc.y);

      doc.end();
      return;
    }

    res.status(400).json({ message: 'Unsupported export format.' });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({ message: error.message });
  }
};
