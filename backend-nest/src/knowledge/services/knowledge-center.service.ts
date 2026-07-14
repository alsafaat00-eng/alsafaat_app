import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { KnowledgeSourceType } from '@prisma/client';
import { LoggerService } from '../../common/services/logger.service';
import { throwApi } from '../../common/exceptions/api.exception';
import { KnowledgeRepository } from '../repositories/knowledge.repository';
import { NewsFetcherService } from './news-fetcher.service';
import { AISummarizerService } from './ai-summarizer.service';
import { PublisherService } from './publisher.service';
import {
  CreateKnowledgeSourceDto,
  UpdateKnowledgeSourceDto,
} from '../dto/knowledge.dto';

@Injectable()
export class KnowledgeCenterService implements OnModuleInit {
  private syncRunning = false;

  constructor(
    private readonly repo: KnowledgeRepository,
    private readonly fetcher: NewsFetcherService,
    private readonly summarizer: AISummarizerService,
    private readonly publisher: PublisherService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.ensureKnowledgeUser();
  }

  async ensureKnowledgeUser() {
    const existing = await this.repo.findKnowledgeUser();
    if (existing) return existing;

    const passwordHash = await bcrypt.hash(randomBytes(48).toString('hex'), 12);
    const user = await this.repo.createKnowledgeUser({ passwordHash });
    this.logger.info({ userId: user.id }, 'Knowledge Center user created');
    await this.repo.createSyncLog({
      level: 'info',
      message: 'تم إنشاء حساب مركز المعرفة',
      meta: { userId: user.id },
    });
    return user;
  }

  listSources() {
    return this.repo.listSources();
  }

  async createSource(dto: CreateKnowledgeSourceDto) {
    const source = await this.repo.createSource({
      name: dto.name.trim(),
      url: dto.url.trim(),
      type: dto.type,
      enabled: dto.enabled ?? true,
    });
    await this.repo.createSyncLog({
      sourceId: source.id,
      level: 'info',
      message: `تمت إضافة مصدر: ${source.name}`,
    });
    return source;
  }

  async updateSource(id: string, dto: UpdateKnowledgeSourceDto) {
    const existing = await this.repo.findSourceById(id);
    if (!existing) throwApi(404, 'not_found', 'المصدر غير موجود');
    const source = await this.repo.updateSource(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.url !== undefined ? { url: dto.url.trim() } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
    });
    await this.repo.createSyncLog({
      sourceId: id,
      level: 'info',
      message: `تم تحديث المصدر: ${source.name}`,
    });
    return source;
  }

  async deleteSource(id: string) {
    const existing = await this.repo.findSourceById(id);
    if (!existing) throwApi(404, 'not_found', 'المصدر غير موجود');
    await this.repo.deleteSource(id);
    await this.repo.createSyncLog({
      level: 'warn',
      message: `تم حذف المصدر: ${existing.name}`,
      meta: { sourceId: id },
    });
    return { deleted: true };
  }

  async setSourceEnabled(id: string, enabled: boolean) {
    return this.updateSource(id, { enabled });
  }

  async listArticles(params: {
    status?: 'PENDING' | 'PUBLISHED' | 'REJECTED';
    sourceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const { items, total } = await this.repo.listArticles({
      status: params.status,
      sourceId: params.sourceId,
      page,
      pageSize,
    });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async listLogs(params: { page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 50));
    const { items, total } = await this.repo.listSyncLogs({ page, pageSize });
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  approveArticle(id: string) {
    return this.publisher.publishArticle(id);
  }

  rejectArticle(id: string, reason?: string) {
    return this.publisher.rejectArticle(id, reason);
  }

  async publishManual(id: string) {
    const article = await this.repo.findArticleById(id);
    if (!article) throwApi(404, 'not_found', 'الخبر غير موجود');

    if (!article.summary || !article.titleAr) {
      await this.summarizeAndStore(article.id);
    }
    return this.publisher.publishArticle(id);
  }

  async syncAll(options?: { sourceId?: string }) {
    if (this.syncRunning) {
      this.logger.warn({}, 'Knowledge sync already running');
      return { skipped: true, reason: 'already_running' };
    }

    this.syncRunning = true;
    const startedAt = Date.now();
    const stats = {
      sources: 0,
      fetched: 0,
      created: 0,
      published: 0,
      skipped: 0,
      failed: 0,
    };

    try {
      await this.ensureKnowledgeUser();
      const sources = options?.sourceId
        ? [
            await this.repo.findSourceById(options.sourceId),
          ].filter((s): s is NonNullable<typeof s> => !!s && s.enabled)
        : await this.repo.listEnabledSources();

      stats.sources = sources.length;
      await this.repo.createSyncLog({
        level: 'info',
        message: `بدء مزامنة مركز المعرفة (${sources.length} مصادر)`,
        meta: { sourceId: options?.sourceId ?? null },
      });

      if (sources.length === 0) {
        await this.repo.createSyncLog({
          level: 'warn',
          message:
            'لا توجد مصادر مفعّلة لمركز المعرفة — أضف مصدراً RSS/API من لوحة التحكم',
        });
        this.logger.warn({}, 'Knowledge sync: no enabled sources');
      }

      for (const source of sources) {
        try {
          const result = await this.syncSource(source.id);
          stats.fetched += result.fetched;
          stats.created += result.created;
          stats.published += result.published;
          stats.skipped += result.skipped;
        } catch (err) {
          stats.failed += 1;
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(
            { err, sourceId: source.id },
            'Knowledge source sync failed',
          );
          await this.repo.createSyncLog({
            sourceId: source.id,
            level: 'error',
            message: `فشل مزامنة المصدر ${source.name}: ${message}`,
          });
        }
      }

      // Retry PENDING articles that previously failed summarization (e.g. missing OpenAI key)
      const autoPublish = process.env.KNOWLEDGE_AUTO_PUBLISH !== 'false';
      const pending = await this.repo.findPendingWithoutSummary(20);
      for (const article of pending) {
        try {
          await this.summarizeAndStore(article.id);
          if (autoPublish) {
            await this.publisher.publishArticle(article.id);
            stats.published += 1;
          }
        } catch (err) {
          stats.failed += 1;
          const message = err instanceof Error ? err.message : String(err);
          await this.repo.updateArticle(article.id, {
            errorMessage: message.slice(0, 500),
          });
          await this.repo.createSyncLog({
            sourceId: article.sourceId,
            level: 'error',
            message: `فشل إعادة تلخيص/نشر: ${article.originalTitle}`,
            meta: { articleId: article.id, error: message },
          });
        }
      }

      await this.repo.createSyncLog({
        level: 'info',
        message: 'اكتملت مزامنة مركز المعرفة',
        meta: { ...stats, durationMs: Date.now() - startedAt },
      });
      this.logger.info(stats, 'Knowledge sync completed');
      return stats;
    } finally {
      this.syncRunning = false;
    }
  }

  private async syncSource(sourceId: string) {
    const source = await this.repo.findSourceById(sourceId);
    if (!source || !source.enabled) {
      return { fetched: 0, created: 0, published: 0, skipped: 0 };
    }

    const items =
      source.type === KnowledgeSourceType.API
        ? await this.fetcher.fetchFromApi(source.url)
        : await this.fetcher.fetchFromRss(source.url);

    const result = { fetched: items.length, created: 0, published: 0, skipped: 0 };
    const autoPublish = process.env.KNOWLEDGE_AUTO_PUBLISH !== 'false';
    const maxPerSource = Math.max(
      1,
      parseInt(process.env.KNOWLEDGE_MAX_ITEMS_PER_SOURCE || '10', 10) || 10,
    );

    for (const item of items.slice(0, maxPerSource)) {
      const existing = await this.repo.findArticleByUrl(item.url);
      if (existing) {
        result.skipped += 1;
        continue;
      }

      const article = await this.repo.createArticle({
        sourceId: source.id,
        originalTitle: item.title,
        originalUrl: item.url,
        publishedAt: item.publishedAt,
        status: 'PENDING',
      });
      result.created += 1;

      try {
        await this.summarizeAndStore(article.id, item.contentSnippet);
        if (autoPublish) {
          await this.publisher.publishArticle(article.id);
          result.published += 1;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.repo.updateArticle(article.id, {
          errorMessage: message.slice(0, 500),
        });
        await this.repo.createSyncLog({
          sourceId: source.id,
          level: 'error',
          message: `فشل تلخيص/نشر: ${item.title}`,
          meta: { articleId: article.id, error: message },
        });
        this.logger.error(
          { err, articleId: article.id },
          'Article summarize/publish failed',
        );
      }
    }

    await this.repo.createSyncLog({
      sourceId: source.id,
      level: 'info',
      message: `مزامنة ${source.name}: جلب ${result.fetched}، جديد ${result.created}، نشر ${result.published}`,
      meta: result,
    });

    return result;
  }

  private async summarizeAndStore(articleId: string, contentHint?: string) {
    const article = await this.repo.findArticleById(articleId);
    if (!article) throwApi(404, 'not_found', 'الخبر غير موجود');

    const summarized = await this.summarizer.summarize({
      title: article.originalTitle,
      content: contentHint || article.originalTitle,
      sourceName: article.source.name,
      sourceUrl: article.originalUrl,
    });

    return this.repo.updateArticle(articleId, {
      titleAr: summarized.titleAr,
      summary: summarized.summary,
      errorMessage: null,
    });
  }
}
