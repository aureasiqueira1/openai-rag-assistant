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
    indexName: 'default', // deve bater com o nome do índice no Atlas
    textKey: 'text', // campo correto
    embeddingKey: 'embedding',
  });

  // 3️⃣ Inserção
  await vectorStore.addDocuments(chunks);

  console.log('✅ Base de conhecimento carregada com sucesso!');
  await mongoose.disconnect();
}

run().catch(console.error);
