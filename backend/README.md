# Backend da Futzone (Python + Flask)

Backend simples para a loja de camisas Futzone. Ele expõe o catálogo de
produtos (o mesmo que hoje está fixo em `dados.js`) através de uma API
REST, e permite registrar os pedidos/interesses dos clientes em um banco
de dados local (SQLite).

## Estrutura

```
backend/
├── app.py            # aplicação Flask (rotas da API)
├── produtos.json     # catálogo de produtos (extraído do dados.js atual)
├── requirements.txt  # dependências Python
└── futzone.db        # criado automaticamente na primeira execução
```

## Como rodar

1. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```

2. Rode o servidor:
   ```bash
   python app.py
   ```

3. A API estará disponível em `http://localhost:5000`

## Endpoints

| Método | Rota                     | Descrição                                   |
|--------|--------------------------|----------------------------------------------|
| GET    | `/api/produtos`          | Lista os produtos (com filtros, veja abaixo) |
| GET    | `/api/produtos/<id>`     | Detalhe de um produto                        |
| GET    | `/api/categorias`        | Lista as categorias existentes               |
| POST   | `/api/produtos`          | Cria um novo produto                         |
| PUT    | `/api/produtos/<id>`     | Atualiza um produto (ex.: marcar esgotado)   |
| DELETE | `/api/produtos/<id>`     | Remove um produto                            |
| POST   | `/api/pedidos`           | Registra o interesse/pedido de um cliente    |
| GET    | `/api/pedidos`           | Lista os pedidos/interesses registrados      |

### Filtros em `/api/produtos`

- `?busca=flamengo` — busca por nome
- `?categoria=Nacional` — filtra por categoria
- `?estoque=true` ou `?estoque=false` — filtra por disponibilidade
- `?preco_min=100&preco_max=150` — filtra por faixa de preço
- `?ordenar=preco_asc` ou `?ordenar=preco_desc` — ordena por preço

Exemplo:
```
GET /api/produtos?categoria=Nacional&ordenar=preco_asc
```

### Exemplo de criação de pedido

```bash
curl -X POST http://localhost:5000/api/pedidos \
  -H "Content-Type: application/json" \
  -d '{
        "produto_id": 1,
        "produto_nome": "Flamengo 25/26 | Versão Jogador",
        "cliente_nome": "João",
        "cliente_telefone": "73999999999"
      }'
```

## Conectando com o front-end atual

Hoje o `produtos.js` usa o array `produtos` (de `dados.js`) diretamente.
Para usar o backend, troque essa parte por uma chamada `fetch`:

```javascript
fetch("http://localhost:5000/api/produtos")
  .then(res => res.json())
  .then(produtos => mostrarProdutos(produtos));
```

E, se quiser registrar o clique em "Comprar" também no backend (além de
abrir o WhatsApp), basta adicionar um `fetch` dentro da função `comprar()`
do `dados.js`, enviando um POST para `/api/pedidos`.

## Observações

- O catálogo é armazenado em `produtos.json` (arquivo simples). Para algo
  em produção, o ideal é migrar para um banco de dados real (SQLite,
  PostgreSQL etc.) — o SQLite já está sendo usado para os pedidos.
- O CORS já está liberado para que o front-end (rodando em outra porta/
  domínio) consiga acessar a API sem bloqueio do navegador.
