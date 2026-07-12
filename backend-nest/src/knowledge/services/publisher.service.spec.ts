import { PublisherService } from './publisher.service';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { LoggerService } from '../../common/services/logger.service';
import { RedisCacheService } from '../../redis/services/redis-cache.service';

describe('PublisherService', () => {
  const repo = {
    findArticleById: jest.fn(),
    findKnowledgeUser: jest.fn(),
    createPost: jest.fn(),
    updateArticle: jest.fn(),
    softHidePost: jest.fn(),
  } as unknown as KnowledgeRepository;

  const cache = {
    del: jest.fn().mockResolvedValue(undefined),
  } as unknown as RedisCacheService;

  const logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  } as unknown as LoggerService;

  const service = new PublisherService(repo, cache, logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds post body with trusted tag and source metadata', () => {
    const body = service.buildPostBody({
      titleAr: 'عنوان',
      summary: 'ملخص\n\n🔗 المصدر:\nhttps://example.com',
      sourceName: 'مصدر موثوق',
      publishedAt: new Date('2026-07-01T00:00:00Z'),
    });

    expect(body.arabicContent).toContain('عنوان');
    expect(body.arabicContent).toContain('وسم: خبر موثوق');
    expect(body.arabicContent).toContain('مصدر موثوق');
    expect(body.content).toContain('trusted-news');
  });

  it('publishes pending summarized articles as posts', async () => {
    (repo.findArticleById as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'PENDING',
      postId: null,
      summary: 'ملخص',
      titleAr: 'عنوان',
      publishedAt: new Date(),
      source: { name: 'MEWA' },
    });
    (repo.findKnowledgeUser as jest.Mock).mockResolvedValue({ id: 'u-ai' });
    (repo.createPost as jest.Mock).mockResolvedValue({ id: 'p1' });
    (repo.updateArticle as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      postId: 'p1',
    });

    const result = await service.publishArticle('a1');
    expect(repo.createPost).toHaveBeenCalled();
    expect(repo.updateArticle).toHaveBeenCalled();
    expect(result.status).toBe('PUBLISHED');
    expect(cache.del).toHaveBeenCalledWith('posts:feed:first');
  });

  it('rejects articles and hides linked posts', async () => {
    (repo.findArticleById as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'PUBLISHED',
      postId: 'p1',
    });
    (repo.updateArticle as jest.Mock).mockResolvedValue({
      id: 'a1',
      status: 'REJECTED',
    });

    await service.rejectArticle('a1', 'محتوى غير مناسب');
    expect(repo.softHidePost).toHaveBeenCalledWith('p1');
    expect(repo.updateArticle).toHaveBeenCalled();
  });
});
