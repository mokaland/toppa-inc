-- ツミギリ データベーススキーマ
-- 作成日: 2026-02-15
-- 作成者: カルロス・メンデス

-- ============================================
-- 拡張機能有効化
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- チャットメッセージテーブル
-- ============================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL DEFAULT uuid_generate_v4(),
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- レポートテーブル
-- ============================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255),
    file_url TEXT,
    file_size INTEGER,
    prompt TEXT NOT NULL,
    result TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- インデックス作成
CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- ============================================
-- ドキュメントテーブル
-- ============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    input_data JSONB NOT NULL,
    generated_content TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- インデックス作成
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_template_id ON documents(template_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- ============================================
-- ユーザ設定テーブル
-- ============================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    api_provider VARCHAR(20) DEFAULT 'openai' CHECK (api_provider IN ('openai', 'anthropic', 'google')),
    api_key_encrypted TEXT,
    plan VARCHAR(20) DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'byok')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

-- チャットメッセージのRLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_policy"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "chat_messages_insert_policy"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- レポートのRLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_policy"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "reports_insert_policy"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reports_update_policy"
    ON reports FOR UPDATE
    USING (auth.uid() = user_id);

-- ドキュメントのRLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select_policy"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "documents_insert_policy"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ユーザー設定のRLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select_policy"
    ON user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_settings_insert_policy"
    ON user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_settings_update_policy"
    ON user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- 関数: updated_at自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_atトリガー設定
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- セキュリティ:  аудитログ用関数（将来拡張用）
-- ============================================
COMMENT ON TABLE chat_messages IS 'チャットアシスタントの会話履歴';
COMMENT ON TABLE reports IS 'AIレポート生成の履歴';
COMMENT ON TABLE documents IS 'テンプレートから生成された書類';
COMMENT ON TABLE user_settings IS 'ユーザー設定（APIキー、プラン等）';