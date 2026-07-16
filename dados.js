
function criarModalCheckout(){

    if (document.getElementById("modal-checkout")) return;

    const estilo = document.createElement("style");
    estilo.textContent = `
        #modal-checkout {
            position: fixed; inset: 0; background: rgba(0,0,0,0.75);
            display: flex; align-items: center; justify-content: center;
            z-index: 9999; font-family: "Figtree", sans-serif;
        }
        #modal-checkout .caixa {
            background: #111; color: white; border: 1px solid #d4af37;
            border-radius: 10px; padding: 24px; width: 90%; max-width: 380px;
            text-align: center;
        }
        #modal-checkout h3 { color: #f7d046; margin: 0 0 14px; }
        #modal-checkout input {
            width: 100%; padding: 10px; border-radius: 6px; border: none;
            margin-bottom: 12px; box-sizing: border-box; font-size: 15px;
        }
        #modal-checkout button {
            width: 100%; padding: 10px; border-radius: 6px; border: none;
            background: #d4af37; color: black; font-weight: bold;
            cursor: pointer; margin-top: 6px;
        }
        #modal-checkout .cancelar {
            background: transparent; color: #aaa; margin-top: 10px;
        }
        #modal-checkout .resumo { text-align: left; font-size: 14px; margin: 10px 0; }
        #modal-checkout .erro { color: #ff6b6b; font-size: 13px; margin-top: 6px; }
    `;
    document.head.appendChild(estilo);

    const modal = document.createElement("div");
    modal.id = "modal-checkout";
    modal.innerHTML = `
        <div class="caixa">
            <h3>Finalizar compra</h3>
            <div class="resumo" id="texto-resumo"></div>
            <input type="text" id="input-nome" placeholder="Seu nome completo">
            <input type="text" id="input-cep" placeholder="CEP">
            <input type="text" id="input-rua" placeholder="Rua/Avenida e número">
            <input type="text" id="input-complemento" placeholder="Complemento (opcional)">
            <input type="text" id="input-bairro" placeholder="Bairro">
            <input type="text" id="input-cidade" placeholder="Cidade/UF">
            <button id="btn-pagar">Finalizar no WhatsApp</button>
            <div class="erro" id="texto-erro"></div>
            <button class="cancelar" id="btn-cancelar">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function fecharModalCheckout(){
    const modal = document.getElementById("modal-checkout");
    if (modal) modal.remove();
}

const NUMERO_WHATSAPP = "557398625840";

function comprar(nomeCamisa, preco){

    criarModalCheckout();

    const btnPagar = document.getElementById("btn-pagar");
    const btnCancelar = document.getElementById("btn-cancelar");
    const textoResumo = document.getElementById("texto-resumo");
    const textoErro = document.getElementById("texto-erro");
    const inputNome = document.getElementById("input-nome");
    const inputCep = document.getElementById("input-cep");
    const inputRua = document.getElementById("input-rua");
    const inputComplemento = document.getElementById("input-complemento");
    const inputBairro = document.getElementById("input-bairro");
    const inputCidade = document.getElementById("input-cidade");

    textoResumo.innerHTML = `
        Produto: ${nomeCamisa}<br>
        <strong>Total: R$ ${preco.toFixed(2).replace(".", ",")}</strong>
    `;

    btnCancelar.onclick = fecharModalCheckout;

    btnPagar.onclick = () => {
        textoErro.textContent = "";

        const nome = inputNome.value.trim();
        const cep = inputCep.value.trim();
        const rua = inputRua.value.trim();
        const complemento = inputComplemento.value.trim();
        const bairro = inputBairro.value.trim();
        const cidade = inputCidade.value.trim();

        if (!nome || !rua || !bairro) {
            textoErro.textContent = "Preencha nome, endereço e bairro.";
            return;
        }

        const mensagem =
            `Olá! Quero comprar a camisa ${nomeCamisa}.\n` +
            `Nome: ${nome}\n` +
            `Endereço: ${rua}${complemento ? ", " + complemento : ""} - ${bairro}${cidade ? " - " + cidade : ""}\n` +
            (cep ? `CEP: ${cep}\n` : "") +
            `Total: R$ ${preco.toFixed(2).replace(".", ",")}`;

        const linkWhats = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        window.open(linkWhats, "_blank");

        fecharModalCheckout();
    };
}
