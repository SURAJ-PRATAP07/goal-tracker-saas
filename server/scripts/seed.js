require('dotenv').config({ path: __dirname + '/../.env' });
const { pool, query } = require('../config/database');
const bcrypt = require('bcryptjs');

async function seed() {
  console.log('Starting seed process...');

  try {
    // 1. Wipe data (except users to keep logins alive, but let's safely reset some standard users if we want to)
    console.log('Wiping old demo data (goals, check-ins, audit logs, cycles, key results)...');
    await query('TRUNCATE TABLE audit_logs, check_ins, key_results, goals, goal_cycles CASCADE');

    // 2. Insert Goal Cycles
    console.log('Inserting goal cycles...');
    const now = new Date();
    const currentYear = now.getFullYear();
    const cycleQ1Id = '11111111-1111-1111-1111-111111111111';
    const cycleQ2Id = '22222222-2222-2222-2222-222222222222';
    const cycleQ3Id = '33333333-3333-3333-3333-333333333333';
    const cycleQ4Id = '44444444-4444-4444-4444-444444444444';
    
    await query(`
      INSERT INTO goal_cycles (id, name, year, quarter, start_date, end_date, is_active) VALUES
      ($1, 'Q1 ${currentYear}', $2, 1, '${currentYear}-01-01', '${currentYear}-03-31', false),
      ($3, 'Q2 ${currentYear}', $2, 2, '${currentYear}-04-01', '${currentYear}-06-30', true),
      ($4, 'Q3 ${currentYear}', $2, 3, '${currentYear}-07-01', '${currentYear}-09-30', false),
      ($5, 'Q4 ${currentYear}', $2, 4, '${currentYear}-10-01', '${currentYear}-12-31', false)
    `, [cycleQ1Id, currentYear, cycleQ2Id, cycleQ3Id, cycleQ4Id]);

    // 3. Find some users
    const userRes = await query('SELECT * FROM users');
    let users = userRes.rows;
    
    // If no users, we need to create them. Let's create a standard set.
    if (users.length === 0) {
      console.log('No users found. Creating demo users...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('password123', salt);

      const adminId = 'a1111111-1111-1111-1111-111111111111';
      const managerId = 'b2222222-2222-2222-2222-222222222222';
      const emp1Id = 'c3333333-3333-3333-3333-333333333333';
      const emp2Id = 'c4444444-4444-4444-4444-444444444444';

      await query(`
        INSERT INTO users (id, first_name, last_name, email, password_hash, role, employee_id, department, job_title) VALUES
        ($1, 'Alice', 'Admin', 'admin@example.com', $5, 'admin', 'EMP-001', 'Operations', 'System Administrator'),
        ($2, 'Mark', 'Manager', 'manager@example.com', $5, 'manager', 'EMP-002', 'Engineering', 'Engineering Manager'),
        ($3, 'Emma', 'Employee', 'employee@example.com', $5, 'employee', 'EMP-003', 'Engineering', 'Software Engineer'),
        ($4, 'Dave', 'Dev', 'dave@example.com', $5, 'employee', 'EMP-004', 'Engineering', 'Frontend Developer')
      `, [adminId, managerId, emp1Id, emp2Id, hash]);

      await query(`UPDATE users SET manager_id = $1 WHERE id IN ($2, $3)`, [managerId, emp1Id, emp2Id]);
      
      users = (await query('SELECT * FROM users')).rows;
    }

    const admin = users.find(u => u.role === 'admin') || users[0];
    const manager = users.find(u => u.role === 'manager') || users[1] || users[0];
    const employees = users.filter(u => u.role === 'employee' && u.manager_id === manager.id);
    const emp1 = employees[0] || users[2] || manager;
    const emp2 = employees[1] || users[3] || emp1;

    console.log('Users mapped. Creating goals...');

    // 4. Create Goals
    // Q1 Past Goals (Completed)
    const goalQ1_1 = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, category, weightage, target_value, current_value, unit_of_measure, status, due_date)
      VALUES ($1, $2, 'Launch v1.0 MVP', 'performance', 100, 100, 100, 'Percentage', 'completed', '${currentYear}-03-15') RETURNING id
    `, [emp1.id, cycleQ1Id]);

    // Q2 Active Goals (Employee 1)
    const goalQ2_1 = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, description, category, weightage, target_value, current_value, unit_of_measure, status, due_date)
      VALUES ($1, $2, 'Reduce API latency by 30%', 'Optimize primary database queries', 'performance', 40, 30, 15, 'Numeric', 'in_progress', '${currentYear}-06-15') RETURNING id
    `, [emp1.id, cycleQ2Id]);

    const goalQ2_2 = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, description, category, weightage, target_value, current_value, unit_of_measure, status, due_date)
      VALUES ($1, $2, 'Complete AWS Certification', 'Cloud Practitioner', 'learning', 20, 1, 0, 'Numeric', 'approved', '${currentYear}-06-30') RETURNING id
    `, [emp1.id, cycleQ2Id]);

    // Shared Goal from Manager to Employee 1 & 2
    const sharedParent = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, category, weightage, target_value, current_value, unit_of_measure, status, is_shared)
      VALUES ($1, $2, 'Team Q2 Deliverables Release', 'operational', 40, 100, 50, 'Percentage', 'in_progress', true) RETURNING id
    `, [manager.id, cycleQ2Id]);

    const sharedChild1 = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, category, weightage, target_value, current_value, unit_of_measure, status, is_shared, parent_goal_id)
      VALUES ($1, $2, 'Team Q2 Deliverables Release', 'operational', 40, 100, 50, 'Percentage', 'in_progress', true, $3) RETURNING id
    `, [emp1.id, cycleQ2Id, sharedParent.rows[0].id]);

    const sharedChild2 = await query(`
      INSERT INTO goals (employee_id, cycle_id, title, category, weightage, target_value, current_value, unit_of_measure, status, is_shared, parent_goal_id)
      VALUES ($1, $2, 'Team Q2 Deliverables Release', 'operational', 30, 100, 40, 'Percentage', 'in_progress', true, $3) RETURNING id
    `, [emp2.id, cycleQ2Id, sharedParent.rows[0].id]);

    console.log('Goals created. Inserting Check-ins...');

    // 5. Create Check-ins
    await query(`
      INSERT INTO check_ins (goal_id, employee_id, cycle_id, check_in_date, progress_value, progress_percent, status, employee_notes, manager_notes) VALUES
      ($1, $2, $3, '${currentYear}-04-15', 5, 17, 'on_track', 'Started indexing optimizations.', 'Good start.'),
      ($1, $2, $3, '${currentYear}-05-01', 10, 33, 'at_risk', 'Hit a blocker with caching layer.', 'Let us discuss in 1:1'),
      ($1, $2, $3, '${currentYear}-05-15', 15, 50, 'on_track', 'Blocker resolved, deployed to staging.', 'Great job.')
    `, [goalQ2_1.rows[0].id, emp1.id, cycleQ2Id]);

    await query(`
      INSERT INTO check_ins (goal_id, employee_id, cycle_id, check_in_date, progress_value, progress_percent, status, employee_notes, manager_notes) VALUES
      ($1, $2, $3, '${currentYear}-05-10', 50, 50, 'on_track', 'Halfway through the release tasks.', 'Keep it up.')
    `, [sharedChild1.rows[0].id, emp1.id, cycleQ2Id]);

    console.log('Check-ins created. Generating Audit Logs...');

    // 6. Generate Audit Logs
    const auditLogs = [
      { action: 'CREATE', entity: 'goal', user: emp1.id, details: { title: 'Reduce API latency by 30%' } },
      { action: 'SUBMIT', entity: 'goal', user: emp1.id, details: { status: 'submitted' } },
      { action: 'APPROVE', entity: 'goal', user: manager.id, details: { status: 'approved' } },
      { action: 'CREATE', entity: 'goal', user: manager.id, details: { parent: 'Team Q2 Deliverables Release', childCount: 2 } },
      { action: 'UPDATE', entity: 'checkin', user: emp1.id, details: { progress: '50%' } }
    ];

    for (let log of auditLogs) {
      await query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
        VALUES ($1, $2, $3, $4, $5)
      `, [log.user, log.action, log.entity, goalQ2_1.rows[0].id, JSON.stringify(log.details)]);
    }

    console.log('Demo data successfully seeded!');
    process.exit(0);

  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seed();
