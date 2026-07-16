// Setas dos carrosséis da home

const vitrines = document.querySelectorAll(".vitrine");

vitrines.forEach(vitrine => {
    const lista = vitrine.querySelector(".lista-produtos");
    const botaoDireita = vitrine.querySelector(".proximo");
    const botaoEsquerda = vitrine.querySelector(".anterior");

    botaoDireita.addEventListener("click", () => {
        lista.scrollBy({ left: 320, behavior: "smooth" });
    });

    botaoEsquerda.addEventListener("click", () => {
        lista.scrollBy({ left: -320, behavior: "smooth" });
    });
});

function criarCard(produto){
    return `
    <div class="produto">
        <img src="${produto.imagem}" alt="${produto.nome}">
        <h4>${produto.nome}</h4>
        <p>R$ ${produto.preco.toFixed(2).replace(".",",")}</p>
        ${
            produto.estoque !== false
            ? `<button onclick="comprar('${produto.nome}', ${produto.preco})">Comprar</button>`
            : `<button class="esgotado" disabled>Esgotado</button>`
        }
    </div>
    `;
}

// comprar() vem de dados.js, carregado antes deste arquivo

const listaLancamentos = document.getElementById("lancamentos");
const listaMaisVendidos = document.getElementById("maisVendidos");

if(listaLancamentos && listaMaisVendidos){
    fetch(`${API_URL}/api/produtos`)
        .then(res => res.json())
        .then(produtos => {
            produtos.slice(0,6).forEach(produto => {
                listaLancamentos.innerHTML += criarCard(produto);
            });
            produtos.slice(6,12).forEach(produto => {
                listaMaisVendidos.innerHTML += criarCard(produto);
            });
        });
}
