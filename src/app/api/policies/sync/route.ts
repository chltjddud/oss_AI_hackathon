import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCrawledData } from '@/lib/crawler';
import { fetchSuncheonApplicableBenefits } from '@/lib/api';

export async function POST() {
  try {
    const [crawled, applicable] = await Promise.all([
      getCrawledData(false),
      fetchSuncheonApplicableBenefits()
    ]);

    const policiesToInsert: Array<{
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
      policiesToInsert.push({
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
      policiesToInsert.push({
        title: item.title,
        category: item.category || '공공복지',
        org: item.org || '정부/지자체',
        dept: item.dept || '',
        target: item.target || '요건 충족 순천시민/국민',
        description: item.description || '',
        url: item.url || '',
        deadline: item.deadline,
        region: item.scope
      });
    });

    const { data, error } = await supabase
      .from('policies')
      .insert(policiesToInsert);

    if (error) {
      return NextResponse.json({
        success: false,
        message: error.message,
        hint: 'Supabase SQL 에디터에서 supabase_schema.sql을 먼저 실행해 주세요.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      insertedCount: policiesToInsert.length,
      data
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
