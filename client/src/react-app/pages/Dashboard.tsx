import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, LogOut, Pencil, Phone, RefreshCw, Search, Settings, Truck, X } from 'lucide-react';

type OrderStatus = 'abandoned' | 'complete' | 'confirmed' | 'cancelled' | 'shipped' | 'delivered' | 'returned';
type Order = {
  id: number; lead_id: string; status: OrderStatus; campaign: string; price: number; delivery_fee: number; delivery_type: string | null;
  phone: string; full_name: string | null; wilaya: string | null; commune: string | null; ecotrack_tracking: string | null; ecotrack_status: string | null; created_at: string; updated_at: string;
};

const statusLabels: Record<OrderStatus | 'all', string> = {
  all: 'الكل', abandoned: 'غير مكتملة', complete: 'مكتملة', confirmed: 'مؤكدة', cancelled: 'ملغاة', shipped: 'مرفوعة إلى EcoTrack', delivered: 'تم التسليم', returned: 'مرتجعة',
};
const formatDate = (value: string) => new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function Dashboard() {
  const [password, setPassword] = useState(() => sessionStorage.getItem('atlasio:dashboard-password') || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [provider, setProvider] = useState('navexdelivery');
  const [token, setToken] = useState('');
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', wilaya: '', commune: '' });
  const startEditing = (order: Order) => { setEditing(order); setEditForm({ fullName: order.full_name || '', phone: order.phone, wilaya: order.wilaya || '', commune: order.commune || '' }); };

  const authHeaders = (nextPassword = password) => ({ 'X-Dashboard-Password': nextPassword });

  const loadOrders = async (nextPassword = password) => {
    if (!nextPassword) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/orders', { headers: authHeaders(nextPassword) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 401 ? 'كلمة المرور غير صحيحة' : (data.error || 'تعذر تحميل الطلبات'));
      setOrders(data.orders || []); sessionStorage.setItem('atlasio:dashboard-password', nextPassword); setPassword(nextPassword);
      await loadSettings(nextPassword);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحميل الطلبات'); }
    finally { setLoading(false); }
  };

  const loadSettings = async (nextPassword = password) => {
    if (!nextPassword) return;
    const response = await fetch('/api/orders?resource=settings', { headers: authHeaders(nextPassword) });
    if (!response.ok) return;
    const data = await response.json(); setProvider(data.provider || 'navexdelivery'); setTokenConfigured(Boolean(data.tokenConfigured));
  };

  useEffect(() => { if (password) void loadOrders(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id: number, nextStatus: OrderStatus) => {
    setError(''); setLoading(true);
    try {
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: nextStatus }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تحديث حالة الطلب');
      setOrders((current) => current.map((order) => order.id === id ? (data.order || { ...order, status: nextStatus }) : order));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تحديث حالة الطلب'); }
    finally { setLoading(false); }
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); setSavingSettings(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'settings', provider, token }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الإعدادات');
      setProvider(data.provider || provider); setToken(''); setTokenConfigured(Boolean(data.tokenConfigured));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ الإعدادات'); }
    finally { setSavingSettings(false); }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', id: editing.id, ...editForm }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تعديل الطلب');
      setOrders((current) => current.map((order) => order.id === editing.id ? data.order : order));
      setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تعديل الطلب'); }
    finally { setLoading(false); }
  };

  const syncStatuses = async () => {
    setSyncing(true); setError('');
    try {
      const response = await fetch('/api/orders?resource=sync', { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذرت مزامنة EcoTrack');
      await loadOrders();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذرت مزامنة EcoTrack'); }
    finally { setSyncing(false); }
  };

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = status === 'all' || order.status === status;
    const normalizedQuery = query.trim().toLowerCase();
    const haystack = [order.lead_id, order.phone, order.full_name, order.wilaya, order.commune, order.campaign, order.ecotrack_tracking].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
  }), [orders, query, status]);
  const counts = orders.reduce<Record<string, number>>((result, order) => { result[order.status] = (result[order.status] || 0) + 1; return result; }, {});

  if (!password) return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-pink-50 px-4 py-16" dir="rtl">
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-100 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Phone className="h-7 w-7" /></div><h1 className="text-2xl font-bold text-gray-900">لوحة الطلبات</h1><p className="mt-2 text-sm text-gray-600">أدخل كلمة المرور لعرض طلبات Atlasio.</p></div>
        <form onSubmit={(event) => { event.preventDefault(); void loadOrders(passwordInput); }} className="space-y-4"><input type="password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} placeholder="كلمة مرور اللوحة" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-right outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" autoFocus /><button type="submit" disabled={loading || !passwordInput} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{loading && <Loader2 className="h-5 w-5 animate-spin" />} دخول</button></form>
        {error && <p className="mt-4 text-center text-sm text-red-600">{error}</p>}
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8" dir="rtl"><div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"><div><p className="text-sm font-semibold text-emerald-600">Atlasio</p><h1 className="text-2xl font-bold text-gray-900">لوحة الطلبات</h1><p className="mt-1 text-sm text-gray-500">أكد الطلب، وسيُرفع تلقائياً إلى EcoTrack.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void syncStatuses()} disabled={syncing} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> مزامنة EcoTrack</button><button type="button" onClick={() => setSettingsOpen((value) => !value)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><Settings className="h-4 w-4" /> إعدادات الشحن</button><button type="button" onClick={() => void loadOrders()} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث</button><button type="button" onClick={() => { sessionStorage.removeItem('atlasio:dashboard-password'); setPassword(''); }} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><LogOut className="h-4 w-4" /> خروج</button></div></header>

      {settingsOpen && <form onSubmit={saveSettings} className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-gray-900">إعدادات EcoTrack</h2><p className="text-sm text-gray-500">أدخل provider والتوكن مرة واحدة، وسيستخدمهما النظام تلقائياً.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${tokenConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{tokenConfigured ? 'التوكن مضبوط' : 'التوكن غير مضبوط'}</span></div><div className="grid gap-3 md:grid-cols-2"><input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="provider مثل navexdelivery" className="rounded-xl border border-gray-200 px-4 py-3 text-left outline-none focus:border-blue-500" dir="ltr" /><input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder={tokenConfigured ? 'اتركه فارغاً للإبقاء على التوكن الحالي' : 'EcoTrack API Token'} className="rounded-xl border border-gray-200 px-4 py-3 text-left outline-none focus:border-blue-500" dir="ltr" /></div><button type="submit" disabled={savingSettings || !provider} className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{savingSettings && <Loader2 className="h-4 w-4 animate-spin" />} حفظ إعدادات الشحن</button></form>}

      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{(['all', 'abandoned', 'complete', 'confirmed', 'shipped', 'delivered', 'returned', 'cancelled'] as const).map((item) => <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-2xl p-4 text-right shadow-sm transition ${status === item ? 'bg-emerald-600 text-white' : 'bg-white text-gray-800 hover:bg-emerald-50'}`}><p className="text-xs">{statusLabels[item]}</p><p className="mt-1 text-2xl font-bold">{item === 'all' ? orders.length : counts[item] || 0}</p></button>)}</section>
      <section className="mb-5 flex flex-col gap-3 md:flex-row"><div className="relative flex-1"><Search className="absolute right-3 top-3 h-5 w-5 text-gray-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالهاتف أو الاسم أو الولاية أو رقم التتبع" className="w-full rounded-xl border border-gray-200 bg-white py-3 pr-10 pl-4 outline-none focus:border-emerald-500" /></div><p className="rounded-xl bg-white px-4 py-3 text-sm text-gray-600">عرض {visibleOrders.length} من {orders.length}</p></section>
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && orders.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">جارٍ تحميل الطلبات...</div> : visibleOrders.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-gray-500">لا توجد طلبات في هذا القسم.</div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibleOrders.map((order) => <article key={order.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><p className="font-bold text-gray-900">{order.full_name || 'زبون بدون اسم'}</p><p className="mt-1 text-xs text-gray-500">{order.lead_id} · {formatDate(order.created_at)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${order.status === 'abandoned' ? 'bg-amber-100 text-amber-800' : order.status === 'cancelled' || order.status === 'returned' ? 'bg-red-100 text-red-800' : order.status === 'delivered' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{statusLabels[order.status]}</span></div><div className="space-y-2 text-sm text-gray-700"><p><strong>الهاتف:</strong> <a href={`tel:${order.phone}`} className="font-bold text-emerald-700 underline">{order.phone}</a></p><p><strong>المكان:</strong> {order.wilaya || '—'}{order.commune ? `، ${order.commune}` : ''}</p><p><strong>السعر:</strong> {order.price} دج + توصيل {order.delivery_fee || 0} دج</p>{order.ecotrack_tracking && <p><strong>رقم التتبع:</strong> <span className="font-bold text-blue-700">{order.ecotrack_tracking}</span></p>}{order.ecotrack_status && <p><strong>EcoTrack:</strong> {order.ecotrack_status}</p>}</div><div className="mt-5 grid grid-cols-2 gap-2">{!['shipped', 'delivered', 'returned', 'cancelled'].includes(order.status) && <button type="button" onClick={() => void updateStatus(order.id, 'confirmed')} className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"><Truck className="h-4 w-4" /> تأكيد ورفع</button>}{!['shipped', 'delivered', 'returned', 'cancelled'].includes(order.status) && <button type="button" onClick={() => startEditing(order)} className="flex items-center justify-center gap-1 rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"><Pencil className="h-4 w-4" /> تعديل</button>}{!['cancelled', 'returned'].includes(order.status) && <button type="button" onClick={() => void updateStatus(order.id, 'cancelled')} className="flex items-center justify-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-sm font-bold text-gray-700 hover:bg-red-50 hover:text-red-700"><X className="h-4 w-4" /> إلغاء</button>}</div>{editing?.id === order.id && <form onSubmit={saveEdit} className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3"><input required value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} placeholder="الاسم" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-right" /><input required value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} placeholder="الهاتف" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left" dir="ltr" /><input required value={editForm.wilaya} onChange={(event) => setEditForm({ ...editForm, wilaya: event.target.value })} placeholder="الولاية" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-right" /><input required value={editForm.commune} onChange={(event) => setEditForm({ ...editForm, commune: event.target.value })} placeholder="البلدية" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-right" /><div className="flex gap-2"><button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white">حفظ التعديل</button><button type="button" onClick={() => setEditing(null)} className="rounded-lg bg-white px-3 py-2 text-sm font-bold text-gray-600">إلغاء</button></div></form>}</article>)}</div>}
    </div></main>
  );
}
