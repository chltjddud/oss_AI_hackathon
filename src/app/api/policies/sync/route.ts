import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCrawledData } from '@/lib/crawler';
import { fetchSuncheonApplicableBenefits } from '@/lib/api';

export function getPolicyStableKey(item: { url?: string | null; org?: string; title?: string }): string {
  if (item.url && item.url.trim().length > 5) {
    return item.url.trim();
  }
  return `${(item.org || '순천시').trim()}:::${(item.title || '').trim()}`;
}

export async function POST() {
  try {
    const [crawled, applicable] = await Promise.all([
      getCrawledData(false),
      fetchSuncheonApplicableBenefits()
    ]);

    const rawCandidates: Array<{
      title: string;
      category: string;
      org: string;
      dept: string;
      target: string;
      description: string;
      url: string;
      deadline: string | null;
      region: string;
    }> = [];

    // Crawled welfare items
    (crawled.welfare || []).forEach(item => {
      rawCandidates.push({
        title: item.title,
        category: '순천맞춤복지',
        org: item.source || '순천시',
        dept: item.dept || '',
        target: item.dept ? `${item.dept} 대상자` : '순천시민',
        description: item.reason || '',
        url: item.link || '',
        deadline: null,
        region: 'suncheon'
      });
    });

    // Unified applicable items (Gov24, Jeonnam, Youth, Central)
    applicable.forEach(item => {
      rawCandidates.push({
        title: item.title,
        category: item.category || '공공복지',
        org: item.org || '정부/지자체',
        dept: item.dept || '',
        target: item.target || '요건 충족 순천시민/국민',
        description: item.description || '',
        url: item.url || '',
        deadline: item.deadline || null,
        region: item.scope
      });
    });

    // 1. Deduplicate candidate list internally
    const uniqueCandidates: typeof rawCandidates = [];
    const seenCandidateKeys = new Set<string>();

    for (const item of rawCandidates) {
      const key = getPolicyStableKey(item);
      if (!seenCandidateKeys.has(key)) {
        seenCandidateKeys.add(key);
        uniqueCandidates.push(item);
      }
    }

    // 2. Fetch existing policies from DB to ensure idempotency and clean existing duplicates
    const { data: existingRows, error: fetchErr } = await supabase
      .from('policies')
      .select('id, title, org, url');

    if (fetchErr) {
      console.warn('Could not fetch existing policies:', fetchErr.message);
    }

    const existingKeyToIdMap = new Map<string, string>();
    const redundantDuplicateIds: string[] = [];

    if (Array.isArray(existingRows)) {
      for (const row of existingRows) {
        const k = getPolicyStableKey(row);
        if (existingKeyToIdMap.has(k)) {
          redundantDuplicateIds.push(row.id);
        } else {
          existingKeyToIdMap.set(k, row.id);
        }
      }
    }

    // Clean existing redundant duplicates in DB
    if (redundantDuplicateIds.length > 0) {
      try {
        await supabase
          .from('policies')
          .delete()
          .in('id', redundantDuplicateIds);
      } catch (err) {
        console.warn('Failed to delete redundant duplicate policies:', err);
      }
    }

    // 3. Separate into items to insert vs items to update
    const itemsToInsert: typeof rawCandidates = [];
    let updatedCount = 0;

    for (const item of uniqueCandidates) {
      const k = getPolicyStableKey(item);
      const existingId = existingKeyToIdMap.get(k);

      if (existingId) {
        // Idempotent update for existing record
        await supabase
          .from('policies')
          .update({
            category: item.category,
            dept: item.dept,
            target: item.target,
            description: item.description,
            deadline: item.deadline,
            region: item.region
          })
          .eq('id', existingId);
        updatedCount++;
      } else {
        itemsToInsert.push(item);
      }
    }

    // 4. Insert only genuinely new records
    let insertedCount = 0;
    if (itemsToInsert.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        const batch = itemsToInsert.slice(i, i + batchSize);
        const { error: insertErr } = await supabase
          .from('policies')
          .insert(batch);
        if (!insertErr) {
          insertedCount += batch.length;
        } else {
          console.warn('Batch insert error:', insertErr.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalCandidates: uniqueCandidates.length,
      insertedCount,
      updatedCount,
      cleanedDuplicatesCount: redundantDuplicateIds.length,
      message: '정책 동기화 멱등성이 성공적으로 적용되었습니다.'
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '동기화 중 오류가 발생했습니다.';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [crawled, applicable] = await Promise.all([
      getCrawledData(false),
      fetchSuncheonApplicableBenefits()
    ]);

    return NextResponse.json({
      success: true,
      total: (crawled.welfare?.length || 0) + applicable.length,
      policies: applicable,
      welfare: crawled.welfare || []
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '조회 중 오류가 발생했습니다.';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}
