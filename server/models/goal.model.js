const { query, getClient } = require('../config/database');

const GoalModel = {
  // ─── Validation Helpers ──────────────────────────────────────────────────────
  getGoalCount: async (employeeId, cycleId, excludeId = null) => {
    const params = [employeeId, cycleId];
    const exclude = excludeId ? `AND id != $3` : '';
    if (excludeId) params.push(excludeId);
    const res = await query(
      `SELECT COUNT(*) FROM goals WHERE employee_id = $1 AND cycle_id = $2 AND status != 'cancelled' ${exclude}`,
      params
    );
    return parseInt(res.rows[0].count);
  },

  getChildGoalsCount: async (parentId) => {
    const res = await query(
      `SELECT COUNT(*) FROM goals WHERE parent_goal_id = $1 AND status != 'cancelled'`,
      [parentId]
    );
    return parseInt(res.rows[0].count);
  },

  getTotalWeightage: async (employeeId, cycleId, excludeId = null) => {
    const params = [employeeId, cycleId];
    const exclude = excludeId ? `AND id != $3` : '';
    if (excludeId) params.push(excludeId);
    const res = await query(
      `SELECT COALESCE(SUM(weightage), 0) AS total
       FROM goals
       WHERE employee_id = $1 AND cycle_id = $2 AND status != 'cancelled' ${exclude}`,
      params
    );
    return parseFloat(res.rows[0].total);
  },

  /** Returns true if a goal with the same title already exists for this employee+cycle */
  findDuplicateTitle: async (employeeId, cycleId, title, excludeId = null) => {
    const params = [employeeId, cycleId, title.trim().toLowerCase()];
    const excludeClause = excludeId ? `AND id != $4` : '';
    if (excludeId) params.push(excludeId);
    const res = await query(
      `SELECT id FROM goals
       WHERE employee_id = $1 AND cycle_id = $2
         AND LOWER(TRIM(title)) = $3
         AND status != 'cancelled'
         ${excludeClause}
       LIMIT 1`,
      params
    );
    return res.rows.length > 0;
  },

  /** Fetch approved/in_progress goals for the checkins page */
  getApprovedGoalsForCheckin: async (employeeId, cycleId) => {
    const res = await query(
      `SELECT g.id, g.title, g.category, g.weightage,
              g.target_value, g.current_value, g.unit_of_measure,
              g.status, g.due_date, g.cycle_id,
              gc.name AS cycle_name,
              (
                SELECT json_agg(
                  json_build_object(
                    'id', ci.id,
                    'check_in_date', ci.check_in_date,
                    'progress_value', ci.progress_value,
                    'progress_percent', ci.progress_percent,
                    'status', ci.status,
                    'employee_notes', ci.employee_notes,
                    'manager_notes', ci.manager_notes,
                    'reviewed_at', ci.reviewed_at
                  ) ORDER BY ci.check_in_date DESC
                )
                FROM check_ins ci
                WHERE ci.goal_id = g.id AND ci.employee_id = $1
              ) AS check_ins
       FROM goals g
       JOIN goal_cycles gc ON g.cycle_id = gc.id
       WHERE g.employee_id = $1
         AND ($2::uuid IS NULL OR g.cycle_id = $2)
         AND g.status IN ('approved', 'in_progress', 'completed')
       ORDER BY g.created_at`,
      [employeeId, cycleId || null]
    );
    return res.rows;
  },

  // ─── CRUD ────────────────────────────────────────────────────────────────────
  create: async ({ employeeId, cycleId, title, description, category, weightage, targetValue, unitOfMeasure, dueDate, isShared = false, parentGoalId = null }) => {
    const result = await query(
      `INSERT INTO goals
        (employee_id, cycle_id, title, description, category, weightage, target_value, unit_of_measure, due_date, is_shared, parent_goal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [employeeId, cycleId, title, description, category, weightage, targetValue, unitOfMeasure, dueDate, isShared, parentGoalId]
    );
    return result.rows[0];
  },

  findAll: async ({ employeeId, cycleId, status, category, approvedBy, managerId, limit, offset, sortField = 'created_at', sortOrder = 'DESC' }) => {
    let conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (employeeId) { conditions.push(`g.employee_id = $${idx++}`); params.push(employeeId); }
    if (cycleId) { conditions.push(`g.cycle_id = $${idx++}`); params.push(cycleId); }
    if (status) { conditions.push(`g.status = $${idx++}`); params.push(status); }
    if (category) { conditions.push(`g.category = $${idx++}`); params.push(category); }
    if (approvedBy) { conditions.push(`g.approved_by = $${idx++}`); params.push(approvedBy); }
    if (managerId) {
      conditions.push(`g.employee_id IN (SELECT id FROM users WHERE manager_id = $${idx++})`);
      params.push(managerId);
    }

    const where = conditions.join(' AND ');
    const countRes = await query(`SELECT COUNT(*) FROM goals g WHERE ${where}`, params);

    const rows = await query(
      `SELECT g.*,
              u.first_name || ' ' || u.last_name AS employee_name,
              u.employee_id AS emp_code,
              gc.name AS cycle_name,
              gc.quarter, gc.year,
              approver.first_name || ' ' || approver.last_name AS approved_by_name,
              (SELECT COUNT(*) FROM goals child WHERE child.parent_goal_id = g.id) AS child_count
       FROM goals g
       JOIN users u ON g.employee_id = u.id
       JOIN goal_cycles gc ON g.cycle_id = gc.id
       LEFT JOIN users approver ON g.approved_by = approver.id
       WHERE ${where}
       ORDER BY g.${sortField} ${sortOrder}
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return { rows: rows.rows, total: parseInt(countRes.rows[0].count) };
  },

  findById: async (id) => {
    const result = await query(
      `SELECT g.*,
              u.first_name || ' ' || u.last_name AS employee_name,
              u.email AS employee_email,
              u.employee_id AS emp_code,
              gc.name AS cycle_name, gc.quarter, gc.year, gc.start_date, gc.end_date,
              approver.first_name || ' ' || approver.last_name AS approved_by_name,
              (SELECT COUNT(*) FROM goals child WHERE child.parent_goal_id = g.id) AS child_count
       FROM goals g
       JOIN users u ON g.employee_id = u.id
       JOIN goal_cycles gc ON g.cycle_id = gc.id
       LEFT JOIN users approver ON g.approved_by = approver.id
       WHERE g.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  update: async (id, updates) => {
    const allowed = ['title', 'description', 'category', 'weightage', 'target_value', 'current_value', 'unit_of_measure', 'due_date', 'completion_notes'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col) && val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (!fields.length) return null;
    values.push(id);

    const result = await query(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  updateSharedChildren: async (parentId, updates) => {
    const allowed = ['title', 'description', 'category', 'target_value', 'unit_of_measure', 'due_date'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowed.includes(col) && val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    }

    if (!fields.length) return 0;
    values.push(parentId);

    const result = await query(
      `UPDATE goals SET ${fields.join(', ')} WHERE parent_goal_id = $${idx}`,
      values
    );
    return result.rowCount;
  },

  updateStatus: async (id, status, extra = {}) => {
    const extraFields = [];
    const extraValues = [];
    let idx = 3;

    if (extra.approvedBy) { extraFields.push(`approved_by = $${idx++}`); extraValues.push(extra.approvedBy); }
    if (extra.approvedAt !== undefined) { extraFields.push(`approved_at = $${idx++}`); extraValues.push(extra.approvedAt); }
    if (extra.rejectionReason !== undefined) { extraFields.push(`rejection_reason = $${idx++}`); extraValues.push(extra.rejectionReason); }
    if (extra.submittedAt !== undefined) { extraFields.push(`submitted_at = $${idx++}`); extraValues.push(extra.submittedAt); }

    const extraSql = extraFields.length ? ', ' + extraFields.join(', ') : '';
    const result = await query(
      `UPDATE goals SET status = $1 ${extraSql} WHERE id = $2 RETURNING *`,
      [status, id, ...extraValues]
    );
    return result.rows[0];
  },

  delete: async (id) => {
    const result = await query(
      "UPDATE goals SET status = 'cancelled' WHERE id = $1 AND status = 'draft' RETURNING id",
      [id]
    );
    return result.rows[0];
  },

  // ─── Key Results ─────────────────────────────────────────────────────────────
  addKeyResult: async (goalId, { title, description, target, dueDate }) => {
    const result = await query(
      `INSERT INTO key_results (goal_id, title, description, target, due_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [goalId, title, description, target, dueDate]
    );
    return result.rows[0];
  },

  getKeyResults: async (goalId) => {
    const result = await query(
      'SELECT * FROM key_results WHERE goal_id = $1 ORDER BY created_at',
      [goalId]
    );
    return result.rows;
  },

  updateKeyResult: async (id, updates) => {
    const result = await query(
      `UPDATE key_results SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        current = COALESCE($3, current),
        is_completed = COALESCE($4, is_completed)
       WHERE id = $5 RETURNING *`,
      [updates.title, updates.description, updates.current, updates.isCompleted, id]
    );
    return result.rows[0];
  },

  // ─── Stats ───────────────────────────────────────────────────────────────────
  getEmployeeGoalStats: async (employeeId, cycleId) => {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status != 'cancelled') AS total_goals,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft,
        COUNT(*) FILTER (WHERE status = 'submitted') AS submitted,
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COALESCE(SUM(weightage) FILTER (WHERE status != 'cancelled'), 0) AS total_weightage,
        COALESCE(AVG(
          CASE WHEN target_value > 0 THEN (current_value / target_value * 100) ELSE 0 END
        ) FILTER (WHERE status IN ('in_progress','completed')), 0) AS avg_progress
       FROM goals
       WHERE employee_id = $1 AND cycle_id = $2`,
      [employeeId, cycleId]
    );
    return result.rows[0];
  },

  getPendingApprovals: async (managerId) => {
    const result = await query(
      `SELECT g.*, u.first_name || ' ' || u.last_name AS employee_name,
              u.employee_id AS emp_code, gc.name AS cycle_name
       FROM goals g
       JOIN users u ON g.employee_id = u.id
       JOIN goal_cycles gc ON g.cycle_id = gc.id
       WHERE g.status = 'submitted'
         AND u.manager_id = $1
       ORDER BY g.submitted_at ASC`,
      [managerId]
    );
    return result.rows;
  },
};

module.exports = GoalModel;
