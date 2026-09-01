import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, LogOut, Phone, RefreshCw, Search, X } from 'lucide-react';

type OrderStatus = 'abandoned' | 'complete' | 'confirmed' | 'cancelled';

type Order = {
  id: number;
  lead_id: string;
  status: OrderStatus;
  campaign: string;
  price: number;
  phone: string;
  full_name: string | null;
  wilaya: string | null;
  commune: string | null;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<OrderStatus | 'all', string> = {
  all: 'الكل',
  abandoned: 'غير مكتملة',
  complete: 'مكتملة',
  confirmed: 'مؤكدة',
  cancelled: 'ملغاة',
};

const formatDate = (value: string) => new Intl.DateTimeFormat('ar-DZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

export default function Dashboard() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('atlasio:dashboard-password') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = async (nextPassword = password) => {
    if (!nextPassword) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        headers: { 'X-Dashboard-Password': nextPassword },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'كلمة المرور غير صحيحة' : (data.error || 'تعذر تحميل الطلبات'));
      setOrders(data.orders || []);
      sessionStorage.setItem('atlasio:dashboard-password', nextPassword);
      setPassword(nextPassword);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (password) void loadOrders();
    // Load once when a saved dashboard password exists.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: number, nextStatus: OrderStatus) => {
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Dashboard-Password': password,
        },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (!response.ok) throw new Error('تعذر تحديث حالة الطلب');
      setOrders((current) => current.map((order) => order.id === id ? { ...order, status: nextStatus } : order));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث حالة الطلب');
    }
  };

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = status === 'all' || order.status === status;
    const normalizedQuery = query.trim().toLowerCase();
    const haystack = [order.lead_id, order.phone, order.full_name, order.wilaya, order.commune, order.campaign].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [orders, query, status]);

  const counts = orders.reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] || 0) + 1;
    return result;
  }, {});

  if (!password) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-pink-50 px-4 py-16" dir="rtl">
        <div className="mx-auto max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Phone className="h-7 w-7" /></div>
            <h1 className="text-2xl font-bold text-gray-900">لوحة الطلبات</h1>
            <p className="mt-2 text-sm text-gray-600">أدخل كلمة المرور لعرض طلبات Atlasio.</p>
          </div>
          <form onSubmit={(event) => { event.preventDefault(); void loadOrders(passwordInput); }} className="space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="كلمة مرور اللوحة"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              autoFocus
            />
            <button type="submit" disabled={loading || !passwordInput} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              دخول
            </button>
          </form>
          {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8" dir="rtl">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Atlasio</p>
            <h1 className="text-2xl font-bold text-gray-900">لوحة الطلبات</h1>
            <p className="mt-1 text-sm text-gray-500">تابع الأرقام وأكّد الطلبات بسهولة.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadOrders()} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث</button>
            <button type="button" onClick={() => { sessionStorage.removeItem('atlasio:dashboard-password'); setPassword(''); }} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><LogOut className="h-4 w-4" /> خروج</button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          {(['all', 'abandoned', 'complete', 'confirmed', 'cancelled'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-2xl p-4 text-right shadow-sm transition ${status === item ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 hover:bg-emerald-50'}`}>
              <p className="text-sm">{statusLabels[item]}</p>
              <p className="mt-1 text-2xl font-bold">{item === 'all' ? orders.length : counts[item] || 0}</p>
            </button>
          ))}
        </section>

        <section className="mb-5 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1"><Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالهاتف أو الاسم أو الولاية أو رقم المتابعة" className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-10 pl-4 outline-none focus:border-emerald-500" /></div>
          <p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-600">عرض {visibleOrders.length} من {orders.length}</p>
        </section>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading && orders.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">جارٍ تحميل الطلبات...</div> : visibleOrders.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">لا توجد طلبات في هذا القسم.</div> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleOrders.map((order) => (
              <article key={order.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div><p className="font-bold text-gray-900">{order.full_name || 'زبون بدون اسم'}</p><p className="mt-1 text-xs text-gray-500">{order.lead_id} · {formatDate(order.created_at)}</p></div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'abandoned' ? 'bg-amber-100 text-amber-800' : order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{statusLabels[order.status]}</span>
                </div>
                <div className="space-y-2 text-sm text-gray-700">
                  <p><strong>الهاتف:</strong> <a href={`tel:${order.phone}`} className="font-bold text-emerald-700 underline">{order.phone}</a></p>
                  <p><strong>المكان:</strong> {order.wilaya || '—'}{order.commune ? `، ${order.commune}` : ''}</p>
                  <p><strong>السعر:</strong> {order.price} دج · <strong>الحملة:</strong> {order.campaign}</p>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void updateStatus(order.id, 'confirmed')} className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"><Check className="h-4 w-4" /> تم التأكيد</button>
                  <button type="button" onClick={() => void updateStatus(order.id, 'cancelled')} className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-700"><X className="h-4 w-4" /> إلغاء</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
