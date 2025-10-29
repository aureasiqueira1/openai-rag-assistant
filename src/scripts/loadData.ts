import { Document } from '@langchain/core/documents';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import * as dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config();

const filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
const rawJsonData: { title: string; text: string; source: string }[] = JSON.parse(
  fs.readFileSync(filePath, 'utf-8')
);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-large',
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // 1. Fragmentação dos Dados (Chunking)
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

  // 2. Criação da Store (Persistência no MongoDB)
  const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
    collection: mongoose.connection.collection('knowledgebase'), // Sua coleção
    indexName: 'default', // O nome do seu Vector Search Index
    textKey: 'content',
    embeddingKey: 'embedding',
  });

  // 3. Inserção (Geração de Embeddings e Salvamento)
  await vectorStore.addDocuments(chunks);

  console.log('Base de Conhecimento carregada com sucesso!');
  await mongoose.disconnect();
}

run().catch(console.error);
