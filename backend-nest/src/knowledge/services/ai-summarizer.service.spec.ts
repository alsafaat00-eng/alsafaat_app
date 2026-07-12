import { AISummarizerService } from './ai-summarizer.service';
import { LoggerService } from '../../common/services/logger.service';
import { ApiException } from '../../common/exceptions/api.exception';

describe('AISummarizerService', () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn(),
  } as unknown as LoggerService;

  const originalKey = process.env.OPENAI_API_KEY;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalKey;
  });

  it('throws when OpenAI is not configured', async () => {
    delete process.env.OPENAI_API_KEY;
    const service = new AISummarizerService(logger);
    expect(service.isConfigured()).toBe(false);
    await expect(
      service.summarize({
        title: 't',
        content: 'c',
        sourceName: 's',
        sourceUrl: 'https://example.com',
      }),
    ).rejects.toBeInstanceOf(ApiException);
  });
});
