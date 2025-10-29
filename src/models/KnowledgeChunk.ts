import mongoose, { Document, Schema } from 'mongoose';

export interface IKnowledgeChunk extends Document {
  title?: string;
  text: string; // conteúdo do conhecimento
  source: string; // Ex: nome do arquivo, URL ou "AI/Generated"
  embedding: number[]; // vetor de embedding
  createdAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>({
  title: { type: String },
  text: { type: String, required: true },
  source: { type: String, required: true },
  embedding: {
    type: [Number],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

// Reutiliza o modelo se já existir (para evitar erro em hot reload do Next)
export const KnowledgeChunk =
  mongoose.models.KnowledgeChunk ||
  mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema, 'knowledgebase');
