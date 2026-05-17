const { query } = require('../config/database');

const ReportModel = {
  // ─── Department-level summary ─────────────────────────────────────────────────
  getDepartmentSummary: async (cycleId) => {
    const result = await query(
      `SELECT
        d.id AS department_id,
        d.name AS department,
        COUNT(DISTINCT u.id) AS total_employees,
        COUNT(g.id) FILTER (WHERE g.status != 'cancelled') AS total_goals,
        COUNT(g.id) FILTER (WHERE g.status = 'completed') AS completed_goals,
        COUNT(g.id) FILTER (WHERE g.status IN ('approved','in_progress')) AS active_goals,
        COUNT(g.id) FILTER (WHERE g.status = 'submitted') AS pending_approval,
        ROUND(AVG(
          CASE WHEN g.target_value > 0 THEN g.current_value / g.target_value * 100 ELSE 0 END
        ), 2) AS avg_progress
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.status = 'active'
       LEFT JOIN goals g ON g.employee_id = u.id AND ($1::uuid IS NULL OR g.cycle_id = $1)
       GROUP BY d.id, d.name
       ORDER BY d.name`,
      [cycleId || null]
    );
    return result.rows;
  },

  // ─── Employee scorecard ───────────────────────────────────────────────────────
  getEmployeeScorecard: async (employeeId, cycleId) => {
    const result = await query(
      `SELECT
        u.id, u.employee_id AS emp_code,
        u.first_name || ' ' || u.last_name AS full_name,
        u.job_title, d.name AS department,
        gc.name AS cycle_name, gc.quarter, gc.year,
        COUNT(g.id) FILTER (WHERE g.status != 'cancelled') AS total_goals,
        COALESCE(SUM(g.weightage) FILTER (WHERE g.status != 'cancelled'), 0) AS total_weightage,
        COUNT(g.id) FILTER (WHERE g.status = 'completed') AS completed,
        COUNT(g.id) FILTER (WHERE g.status = 'in_progress') AS in_progress,
        COUNT(g.id) FILTER (WHERE g.status IN ('draft','submitted')) AS pending,
        ROUND(AVG(
          CASE WHEN g.target_value > 0 THEN g.current_value / g.target_value * 100 ELSE 0 END
        ) FILTER (WHERE g.status NOT IN ('draft','cancelled')), 2) AS avg_progress,
        ROUND(SUM(
          g.weightage * CASE WHEN g.target_value > 0
            THEN LEAST(g.current_value / g.target_value, 1) ELSE 0 END
        ) FILTER (WHERE g.status NOT IN ('draft','cancelled')), 2) AS weighted_score
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN goals g ON g.employee_id = u.id AND ($2::uuid IS NULL OR g.cycle_id = $2)
       LEFT JOIN goal_cycles gc ON gc.id = $2
       WHERE u.id = $1
       GROUP BY u.id, u.employee_id, u.first_name, u.last_name, u.job_title, d.name, gc.name, gc.quarter, gc.year`,
      [employeeId, cycleId || null]
    );
    return result.rows[0] || null;
  },

  // ─── Team overview for manager ────────────────────────────────────────────────
  getTeamReport: async (managerId, cycleId) => {
    const result = await query(
      `SELECT
        u.id, u.first_name || ' ' || u.last_name AS full_name, u.job_title,
        COUNT(g.id) FILTER (WHERE g.status != 'cancelled') AS total_goals,
        COUNT(g.id) FILTER (WHERE g.status = 'submitted') AS pending_approval,
        COUNT(g.id) FILTER (WHERE g.status = 'completed') AS completed,
        ROUND(AVG(
          CASE WHEN g.target_value > 0 THEN g.current_value / g.target_value * 100 ELSE 0 END
        ) FILTER (WHERE g.status NOT IN ('draft','cancelled')), 2) AS avg_progress
       FROM users u
       LEFT JOIN goals g ON g.employee_id = u.id AND ($2::uuid IS NULL OR g.cycle_id = $2)
       WHERE u.manager_id = $1 AND u.status = 'active'
       GROUP BY u.id, u.first_name, u.last_name, u.job_title
       ORDER BY u.first_name`,
      [managerId, cycleId || null]
    );
    return result.rows;
  },

  // ─── Goal distribution ────────────────────────────────────────────────────────
  getGoalDistribution: async (cycleId) => {
    const [byStatus, byCategory] = await Promise.all([
      query(
        `SELECT status, COUNT(*) AS count
         FROM goals
         WHERE ($1::uuid IS NULL OR cycle_id = $1)
         GROUP BY status ORDER BY count DESC`,
        [cycleId || null]
      ),
      query(
        `SELECT category, COUNT(*) AS count,
                ROUND(AVG(weightage), 2) AS avg_weightage
         FROM goals
         WHERE ($1::uuid IS NULL OR cycle_id = $1) AND status != 'cancelled'
         GROUP BY category ORDER BY count DESC`,
        [cycleId || null]
      ),
    ]);
    return { byStatus: byStatus.rows, byCategory: byCategory.rows };
  },

  // ─── Overall stats for admin ──────────────────────────────────────────────────
  getAdminDashboard: async (cycleId) => {
    const result = await query(
      `SELECT
        (SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
        (SELECT COUNT(*) FROM users WHERE role = 'employee' AND status = 'active') AS total_employees,
        (SELECT COUNT(*) FROM goals WHERE ($1::uuid IS NULL OR cycle_id = $1) AND status != 'cancelled') AS total_goals,
        (SELECT COUNT(*) FROM goals WHERE ($1::uuid IS NULL OR cycle_id = $1) AND status = 'submitted') AS pending_approvals,
        (SELECT COUNT(*) FROM goals WHERE ($1::uuid IS NULL OR cycle_id = $1) AND status = 'completed') AS completed_goals,
        (SELECT COUNT(*) FROM check_ins WHERE ($1::uuid IS NULL OR cycle_id = $1)) AS total_checkins,
        (SELECT ROUND(AVG(
          CASE WHEN target_value > 0 THEN current_value / target_value * 100 ELSE 0 END
        ), 2) FROM goals WHERE ($1::uuid IS NULL OR cycle_id = $1) AND status NOT IN ('draft','cancelled')) AS avg_progress`,
      [cycleId || null]
    );
    return result.rows[0];
  },

  // ─── Goal Cycles ──────────────────────────────────────────────────────────────
  getAllCycles: async () => {
    const result = await query(
      'SELECT * FROM goal_cycles ORDER BY year DESC, quarter DESC'
    );
    return result.rows;
  },

  // ─── Recent Activity Feed ─────────────────────────────────────────────────────
  getRecentActivity: async (limit = 10) => {
    const result = await query(
      `SELECT
         al.id, al.action, al.entity_type, al.new_values, al.created_at,
         u.first_name || ' ' || u.last_name AS user_name, u.role
       FROM audit_logs al
       JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  getActiveCycle: async () => {
    const result = await query(
      "SELECT * FROM goal_cycles WHERE is_active = true LIMIT 1"
    );
    return result.rows[0] || null;
  },

  // ─── Monthly completion trend (for admin area chart) ──────────────────────────
  getMonthlyTrend: async (cycleId) => {
    const result = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', ci.check_in_date), 'Mon') AS month,
         EXTRACT(MONTH FROM ci.check_in_date)                   AS month_num,
         ROUND(AVG(ci.progress_percent), 2)                     AS completion,
         COUNT(DISTINCT ci.employee_id)                         AS employees
       FROM check_ins ci
       WHERE ($1::uuid IS NULL OR ci.cycle_id = $1)
       GROUP BY DATE_TRUNC('month', ci.check_in_date), EXTRACT(MONTH FROM ci.check_in_date)
       ORDER BY month_num`,
      [cycleId || null]
    );
    return result.rows;
  },

  // ─── Quarter-on-quarter trend (for admin line chart) ─────────────────────────
  getQuarterlyTrend: async () => {
    const result = await query(
      `SELECT
         gc.name AS quarter,
         gc.year,
         gc.quarter AS q_num,
         ROUND(COALESCE(AVG(
           CASE WHEN g.target_value > 0
                THEN LEAST(g.current_value / g.target_value * 100, 100)
                ELSE 0 END
         ), 0), 2) AS completion
       FROM goal_cycles gc
       LEFT JOIN goals g ON g.cycle_id = gc.id
         AND g.status NOT IN ('cancelled','draft')
       GROUP BY gc.id, gc.name, gc.year, gc.quarter
       ORDER BY gc.year, gc.quarter
       LIMIT 8`
    );
    return result.rows;
  },

  // ─── Top performers leaderboard ───────────────────────────────────────────────
  getLeaderboard: async (cycleId, limit = 10) => {
    const result = await query(
      `SELECT
         u.first_name || ' ' || u.last_name AS name,
         COUNT(g.id) FILTER (WHERE g.status NOT IN ('cancelled','draft')) AS goals,
         ROUND(COALESCE(AVG(
           CASE WHEN g.target_value > 0
                THEN LEAST(g.current_value / g.target_value * 100, 100)
                ELSE 0 END
         ) FILTER (WHERE g.status NOT IN ('cancelled','draft')), 0), 2) AS score
       FROM users u
       LEFT JOIN goals g ON g.employee_id = u.id
         AND ($1::uuid IS NULL OR g.cycle_id = $1)
       WHERE u.role = 'employee' AND u.status = 'active'
       GROUP BY u.id, u.first_name, u.last_name
       ORDER BY score DESC NULLS LAST
       LIMIT $2`,
      [cycleId || null, limit]
    );
    return result.rows;
  },

  // ─── Manager dashboard: team progress + approval breakdown ───────────────────
  getManagerDashboardData: async (managerId, cycleId) => {
    const [teamRows, approvalRows] = await Promise.all([
      query(
        `SELECT
           u.id,
           u.first_name || ' ' || u.last_name AS name,
           d.name AS department,
           COUNT(g.id) FILTER (WHERE g.status NOT IN ('cancelled'))           AS total_goals,
           COUNT(g.id) FILTER (WHERE g.status = 'completed')                  AS goals_completed,
           COUNT(g.id) FILTER (WHERE g.status = 'submitted')                  AS pending_approval,
           ROUND(COALESCE(AVG(
             CASE WHEN g.target_value > 0
                  THEN LEAST(g.current_value / g.target_value * 100, 100)
                  ELSE 0 END
           ) FILTER (WHERE g.status NOT IN ('cancelled','draft')), 0), 2)     AS progress,
           CASE
             WHEN COALESCE(AVG(CASE WHEN g.target_value > 0
                  THEN g.current_value / g.target_value * 100 ELSE 0 END), 0) >= 80 THEN 'Completed'
             WHEN COALESCE(AVG(CASE WHEN g.target_value > 0
                  THEN g.current_value / g.target_value * 100 ELSE 0 END), 0) >= 50 THEN 'On Track'
             ELSE 'At Risk'
           END AS quarterly_status
         FROM users u
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN goals g ON g.employee_id = u.id
           AND ($2::uuid IS NULL OR g.cycle_id = $2)
         WHERE u.manager_id = $1 AND u.status = 'active'
         GROUP BY u.id, u.first_name, u.last_name, d.name
         ORDER BY u.first_name`,
        [managerId, cycleId || null]
      ),
      query(
        `SELECT
           COUNT(*) FILTER (WHERE g.status = 'submitted')                    AS pending,
           COUNT(*) FILTER (WHERE g.status IN ('approved','in_progress','completed')) AS approved,
           COUNT(*) FILTER (WHERE g.status = 'rejected')                     AS rejected
         FROM goals g
         JOIN users u ON g.employee_id = u.id
         WHERE u.manager_id = $1
           AND ($2::uuid IS NULL OR g.cycle_id = $2)`,
        [managerId, cycleId || null]
      ),
    ]);
    return { team: teamRows.rows, approvalStats: approvalRows.rows[0] };
  },

  // ─── Employee dashboard: stats + goals + quarterly check-in trend ────────────
  getEmployeeDashboardData: async (employeeId, cycleId) => {
    const [statsRows, goalRows, trendRows] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status NOT IN ('cancelled'))          AS total_goals,
           COUNT(*) FILTER (WHERE status = 'completed')                 AS completed_goals,
           COUNT(*) FILTER (WHERE status IN ('draft','submitted'))       AS not_started,
           COUNT(*) FILTER (WHERE status IN ('approved','in_progress')) AS in_progress,
           ROUND(COALESCE(AVG(
             CASE WHEN target_value > 0
                  THEN LEAST(current_value / target_value * 100, 100)
                  ELSE 0 END
           ) FILTER (WHERE status NOT IN ('draft','cancelled')), 0), 2) AS avg_progress
         FROM goals
         WHERE employee_id = $1
           AND ($2::uuid IS NULL OR cycle_id = $2)`,
        [employeeId, cycleId || null]
      ),
      query(
        `SELECT id, title, category, weightage, target_value, current_value,
                unit_of_measure, status, due_date
         FROM goals
         WHERE employee_id = $1
           AND ($2::uuid IS NULL OR cycle_id = $2)
           AND status != 'cancelled'
         ORDER BY created_at`,
        [employeeId, cycleId || null]
      ),
      query(
        `SELECT
           gc.name    AS quarter,
           gc.quarter AS q_num,
           100        AS planned,
           ROUND(COALESCE(AVG(ci.progress_percent), 0), 2) AS actual
         FROM goal_cycles gc
         LEFT JOIN check_ins ci ON ci.cycle_id = gc.id AND ci.employee_id = $1
         WHERE gc.year = EXTRACT(YEAR FROM NOW())
         GROUP BY gc.id, gc.name, gc.quarter
         ORDER BY gc.quarter`,
        [employeeId]
      ),
    ]);
    return {
      stats:          statsRows.rows[0],
      goals:          goalRows.rows,
      quarterlyTrend: trendRows.rows,
    };
  },
};

module.exports = ReportModel;
