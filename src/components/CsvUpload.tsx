import React from 'react';

const CsvUpload: React.FC = () => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">CSVレポート生成</h2>
      <p className="text-gray-600">ここにCSVアップロード機能とレポート表示機能が入ります。</p>
      {/* TODO: ファイル選択エリア、進捗表示の実装 */}
    </div>
  );
};

export default CsvUpload;
