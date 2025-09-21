const API_PORT = import.meta.env.VITE_BACKEND_PORT

document.getElementById("login").addEventListener("click",async function (e) {
    e.preventDefault();

    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    try {
        
        let response = await fetch(`${API_PORT}/api/users/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              email,password
            })
          });

        if (response.status === 401) {
            alert("Correo o contraseña incorrectos");
            return; // salir de la función
        }

        if (!response.ok) {
            //document.getElementById("resultado").innerText = "";
            throw new Error("Error en la petición: " + response.status);
        }

        let data = await response.json()

        localStorage.setItem("token", data.token);

        //document.getElementById("resultado").innerText = "Bienvenido " + data.user.name;

        window.location.href = "/src/pages/dashboard.html"; // Ajustar a view principal

    } catch (error) {
        alert(error.message);
      }
    
})