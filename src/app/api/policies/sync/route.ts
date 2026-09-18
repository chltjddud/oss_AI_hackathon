import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getCrawledData } from '@/lib/crawler';
import { fetchPublicBenefits } from '@/lib/api';

export async function POST() {
  try {
    const [crawled, gov24] = await Promise.all([
      getCrawledData(false),
      fetchPublicBenefits(1, 30)
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

    // Gov24 items
    (gov24?.data || []).forEach((item: any) => {
      policiesToInsert.push({
        title: item.서비스명 || item.svcNm || '공공서비스',
        category: item.서비스분야 || '공공복지',
        org: item.소관기관명 || '정부/지자체',
        dept: item.소관기관명 || '',
        target: item.지원유형 || item.선정기준 || '요건 충족자',
        description: item.서비스목적요약 || item.지원내용 || '',
        url: item.상세조회URL || '',
        deadline: null,
        region: 'national'
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
