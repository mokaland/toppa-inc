import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'

const app = new Hono()

app.use('*', cors())

// JWT認証ミドルウェア (Supabase Authから取得したJWTを検証)
app.use('/api/*', jwt({
  secret: process.env.JWT_SECRET || '' // .env.example と wrangler.toml で定義
}))

app.get('/', (c) => {
  return c.text('TOPPA Inc. Tsumikiri API')
})

// 認証関連のエンドポイント（Supabase Authのコールバックなど）はJWTミドルウェアの対象外とする
// 例: app.post('/auth/callback', async (c) => { ... })

// チャットAPIのルーティングの骨子
app.post('/api/chat', async (c) => {
  // 認証済みのユーザーIDを取得
  // const payload = c.get('jwtPayload')
  // const userId = payload.sub
  return c.json({ message: 'Chat API endpoint (WIP)' })
})

// レポートAPIのルーティングの骨子
app.post('/api/report/generate', async (c) => {
  return c.json({ message: 'Report API endpoint (WIP)' })
})

// ドキュメントAPIのルーティングの骨子
app.post('/api/document/generate', async (c) => {
  return c.json({ message: 'Document API endpoint (WIP)' })
})

export default app
