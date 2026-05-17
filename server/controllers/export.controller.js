const exceljs = require('exceljs');
const { parse } = require('json2csv');
const { query } = require('../config/database');
const ReportModel = require('../models/report.model');

/**
 * Helper to set headers and stream response
 */
const sendExportResponse = async (res, data, type, filenamePrefix) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (type === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filenamePrefix}-${timestamp}.csv"`);
    
    if (!data || data.length === 0) return res.send('');
    
    try {
      const csv = parse(data);
      return res.send(csv);
    } catch (err) {
      console.error('CSV Export Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate CSV' });
    }
  } else {
    // Excel
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenamePrefix}-${timestamp}.xlsx"`);
    
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Data');
    
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]).map(key => ({
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Convert to Title Case
        key: key,
        width: 20
      }));
      worksheet.columns = columns;
      worksheet.addRows(data);
    }
    
    try {
      await workbook.xlsx.write(res);
      return res.end();
    } catch (err) {
      console.error('Excel Export Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to generate Excel' });
    }
  }
};

/**
 * GET /api/v1/exports/goals
 * Exports all goals with user and department context
 */
const exportGoals = async (req, res, next) => {
  try {
    const { format = 'excel', cycleId } = req.query;
    let cycleCond = '1=1';
    const params = [];
    if (cycleId) {
      cycleCond = 'g.cycle_id = $1';
      params.push(cycleId);
    }

    const result = await query(
      `SELECT g.title AS goal_title, g.category, g.weightage, g.status AS goal_status, 
              g.target_value, g.current_value, g.unit_of_measure, g.due_date,
              u.first_name || ' ' || u.last_name AS employee_name,
              u.email AS employee_email,
              d.name AS department_name,
              gc.name AS cycle_name, gc.quarter, gc.year,
              approver.first_name || ' ' || approver.last_name AS approved_by
       FROM goals g
       JOIN users u ON g.employee_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       JOIN goal_cycles gc ON g.cycle_id = gc.id
       LEFT JOIN users approver ON g.approved_by = approver.id
       WHERE ${cycleCond}
       ORDER BY d.name, u.last_name, g.created_at`,
      params
    );

    await sendExportResponse(res, result.rows, format, 'goals-export');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/exports/audit-logs
 * Exports audit logs
 */
const exportAuditLogs = async (req, res, next) => {
  try {
    const { format = 'excel', action, from, to } = req.query;
    
    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (action) { conditions.push(`al.action = $${idx++}`); params.push(action.toUpperCase()); }
    if (from) { conditions.push(`al.created_at >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`al.created_at <= $${idx++}`); params.push(to); }

    const where = conditions.join(' AND ');

    const result = await query(
      `SELECT al.action, al.entity_type, al.entity_id, 
              al.created_at, al.ip_address,
              u.first_name || ' ' || u.last_name AS performed_by,
              u.email AS user_email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT 10000`, // Protect against massive DB dumps
      params
    );

    await sendExportResponse(res, result.rows, format, 'audit-logs');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/exports/users
 * Exports user directory
 */
const exportUsers = async (req, res, next) => {
  try {
    const { format = 'excel', status, role } = req.query;
    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`u.status = $${idx++}`); params.push(status); }
    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role); }

    const where = conditions.join(' AND ');

    const result = await query(
      `SELECT u.employee_id, u.first_name, u.last_name, u.email, 
              u.role, u.status, u.job_title, u.last_login_at,
              d.name AS department_name,
              m.first_name || ' ' || m.last_name AS manager_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE ${where}
       ORDER BY u.last_name`,
      params
    );

    await sendExportResponse(res, result.rows, format, 'users-export');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  exportGoals,
  exportAuditLogs,
  exportUsers
};
