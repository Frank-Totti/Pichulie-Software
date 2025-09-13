const express = require('express');
const { createTask, getUserTasks, edit } = require('../apps/task/controllers/controllers');
//const authMiddleware = require('../apps/task/middlewares/middlewares');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

/**
 * @route GET /tasks
 * @group Tasks - Task management operations  
 * @summary Get user's tasks (optimized ≤ 500ms)
 * @description Retrieves tasks for authenticated user with filtering and pagination
 * @security JWT
 */
router.get('/', authenticateToken, getUserTasks);

/**
 * @route POST /tasks/new
 * @group Tasks - Task management operations
 * @summary Create a new task
 * @security JWT
 */
router.post('/new', authenticateToken, createTask);

/**
 * @route PUT /tasks/update
 * @group Tasks - Task management operations
 * @summary Update a task
 * @security JWT
 */
router.put('/edit/:id', authenticateToken, edit);

module.exports = router;