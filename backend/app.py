# -*- coding: utf-8 -*-
"""
Backend simples para a loja Futzone.

Serve o catálogo de produtos (camisas) por uma API REST e permite
registrar pedidos/interesses de clientes em um banco SQLite local.

Como rodar:
    pip install -r requirements.txt
    python app.py

O servidor sobe em http://localhost:5000
"""

import json
import os
import sqlite3
from datetime import datetime

from flask import Flask, jsonify, request, g
import requests

try:
    from flask_cors import CORS
    TEM_CORS = True
except ImportError:
    TEM_CORS = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUTOS_JSON = os.path.join(BASE_DIR, "produtos.json")
DB_PATH = os.path.join(BASE_DIR, "futzone.db")

app = Flask(__name__)

if TEM_CORS:
    CORS(app)  # permite que o front-end (HTML/JS) acesse a API de outra origem
else:
    @app.after_request
    def add_cors_headers(response):
        # Fallback simples caso flask-cors não esteja instalado
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response


# ---------------------------------------------------------------------------
# Banco de dados (SQLite) - guarda os pedidos/interesses dos clientes
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id INTEGER,
            produto_nome TEXT NOT NULL,
            cliente_nome TEXT,
            cliente_telefone TEXT,
            criado_em TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


# ---------------------------------------------------------------------------
# Produtos - carregados do produtos.json (gerado a partir do dados.js atual)
# ---------------------------------------------------------------------------

def carregar_produtos():
    with open(PRODUTOS_JSON, encoding="utf-8") as f:
        return json.load(f)


def salvar_produtos(produtos):
    with open(PRODUTOS_JSON, "w", encoding="utf-8") as f:
        json.dump(produtos, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# Rotas - Produtos
# ---------------------------------------------------------------------------

@app.get("/api/produtos")
def listar_produtos():
    """
    Lista os produtos, com suporte a filtros via query string:

    /api/produtos?busca=flamengo
    /api/produtos?categoria=Nacional
    /api/produtos?estoque=true
    /api/produtos?preco_min=100&preco_max=150
    /api/produtos?ordenar=preco_asc   (ou preco_desc)
    """
    produtos = carregar_produtos()

    busca = request.args.get("busca", "").strip().lower()
    categoria = request.args.get("categoria", "").strip().lower()
    estoque = request.args.get("estoque")
    preco_min = request.args.get("preco_min", type=float)
    preco_max = request.args.get("preco_max", type=float)
    ordenar = request.args.get("ordenar")

    if busca:
        produtos = [p for p in produtos if busca in p["nome"].lower()]

    if categoria:
        produtos = [p for p in produtos if p["categoria"].lower() == categoria]

    if estoque is not None:
        quer_em_estoque = estoque.lower() in ("true", "1", "sim")
        produtos = [p for p in produtos if p.get("estoque", True) == quer_em_estoque]

    if preco_min is not None:
        produtos = [p for p in produtos if p["preco"] >= preco_min]

    if preco_max is not None:
        produtos = [p for p in produtos if p["preco"] <= preco_max]

    if ordenar == "preco_asc":
        produtos = sorted(produtos, key=lambda p: p["preco"])
    elif ordenar == "preco_desc":
        produtos = sorted(produtos, key=lambda p: p["preco"], reverse=True)

    return jsonify(produtos)


@app.get("/api/produtos/<int:produto_id>")
def obter_produto(produto_id):
    produtos = carregar_produtos()
    produto = next((p for p in produtos if p["id"] == produto_id), None)
    if produto is None:
        return jsonify({"erro": "Produto não encontrado"}), 404
    return jsonify(produto)


@app.get("/api/categorias")
def listar_categorias():
    produtos = carregar_produtos()
    categorias = sorted({p["categoria"] for p in produtos})
    return jsonify(categorias)


@app.post("/api/produtos")
def criar_produto():
    """Cadastra um novo produto (uso administrativo simples)."""
    dados = request.get_json(silent=True) or {}

    campos_obrigatorios = ["nome", "preco", "categoria", "imagem"]
    faltando = [c for c in campos_obrigatorios if c not in dados]
    if faltando:
        return jsonify({"erro": f"Campos obrigatórios faltando: {', '.join(faltando)}"}), 400

    produtos = carregar_produtos()
    novo_id = max((p["id"] for p in produtos), default=0) + 1

    novo_produto = {
        "id": novo_id,
        "nome": dados["nome"],
        "preco": float(dados["preco"]),
        "categoria": dados["categoria"],
        "imagem": dados["imagem"],
        "estoque": dados.get("estoque", True),
    }

    produtos.append(novo_produto)
    salvar_produtos(produtos)

    return jsonify(novo_produto), 201


@app.put("/api/produtos/<int:produto_id>")
def atualizar_produto(produto_id):
    """Atualiza campos de um produto existente (ex.: marcar como esgotado)."""
    dados = request.get_json(silent=True) or {}
    produtos = carregar_produtos()

    produto = next((p for p in produtos if p["id"] == produto_id), None)
    if produto is None:
        return jsonify({"erro": "Produto não encontrado"}), 404

    for campo in ["nome", "preco", "categoria", "imagem", "estoque"]:
        if campo in dados:
            produto[campo] = dados[campo]

    salvar_produtos(produtos)
    return jsonify(produto)


@app.delete("/api/produtos/<int:produto_id>")
def remover_produto(produto_id):
    produtos = carregar_produtos()
    novos_produtos = [p for p in produtos if p["id"] != produto_id]

    if len(novos_produtos) == len(produtos):
        return jsonify({"erro": "Produto não encontrado"}), 404

    salvar_produtos(novos_produtos)
    return jsonify({"mensagem": "Produto removido com sucesso"})


# ---------------------------------------------------------------------------
# Rotas - Pedidos / Interesses de clientes
# ---------------------------------------------------------------------------

@app.post("/api/pedidos")
def criar_pedido():
    """
    Registra o interesse de um cliente em uma camisa.
    Corpo esperado (JSON):
    {
        "produto_id": 1,
        "produto_nome": "Flamengo 25/26 | Versão Jogador",
        "cliente_nome": "João",
        "cliente_telefone": "73999999999"
    }
    """
    dados = request.get_json(silent=True) or {}

    produto_nome = dados.get("produto_nome")
    if not produto_nome:
        return jsonify({"erro": "Campo 'produto_nome' é obrigatório"}), 400

    db = get_db()
    cursor = db.execute(
        """
        INSERT INTO pedidos (produto_id, produto_nome, cliente_nome, cliente_telefone, criado_em)
        VALUES (?, ?, ?, ?, ?)
        """,
        (
            dados.get("produto_id"),
            produto_nome,
            dados.get("cliente_nome"),
            dados.get("cliente_telefone"),
            datetime.utcnow().isoformat(),
        ),
    )
    db.commit()

    return jsonify({"id": cursor.lastrowid, "mensagem": "Pedido registrado com sucesso"}), 201


@app.get("/api/pedidos")
def listar_pedidos():
    """Lista todos os pedidos/interesses registrados (uso administrativo)."""
    db = get_db()
    linhas = db.execute("SELECT * FROM pedidos ORDER BY id DESC").fetchall()
    return jsonify([dict(row) for row in linhas])


# ---------------------------------------------------------------------------
# Frete - valor fixo por região, calculado a partir do CEP (via ViaCEP)
# ---------------------------------------------------------------------------

REGIAO_POR_UF = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte",
    "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste",
    "PB": "Nordeste", "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste",
    "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste",
    "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}

VALOR_FRETE_POR_REGIAO = {
    "Norte": 35.00,
    "Nordeste": 30.00,
    "Centro-Oeste": 28.00,
    "Sudeste": 20.00,
    "Sul": 25.00,
}


@app.get("/api/calcular-frete")
def calcular_frete():
    """
    Calcula o frete a partir de um CEP (usa a API pública ViaCEP para
    descobrir o estado, e uma tabela fixa de valor por região).
    Uso: /api/calcular-frete?cep=45600000
    """
    cep = request.args.get("cep", "").strip().replace("-", "")

    if not cep.isdigit() or len(cep) != 8:
        return jsonify({"erro": "CEP inválido"}), 400

    try:
        resposta = requests.get(f"https://viacep.com.br/ws/{cep}/json/", timeout=5)
        endereco = resposta.json()
    except requests.RequestException:
        return jsonify({"erro": "Não foi possível consultar o CEP"}), 502

    if endereco.get("erro"):
        return jsonify({"erro": "CEP não encontrado"}), 404

    uf = endereco.get("uf")
    cidade = endereco.get("localidade")
    regiao = REGIAO_POR_UF.get(uf, "Sudeste")
    valor_frete = VALOR_FRETE_POR_REGIAO[regiao]

    return jsonify({
        "cep": cep,
        "cidade": cidade,
        "uf": uf,
        "regiao": regiao,
        "valor_frete": valor_frete,
    })


# ---------------------------------------------------------------------------
# Rota inicial simples, só para checar se a API está no ar
# ---------------------------------------------------------------------------

@app.get("/")
def home():
    return jsonify({
        "mensagem": "API da Futzone no ar!",
        "endpoints": [
            "GET  /api/produtos",
            "GET  /api/produtos/<id>",
            "GET  /api/categorias",
            "POST /api/produtos",
            "PUT  /api/produtos/<id>",
            "DELETE /api/produtos/<id>",
            "POST /api/pedidos",
            "GET  /api/pedidos",
        ],
    })


# Garante que a tabela exista tanto rodando localmente (python app.py)
# quanto em produção via gunicorn (Render chama "app:app" diretamente,
# sem passar pelo bloco abaixo).
init_db()

if __name__ == "__main__":
    porta = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host="0.0.0.0", port=porta)
