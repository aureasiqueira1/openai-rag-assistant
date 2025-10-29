# 🤖 OpenAI RAG Assistant

Aplicação **Next.js 14** com integração **OpenAI** e **MongoDB Atlas Vector Search**, construída para responder perguntas com base em uma **base de conhecimento vetorial** (RAG – *Retrieval-Augmented Generation*).
Quando não encontra a resposta na base, a IA gera uma nova, salva automaticamente e enriquece o conhecimento com embeddings.

---

## 🚀 Tecnologias Principais

- **Next.js 14 (App Router)**
- **TypeScript**
- **OpenAI API (GPT-4o-mini + text-embedding-3-large)**
- **MongoDB Atlas Vector Search**
- **LangChain**
- **Vercel (deploy e execução do app)**

---

## 🧠 Como o sistema funciona

1. As informações são carregadas de um arquivo JSON localizado em `data/knowledge_base.json`.
2. Um script (`src/scripts/loadData.ts`) gera embeddings e salva cada fragmento no MongoDB Atlas.
3. Quando o usuário faz uma pergunta:
   - O sistema gera um embedding da pergunta.
   - Busca no Atlas por vetores mais semelhantes (usando similaridade por cosseno).
   - Se encontrar algo relevante (acima do *threshold*), responde com base na base de conhecimento.
   - Caso contrário, gera uma nova resposta com o modelo GPT-4o-mini, salva e adiciona à base.

---

## ⚙️ Configuração

### 1️⃣ Clonar o projeto

```bash
git clone https://github.com/<seu-usuario>/openai-rag-assistant.git
cd openai-rag-assistant
```

### 2️⃣ Instalar dependências
```bash
npm install
```

### 3️⃣ Criar o arquivo .env
```bash
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_atlas_connection_string
```

### 4️⃣ Carregar a base inicial
💡 Requer Node 18+ e conexão com a internet.

```bash
npx tsx src/scripts/loadData.ts
```

### 5️⃣ Rodar localmente
```bash
npm run dev
```
Abra no navegador: http://localhost:3000

---

### 🧾 Exemplo de uso da API

## POST /api/ask
### Request
```json
{
  "question": "O que é Domain-Driven Design?"
}
```
### Response
```json
{
  "answer": "Domain-Driven Design é uma abordagem que foca no domínio principal e na lógica do negócio...",
  "fromKnowledgeBase": true
}
```
---

## 🧠 Conceito RAG
O Retrieval-Augmented Generation (RAG) combina:

- Recuperação de conhecimento (busca vetorial)
- Geração de texto com IA

Isso garante respostas mais precisas, contextualizadas e atualizadas sem precisar reentreinar o modelo.
