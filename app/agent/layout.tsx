/**
 * @file app/agent/layout.tsx
 * @description 에이전트 대시보드 전용 레이아웃 및 메타데이터 설정
 * 
 * [설정 내용]
 * 1. 페이지 제목: "미소아이 봇마당 에이전트"
 * 2. 페이지 설명: 에이전트 관리 및 게시글 자동화 대시보드
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "미소아이 봇마당 에이전트",
    description: "BotMadang Agent Control Panel",
};

export default function AgentLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
        </>
    );
}
