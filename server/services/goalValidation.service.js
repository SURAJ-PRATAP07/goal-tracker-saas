const GoalModel = require('../models/goal.model');
const { AppError } = require('../utils/response');

const MAX_GOALS = 8;
const MIN_WEIGHTAGE = 10;
const MAX_TOTAL_WEIGHTAGE = 100;

const GoalValidationService = {
  /**
   * Validate all constraints before creating or updating a goal
   */
  validateGoalConstraints: async ({ employeeId, cycleId, weightage, excludeGoalId = null }) => {
    // 1. Max goals per cycle
    const count = await GoalModel.getGoalCount(employeeId, cycleId, excludeGoalId);
    if (count >= MAX_GOALS) {
      throw new AppError(`Maximum of ${MAX_GOALS} goals allowed per cycle`, 400);
    }

    // 2. Min weightage
    if (weightage < MIN_WEIGHTAGE) {
      throw new AppError(`Minimum goal weightage is ${MIN_WEIGHTAGE}%`, 400);
    }

    // 3. Total weightage cap
    const current = await GoalModel.getTotalWeightage(employeeId, cycleId, excludeGoalId);
    if (current + parseFloat(weightage) > MAX_TOTAL_WEIGHTAGE) {
      throw new AppError(
        `Adding ${weightage}% would exceed 100% total weightage. Current: ${current}%, Available: ${MAX_TOTAL_WEIGHTAGE - current}%`,
        400
      );
    }

    return { currentCount: count, currentWeightage: current };
  },

  /**
   * Validate that total weightage equals exactly 100% before submission
   */
  validateSubmissionReadiness: async (employeeId, cycleId) => {
    const total = await GoalModel.getTotalWeightage(employeeId, cycleId);
    if (total !== MAX_TOTAL_WEIGHTAGE) {
      throw new AppError(
        `Total goal weightage must equal exactly 100% before submission. Current: ${total}%`,
        400
      );
    }

    const count = await GoalModel.getGoalCount(employeeId, cycleId);
    if (count === 0) {
      throw new AppError('You must have at least one goal before submitting', 400);
    }

    return { total, count };
  },
};

module.exports = GoalValidationService;
