-- 데이터베이스 스키마 정의
-- 여기에 CREATE TABLE 등의 SQL 문을 작성하여 저장하시면 됩니다.
-- 상품 테이블 생성
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,              -- 레코드 고유 ID (자동 증가)
    product_id TEXT NOT NULL,           -- 상품 고유 ID (히스토리 관리용)
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),
    category TEXT,
    description TEXT,
    rating DECIMAL(3,2),
    review_count INTEGER DEFAULT 0,
    special_offer TEXT,
    seller_name TEXT,
    seller_email TEXT,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_seller_name ON products(seller_name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- updated_at 자동 업데이트를 위한 트리거 함수 생성
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;

$$ language 'plpgsql';


-- updated_at 트리거 생성
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 샘플 상품 데이터 삽입
INSERT INTO products (
    product_id, name, price, original_price, category, rating, review_count,
    special_offer, seller_name, seller_email
) VALUES
(
    '1',
    '무선 블루투스 이어폰',
    29900,
    49900,
    'digital',
    4.5,
    128,
    'Y',
    'TechSound',
    'contact@techsound.com'
),
(
    '2',
    '스마트워치 프로',
    199000,
    249000,
    'digital',
    4.8,
    256,
    'Y',
    'SmartTech',
    'support@smarttech.com'
);

-- ==========================================
-- 봇마당 에이전트 관련 테이블
-- ==========================================

-- 에이전트 정보 및 인증 상태 관리
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    api_key TEXT,                       -- 인증 후 발급받은 API Key
    claim_url TEXT,                     -- 인증을 위한 Claim URL
    verification_code TEXT,             -- 인증 코드
    is_verified BOOLEAN DEFAULT FALSE,  -- 인증 완료 여부
    wallet_address TEXT,                -- (선택) 지갑 주소
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 게시글 (내 게시글 + 스크랩한 게시글)
CREATE TABLE IF NOT EXISTS bot_posts (
    id TEXT PRIMARY KEY,                -- 봇마당 Post ID (UUID 등)
    local_id SERIAL,                    -- 내부 관리용 ID
    title TEXT NOT NULL,
    content TEXT,
    submadang TEXT,                     -- 게시판 카테고리 (general, tech, etc.)
    author_id TEXT,                     -- 작성자 에이전트 ID
    author_name TEXT,
    view_count INTEGER DEFAULT 0,
    upvotes INTEGER DEFAULT 0,          -- 추천 수
    downvotes INTEGER DEFAULT 0,        -- 비추천 수
    comment_count INTEGER DEFAULT 0,
    is_own_post BOOLEAN DEFAULT FALSE,  -- 내가 쓴 글인지 여부
    created_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 댓글
CREATE TABLE IF NOT EXISTS bot_comments (
    id TEXT PRIMARY KEY,                -- 봇마당 Comment ID
    post_id TEXT NOT NULL REFERENCES bot_posts(id) ON DELETE CASCADE,
    content TEXT,
    author_id TEXT,                     -- 댓글 작성자 ID
    author_name TEXT,
    parent_id TEXT,                     -- 대댓글인 경우 부모 댓글 ID
    upvotes INTEGER DEFAULT 0,          -- 추천 수
    downvotes INTEGER DEFAULT 0,        -- 비추천 수
    is_own_comment BOOLEAN DEFAULT FALSE, -- 내가 쓴 댓글인지 여부
    created_at TIMESTAMP WITH TIME ZONE,
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 알림
CREATE TABLE IF NOT EXISTS bot_notifications (
    id TEXT PRIMARY KEY,                -- 봇마당 Notification ID
    type TEXT NOT NULL,                 -- comment_on_post, reply_to_comment, etc.
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE,
    raw_data JSONB,                     -- 원본 데이터 저장 (확장성)
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_bot_posts_created_at ON bot_posts(created_at);
CREATE INDEX IF NOT EXISTS idx_bot_posts_is_own_post ON bot_posts(is_own_post);
CREATE INDEX IF NOT EXISTS idx_bot_notifications_is_read ON bot_notifications(is_read);