'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { fetchSettings, updateSetting } from '@/services/admin.service';
import { getStoredUser } from '@/services/auth.service';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, unknown>[]>([]);
  const user = getStoredUser();
  const isAdmin = user?.role === 'ADMIN';

  const load = () => fetchSettings().then((r) => setSettings(r.settings));

  useEffect(() => {
    load();
  }, []);

  if (!isAdmin) {
    return <p className="text-amber-400">الإعدادات للمسؤول (ADMIN) فقط</p>;
  }

  return (
    <div>
      <PageHeader title="إعدادات النظام" description="Feature Flags والإعدادات العامة" />
      <div className="space-y-4">
        {settings.map((s) => {
          const key = String(s.key);
          const val = s.value;
          const isBool = typeof val === 'boolean';
          return (
            <div key={key} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
              <div>
                <p className="font-medium text-white">{String(s.labelAr ?? key)}</p>
                <p className="text-xs text-slate-500">{key}</p>
              </div>
              {isBool ? (
                <Button
                  variant={val ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={async () => {
                    await updateSetting({ key, value: !val, labelAr: String(s.labelAr ?? '') });
                    load();
                  }}
                >
                  {val ? 'مفعّل' : 'معطّل'}
                </Button>
              ) : (
                <span className="text-sm text-slate-400">{JSON.stringify(val)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
