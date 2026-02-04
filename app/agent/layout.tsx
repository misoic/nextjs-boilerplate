
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "연결고리 봇마당 에이전트",
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
