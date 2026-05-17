const { query } = require('../config/database');

const CheckInModel = {
  create: async ({ goalId, employeeId, cycleId, progressValue, progressPercent, status, employeeNotes }) => {
    const result = await query(
      `INSERT INTO check_ins
        (goal_id, employee_id, cycle_id, progress_value, progress_percent, status, employee_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [goalId, employeeId, cycleId, progressValue, progressPercent, status, employeeNotes]
    );
    // Update goal's current value
    if (progressValue !== undefined) {
      await query('UPDATE goals SET current_value = $1 WHERE id = $2', [progressValue, goalId]);
    }
    return result.rows[0];
  },

  findAll: async ({ goalId, employeeId, cycleId, managerId, limit, offset }) => {
    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (goalId) { conditions.push(`ci.goal_id = $${idx++}`); params.push(goalId); }
    if (employeeId) { conditions.push(`ci.employee_id = $${idx++}`); params.push(employeeId); }
    if (cycleId) { conditions.push(`ci.cycle_id = $${idx++}`); params.push(cycleId); }
    if (managerId) {
      conditions.push(`ci.employee_id IN (SELECT id FROM users WHERE manager_id = $${idx++})`);
      params.push(managerId);
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM check_ins ci WHERE ${where}`, params);

    const rows = await query(
      `SELECT ci.*,
              g.title AS goal_title, g.target_value, g.weightage,
              u.first_name || ' ' || u.last_name AS employee_name,
              gc.name AS cycle_name,
              m.first_name || ' ' || m.last_name AS manager_name
       FROM check_ins ci
       JOIN goals g ON ci.goal_id = g.id
       JOIN users u ON ci.employee_id = u.id
       JOIN goal_cycles gc ON ci.cycle_id = gc.id
       LEFT JOIN users m ON ci.manager_id = m.id
       WHERE ${where}
       ORDER BY ci.check_in_date DESC, ci.created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { rows: rows.rows, total: parseInt(countRes.rows[0].count) };
  },

  findById: async (id) => {
    const result = await query(
      `SELECT ci.*,
              g.title AS goal_title, g.target_value, g.weightage, g.status AS goal_status,
              u.first_name || ' ' || u.last_name AS employee_name,
              gc.name AS cycle_name
       FROM check_ins ci
       JOIN goals g ON ci.goal_id = g.id
       JOIN users u ON ci.employee_id = u.id
       JOIN goal_cycles gc ON ci.cycle_id = gc.id
       WHERE ci.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  addManagerFeedback: async (id, { managerNotes, managerId }) => {
    const result = await query(
      `UPDATE check_ins
       SET manager_notes = $1, manager_id = $2, reviewed_at = NOW()
       WHERE id = $3 RETURNING *`,
      [managerNotes, managerId, id]
    );
    return result.rows[0];
  },

  getGoalProgress: async (goalId) => {
    const result = await query(
      `SELECT
        COUNT(*) AS total_checkins,
        ROUND(AVG(progress_percent), 2) AS avg_progress,
        MAX(progress_percent) AS latest_progress,
        json_agg(
          json_build_object(
            'date', check_in_date,
            'progress', progress_percent,
            'status', status
          ) ORDER BY check_in_date
        ) AS timeline
       FROM check_ins
       WHERE goal_id = $1`,
      [goalId]
    );
    return result.rows[0];
  },
};

module.exports = CheckInModel;
