
// lib/supabase.ts
// Supabase 클라이언트 라이브러리를 가져옵니다
import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase 연결 정보를 가져옵니다
// NEXT_PUBLIC_ 접두사가 있으면 클라이언트에서도 접근 가능
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// NEXT_PUBLIC_ 접두사가 없으면 서버에서만 접근 가능 (보안)
const supabaseKey = process.env.SUPABASE_API_KEY!;

// Supabase 클라이언트를 생성합니다
// 이 클라이언트를 통해 데이터베이스와 상호작용할 수 있습니다
export const supabase = createClient(supabaseUrl, supabaseKey);

// 다른 파일에서 import할 수 있도록 기본 내보내기
export default supabase;
