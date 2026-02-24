import { Hono } from 'hono';

interface Env {
  GEMINI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const csvUpload = new Hono<{ Bindings: Env }>();

csvUpload.post('/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file) {
      return c.json({ error: 'No file uploaded.' }, 400);
    }

    if (typeof file === 'string') {
        // This case might occur if the 'file' field is not actually a file but a string.
        // For actual file uploads, 'file' should be an instance of File.
        return c.json({ error: 'Uploaded content is not a file.' }, 400);
    }

    // Read the file content
    const fileContent = await file.text();

    // Here, you would typically parse the CSV content
    // For now, just return a success message
    console.log('Received CSV file:', file.name);
    console.log('File content (first 100 chars):', fileContent.substring(0, 100));

    return c.json({ message: 'File uploaded successfully!', fileName: file.name }, 200);

  } catch (error) {
    console.error('CSV upload failed:', error);
    return c.json({ error: 'CSVファイルのアップロードに失敗しました。' }, 500);
  }
});

export default csvUpload;
