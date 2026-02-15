-- 作成者: カルロス・メンデス
-- 日付: 2026-02-15
-- 概要: ツミキリ MVPの初期データベーススキーマ

--
-- chat_messages: チャット履歴テーブル
--
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) の有効化
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のメッセージのみ閲覧・挿入可能
CREATE POLICY "Users can view their own messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

--
-- reports: AIレポート生成履歴テーブル
--
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    prompt TEXT NOT NULL,
    result TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- RLSの有効化
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレポートのみ閲覧・挿入可能
CREATE POLICY "Users can view their own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

--
-- documents: テンプレート書類生成履歴テーブル
--
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    template_id VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    generated_content TEXT,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- RLSの有効化
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の書類のみ閲覧・挿入可能
CREATE POLICY "Users can view their own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

--
-- user_settings: ユーザー設定テーブル (BYOK APIキー等)
--
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    openai_api_key TEXT,
    anthropic_api_key TEXT,
    google_api_key TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLSの有効化
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の設定のみ管理可能
CREATE POLICY "Users can manage their own settings"
    ON user_settings FOR ALL
    USING (auth.uid() = user_id);
