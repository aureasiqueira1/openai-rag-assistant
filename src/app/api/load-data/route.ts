import { Document } from '@langchain/core/documents';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import fs from 'fs';
import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';
import path from 'path';
import { IKnowledgeChunk } from '../../../models/KnowledgeChunk';

const uri = process.env.MONGODB_URI!;
const client = new MongoClient(uri);

export async function POST() {
  try {
    await client.connect();
    const db = client.db(); // banco padrão do URI
    const collection = db.collection('knowledgebase');

    const filePath = path.join(process.cwd(), 'data', 'knowledge_base.json');
    const rawJsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large',
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    const docs = rawJsonData.map(
      (item: IKnowledgeChunk) =>
        new Document({
          pageContent: `${item.title}: ${item.text}`,
          metadata: { source: item.source },
        })
    );

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);

    console.log(`Fragmentos criados: ${chunks.length}`);

    // 2️⃣ Criação da store no MongoDB Atlas
    const vectorStore = new MongoDBAtlasVectorSearch(embeddings, {
      collection,
      indexName: 'default',
      textKey: 'text',
      embeddingKey: 'embedding',
    });

    // 3️⃣ Inserção
    await vectorStore.addDocuments(chunks);

    console.log('✅ Base de conhecimento carregada com sucesso!');

    await client.close();

    return NextResponse.json({ message: '✅ Base carregada com sucesso!' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
