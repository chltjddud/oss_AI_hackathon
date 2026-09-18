-- Supabase Schema for Suncheon Benefits Portal

-- 1. 정책 테이블 (policies)
CREATE TABLE IF NOT EXISTS public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    org TEXT NOT NULL,
    dept TEXT,
    target TEXT,
    description TEXT,
    url TEXT,
    deadline TEXT,
    region TEXT DEFAULT 'suncheon',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 및 공용 조회/입력 정책 설정
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for policies" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for policies" ON public.policies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for policies" ON public.policies FOR UPDATE USING (true);

-- 2. 순천시민 지원 필요 제안 테이블 (citizen_requests)
CREATE TABLE IF NOT EXISTS public.citizen_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 청년, 주거, 일자리, 육아·교육, 어르신, 문화, 복지 등
    content TEXT NOT NULL,
    expected_effect TEXT,
    author_name TEXT NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    likes_count INTEGER DEFAULT 0,
    status TEXT DEFAULT '접수완료', -- 접수완료, 검토중, 시정반영
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 활성화 및 정책 설정
ALTER TABLE public.citizen_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access for citizen_requests" ON public.citizen_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert access for citizen_requests" ON public.citizen_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access for citizen_requests" ON public.citizen_requests FOR UPDATE USING (true);
