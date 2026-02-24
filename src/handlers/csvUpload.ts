import { Hono } from 'hono';
import { parseCsv } from '../lib/csvParser';

const csvUpload = new Hono();

csvUpload.post('/upload', async (c) => {
  try {
    const body = await c.req.formData();
    const file = body.get('file');

    if (!file || typeof file === 'string') {
      return c.json({ error: 'No file uploaded or invalid file type' }, 400);
    }

    const csvString = await file.text();
    const { data, errors } = await parseCsv(csvString);

    if (errors.length > 0) {
      console.warn('CSV parsing errors:', errors);
      // Depending on requirements, you might want to return errors to the client
      // For now, we'll proceed with the parsed data but log warnings.
    }

    return c.json({ message: 'CSV processed successfully', data, errors: errors.length > 0 ? errors : undefined });

  } catch (error) {
    console.error('CSV upload failed:', error);
    return c.json({ error: 'CSVのアップロードと処理に失敗しました。' }, 500);
  }
});

export default csvUpload;
