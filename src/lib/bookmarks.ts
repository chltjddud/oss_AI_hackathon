import { supabase } from '@/lib/supabase';

export interface BookmarkPayload {
  id: string;
  title: string;
  org?: string;
  dept?: string;
  target?: string;
  category?: string;
  scope?: string;
  url?: string;
  deadline?: string | null;
  description?: string;
}

export interface BookmarkOperationResult {
  success: boolean;
  error?: string;
  action?: 'saved' | 'removed';
}

/**
 * Save a policy bookmark to Supabase saved_policies table with the exact schema columns:
 * user_email, policy_id, policy_title, policy_org, policy_data (JSONB)
 */
export async function saveBookmarkToDb(
  email: string,
  policy: BookmarkPayload
): Promise<BookmarkOperationResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !policy.id) {
    return { success: false, error: '유효한 이메일과 정책 ID가 필요합니다.' };
  }

  try {
    const { error } = await supabase
      .from('saved_policies')
      .upsert(
        {
          user_email: cleanEmail,
          policy_id: policy.id,
          policy_title: policy.title,
          policy_org: policy.org || '순천시',
          policy_data: {
            dept: policy.dept || '',
            target: policy.target || '',
            category: policy.category || '',
            scope: policy.scope || 'suncheon',
            url: policy.url || '',
            deadline: policy.deadline || null,
            description: policy.description || ''
          }
        },
        { onConflict: 'user_email,policy_id' }
      );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, action: 'saved' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '데이터베이스 저장 중 오류가 발생했습니다.';
    return { success: false, error: message };
  }
}

/**
 * Remove a policy bookmark from Supabase saved_policies table
 */
export async function removeBookmarkFromDb(
  email: string,
  policyId: string
): Promise<BookmarkOperationResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !policyId) {
    return { success: false, error: '유효한 이메일과 정책 ID가 필요합니다.' };
  }

  try {
    const { error } = await supabase
      .from('saved_policies')
      .delete()
      .match({ user_email: cleanEmail, policy_id: policyId });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, action: 'removed' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '데이터베이스 삭제 중 오류가 발생했습니다.';
    return { success: false, error: message };
  }
}

/**
 * Fetch all saved policy IDs for a given user from Supabase
 */
export async function fetchUserBookmarkIds(email: string): Promise<string[]> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return [];

  try {
    const { data, error } = await supabase
      .from('saved_policies')
      .select('policy_id')
      .eq('user_email', cleanEmail);

    if (!error && Array.isArray(data)) {
      return data.map(item => item.policy_id).filter(Boolean);
    }
  } catch {
    // Graceful fallback
  }

  return [];
}
