// app/api/supabase/test/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET() {
    try {
        // Supabase 데이터베이스에서 'test_table'의 모든 레코드를 가져옵니다
        // .from('test_table'): test_table 테이블을 선택합니다.
        // .select('*'): test_table 테이블의 모든 컬럼을 선택합니다.
        // .order('id', { ascending: true }): id 컬럼을 기준으로 오름차순 정렬합니다.
        const { data, error } = await supabase
            .from('test_table')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Supabase 연결 오류:', error);

            // 에러 응답을 JSON 형태로 반환 (HTTP 상태 코드 500)
            return NextResponse.json({
                success: false,
                error: error.message,
                message: 'Supabase 연결 오류'
            }, { status: 500 });
        }

        // 성공적으로 데이터를 가져오면 200 상태 코드와 함께 데이터를 반환합니다
        console.log('Supabase 연결 성공:', data);

        // 성공 응답을 JSON 형태로 반환 (HTTP 상태 코드 200)
        return NextResponse.json({
            success: true,
            data,
            message: 'Supabase 연결 및 데이터 조회 성공'
        });
    } catch (error: unknown) {
        // 예기치 않은 에러가 발생하면 500 상태 코드를 반환합니다
        console.error('API 오류:', error);

        // 에러가 Error 객체인지 확인하고 안전하게 메시지 추출
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

        // 에러 응답을 JSON 형태로 반환 (HTTP 상태 코드 500)
        return NextResponse.json({
            success: false,
            error: errorMessage,
            message: '알 수 없는 오류가 발생했습니다.'
        }, { status: 500 });
    }
}