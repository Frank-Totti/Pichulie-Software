const API_PORT = import.meta.env.VITE_BACKEND_PORT

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("recover");
    const resultado = document.getElementById("resultado");
  
    form.addEventListener("click", async (e) => {
      e.preventDefault();
  
      const email = document.getElementById("email").value;
  
      try {
        const response = await fetch(`${API_PORT}/api/users/request-reset`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        });
  
        const data = await response.json();
  
        if (response.status === 400) {
          alert(data.message);
          return;
        }
  
        // Siempre mostrar mensaje genérico, incluso si el correo no existe
        resultado.innerText = data.message || "You will receive a reset link if the email exists.";
  
      } catch (error) {
        alert("Error: " + error.message);
      }
    });
  });
  