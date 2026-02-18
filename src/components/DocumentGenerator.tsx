import React, { useState } from 'react';

const DocumentGenerator: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [naturalLanguageInput, setNaturalLanguageInput] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('プレビューエリア');

  const handleGenerateDocument = () => {
    // Logic to generate document based on template and natural language input
    // For now, just update the preview content
    setPreviewContent(`生成された書類プレビュー (テンプレート: ${selectedTemplate}, 入力: ${naturalLanguageInput})`);
  };

  const handleExportPdf = () => {
    // Logic to export document as PDF
    alert('PDF出力機能はまだ実装されていません。');
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">書類生成</h1>

      {/* テンプレート選択 */}
      <div>
        <label htmlFor="template-select" className="block text-sm font-medium text-gray-700">
          テンプレートを選択
        </label>
        <select
          id="template-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
        >
          <option value="">テンプレートを選択してください</option>
          <option value="quotation">見積書</option>
          <option value="invoice">請求書</option>
        </select>
      </div>

      {/* 自然言語入力 */}
      <div>
        <label htmlFor="natural-language-input" className="block text-sm font-medium text-gray-700">
          自然言語で書類内容を入力
        </label>
        <textarea
          id="natural-language-input"
          rows={5}
          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
          placeholder="例: 株式会社〇〇様宛に、〇〇プロジェクトの費用として100万円の見積書を作成してください。"
          value={naturalLanguageInput}
          onChange={(e) => setNaturalLanguageInput(e.target.value)}
        ></textarea>
      </div>

      {/* 生成ボタン */}
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        onClick={handleGenerateDocument}
      >
        書類を生成
      </button>

      {/* プレビューエリア */}
      <div className="border border-gray-300 rounded-md p-4 bg-gray-50 min-h-[200px]">
        <h2 className="text-lg font-semibold mb-2">プレビュー</h2>
        <p className="text-gray-800 whitespace-pre-wrap">{previewContent}</p>
      </div>

      {/* PDF出力ボタン */}
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        onClick={handleExportPdf}
      >
        PDF出力
      </button>
    </div>
  );
};

export default DocumentGenerator;
