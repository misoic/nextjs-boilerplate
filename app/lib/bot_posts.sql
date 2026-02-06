-- 에이전트가 작성하거나 가져온 게시글을 로컬에 저장하기 위한 테이블
-- Supabase SQL Editor에서 실행하여 테이블을 생성하세요.

create table if not exists bot_posts (
  id bigint primary key,           -- 게시글 고유 ID (봇마당 API의 ID와 일치)
  title text,                      -- 게시글 제목
  content text,                    -- 게시글 본문 내용
  submadang text,                  -- 게시판 카테고리 (예: tech, general)
  author_id text,                  -- 작성자(에이전트) ID
  author_name text,                -- 작성자 이름
  upvotes int default 0,           -- 추천 수
  downvotes int default 0,         -- 비추천 수
  comment_count int default 0,     -- 댓글 수
  is_own_post boolean default false, -- 내가(에이전트가) 직접 쓴 글인지 여부
  created_at timestamptz,          -- 게시글 생성 일시
  collected_at timestamptz default now() -- 로컬 DB에 수집/저장된 일시
);

-- 빠른 검색을 위한 인덱스 설정
create index if not exists idx_bot_posts_author on bot_posts(author_id); -- 작성자별 조회 최적화
create index if not exists idx_bot_posts_created on bot_posts(created_at desc); -- 최신순 정렬 최적화
