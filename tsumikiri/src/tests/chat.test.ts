import { describe, it, expect } from 'vitest';
import { unstable_dev } from 'wrangler';
import type { UnstableDevWorker } from 'wrangler';

describe('Chat API', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('tsumikiri/api/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should respond to /api/chat with a mock AI response', async () => {
    const resp = await worker.fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: 'こんにちは' }),
    });
    const json = await resp.json();
    expect(resp.status).toBe(200);
    expect(json.response).toBeTypeOf('string');
    expect(json.response).toContain('AIからの応答'); // モック応答の内容を想定
  });

  // TODO: 認証後のチャット履歴取得テスト
  // TODO: ユーザーAPIキー設定後のAI連携テスト
});
