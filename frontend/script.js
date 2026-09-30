fetch("http://localhost:8080/api/clientes")
    .then(response => response.json())
    .then(clientes => {

        const container = document.getElementById("clientes");

        clientes.forEach(cliente => {

            const elemento = document.createElement("p");

            elemento.textContent =
                cliente.id + " - " + cliente.nome;

            container.appendChild(elemento);
        });

    })
    .catch(error => {

        console.error("Erro:", error);

    });