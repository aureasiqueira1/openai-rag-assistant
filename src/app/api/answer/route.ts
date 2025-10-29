import { KnowledgeChunk } from '@/models/KnowledgeChunk';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MONGODB_URI = process.env.MONGODB_URI!;

// 🔌 Função de conexão com o Mongo (evita várias conexões simultâneas)
async function connectToMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
}

export async function POST(req: Request) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: 'Pergunta é obrigatória.' }, { status: 400 });
    }

    await connectToMongo();

    // 1️⃣ Gera embedding da pergunta
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: question,
    });
    const questionEmbedding = embeddingResponse.data[0].embedding;

    // 2️⃣ Busca vetorial
    const results = await KnowledgeChunk.aggregate([
      {
        $vectorSearch: {
          queryVector: questionEmbedding,
          path: 'embedding',
          numCandidates: 10,
          limit: 3,
          index: 'default', // nome do índice real no Atlas
        },
      },
    ]);

    let responseText = '';
    let fromKnowledgeBase = false;

    const topScore = results?.[0]?.score ?? 0;

    const SIMILARITY_THRESHOLD = 0.75;

    if (topScore > SIMILARITY_THRESHOLD) {
      // 3️⃣ Usa a base de conhecimento
      fromKnowledgeBase = true;
      const context = results.map(r => r.text).join('\n');

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente técnico especializado em desenvolvimento de software.',
          },
          {
            role: 'user',
            content: `Use o conteúdo do contexto para responder a pergunta do usuário :\n\n${context}\n\nPergunta: ${question}`,
          },
        ],
      });

      responseText = completion.choices[0].message.content || '';
    } else {
      fromKnowledgeBase = false;
      // 4️⃣ Gera nova resposta com o modelo e salva no banco
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 400,
        messages: [
          {
            role: 'system',
            content:
              'Você é um assistente técnico especializado em desenvolvimento de software. Responda com clareza e base técnica sólida.',
          },
          { role: 'user', content: question },
        ],
      });

      responseText = completion.choices[0].message.content || '';

      // 5️⃣ Gera embedding da nova resposta e salva
      const newEmbedding = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: responseText,
      });

      await KnowledgeChunk.create({
        title: question,
        text: responseText,
        source: 'AI/Generated',
        embedding: newEmbedding.data[0].embedding,
      });
    }

    return NextResponse.json({
      answer: responseText,
      fromKnowledgeBase,
    });
  } catch (error: unknown) {
    console.error('Erro ao responder pergunta:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Erro interno ao gerar resposta.' },
      { status: 500 }
    );
  }
}
