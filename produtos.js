// Catálogo com busca, filtro e ordenação

const catalogo = document.getElementById("catalogo");
const pesquisa = document.getElementById("pesquisa");
const preco = document.getElementById("preco");
const ordenar = document.getElementById("ordenar");
const filtros = document.querySelectorAll(".filtro-categoria");
const limpar = document.getElementById("limpar");

let produtos = [];

function mostrarProdutos(lista){
    catalogo.innerHTML = "";

    lista.forEach(produto => {
        catalogo.innerHTML += `
            <div class="produto">
                <div class="imagem">
                    ${produto.estoque === false ? `<span class="selo-esgotado">ESGOTADO</span>` : ""}
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>
                <h4>${produto.nome}</h4>
                <p>R$ ${produto.preco.toFixed(2).replace(".",",")}</p>
                ${
                    produto.estoque !== false
                    ? `<button onclick="comprar('${produto.nome}', ${produto.preco})">Comprar</button>`
                    : `<button class="esgotado" disabled>Esgotado</button>`
                }
            </div>
        `;
    });
}

mostrarProdutos(produtos);

pesquisa.addEventListener("input", filtrarProdutos);
preco.addEventListener("change", filtrarProdutos);
ordenar.addEventListener("change", filtrarProdutos);

filtros.forEach(filtro => {
    filtro.addEventListener("change", filtrarProdutos);
});

limpar.addEventListener("click", () => {
    pesquisa.value = "";
    preco.value = "todos";
    ordenar.value = "recente";
    filtros.forEach(filtro => filtro.checked = false);
    filtrarProdutos();
});

function filtrarProdutos(){
    let resultado = [...produtos];

    const texto = pesquisa.value.toLowerCase().trim();
    if(texto != ""){
        resultado = resultado.filter(produto => produto.nome.toLowerCase().includes(texto));
    }

    let categorias = [];
    filtros.forEach(filtro => {
        if(filtro.checked) categorias.push(filtro.value);
    });

    if(categorias.length > 0){
        resultado = resultado.filter(produto => categorias.includes(produto.categoria));
    }

    if(preco.value != "todos"){
        resultado = resultado.filter(produto => produto.preco <= Number(preco.value));
    }

    if(ordenar.value == "menor"){
        resultado.sort((a,b) => a.preco - b.preco);
    } else if(ordenar.value == "maior"){
        resultado.sort((a,b) => b.preco - a.preco);
    } else if(ordenar.value == "az"){
        resultado.sort((a,b) => a.nome.localeCompare(b.nome));
    } else if(ordenar.value == "za"){
        resultado.sort((a,b) => b.nome.localeCompare(a.nome));
    }

    mostrarProdutos(resultado);
}

fetch(`${API_URL}/api/produtos`)
    .then(res => res.json())
    .then(dados => {
        produtos = dados;
        mostrarProdutos(produtos);
    })
    .catch(erro => {
        console.error("Erro ao carregar produtos:", erro);
    });
