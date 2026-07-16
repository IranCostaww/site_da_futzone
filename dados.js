// Modal de checkout: pede o CEP, calcula o frete e manda pro WhatsApp

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
            <div id="passo-cep">
                <input type="text" id="input-cep" placeholder="Digite seu CEP" maxlength="9">
                <button id="btn-calcular-frete">Calcular frete</button>
            </div>
            <div id="passo-resumo" style="display:none">
                <div class="resumo" id="texto-resumo"></div>
                <input type="text" id="input-nome" placeholder="Seu nome completo">
                <input type="text" id="input-rua" placeholder="Rua/Avenida e número">
                <input type="text" id="input-complemento" placeholder="Complemento (opcional)">
                <input type="text" id="input-bairro" placeholder="Bairro">
                <button id="btn-pagar">Finalizar no WhatsApp</button>
            </div>
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

const NUMERO_WHATSAPP = "5573988625840";

// Função única de compra (usada por script.js e produtos.js)
function comprar(nomeCamisa, preco){

    criarModalCheckout();

    const inputCep = document.getElementById("input-cep");
    const btnCalcular = document.getElementById("btn-calcular-frete");
    const btnPagar = document.getElementById("btn-pagar");
    const btnCancelar = document.getElementById("btn-cancelar");
    const passoCep = document.getElementById("passo-cep");
    const passoResumo = document.getElementById("passo-resumo");
    const textoResumo = document.getElementById("texto-resumo");
    const textoErro = document.getElementById("texto-erro");
    const inputNome = document.getElementById("input-nome");
    const inputRua = document.getElementById("input-rua");
    const inputComplemento = document.getElementById("input-complemento");
    const inputBairro = document.getElementById("input-bairro");

    let freteCalculado = null;

    btnCancelar.onclick = fecharModalCheckout;

    btnCalcular.onclick = async () => {
        textoErro.textContent = "";
        const cep = inputCep.value.trim();

        if (!cep) {
            textoErro.textContent = "Digite um CEP.";
            return;
        }

        btnCalcular.textContent = "Calculando...";
        btnCalcular.disabled = true;

        try {
            const resposta = await fetch(
                `${API_URL}/api/calcular-frete?cep=${encodeURIComponent(cep)}`
            );
            const frete = await resposta.json();

            if (frete.erro) {
                textoErro.textContent = frete.erro;
                return;
            }

            freteCalculado = frete;
            const total = preco + frete.valor_frete;

            textoResumo.innerHTML = `
                Produto: ${nomeCamisa}<br>
                Frete para ${frete.cidade}/${frete.uf}: R$ ${frete.valor_frete.toFixed(2).replace(".", ",")}<br>
                <strong>Total: R$ ${total.toFixed(2).replace(".", ",")}</strong>
            `;

            passoCep.style.display = "none";
            passoResumo.style.display = "block";

        } catch (erro) {
            textoErro.textContent = "Erro ao consultar o CEP. Tente novamente.";
        } finally {
            btnCalcular.textContent = "Calcular frete";
            btnCalcular.disabled = false;
        }
    };

    btnPagar.onclick = () => {
        if (!freteCalculado) return;

        const nome = inputNome.value.trim();
        const rua = inputRua.value.trim();
        const complemento = inputComplemento.value.trim();
        const bairro = inputBairro.value.trim();

        if (!nome || !rua || !bairro) {
            textoErro.textContent = "Preencha nome, endereço e bairro.";
            return;
        }

        const total = preco + freteCalculado.valor_frete;

        const mensagem =
            `Olá! Quero comprar a camisa ${nomeCamisa}.\n` +
            `Nome: ${nome}\n` +
            `Endereço: ${rua}${complemento ? ", " + complemento : ""} - ${bairro}\n` +
            `CEP: ${freteCalculado.cep} (${freteCalculado.cidade}/${freteCalculado.uf})\n` +
            `Frete: R$ ${freteCalculado.valor_frete.toFixed(2).replace(".", ",")}\n` +
            `Total: R$ ${total.toFixed(2).replace(".", ",")}`;

        const linkWhats = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
        window.open(linkWhats, "_blank");

        fecharModalCheckout();
    };
}