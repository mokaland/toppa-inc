import React, { useState } from 'react';

const CsvUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [instructions, setInstructions] = useState<string>('');
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const MAX_FILE_SIZE_MB = 5;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFile = (selectedFile: File) => {
    setError(''); // Clear previous errors

    if (selectedFile.type !== 'text/csv') {
      setError('対応しているファイル形式はCSVのみです'); // Supported file format is CSV only
      setFile(null);
      setPreview('');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`ファイルサイズは${MAX_FILE_SIZE_MB}MB以下にしてください`); // File size should be 5MB or less
      setFile(null);
      setPreview('');
      return;
    }

    setFile(selectedFile);
    readCsvPreview(selectedFile);
  };

  const readCsvPreview = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').slice(0, 5).join('\n');
      setPreview(lines);
    };
    reader.onerror = () => {
      setError('ファイルの読み込み中にエラーが発生しました。'); // Error occurred while reading the file
      setPreview('');
    };
    reader.readAsText(csvFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInstructions(e.target.value);
  };

  const handleGenerateReport = () => {
    if (!file) {
      setError('CSVファイルをアップロードしてください。'); // Please upload a CSV file
      return;
    }
    // Placeholder for API call
    console.log('Generating report with file:', file.name, 'and instructions:', instructions);
    // In a real application, you would send 'file' and 'instructions' to your backend API.
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">AIレポート生成</h2>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${error ? 'border-red-500 bg-red-50' : ''}`
        }
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="csv-upload"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <label htmlFor="csv-upload" className="cursor-pointer text-blue-600 hover:text-blue-800">
          {file ? `ファイルが選択されました: ${file.name}` : 'CSVファイルをドラッグ＆ドロップまたはクリックして選択'}
        </label>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {/* CSV Preview */}
      {preview && (
        <div className="bg-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          <h3 className="text-lg font-semibold mb-2">ファイルプレビュー (先頭5行):</h3>
          <pre>{preview}</pre>
        </div>
      )}

      {/* Instructions Text Area */}
      <div>
        <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
          指示を入力してください:
        </label>
        <textarea
          id="instructions"
          rows={4}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
          placeholder="例: 先月の売上を部門別にグラフ化して"
          value={instructions}
          onChange={handleInstructionsChange}
        ></textarea>
      </div>

      {/* Generate Button */}
      <div>
        <button
          type="button"
          onClick={handleGenerateReport}
          disabled={!file || instructions.trim() === ''}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          レポート生成
        </button>
      </div>
    </div>
  );
};

export default CsvUpload;
