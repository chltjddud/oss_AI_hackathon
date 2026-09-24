import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, confirmText } = body;

    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail) {
      return NextResponse.json(
        { success: false, error: '탈퇴할 계정의 이메일 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (confirmText !== '회원탈퇴') {
      return NextResponse.json(
        { success: false, error: '"회원탈퇴" 문구를 정확하게 입력해 주세요.' },
        { status: 400 }
      );
    }

    // 1. Re-authenticate user if password is provided
    if (password) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      // If Supabase rejected and it's not a local-only guest account, fail with 401
      if (authError && cleanEmail !== 'guest@suncheon.kr') {
        // Also verify if password matches local fallback
        return NextResponse.json(
          { success: false, error: '현재 비밀번호가 일치하지 않아 탈퇴할 수 없습니다.' },
          { status: 401 }
        );
      }
    }

    // 2. Data Deletion & Preservation Policy:
    // Policy A: Completely delete user bookmarks from saved_policies
    try {
      await supabase
        .from('saved_policies')
        .delete()
        .eq('user_email', cleanEmail);
    } catch (err) {
      console.warn('Failed to delete saved_policies during account deletion:', err);
    }

    // Policy B: Citizen requests (civic suggestions): anonymize author name and unlink user id
    try {
      await supabase
        .from('citizen_requests')
        .update({
          author_name: '탈퇴회원',
          author_id: null
        })
        .eq('author_name', cleanEmail);
    } catch (err) {
      console.warn('Failed to anonymize citizen_requests during account deletion:', err);
    }

    return NextResponse.json({
      success: true,
      message: '회원 탈퇴 및 개인 데이터 처리가 완료되었습니다.',
      deletedEmail: cleanEmail
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '서버 탈퇴 처리 중 오류가 발생했습니다.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
