import { supabase } from './supabase';
import fs from 'fs';
import path from 'path';

export interface RagDocumentMetadata {
  type: 'policy' | 'notice' | 'guide';
  sourceId?: string;
  org?: string;
  target?: string;
  amount?: string;
  eligibility?: string;
  requiredDocs?: string[];
  url?: string;
  scope?: string;
  date?: string;
  [key: string]: any;
}

export interface RagDocumentChunk {
  id: string;
  title: string;
  category: string;
  content: string;
  metadata: RagDocumentMetadata;
  embedding?: number[];
  similarity?: number;
}

let localCacheMemory: RagDocumentChunk[] | null = null;

function loadLocalRagCache(): RagDocumentChunk[] {
  if (localCacheMemory) {
    return localCacheMemory;
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'rag_embeddings.json');
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      localCacheMemory = JSON.parse(raw);
      return localCacheMemory || [];
    }
  } catch (err) {
    console.warn('[RAG] Failed to load local embeddings cache:', err);
  }

  return [];
}

/**
 * Gemini gemini-embedding-001 모델을 활용해 768차원 텍스트 벡터 임베딩 생성
 */
export async function generateGeminiEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !text || text.trim().length === 0) {
    return null;
  }

  const cleanText = text.slice(0, 2048).trim();

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: cleanText }] },
          outputDimensionality: 768
        }),
        signal: AbortSignal.timeout(6000)
      }
    );

    if (!res.ok) {
      console.warn(`[RAG] Embedding API error status: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const values = data.embedding?.values;
    if (Array.isArray(values) && values.length === 768) {
      return values;
    }
    return null;
  } catch (err) {
    console.warn('[RAG] Embedding generation error:', err);
    return null;
  }
}

/**
 * 코사인 유사도 연산 (로컬 벡터 검색용)
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RagSearchOptions {
  topK?: number;
  threshold?: number;
  category?: string;
}

/**
 * 사용자 질의에 대한 Supabase pgvector 및 로컬 벡터 캐시 기반 하이브리드 RAG 검색
 */
export async function searchRagDocuments(
  query: string,
  options: RagSearchOptions = {}
): Promise<RagDocumentChunk[]> {
  const { topK = 5, threshold = 0.35, category } = options;
  if (!query || query.trim().length === 0) return [];

  const queryEmbedding = await generateGeminiEmbedding(query);
  if (!queryEmbedding) {
    console.warn('[RAG] Could not generate query embedding, returning empty search.');
    return [];
  }

  // 1. Supabase pgvector RPC 검색 시도
  try {
    const { data, error } = await supabase.rpc('match_rag_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: topK * 2
    });

    if (!error && Array.isArray(data) && data.length > 0) {
      let filtered = data;
      if (category && category !== '전체') {
        filtered = filtered.filter((d: any) => d.category === category);
      }
      return filtered.slice(0, topK).map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        metadata: (row.metadata || {}) as RagDocumentMetadata,
        similarity: row.similarity
      }));
    }
  } catch (rpcErr) {
    console.warn('[RAG] Supabase RPC match failed, falling back to local vector index:', rpcErr);
  }

  // 2. Fallback: 로컬 임베딩 캐시 (data/rag_embeddings.json) 기반 코사인 유사도 검색
  const localChunks = loadLocalRagCache();
  if (localChunks.length === 0) {
    return [];
  }

  const scored = localChunks
    .map(chunk => {
      if (!chunk.embedding || chunk.embedding.length !== 768) {
        return { ...chunk, similarity: 0 };
      }
      const similarity = calculateCosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        id: chunk.id,
        title: chunk.title,
        category: chunk.category,
        content: chunk.content,
        metadata: chunk.metadata,
        similarity
      };
    })
    .filter(item => {
      if (category && category !== '전체' && item.category !== category) {
        return false;
      }
      return (item.similarity || 0) >= threshold;
    })
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, topK);

  return scored;
}
