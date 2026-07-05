'use client';

import { ResourcePage, Badge } from '@/components/ui/ResourcePage';
import { Button } from '@/components/ui/Button';
import { fetchButchers, updateButcher } from '@/services/admin.service';

type ButcherRow = {
  id: string;
  nameAr: string;
  cityAr: string;
  type: string;
  isOpen: boolean;
  user?: { arabicName?: string };
};

export default function ButchersPage() {
  return (
    <ResourcePage<ButcherRow>
      title="إدارة الملاحم"
      description="الملاحم المسجّلة في المنصة"
      fetchPage={({ page, search }) => fetchButchers({ page, search })}
      columns={[
        { key: 'nameAr', label: 'الاسم' },
        { key: 'cityAr', label: 'المدينة' },
        {
          key: 'type',
          label: 'النوع',
          render: (r) => <Badge tone={r.type === 'verified' ? 'success' : 'default'}>{r.type}</Badge>,
        },
        {
          key: 'isOpen',
          label: 'مفتوح',
          render: (r) => (r.isOpen ? 'نعم' : 'لا'),
        },
      ]}
      actions={(row, reload) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await updateButcher(row.id, {
              type: row.type === 'verified' ? 'regular' : 'verified',
            });
            reload();
          }}
        >
          {row.type === 'verified' ? 'إلغاء التوثيق' : 'توثيق'}
        </Button>
      )}
    />
  );
}
