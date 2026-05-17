const { query } = require('../config/database');
const logger = require('../utils/logger');

const NotificationService = {
  /**
   * Create a notification for a user
   */
  create: async ({ userId, type, title, message, entityType, entityId }) => {
    try {
      const result = await query(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [userId, type, title, message, entityType, entityId]
      );
      return result.rows[0];
    } catch (err) {
      logger.warn('Notification create failed:', err.message);
    }
  },

  /**
   * Notify manager when goal is submitted
   */
  goalSubmitted: async (goal, employee, managerId) => {
    return NotificationService.create({
      userId: managerId,
      type: 'GOAL_SUBMITTED',
      title: 'New Goal Awaiting Approval',
      message: `${employee.first_name} ${employee.last_name} submitted goal: "${goal.title}"`,
      entityType: 'goal',
      entityId: goal.id,
    });
  },

  /**
   * Notify employee when goal is approved/rejected
   */
  goalDecision: async (goal, decision, employeeId, reason = null) => {
    return NotificationService.create({
      userId: employeeId,
      type: `GOAL_${decision.toUpperCase()}`,
      title: `Goal ${decision === 'approved' ? 'Approved' : 'Rejected'}`,
      message: decision === 'approved'
        ? `Your goal "${goal.title}" has been approved.`
        : `Your goal "${goal.title}" was rejected. Reason: ${reason}`,
      entityType: 'goal',
      entityId: goal.id,
    });
  },

  /**
   * Get unread notifications for a user
   */
  getUnread: async (userId) => {
    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 AND is_read = false
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Mark notifications as read
   */
  markRead: async (userId, notificationIds = null) => {
    if (notificationIds?.length) {
      await query(
        'UPDATE notifications SET is_read = true WHERE user_id = $1 AND id = ANY($2)',
        [userId, notificationIds]
      );
    } else {
      await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
    }
  },
};

module.exports = NotificationService;
