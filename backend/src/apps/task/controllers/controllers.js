const Task = require('../models/models');
const handleServerError = require('../../../middlewares/errorHandler');

/**
 * Get user tasks controller
 * 
 * Retrieves filtered and paginated tasks for the authenticated user with optional
 * query parameters for filtering by status, date, and pagination. Implements
 * performance monitoring and comprehensive filtering capabilities.
 * 
 * Task retrieval flow:
 * 1. Starts performance timer for request monitoring
 * 2. Extracts and validates query parameters with defaults
 * 3. Builds base filter for user-specific tasks (user_id)
 * 4. Applies optional status filter with validation
 * 5. Applies optional date filter with day-range calculation
 * 6. Executes database query with constructed filters
 * 7. Implements pagination with limit and skip
 * 8. Returns filtered tasks with metadata
 * 
 * @see {@link https://docs.mongodb.com/manual/tutorial/query-documents/} MongoDB Query Documentation
 * @see {@link https://mongoosejs.com/docs/queries.html} Mongoose Query Documentation
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date} JavaScript Date Object
 * 
 */
const getUserTasks = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Get query parameters for optional filters
    const { status, date, limit = 50, page = 1 } = req.query;
    
    // Build base filter (only user tasks)
    const filter = { user_id: req.user.id };
    
    // Add additional filters
    if (status && ['to do', 'in process', 'finished'].includes(status)) {
      filter.status = status;
    }
    
    if (date) {
      const targetDate = new Date(date);
      if (!isNaN(targetDate.getTime())) {
        // Filter by day
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        filter.task_date = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }
    }

    // Set pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    //Sort by task date (most recent first)
    const tasks = await Task.find(filter)
      .lean() // Returns flat JS objects 
      .sort({ task_date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination (only if needed)
    const totalTasks = await Task.countDocuments(filter);
    
    const responseTime = Date.now() - startTime;
    
    res.status(200).json({
      success: true,
      message: 'Tasks successfully found',
      data: {
        tasks,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTasks / parseInt(limit)),
          totalTasks,
          tasksPerPage: parseInt(limit),
          hasNextPage: skip + tasks.length < totalTasks,
          hasPrevPage: parseInt(page) > 1
        }
      },
      meta: {
        responseTime: `${responseTime}ms`,
        count: tasks.length
      }
    });

  } catch (error) {
    return handleServerError(error, 'Get user tasks', res);
  }
};

/**
 * Create task controller
 * 
 * Creates a new task for the authenticated user with provided task details.
 * Automatically associates the task with the authenticated user and handles
 * task creation with comprehensive error handling and validation.
 * 
 * Task creation flow:
 * 1. Extracts task details from request body
 * 2. Creates new Task instance with provided data
 * 3. Automatically assigns authenticated user ID to task
 * 4. Validates task data against schema requirements
 * 5. Saves new task to database
 * 6. Returns success response with created task details
 * 7. Handles errors with environment-aware logging
 * 
 * @see {@link https://mongoosejs.com/docs/validation.html} Mongoose Validation
 * @see {@link https://mongoosejs.com/docs/middleware.html} Mongoose Middleware
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/201} HTTP 201 Created
 */
const createTask = async (req, res) => {
  try {
    const { title, detail, status, task_date } = req.body;

    if (!title || !status || !task_date) {
      return res.status(400).json({ message: "Not all required fields have been entered." })
    };

    if (title.length > 50) {
      return res.status(400).json({ message: "Title cannot exceed 50 characters." })
    };

    if (detail.length > 500) {
      return res.status(400).json({ message: "Detail cannot exceed 50 characters." })
    };

    const newTask = new Task({
      title,
      detail,
      status,
      task_date,
      user_id: req.user.id,
    });

    const savedTask = await newTask.save();

    res.status(201).json({
      message: `Task created successfully with id: ${savedTask.id}`,
      task: savedTask,
    });
  } catch (error) {
    return handleServerError(error, 'Create user task', res);
  }
};

const edit = async (req, res) => {
  try {
    const {title, detail, status, task_date, remember} = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    // Check if all required fields are provided
    if (!title || !status || !task_date) {
      return res.status(400).json({ message: "Not all required fields have been entered." })
    };
    
    // Validate field lengths
    if (title.length > 50) {
      return res.status(400).json({ message: "Title cannot exceed 50 characters." })
    };
    if (detail.length > 500) {
      return res.status(400).json({ message: "Detail cannot exceed 50 characters." })
    };

    // Validate task_date is not in the past
    const today = new Date();
    if (task_date < today) {
      return res.status(400).json({ message: "Task date cannot be in the past, must be in the future." });
    }

    // Updating the fields that were fulfilled and aproved
    if (title) task.title = title;
    if (detail) task.detail = detail;
    if (status && ['to do', 'in process', 'finished'].includes(status)) task.status = status;
    if (task_date) task.task_date = task_date;
    if (remember && typeof remember === 'boolean') task.remember = remember;

    await task.save();
    return res.status(200).json({ message: 'Task updated successfully' });

  } catch (error){
    return handleServerError(error, 'Update task', res);
  }
}

module.exports = { createTask, getUserTasks, edit };
