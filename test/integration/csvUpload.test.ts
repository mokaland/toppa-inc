import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import app from '../../api'; // Import the main Hono app


// Mock the parseCsv function to control its behavior during tests
vi.mock('../../src/lib/csvParser', () => ({
  parseCsv: vi.fn((csvString: string) => {
    if (csvString === `header1,header2\nvalue1,value2`) {
      return { data: [{ header1: 'value1', header2: 'value2' }], errors: [] };
    }
    if (csvString === 'invalid') {
      return { data: [], errors: [{ code: 'SomeError', message: 'Invalid CSV format', row: 1 }] };
    }
    return { data: [], errors: [] };
  }),
}));

describe('CSV Upload API Integration', () => {
  it('should successfully upload and process a valid CSV file', async () => {
    const formData = new FormData();
    formData.append('file', new Blob([`header1,header2\nvalue1,value2`], { type: 'text/csv' }), 'test.csv');

    const req = new Request('http://localhost/api/csv/upload', {
      method: 'POST',
      body: formData,
      // Hono testing utility should handle content-type for FormData
    });

    const res = await app.request(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('CSV processed successfully');
    expect(json.data).toEqual([{ header1: 'value1', header2: 'value2' }]);
    expect(json.errors).toBeUndefined();
  });

  it('should return 400 if no file is uploaded', async () => {
    const formData = new FormData(); // Empty form data

    const req = new Request('http://localhost/api/csv/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('No file uploaded or invalid file type');
  });

  it('should return 200 and report parsing errors if CSV is invalid but handled by parser', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['invalid'], { type: 'text/csv' }), 'invalid.csv');

    const req = new Request('http://localhost/api/csv/upload', {
      method: 'POST',
      body: formData,
    });

    const res = await app.request(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('CSV processed successfully');
    expect(json.data).toEqual([]);
    expect(json.errors).toEqual([{ code: 'SomeError', message: 'Invalid CSV format', row: 1 }]);
  });
});
