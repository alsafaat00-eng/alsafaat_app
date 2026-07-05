import { apiClient, unwrap } from './api.client';

export type DashboardStats = {
  users: { total: number; active: number; banned: number; newToday: number };
  posts: { total: number; hidden: number };
  listings: { total: number; active: number; suspended: number };
  liveStreams: { total: number; liveNow: number };
  tickets: { open: number; urgent: number; total: number };
  butchers: { total: number; verified: number };
  charts: {
    usersByDay: { date: string; count: number }[];
    ticketsByCategory: { category: string; count: number }[];
  };
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await apiClient.get('/admin/dashboard/stats');
  return unwrap(res);
}
