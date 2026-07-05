'use client';

import Link from 'next/link';
import { ResourcePage, Badge } from '@/components/ui/ResourcePage';
import { Button } from '@/components/ui/Button';
import { fetchUsers, updateUser, deleteUser } from '@/services/admin.service';

type UserRow = {
  id: string;
  username: string;
  arabicName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  verified: boolean;
  createdAt: string;
};

export default function UsersPage() {
  return (
    <ResourcePage<UserRow>
      title="إدارة المستخدمين"
      description="عرض وتعديل وحظر المستخدمين"
      fetchPage={({ page, search }) => fetchUsers({ page, search })}
      columns={[
        { key: 'arabicName', label: 'الاسم' },
        { key: 'username', label: 'المستخدم' },
        { key: 'email', label: 'البريد' },
        {
          key: 'role',
          label: 'الدور',
          render: (r) => <Badge tone="info">{r.role}</Badge>,
        },
        {
          key: 'isActive',
          label: 'الحالة',
          render: (r) => (
            <Badge tone={r.isActive ? 'success' : 'danger'}>{r.isActive ? 'نشط' : 'محظور'}</Badge>
          ),
        },
      ]}
      actions={(row, reload) => (
        <div className="flex flex-wrap gap-2">
          <Link href={`/users/${row.id}`}>
            <Button variant="ghost" size="sm">
              تفاصيل
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await updateUser(row.id, { isActive: !row.isActive });
              reload();
            }}
          >
            {row.isActive ? 'حظر' : 'فك الحظر'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              if (confirm('تأكيد الحذف؟')) {
                await deleteUser(row.id);
                reload();
              }
            }}
          >
            حذف
          </Button>
        </div>
      )}
    />
  );
}
