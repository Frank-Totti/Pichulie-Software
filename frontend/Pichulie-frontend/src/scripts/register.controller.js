const API_PORT = import.meta.env.VITE_BACKEND_PORT

document.getElementById("register").addEventListener("click", async function (e) {
    e.preventDefault();

    // Obtener valores de los inputs
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const passwordCheck = document.getElementById("passwordCheck").value;
    const name = document.getElementById("name").value;
    const age = document.getElementById("age").value;

    try {
        // Llamada al endpoint de registro
        const response = await fetch(`${API_PORT}/api/users/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password, passwordCheck, name, age })
        });

        if (response.status === 409) {
            alert("Ya existe un usuario con ese correo");
            return;
        }

        if (response.status === 400) {
            const data = await response.json();
            alert(data.message);
            return;
        }

        if (!response.ok) {
            throw new Error("Error en la petición: " + response.status);
        }

        const data = await response.json();

        alert("Registro exitoso, ahora puedes iniciar sesión");

        window.top.location.href = 'login.html'

    } catch (error) {
        alert(error.message);
    }
});