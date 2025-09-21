const API_PORT = import.meta.env.VITE_BACKEND_PORT

export class EditProfileController {
  constructor() {
    this.form = null
    this.avatarInput = null
    this.avatarPreview = null
    this.selectedAvatarFile = null;
    this.passwordToggle = null
    this.confirmPasswordToggle = null
    this.isPasswordVisible = false
    this.isConfirmPasswordVisible = false
  }

  init() {
    console.log("Initializing Edit Profile Controller...")
    this.bindElements()
    this.bindEvents()
    this.loadUserData()
  }

  bindElements() {
    this.form = document.getElementById('profileForm')
    this.avatarInput = document.getElementById('avatarInput')
    this.avatarPreview = document.getElementById('avatarPreview')
    this.avatarContainer = document.querySelector('.avatar-preview');
    this.avatarContainer.addEventListener('click', () => this.triggerAvatarUpload());
    this.passwordToggle = document.getElementById('passwordToggle')
    this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle')
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    const changeAvatarBtn = document.getElementById('changeAvatarBtn');
    if (changeAvatarBtn) {
      changeAvatarBtn.addEventListener('click', () => this.uploadAvatar());
    }

    if (this.avatarPreview) {
      this.avatarPreview.addEventListener('click', () => this.triggerAvatarUpload());
    }

    if (this.avatarInput) {
      this.avatarInput.addEventListener('change', (e) => this.handleAvatarChange(e));
    }

    if (this.passwordToggle) {
      this.passwordToggle.addEventListener('click', () => this.togglePasswordVisibility())
    }

    if (this.confirmPasswordToggle) {
      this.confirmPasswordToggle.addEventListener('click', () => this.toggleConfirmPasswordVisibility())
    }

    const cancelBtn = document.getElementById('cancelBtn')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel())
    }

    const closeSuccessModal = document.getElementById('closeSuccessModal')
    if (closeSuccessModal) {
      closeSuccessModal.addEventListener('click', () => this.closeSuccessModal())
    }

    this.setupFormValidation()
  }

  setupFormValidation() {
    const inputs = this.form.querySelectorAll('input[required]')
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input))
      input.addEventListener('input', () => this.clearFieldError(input))
    })
  }

async loadUserData() {
  console.log("Loading user data...");

  const token = localStorage.getItem('token');
  console.log("Token usado:", token);

  if (!token) {
    console.error("No token found, user might not be logged in");
    return;
  }

  try {
    const response = await fetch(`${API_PORT}/api/users/get-info`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log("Response object:", response);

    if (!response.ok) {
      console.error(" Fetch failed with status:", response.status);
      const errorText = await response.text();
      console.error("Response body:", errorText);
      return;
    }

    const data = await response.json();
    console.log(" FULL BACKEND RESPONSE:", JSON.stringify(data, null, 2));

    this.populateForm(data);

  } catch (error) {
    console.error("Error loading user data:", error);
  }
}



  populateForm(userData) {
    console.log("populateForm called with:", userData)

    const nameInput = document.getElementById('userName')
    const emailInput = document.getElementById('userEmail')
    const ageInput = document.getElementById('userAge')
    const avatarPreview = document.getElementById('avatarPreview')

    if (nameInput) nameInput.value = userData.name || ""
    if (emailInput) emailInput.value = userData.email || ""
    if (ageInput) ageInput.value = userData.age || ""
    if (avatarPreview && userData.profile_picture) {
      avatarPreview.src = userData.profile_picture
    }
  }

  triggerAvatarUpload() {
    this.avatarInput?.click();
  }

  handleAvatarChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    this.selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = document.getElementById('avatarPreview');
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  async uploadAvatar() {
    if (!this.selectedAvatarFile) {
      alert('Select an image first');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', this.selectedAvatarFile);

    const token = localStorage.getItem('token');
    const res = await fetch(`${API_PORT}/api/users/upload-pfp`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      console.error(await res.text());
      alert('Error subiendo imagen');
      return;
    }
    alert('¡Avatar subido!');
  }


  togglePasswordVisibility() {
    const passwordInput = document.getElementById('userPassword')
    if (passwordInput) {
      this.isPasswordVisible = !this.isPasswordVisible
      passwordInput.type = this.isPasswordVisible ? 'text' : 'password'

      const eyeIcon = this.passwordToggle.querySelector('.eye-icon')
      if (eyeIcon) eyeIcon.textContent = this.isPasswordVisible ? '👁️' : '🙈'
    }
  }

  toggleConfirmPasswordVisibility() {
    const confirmPasswordInput = document.getElementById('confirmPassword')
    if (confirmPasswordInput) {
      this.isConfirmPasswordVisible = !this.isConfirmPasswordVisible
      confirmPasswordInput.type = this.isConfirmPasswordVisible ? 'text' : 'password'

      const eyeIcon = this.confirmPasswordToggle.querySelector('.eye-icon')
      if (eyeIcon) eyeIcon.textContent = this.isConfirmPasswordVisible ? '👁️' : '🙈'
    }
  }

  validateField(field) {
    const value = field.value.trim()
    const fieldName = field.name
    let isValid = true
    let errorMessage = ''

    this.clearFieldError(field)

    switch (fieldName) {
      case 'name':
        if (!value) {
          errorMessage = 'Name is required'
          isValid = false
        } else if (value.length < 2) {
          errorMessage = 'Name must be at least 2 characters'
          isValid = false
        } else if (value.length > 100) {
          errorMessage = 'Name must be less than 100 characters'
          isValid = false
        }
        break

      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!value) {
          errorMessage = 'Email is required'
          isValid = false
        } else if (!emailRegex.test(value)) {
          errorMessage = 'Please enter a valid email address'
          isValid = false
        }
        break

      case 'age':
        const age = parseInt(value)
        if (!value) {
          errorMessage = 'Age is required'
          isValid = false
        } else if (isNaN(age) || age < 13 || age > 122) {
          errorMessage = 'Age must be between 13 and 122'
          isValid = false
        }
        break

      case 'password':
        if (value && value.length < 8) {
          errorMessage = 'Password must be at least 8 characters'
          isValid = false
        } else if (value) {
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/
          if (!passwordRegex.test(value)) {
            errorMessage = 'Password must contain uppercase, lowercase, and number'
            isValid = false
          }
        }
        break

      case 'confirmPassword':
        const password = document.getElementById('userPassword').value
        if (value && value !== password) {
          errorMessage = 'Passwords do not match'
          isValid = false
        }
        break
    }

    if (!isValid) {
      this.showFieldError(field, errorMessage)
    }

    return isValid
  }

  showFieldError(field, message) {
    field.classList.add('error')
    const existingError = field.parentNode.querySelector('.field-error')
    if (existingError) existingError.remove()

    const errorDiv = document.createElement('div')
    errorDiv.className = 'field-error'
    errorDiv.textContent = message
    field.parentNode.appendChild(errorDiv)
  }

  clearFieldError(field) {
    field.classList.remove('error')
    const errorDiv = field.parentNode.querySelector('.field-error')
    if (errorDiv) errorDiv.remove()
  }

  validateForm() {
    const requiredFields = ['name', 'email', 'age']
    let isValid = true

    requiredFields.forEach(fieldName => {
      const field = document.querySelector(`[name="${fieldName}"]`)
      if (field && !this.validateField(field)) isValid = false
    })

    const passwordField = document.getElementById('userPassword')
    const confirmPasswordField = document.getElementById('confirmPassword')

    if (passwordField && passwordField.value) {
      if (!this.validateField(passwordField)) isValid = false
      if (confirmPasswordField && !this.validateField(confirmPasswordField)) isValid = false
    }

    return isValid
  }

  async handleFormSubmit(event) {
    event.preventDefault()

    if (!this.validateForm()) {
      showAlert('Please fix the errors before submitting', 'error', 'dashboard')
      return
    }

    const saveBtn = document.getElementById('saveBtn')
    const btnText = saveBtn.querySelector('.btn-text')
    const btnLoading = saveBtn.querySelector('.btn-loading')

    saveBtn.disabled = true
    btnText.style.display = 'none'
    btnLoading.style.display = 'inline'

    try {
      await this.saveProfile()
      this.showSuccessModal()
    } catch (error) {
      console.error('Error saving profile:', error)
      showAlert('Failed to save profile. Please try again.', 'error', 'dashboard')
    } finally {
      saveBtn.disabled = false
      btnText.style.display = 'inline'
      btnLoading.style.display = 'none'
    }
  }

  async saveProfile() {
    const formData = new FormData(this.form)
    const profileData = {
      name: formData.get('name'),
      email: formData.get('email'),
      age: parseInt(formData.get('age')),
      password: formData.get('password') || undefined
    }

    if (!profileData.password) delete profileData.password

    console.log('Saving profile data:', profileData)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_PORT}/api/users/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error updating profile")
      }

      const data = await response.json()
      console.log("Profile updated successfully:", data)

      localStorage.setItem('userData', JSON.stringify(data))
      return data
    } catch (error) {
      console.error("Error in saveProfile:", error)
      throw error
    }
  }

  showSuccessModal() {
    const modal = document.getElementById('successModal')
    if (modal) modal.style.display = 'flex'
  }

  closeSuccessModal() {
    const modal = document.getElementById('successModal')
    if (modal) modal.style.display = 'none'
    window.location.href = '../dashboard/dashboard.html';
  }

  handleCancel() {
    const hasChanges = this.hasUnsavedChanges()
    if (hasChanges) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }
    window.location.href = '../dashboard/dashboard.html';
  }

  hasUnsavedChanges() {
    const passwordField = document.getElementById('userPassword')
    return passwordField && passwordField.value.trim() !== ''
  }
}

function initializeEditProfile() {
  console.log("Initializing edit profile page...")
  const editProfileController = new EditProfileController()
  window.editProfileController = editProfileController
  editProfileController.init()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEditProfile)
} else {
  initializeEditProfile()
}