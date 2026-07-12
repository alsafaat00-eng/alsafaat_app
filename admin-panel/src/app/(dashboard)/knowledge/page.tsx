'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Power,
  Trash2,
  Check,
  X,
  Upload,
} from 'lucide-react';
import {
  createKnowledgeSource,
  deleteKnowledgeSource,
  fetchKnowledgeArticles,
  fetchKnowledgeLogs,
  fetchKnowledgeSources,
  publishKnowledgeArticle,
  approveKnowledgeArticle,
  rejectKnowledgeArticle,
  setKnowledgeSourceEnabled,
  syncKnowledge,
  syncKnowledgeSource,
  type KnowledgeArticle,
  type KnowledgeSource,
  type KnowledgeSyncLog,
} from '@/services/knowledge.service';

type Tab = 'sources' | 'articles' | 'logs';

export default function KnowledgeCenterPage() {
  const [tab, setTab] = useState<Tab>('sources');
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [logs, setLogs] = useState<KnowledgeSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [form, setForm] = useState({
    name: '',
    url: '',
    type: 'RSS' as 'RSS' | 'API',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'sources') {
        setSources(await fetchKnowledgeSources());
      } else if (tab === 'articles') {
        const data = await fetchKnowledgeArticles({
          status: statusFilter || undefined,
          pageSize: 50,
        });
        setArticles(data.items);
      } else {
        const data = await fetchKnowledgeLogs({ pageSize: 50 });
        setLogs(data.items);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التحميل');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreateSource(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createKnowledgeSource(form);
      setForm({ name: '', url: '', type: 'RSS' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء المصدر');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
            <BookOpen className="h-6 w-6 text-emerald-400" />
            مركز المعرفة
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            إدارة المصادر والأخبار الموثوقة والنشر التلقائي
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await syncKnowledge();
              await load();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'فشلت المزامنة');
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          إعادة مزامنة الكل
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(
          [
            ['sources', 'المصادر'],
            ['articles', 'الأخبار'],
            ['logs', 'سجل العمليات'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-2 text-sm ${
              tab === id
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'text-slate-400 hover:bg-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-400">جاري التحميل...</p>
      ) : null}

      {!loading && tab === 'sources' ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={onCreateSource}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4"
          >
            <h2 className="flex items-center gap-2 font-semibold text-slate-100">
              <Plus className="h-4 w-4" /> إضافة مصدر
            </h2>
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="اسم المصدر"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <input
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              placeholder="رابط RSS أو API"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              required
            />
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as 'RSS' | 'API' }))
              }
            >
              <option value="RSS">RSS</option>
              <option value="API">API</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              حفظ المصدر
            </button>
          </form>

          <div className="space-y-3">
            {sources.map((source) => (
              <div
                key={source.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-100">{source.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{source.url}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {source.type} · {source.enabled ? 'مفعّل' : 'معطّل'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      title="مزامنة"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await syncKnowledgeSource(source.id);
                          await load();
                        } finally {
                          setBusy(false);
                        }
                      }}
                      className="rounded-lg p-2 text-slate-300 hover:bg-slate-900"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={source.enabled ? 'تعطيل' : 'تفعيل'}
                      onClick={async () => {
                        await setKnowledgeSourceEnabled(source.id, !source.enabled);
                        await load();
                      }}
                      className="rounded-lg p-2 text-slate-300 hover:bg-slate-900"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={async () => {
                        if (!confirm('حذف المصدر؟')) return;
                        await deleteKnowledgeSource(source.id);
                        await load();
                      }}
                      className="rounded-lg p-2 text-rose-400 hover:bg-slate-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && tab === 'articles' ? (
        <div className="space-y-4">
          <select
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">كل الحالات</option>
            <option value="PENDING">بانتظار</option>
            <option value="PUBLISHED">منشور</option>
            <option value="REJECTED">مرفوض</option>
          </select>

          <div className="space-y-3">
            {articles.map((article) => (
              <div
                key={article.id}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100">
                      {article.titleAr || article.originalTitle}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {article.source?.name} · {article.status}
                    </p>
                    <a
                      href={article.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block break-all text-xs text-emerald-400"
                    >
                      {article.originalUrl}
                    </a>
                    {article.summary ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">
                        {article.summary}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      title="موافقة / نشر"
                      onClick={async () => {
                        await approveKnowledgeArticle(article.id);
                        await load();
                      }}
                      className="rounded-lg p-2 text-emerald-400 hover:bg-slate-900"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="نشر يدوي"
                      onClick={async () => {
                        await publishKnowledgeArticle(article.id);
                        await load();
                      }}
                      className="rounded-lg p-2 text-sky-400 hover:bg-slate-900"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="رفض"
                      onClick={async () => {
                        await rejectKnowledgeArticle(article.id);
                        await load();
                      }}
                      className="rounded-lg p-2 text-rose-400 hover:bg-slate-900"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && tab === 'logs' ? (
        <div className="space-y-2">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <span
                  className={
                    log.level === 'error'
                      ? 'text-rose-400'
                      : log.level === 'warn'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                  }
                >
                  {log.level}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(log.createdAt).toLocaleString('ar-SA')}
                </span>
              </div>
              <p className="mt-1 text-slate-200">{log.message}</p>
              {log.source?.name ? (
                <p className="mt-1 text-xs text-slate-500">{log.source.name}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
