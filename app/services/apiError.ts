export async function parseApiError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    if (typeof json.messageAr === 'string' && json.messageAr.trim()) {
      return json.messageAr;
    }
    if (typeof json.message === 'string' && json.message.trim()) {
      return json.message;
    }
    if (Array.isArray(json.message)) {
      return json.message.join('، ');
    }
    if (typeof json.error === 'string') {
      return json.error;
    }
  } catch {
    // ignore parse errors
  }
  return 'حدث خطأ، يرجى المحاولة مجدداً';
}
