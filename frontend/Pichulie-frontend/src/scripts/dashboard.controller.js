const API_PORT = import.meta.env.VITE_BACKEND_PORT

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
}

class TaskManager {
  constructor() {
    this.tasks = {
      // Internamente trabajamos con las columnas del DOM: todo | inprocess | finished
      todo: [{ id: 1, title: "Do math homework", time: "7:30 AM", reminder: true }],
      inprocess: [{ id: 2, title: "Do english homework", time: "10:30 AM", reminder: false }],
      finished: [{ id: 3, title: "Do biology homework", time: "5:00 AM", reminder: false }],
    }

    // Mapear estados del backend <-> columnas del frontend
    this.statusToColumn = {
      "to do": "todo",
      "in process": "inprocess",
      "finished": "finished",
    }

    this.columnToStatus = {
      todo: "to do",
      inprocess: "in process",
      finished: "finished",
    }

    //this.currentDate = new Date()//.toISOString().split("T")[0];
    const savedDate = localStorage.getItem("currentDate");
    if (savedDate) {
        this.currentDate = new Date(savedDate);
    } else {
        this.currentDate = new Date();
        localStorage.setItem("currentDate", this.currentDate.toISOString());
    }
    //this.day = new Date().toISOString().split("T")[0];
    this.init()
  }

  init() {
    this.bindEvents()
    this.updateDateDisplay()
    this.renderTasks(this.currentDate.toISOString().split("T")[0])
    this.todayButton()
    
  }

  async todayButton(){
    document.getElementById("today").addEventListener("click", async (e) => {
      e.preventDefault();
      this.renderTasks(this.currentDate.toISOString().split("T")[0]);
    })
  }

  bindEvents() {

    // Add task buttons
    document.querySelector(".add-task-btn").addEventListener("click", () => this.openModal())
    document.querySelector(".add-task-main").addEventListener("click", () => this.openModal())

    // Modal events
    document.querySelector(".modal-close").addEventListener("click", () => this.closeModal())
    document.querySelector(".btn-cancel").addEventListener("click", () => this.closeModal())
    document.querySelector(".btn-save").addEventListener("click", () => this.saveTask())

    // Delete modal events
    document.getElementById("cancelDelete").addEventListener("click", () => this.closeDeleteModal())
    document.getElementById("confirmDelete").addEventListener("click", () => this.confirmDeleteTask())

    // Date navigation
    document.querySelector(".prev").addEventListener("click", () => this.changeDate(-1))
    document.querySelector(".next").addEventListener("click", () => this.changeDate(1))

    // Navigation menu
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", (e) => this.handleNavigation(e))
    })

    // Header dropdown toggle (hamburger) and profile actions
    const menuBtn = document.querySelector(".menu-icon")
    const headerDropdown = document.getElementById("headerDropdown")
    if (menuBtn) {
      menuBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        headerDropdown.classList.toggle("active")
        headerDropdown.setAttribute("aria-hidden", headerDropdown.classList.contains("active") ? "false" : "true")
      })
    }

    // Close dropdown when clicking elsewhere
    document.addEventListener("click", (e) => {
      if (headerDropdown && headerDropdown.classList.contains("active")) {
        // If click is outside the dropdown and outside the menu button
        const path = e.composedPath ? e.composedPath() : (e.path || [])
        if (!path.includes(headerDropdown) && !path.includes(menuBtn)) {
          headerDropdown.classList.remove("active")
          headerDropdown.setAttribute("aria-hidden", "true")
        }
      }
    })

    // Dropdown item actions
    const editProfileBtn = document.getElementById("editProfile")
    const logoutBtn = document.getElementById("logoutBtn")
    if (editProfileBtn) editProfileBtn.addEventListener("click", () => this.editProfile())
    if (logoutBtn) logoutBtn.addEventListener("click", () => this.performLogout())

    // Close modal on overlay click
    document.querySelector(".modal-overlay").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal()
      }
    })

    // Task menu actions
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("task-menu")) {
        e.stopPropagation()
        this.showContextMenu(e)
      } else {
        this.hideContextMenu()
      }
    })

    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("context-menu-item")) {
        this.handleContextMenuAction(e)
      }
    })
  }

  openModal(isEdit = false) {
    const modal = document.getElementById("taskModal")
    const modalTitle = document.getElementById("modalTitle")
    const actionBtn = document.getElementById("taskActionBtn")
    const cancelBtn = document.querySelector(".btn-cancel")

    // Set modal to create or edit mode
    if (isEdit) {
      modalTitle.textContent = "Edit Task"
      actionBtn.textContent = "EDIT"
      actionBtn.classList.add("edit-mode")
      cancelBtn.textContent = "DROP"
      cancelBtn.classList.add("drop-mode")
    } else {
      modalTitle.textContent = "Create Task"
      actionBtn.textContent = "CREATE"
      actionBtn.classList.remove("edit-mode")
      cancelBtn.textContent = "CANCEL"
      cancelBtn.classList.remove("drop-mode")
    }

    modal.classList.add("active")
    document.getElementById("taskTitle").focus()
  }

  closeModal() {
    document.getElementById("taskModal").classList.remove("active")
    this.clearModalForm()
    this.editingTask = null
  }

  clearModalForm() {
    document.getElementById("taskTitle").value = ""
    document.getElementById("taskDescription").value = ""
    document.getElementById("taskTime").value = "12:00"
    //document.getElementById("taskDate").value = new Date().toISOString().split("T")[0]
    document.getElementById("statusTodo").checked = true
    document.getElementById("taskReminder").checked = false
  }

  async saveTask() {
    const title = document.getElementById("taskTitle").value.trim();
    const time = document.getElementById("taskTime").value;
    const description = document.getElementById("taskDescription").value.trim();
    const reminder = document.getElementById("taskReminder").checked;
  
    // Validar status seleccionado
    const statusRadios = document.querySelectorAll('input[name="status"]');
    let status = "to do";
    for (const radio of statusRadios) {
      if (radio.checked) {
        status = radio.value;
        break;
      }
    }
  
    if (!title) {
      alert("Please enter a task title");
      return;
    }
  
    // Obtener token
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found. Please log in.");
      return;
    }
  
    // Generar fecha y hora en ISO
    let taskDateTime;
    if (time) {
      const dateStr = this.currentDate.toISOString().split("T")[0];
      taskDateTime = new Date(`${dateStr}T${time}:00`).toISOString();
    } else {
      taskDateTime = this.currentDate.toISOString();
    }
  
    try {
      let response;
  
      if (this.editingTask) {
        // ESTAMOS EDITANDO
        const taskId = this.editingTask.id;
        const updatedTask = {
          title,
          detail: description,
          remember: reminder,
          status,
          task_date: taskDateTime
        };
  
        response = await fetch(`${API_PORT}/api/task/edit/${taskId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(updatedTask)
        });
      } else {
        // CREANDO NUEVA TAREA
        const bodyData = {
          title,
          detail: description,
          status,
          task_date: taskDateTime
        };
  
        response = await fetch(`${API_PORT}/api/task/new`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(bodyData)
        });
      }
  
      console.log("Response status:", response.status);
      const rawText = await response.text();
      console.log("Raw response body:", rawText);
  
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${rawText}`);
      }
  
      const data = JSON.parse(rawText);
      console.log(this.editingTask ? "Task updated successfully:" : "Task created successfully:", data);
  
      alert(this.editingTask ? "Task updated successfully!" : "Task created successfully!");
  
      this.editingTask = null;
      await this.renderTasks(this.currentDate.toISOString().split("T")[0]);
      this.closeModal();
  
    } catch (error) {
      console.error("Error saving the task:", error);
      alert("An error occurred while saving the task. Check the console for details.");
    }
  }

  formatTime(time24) {
    if (!time24) return ""
    const [hours, minutes] = time24.split(":")
    const hour12 = hours % 12 || 12
    const ampm = hours >= 12 ? "PM" : "AM"
    return `${hour12}:${minutes} ${ampm}`
  }

  async renderTasks(fecha) {
    try {
        const token = localStorage.getItem("token");
        
        if (!token) {
            throw new Error("Authentication required - No token found");
        }

        // Decode token to get userId
        const decodedToken = decodeToken(token);
        if (!decodedToken || !decodedToken.id) {
            throw new Error("Invalid token format");
        }

        const userId = decodedToken.id; // Get userId from token

        if (!token) {
            console.warn("Missing auth data:", {
                token: !!token,
                userId: !!userId
            });
            throw new Error("Authentication required - Token: " + !!token + ", UserId: " + !!userId);
        }

        const response = await fetch(`${API_PORT}/api/task/by-date`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                user_id: userId,
                task_date: fecha
            })
        });

        // Log raw response for debugging
        const rawText = await response.text();

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} - ${rawText}`);
        }

        // Parse the response text
        const data = JSON.parse(rawText);

        // Clear current tasks
        this.tasks = {
            todo: [],
            inprocess: [],
            finished: []
        };

        // Map tasks from DB to columns
        if (data.tasks && Array.isArray(data.tasks)) {
            data.tasks.forEach(task => {
                // Verify task belongs to current user
                if (task.user_id === userId) {
                    const column = this.statusToColumn[task.status?.toLowerCase()];
                    if (column) {
                        this.tasks[column].push({
                            _id: task._id,
                            title: task.title,
                            description: task.detail,
                            time: new Date(task.task_date).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            }),
                            reminder: task.remember,
                            status: task.status,
                            user_id: task.user_id
                        });
                    }
                }
            });
        }

        // Render tasks in columns
        Object.keys(this.tasks).forEach(column => {
            const columnEl = document.querySelector(`.task-column[data-column="${column}"]`);
            if (!columnEl) {
                console.warn(`Column element not found: ${column}`);
                return;
            }

            // Clear existing tasks
            columnEl.innerHTML = '';

            // Add column title
            const titleEl = document.createElement('h2');
            titleEl.className = 'column-title';
            titleEl.textContent = column === 'inprocess' ? 'In Progress' : 
                                column === 'todo' ? 'To Do' : 'Finished';
            columnEl.appendChild(titleEl);

            // Create task list container
            const taskList = document.createElement('div');
            taskList.className = 'task-list';

            // Add tasks
            if (this.tasks[column].length === 0) {
                // Show empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'empty-state';
                emptyState.textContent = 'No tasks yet';
                taskList.appendChild(emptyState);
            } else {
                this.tasks[column].forEach(task => {
                    const taskCard = this.createTaskCard(task, column);
                    taskList.appendChild(taskCard);
                });
            }

            columnEl.appendChild(taskList);
        });

    } catch (error) {
        console.error("Error fetching tasks:", error);
        alert(`Error loading tasks: ${error.message}`);
    }
}

  createTaskCard(task, column) {
    const card = document.createElement("div")
    card.className = "task-card"
    // Usar _id si viene de Mongo, o id local como fallback
    card.dataset.taskId = task._id || task.id
    card.dataset.column = column

    card.innerHTML = `
            <div class="task-header">
                <h3 class="task-title">${task.title}</h3>
                <button class="task-menu">☰</button>
            </div>
            <div class="task-meta">
                ${task.reminder ? '<span class="task-reminder">Remember</span>' : ""}
                ${task.time ? `<span class="task-time">${task.time}</span>` : ""}
                ${column === "todo" && task.reminder ? '<span class="task-check">✓</span>' : ""}
            </div>
        `

    return card
  }

  showContextMenu(e) {
    this.hideContextMenu() // Hide any existing menu

    const taskCard = e.target.closest(".task-card")
    const taskId = taskCard.dataset.taskId
    const column = taskCard.dataset.column

    // Create context menu
    const contextMenu = document.createElement("div")
    contextMenu.className = "context-menu active"
    contextMenu.innerHTML = `
      <button class="context-menu-item" data-action="edit" data-task-id="${taskId}" data-column="${column}">
        Edit Task
      </button>
      <button class="context-menu-item delete" data-action="delete" data-task-id="${taskId}" data-column="${column}">
        Delete Task
      </button>
    `

    // Position the menu
    const rect = e.target.getBoundingClientRect()
    contextMenu.style.position = "fixed"
    contextMenu.style.left = `${rect.right + 5}px`
    contextMenu.style.top = `${rect.top}px`

    document.body.appendChild(contextMenu)

    // Store reference for cleanup
    this.activeContextMenu = contextMenu
  }

  hideContextMenu() {
    if (this.activeContextMenu) {
      this.activeContextMenu.remove()
      this.activeContextMenu = null
    }
  }

  handleContextMenuAction(e) {
    const action = e.target.dataset.action
    // Usar el id tal cual (Mongo _id es string)
    const taskId = e.target.dataset.taskId
    const column = e.target.dataset.column

    this.hideContextMenu()

    if (action === "edit") {
      this.editTask(taskId, column)
    } else if (action === "delete") {
      this.deleteTaskWithConfirmation(taskId, column)
    }
  }

  async saveEditedTask() {
    if (!this.editingTask) return;
  
    const taskId = this.editingTask.id;
  
    // Tomamos valores del modal
    const titleEl = document.getElementById("taskTitle");
    const descEl  = document.getElementById("taskDescription");
    const timeEl  = document.getElementById("taskTime");
    const remEl   = document.getElementById("taskReminder");
    const stTodo  = document.getElementById("statusTodo");
    const stIn    = document.getElementById("statusInProcess");
    const stFin   = document.getElementById("statusFinished");
  
    // Formamos la fecha final (ejemplo: usar hoy + hora seleccionada)
    let finalDate = null;
    if (timeEl?.value) {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      finalDate = new Date(`${today}T${timeEl.value}:00.000Z`);
    }
  
    const updatedTask = {
      title: titleEl?.value || "",
      detail: descEl?.value || "",
      task_date: finalDate, 
      remember: remEl?.checked || false,
      status: stTodo?.checked ? "to do" : stIn?.checked ? "in process" : "finished"
    };
  
    try {
      const token = localStorage.getItem("token"); // ⚡ importante: JWT
      const res = await fetch(`${API_PORT}/tasks/edit/${taskId}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(updatedTask)
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al actualizar la tarea");
      }
  
      console.log("Tarea actualizada:", data);
  
      this.closeModal();
      this.loadTasks();
  
    } catch (err) {
      console.error("Error al editar tarea:", err);
      alert(err.message || "No se pudo guardar la tarea");
    }
  }

  async editTask(taskId, column) {
    try {
      // Traemos la tarea desde el backend
      const task = await this.getTaskById(taskId);
      if (!task) return;
  
      // Rellenar modal con los datos traídos del backend
      const titleEl = document.getElementById("taskTitle");
      const descEl  = document.getElementById("taskDescription");
      const timeEl  = document.getElementById("taskTime");
      const remEl   = document.getElementById("taskReminder");
      const stTodo  = document.getElementById("statusTodo");
      const stIn    = document.getElementById("statusInProcess");
      const stFin   = document.getElementById("statusFinished");
  
      if (titleEl) titleEl.value = task.title || "";
      if (descEl)  descEl.value = task.detail || task.description || "";
      if (remEl)   remEl.checked = !!task.remember;
  
      // time input en formato HH:MM si existe task_date
      if (timeEl && task.task_date) {
        const d = new Date(task.task_date);
        timeEl.value = d.toTimeString().slice(0, 5); // "HH:MM"
      } else if (timeEl) {
        timeEl.value = "12:00";
      }
  
      // Seleccionar radio según estado
      if (stTodo) stTodo.checked = (task.status === "to do");
      if (stIn)   stIn.checked   = (task.status === "in process");
      if (stFin)  stFin.checked  = (task.status === "finished");
  
      // Guardamos info de edición y abrimos modal en modo edición
      this.editingTask = { id: taskId, column: this.statusToColumn[task.status] || column || "todo" };
      this.openModal(true);
  
    } catch (err) {
      console.error("Error al cargar tarea:", err);
      alert("No se pudo cargar la tarea. Mira la consola para más detalles.");
    }
  }
  
  convertTo24Hour(time12) {
    if (!time12) return "12:00"
    const [time, modifier] = time12.split(" ")
    let [hours, minutes] = time.split(":")
    if (hours === "12") {
      hours = "00"
    }
    if (modifier === "PM") {
      hours = Number.parseInt(hours, 10) + 12
    }
    return `${hours.toString().padStart(2, "0")}:${minutes}`
  }

  deleteTaskWithConfirmation(taskId, column) {
    const task = this.tasks[column].find((t) => (t._id || t.id) === taskId)
    if (!task) return

    this.showDeleteModal(task, taskId, column)
  }

  showDeleteModal(task, taskId, column) {
    const deleteModal = document.getElementById("deleteModal")
    const taskTitle = document.getElementById("deleteTaskTitle")
    const taskDescription = document.getElementById("deleteTaskDescription")

    taskTitle.textContent = task.title
    taskDescription.textContent =
      task.description ||
      "No description."
    
    this.taskToDelete = { id: taskId, column: column }

    deleteModal.classList.add("active")
  }

  closeDeleteModal() {
    document.getElementById("deleteModal").classList.remove("active")
    this.taskToDelete = null
  }

  confirmDeleteTask() {
    if (this.taskToDelete) {
      this.deleteTask(this.taskToDelete.id, this.taskToDelete.column)
      this.closeDeleteModal()
    }
  }

  moveTask(taskId, fromColumn, toColumn) {
    if (fromColumn === toColumn) return

    const taskIndex = this.tasks[fromColumn].findIndex((task) => (task._id || task.id) === taskId)
    if (taskIndex === -1) return

    const task = this.tasks[fromColumn].splice(taskIndex, 1)[0]
    this.tasks[toColumn].push(task)
    this.renderTasks(this.currentDate.toISOString().split("T")[0])
  }

  async deleteTask(taskId, column) {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Authentication required");
        }

        // Call API to delete task
        const response = await fetch(`${API_PORT}/api/task/delete/${taskId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // Remove from local state
        const taskIndex = this.tasks[column].findIndex((task) => (task._id || task.id) === taskId);
        if (taskIndex !== -1) {
            this.tasks[column].splice(taskIndex, 1);
            // Re-render tasks to update UI
            await this.renderTasks(this.currentDate.toISOString().split("T")[0]);
        }

        alert('Task deleted successfully');

    } catch (error) {
        console.error("Error deleting task:", error);
        alert("Error deleting task: " + error.message);
    }
}

  changeDate(direction) {
    this.currentDate.setDate(this.currentDate.getDate() + direction)
    localStorage.setItem("currentDate", this.currentDate);//.toISOString());
    this.updateDateDisplay()
    this.updateHeaderDate()
    this.renderTasks(this.currentDate.toISOString().split("T")[0])
  }

  updateDateDisplay() {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    document.querySelector(".month").textContent = months[this.currentDate.getMonth()]
    document.querySelector(".year").textContent = this.currentDate.getFullYear()
    document.querySelector(".day").textContent = this.currentDate.getDate().toString().padStart(2, "0")
  }

  updateHeaderDate() {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const dayName = days[this.currentDate.getDay()]
    const isToday = this.isToday(this.currentDate)

    document.querySelector(".date-title").textContent = `${dayName}${isToday ? " - Today" : ""}`
  }

  isToday(date) {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  handleNavigation(e) {
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active")
    })

    // Add active class to clicked item
    e.currentTarget.classList.add("active")

    // Handle different navigation actions
    const text = e.currentTarget.textContent.trim()

    switch (text) {
      case "Add task":
        this.openModal()
        break
      case "Search by date":
        this.handleSearchByDate()
        break
      case "Today":
        this.goToToday()
        break
      case "See all tasks":
        this.showAllTasks()
        break
      case "Trash":
        this.showTrash()
        break
    }
  }

  handleSearchByDate() {
    const dateInput = prompt("Enter date (YYYY-MM-DD):")
    if (dateInput) {
      const newDate = new Date(dateInput)
      if (!isNaN(newDate)) {
        this.currentDate = newDate
        this.updateDateDisplay()
        this.updateHeaderDate()
      }
    }
  }

  goToToday() {
    this.currentDate = new Date()
    this.updateDateDisplay()
    this.updateHeaderDate()
  }

  showAllTasks() {
    console.log("Show all tasks functionality")
    // Lógica para mostrar las tareas (Me falta)
  }

  showTrash() {
    console.log("Show trash functionality")
    // Lógica para mostrar la basura (Me falta)
  }

  /**
   * Performs user logout by calling backend endpoint and cleaning local storage
   */
  async performLogout() {
    try {
      // Get the stored token
      const token = localStorage.getItem('token');
      
      if (token) {
        // Call the backend logout endpoint
        const response = await fetch(`${API_PORT}/api/users/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log(data.message);
        } else {
          console.warn('Logout endpoint failed, but proceeding with client-side logout');
        }
      }

      // Clear localStorage regardless of backend response
      localStorage.removeItem('token');
      localStorage.removeItem('id');
      
      console.log('User logged out successfully');
      
      // Redirect to login page
      window.location.href = '../../index.html';
      
    } catch (error) {
      console.error('Error during logout:', error);
      
      // Even if there's an error, clear the session and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('id');
      window.location.href = '../../index.html';
    }
  }
  async editProfile(){

    window.location.href = '../profile/edit-profile.html';
  
  }

  async getTaskById(taskId) {
    try {
      const response = await fetch(`${API_PORT}/api/task/get-task/${taskId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}` // si usas JWT
        }
      });

      if (!response.ok) {
        throw new Error(`Error al obtener la tarea: ${response.status}`);
      }

      const task = await response.json();
      console.log("Tarea obtenida:", task);

      // Aquí puedes actualizar el DOM con los datos de la tarea
      // Ejemplo:
      const taskDetail = document.getElementById("taskDetail");
      if (taskDetail) {
        taskDetail.innerHTML = `
          <h2>${task.title}</h2>
          <p>${task.detail}</p>
          <p><strong>Estado:</strong> ${task.status}</p>
          <p><strong>Fecha:</strong> ${new Date(task.task_date).toLocaleString()}</p>
        `;
      }

      return task;
    } catch (error) {
      console.error("Error en getTaskById:", error);
    }
  }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  new TaskManager()
})

export default TaskManager