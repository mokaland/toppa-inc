// src/upload_example.js
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化
// 環境変数からURLとanonキーを取得することを想定
const supabaseUrl = 'YOUR_SUPABASE_URL'; // 本番環境では環境変数から取得
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // 本番環境では環境変数から取得
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function uploadFile(file) {
  if (!file) {
    console.error('ファイルが選択されていません。');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      console.log('ファイルアップロード成功:', data);
      return data;
    } else {
      const errorData = await response.json();
      console.error('ファイルアップロード失敗:', errorData);
      throw new Error(errorData.message || 'ファイルアップロードに失敗しました。');
    }
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  }
}

// 例として、HTMLのinput[type="file"]とbuttonを想定したイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('file-input');
  const uploadButton = document.getElementById('upload-button');

  if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', async () => {
      const selectedFile = fileInput.files[0];
      if (selectedFile) {
        try {
          await uploadFile(selectedFile);
          alert('ファイルが正常にアップロードされました。');
        } catch (error) {
          alert('ファイルのアップロード中にエラーが発生しました。詳細はコンソールを確認してください。');
        }。
      } else {
        alert('ファイルを選択してください。');
      }
    });
  }
});

// テストのために関数をエクスポート (実際のフロントエンドでは不要な場合が多い)
export { uploadFile, supabase };
