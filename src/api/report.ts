import { Hono } from 'hono';
import { env } from 'hono/adapter';
import { stream } from 'hono/streaming';

const report = new Hono();

// 認証ミドルウェア（仮）
// 実際にはSupabase AuthのJWTを検証する
const authMiddleware = async (c, next) => {
    // 仮のユーザーID
    // TODO: Supabase Authから実際のユーザーIDを取得するロジックを実装
    c.set('userId', 'dummy_user_id_from_auth');
    await next();
};

report.post('/upload', authMiddleware, async (c) => {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env<{ SUPABASE_URL: string; SUPABASE_ANON_KEY: string }>(c);
    const userId = c.get('userId');

    if (!userId) {
        return c.json({ error: '認証が必要です' }, 401);
    }

    try {
        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!file || !(file instanceof File)) {
            return c.json({ error: 'ファイルが提供されていません' }, 400);
        }

        const fileName = file.name;
        const fileContent = await file.arrayBuffer();

        // Supabase Storageへのアップロード処理
        // TODO: エラーハンドリングとレスポンス形式の厳密化
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/public/reports/${userId}/${fileName}`;
        const response = await fetch(uploadUrl, {
            method: 'POST', // またはPUT
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // StorageへのアクセスはService Role KeyまたはAuth JWT
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'true', // 上書きを許可
            },
            body: fileContent,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Supabase Storage upload failed:', errorText);
            return c.json({ error: 'ファイルのアップロードに失敗しました', details: errorText }, 500);
        }

        // TODO: Supabase DBにレポート情報を記録する処理を追加
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/reports/${userId}/${fileName}`; // 公開URLの構築例

        return c.json({ message: 'ファイルが正常にアップロードされました', fileName, publicUrl }, 200);

    } catch (error) {
        console.error('ファイルアップロード中にエラーが発生しました:', error);
        return c.json({ error: 'サーバーエラーが発生しました' }, 500);
    }
});

export default report;
