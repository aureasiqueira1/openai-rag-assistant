import { Document } from '@langchain/core/documents';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import fs from 'fs';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export async function POST() {
  try {
    await mongoose.connect(MONGODB_URI);

    const filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
    const rawJsonData: { title: string; text: string; source: string }[] = JSON.parse(
      fs.readFileSync(filePath, 'utf-8')
    );

    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large',
      openAIApiKey: OPENAI_API_KEY,
    });

    // 1️⃣ Fragmentação dos dados
    const docsToSplit = rawJsonData.map(
      item =>
        new Document({
          pageContent: `${item.title}: ${item.text}`,
          metadata: { source: item.source },
        })
    );

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docsToSplit);

    console.log(`Fragmentos criados: ${chunks.length}`);

    // 2️⃣ Criação da store no MongoDB Atlas
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection: mongoose.connection.collection('knowledgebase'),
      indexName: 'default',
      textKey: 'text',
      embeddingKey: 'embedding',
    });

    // 3️⃣ Inserção
    await vectorStore.addDocuments(chunks);

    console.log('✅ Base de conhecimento carregada com sucesso!');

    await mongoose.disconnect();

    return NextResponse.json({ message: 'Base de conhecimento carregada com sucesso!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
