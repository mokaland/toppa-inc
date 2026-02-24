import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import csvUpload from './csvUpload';
import * as csvParser from '../lib/csvParser';

// Mock the parseCsv function
vi.mock('../lib/csvParser', () => ({
  parseCsv: vi.fn(),
}));

const mockParseCsv = vi.mocked(csvParser.parseCsv);

describe('csvUpload handler', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/', csvUpload); // Mount the csvUpload handler
    vi.clearAllMocks();
  });

  it('should successfully upload and process a CSV file', async () => {
    const mockCsvData = [{ name: 'test1', value: '1' }];
    mockParseCsv.mockResolvedValueOnce({ data: mockCsvData, errors: [] });

    const csvContent = 'name,value\ntest1,1';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'CSV processed successfully', data: mockCsvData });
    expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
  });

  it('should return 400 if no file is uploaded', async () => {
    const formData = new FormData();

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No file uploaded or invalid file type' });
    expect(mockParseCsv).not.toHaveBeenCalled();
  });

  it('should return 400 if file is of invalid type (string instead of File)', async () => {
    const formData = new FormData();
    formData.append('file', 'invalid_string_file_content');

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'No file uploaded or invalid file type' });
    expect(mockParseCsv).not.toHaveBeenCalled();
  });

  it('should return 200 with errors if CSV parsing encounters issues', async () => {
    const mockErrors = [{ code: 'TestError', row: 1, message: 'Error in row 1' }];
    mockParseCsv.mockResolvedValueOnce({ data: [], errors: mockErrors });

    const csvContent = 'name,value\ninvalid_row';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'CSV processed successfully', data: [], errors: mockErrors });
    expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
  });

  it('should return 500 if an unexpected error occurs during processing', async () => {
    mockParseCsv.mockRejectedValueOnce(new Error('Unexpected parsing error'));

    const csvContent = 'name,value\ntest1,1';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await app.request('/upload', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'CSVのアップロードと処理に失敗しました。' });
    expect(mockParseCsv).toHaveBeenCalledWith(csvContent);
  });
});
