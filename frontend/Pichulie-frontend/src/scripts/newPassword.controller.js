// Extraer token de la URL (?token=...)
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");

const form = document.getElementById("resetForm");
const messageEl = document.getElementById("message");

form.addEventListener("click", async (e) => {
  e.preventDefault();

  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "Passwords do not match";
    messageEl.style.color = "red";
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword })
    });

    const data = await res.json();
    if (res.ok) {
      messageEl.textContent = "Password changed successfully. Redirecting...";
      messageEl.style.color = "green";
      setTimeout(() => {
        window.location.href = "index.html"; // login
      }, 1500);
    } else {
      messageEl.textContent = data.message || "Error resetting password";
      messageEl.style.color = "red";
    }
  } catch (err) {
    messageEl.textContent = "Server error";
    messageEl.style.color = "red";
  }
});
