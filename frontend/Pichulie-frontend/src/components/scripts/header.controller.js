const API_PORT = import.meta.env.VITE_BACKEND_PORT

// JWT Token handling functions
function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

function getTokenFromStorage() {
    // Check multiple storage locations
    return localStorage.getItem('token') || 
            localStorage.getItem('authToken') || 
            localStorage.getItem('jwt') ||
            sessionStorage.getItem('token');
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
                .map(word => word.charAt(0).toUpperCase())
                .join('')
                .substring(0, 2);
}

async function fetchUserData(token) {
    try {
        // Replace with your actual API endpoint
        const response = await fetch(`${API_PORT}/api/users/get-info`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

async function updateUserDisplay() {
    const token = getTokenFromStorage();
    
    if (!token) {
        console.warn('No token found');
        document.getElementById('userName').textContent = 'Guest';
        document.getElementById('userInitials').textContent = 'G';
        return;
    }

    const decoded = decodeJWT(token);
    if (!decoded) {
        console.error('Failed to decode token');
        return;
    }

    // Since token only has email and id, use email as temporary display
    const userEmail = decoded.email || 'User';
    const userId = decoded.id || decoded.sub;

    // Show email initially (or just "Loading...")
    document.getElementById('userName').textContent = '';
    document.getElementById('userInitials').textContent = '...';

    // Fetch user data from API to get the actual name and profile picture
    if (userId) {
        const userData = await fetchUserData(token);
        if (userData) {
            // Now update with real name from API
            const realName = userData.name || userEmail.split('@')[0]; // fallback to email username
            
            document.getElementById('userName').textContent = realName;
            document.getElementById('userInitials').textContent = getInitials(realName);

            // Handle profile picture
            const profilePicture = userData.profile_picture;
            
            console.log('Profile picture URL:', profilePicture); // Debug
            
            if (profilePicture && profilePicture !== 'default-avatar.png' && profilePicture !== null) {
                const profileImg = document.getElementById('profilePicture');
                const initialsSpan = document.getElementById('userInitials');
                
                profileImg.src = profilePicture;
                profileImg.style.display = 'block';
                initialsSpan.style.display = 'none';
                
                profileImg.onerror = function() {
                    console.error('Failed to load profile image:', profilePicture);
                    this.style.display = 'none';
                    initialsSpan.style.display = 'flex';
                };
            }
        } else {
            // If API fails, at least show something from email
            const fallbackName = userEmail.split('@')[0];
            document.getElementById('userName').textContent = fallbackName;
            document.getElementById('userInitials').textContent = getInitials(fallbackName);
        }
    }
}

// Utility function to check if token is expired
function isTokenExpired(token) {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
            
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
}

// === User menu actions ===
function performLogout() {
    const tokenKeys = ['token', 'authToken', 'jwt'];
    tokenKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });

    window.top.location.href = '../../login.html';
}

function editProfile() {
    window.top.location.href = '../../profile/edit-profile.html';
}

// Call when page loads
document.addEventListener('DOMContentLoaded', function() {
    updateUserDisplay();

    const menuBtns = document.querySelectorAll(".menu__btn");

    menuBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const dropdown = btn.nextElementSibling;
            const isOpen = dropdown.classList.toggle("active");
            btn.setAttribute("aria-expanded", isOpen);
            dropdown.setAttribute("aria-hidden", !isOpen);
        });
    });

    // Cerrar menú al hacer click fuera
    document.addEventListener("click", e => {
        menuBtns.forEach(btn => {
            const dropdown = btn.nextElementSibling;
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove("active");
                btn.setAttribute("aria-expanded", "false");
                dropdown.setAttribute("aria-hidden", "true");
            }
        });
    });

    // Eventos para Edit y Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const editBtn = document.getElementById('editProfileBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
    if (editBtn) editBtn.addEventListener('click', editProfile);
});

// Optional: Listen for storage changes (if user logs in/out in another tab)
window.addEventListener('storage', function(e) {
    if (e.key === 'token' || e.key === 'authToken') {
        updateUserDisplay();
    }
});

// Optional: Auto-refresh token if needed
function setupTokenRefresh() {
    const token = getTokenFromStorage();
    if (!token) return;

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return;

    const timeToExpiry = (decoded.exp * 1000) - Date.now();
    const refreshTime = timeToExpiry - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    if (refreshTime > 0) {
        setTimeout(() => {
            // Implement token refresh logic here
            console.log('Token refresh needed');
        }, refreshTime);
    }
}