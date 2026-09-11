import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Box,
  Check,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  PackageCheck,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Truck,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

type OrderStatus = 'abandoned' | 'complete' | 'confirmed' | 'not_responding' | 'cancelled' | 'shipped' | 'delivered' | 'returned' | 'trashed';
type ProviderProfile = { id: string; name: string; provider: string; token?: string; tokenConfigured?: boolean; deliveryFees?: Record<string, { home: number; stopDesk: number }> };
type StockProduct = { id: number; name: string; sku: string | null; quantity: number; active: boolean };
type Order = {
  id: number; lead_id: string; status: OrderStatus; status_before_trash: OrderStatus | null; trashed_at: string | null; campaign: string; price: number; delivery_fee: number; delivery_type: string | null;
  phone: string; full_name: string | null; wilaya: string | null; commune: string | null; ecotrack_tracking: string | null; ecotrack_status: string | null; gift_booklet: boolean; shipping_provider_id: string | null; shipping_provider_name: string | null; stock_product_id: number | null; stock_product_name: string | null; ship_from_stock: boolean; created_at: string; updated_at: string;
};

const statusLabels: Record<OrderStatus | 'all', string> = {
  all: 'الكل', abandoned: 'غير مكتملة', complete: 'مكتملة', confirmed: 'مؤكدة', not_responding: 'لا يستجيب', cancelled: 'ملغاة', shipped: 'مرفوعة إلى EcoTrack', delivered: 'تم التسليم', returned: 'مرتجعة', trashed: 'سلة المهملات',
};
const formatDate = (value: string) => new Intl.DateTimeFormat('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
const ecoStatusLabel = (value: string | null) => ({ created: 'تم إنشاء الشحنة', delivered: 'تم التسليم', returned: 'مرتجعة', cancelled: 'ملغاة في EcoTrack', pending: 'قيد الانتظار' }[value || ''] || value || 'غير مرفوعة');
const WILAYAS = ['01 - أدرار','02 - الشلف','03 - الأغواط','04 - أم البواقي','05 - باتنة','06 - بجاية','07 - بسكرة','08 - بشار','09 - البليدة','10 - البويرة','11 - تمنراست','12 - تبسة','13 - تلمسان','14 - تيارت','15 - تيزي وزو','16 - الجزائر','17 - الجلفة','18 - جيجل','19 - سطيف','20 - سعيدة','21 - سكيكدة','22 - سيدي بلعباس','23 - عنابة','24 - قالمة','25 - قسنطينة','26 - المدية','27 - مستغانم','28 - المسيلة','29 - معسكر','30 - ورقلة','31 - وهران','32 - البيض','33 - إليزي','34 - برج بوعريريج','35 - بومرداس','36 - الطارف','37 - تندوف','38 - تيسمسيلت','39 - الوادي','40 - خنشلة','41 - سوق أهراس','42 - تيبازة','43 - ميلة','44 - عين الدفلى','45 - النعامة','46 - عين تموشنت','47 - غرداية','48 - غليزان','49 - المغير','50 - المنيعة','51 - أولاد جلال','52 - بني عباس','53 - برج باجي مختار','54 - تيميمون','55 - تقرت','56 - جانت','57 - عين صالح','58 - عين قزام'];

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
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeProviderId, setActiveProviderId] = useState('');
  const [providerNameDraft, setProviderNameDraft] = useState('');
  const [editingProviderId, setEditingProviderId] = useState('');
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [selectedStockProductId, setSelectedStockProductId] = useState('');
  const [shipFromStock, setShipFromStock] = useState(true);
  const [feeText, setFeeText] = useState('{}');
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ fullName: '', phone: '', wilaya: '', commune: '', price: '', deliveryFee: '' });
  const [editCommunes, setEditCommunes] = useState<Array<{ name: string; hasStopDesk: boolean }>>([]);
  const startEditing = (order: Order) => {
    setEditing(order); setEditForm({ fullName: order.full_name || '', phone: order.phone, wilaya: order.wilaya || '', commune: order.commune || '', price: String(order.price), deliveryFee: String(order.delivery_fee || 0) }); setEditCommunes([]);
    void fetch(`/api/orders?resource=communes&wilaya=${encodeURIComponent(order.wilaya || '')}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('communes'))).then((data: { communes?: Array<{ name: string; hasStopDesk: boolean }> }) => setEditCommunes(data.communes || [])).catch(() => setEditCommunes([]));
  };

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
    const data = await response.json(); setProvider(data.provider || 'navexdelivery'); setTokenConfigured(Boolean(data.tokenConfigured)); setFeeText(JSON.stringify(data.deliveryFees || {}, null, 2)); setProviders(data.providers || []); setActiveProviderId(data.activeProviderId || data.providers?.[0]?.id || ''); setSelectedProviderId(data.activeProviderId || data.providers?.[0]?.id || ''); const activeProvider = (data.providers || []).find((item: ProviderProfile) => item.id === (data.activeProviderId || '')) || (data.providers || [])[0]; setProviderNameDraft(activeProvider?.name || ''); setEditingProviderId(activeProvider?.id || '');
    const stockProviderId = data.activeProviderId || data.providers?.[0]?.id || '';
    const stockResponse = await fetch(`/api/orders?resource=stock&providerId=${encodeURIComponent(stockProviderId)}`, { headers: authHeaders(nextPassword) });
    if (stockResponse.ok) {
      const stockData = await stockResponse.json();
      const nextProducts = stockData.products || [];
      setStockProducts(nextProducts);
      setSelectedStockProductId(nextProducts[0] ? String(nextProducts[0].id) : '');
      setShipFromStock((current) => (nextProducts.length === 0 ? false : current));
    }
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

  const saveProviderProfile = async () => {
    const name = providerNameDraft.trim(); const providerCode = provider.trim().toLowerCase(); const providerToken = token.trim();
    if (!name || !providerCode || (!providerToken && !editingProviderId)) { setError('أدخل اسم الشركة وProvider والتوكن'); return; }
    setSavingSettings(true); setError('');
    try {
      const id = editingProviderId || `provider-${Date.now()}`;
      const nextProviders = [...providers.filter((item) => item.id !== id), { id, name, provider: providerCode, token: providerToken }];
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'settings', providers: nextProviders, activeProviderId: activeProviderId || id }) });
      const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'تعذر حفظ شركة التوصيل');
      setProviders(data.providers || []); setActiveProviderId(data.activeProviderId || id); setSelectedProviderId(data.activeProviderId || id); setEditingProviderId(id); setToken(''); setTokenConfigured(true); await refreshStock(data.activeProviderId || id);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ شركة التوصيل'); }
    finally { setSavingSettings(false); }
  };

  const refreshStock = async (providerId: string) => { if (!providerId) return; const response = await fetch(`/api/orders?resource=stock&providerId=${encodeURIComponent(providerId)}`, { headers: authHeaders() }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || 'تعذر جلب منتجات المخزون من الشركة'); const nextProducts = data.products || []; setStockProducts(nextProducts); setSelectedStockProductId(nextProducts[0] ? String(nextProducts[0].id) : ''); setShipFromStock((current) => (nextProducts.length === 0 ? false : current)); };

  const startNewProvider = () => { setEditingProviderId(''); setProviderNameDraft(''); setProvider(''); setToken(''); setTokenConfigured(false); setStockProducts([]); setSelectedStockProductId(''); setShipFromStock(false); };

  const selectProviderForEdit = (item: ProviderProfile) => { setEditingProviderId(item.id); setProviderNameDraft(item.name); setProvider(item.provider); setToken(''); setActiveProviderId(item.id); setSelectedProviderId(item.id); setTokenConfigured(Boolean(item.tokenConfigured)); void refreshStock(item.id); };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault(); setSavingSettings(true); setError('');
    try {
      let deliveryFees: unknown = {};
      try { deliveryFees = JSON.parse(feeText || '{}'); } catch { throw new Error('صيغة أسعار التوصيل غير صحيحة؛ استخدم JSON صالحاً'); }
      const providerProfiles = providers.map((item) => ({ id: item.id, name: item.name, provider: item.provider, token: item.id === editingProviderId ? token : '' }));
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ resource: 'settings', providers: providerProfiles, activeProviderId, provider, token, deliveryFees }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر حفظ الإعدادات');
      setProvider(data.provider || provider); setToken(''); setTokenConfigured(Boolean(data.tokenConfigured)); setFeeText(JSON.stringify(data.deliveryFees || {}, null, 2)); setProviders(data.providers || []); setActiveProviderId(data.activeProviderId || activeProviderId); setSelectedProviderId(data.activeProviderId || activeProviderId);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر حفظ الإعدادات'); }
    finally { setSavingSettings(false); }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'edit', id: editing.id, ...editForm, price: Number(editForm.price), deliveryFee: Number(editForm.deliveryFee) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تعديل الطلب');
      setOrders((current) => current.map((order) => order.id === editing.id ? data.order : order));
      setEditing(null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تعديل الطلب'); }
    finally { setLoading(false); }
  };

  const runAction = async (id: number, action: 'ship' | 'unship' | 'trash' | 'restore') => {
    setLoading(true); setError('');
    try {
      const shouldUseStock = action === 'ship' ? shipFromStock && Boolean(selectedStockProductId) : false;
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({
        id,
        action,
        providerId: action === 'ship' ? selectedProviderId : undefined,
        shippingMode: action === 'ship' ? (shouldUseStock ? 'stock' : 'without_stock') : undefined,
        stockProductId: action === 'ship' && shouldUseStock ? Number(selectedStockProductId) : undefined,
      }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ العملية');
      setOrders((current) => current.map((order) => order.id === id ? data.order : order));
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر تنفيذ العملية'); }
    finally { setLoading(false); }
  };

  const shipAll = async () => {
    setLoading(true); setError('');
    try {
      const shouldUseStock = shipFromStock && Boolean(selectedStockProductId);
      const response = await fetch('/api/orders', { method: 'PATCH', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({
        action: 'shipAll',
        providerId: selectedProviderId,
        shippingMode: shouldUseStock ? 'stock' : 'without_stock',
        stockProductId: shouldUseStock ? Number(selectedStockProductId) : undefined,
      }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر شحن الطلبات');
      await loadOrders();
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'تعذر شحن الطلبات'); }
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

  const statusOptions: Array<OrderStatus | 'all'> = ['all', 'confirmed', 'complete', 'shipped', 'delivered', 'not_responding', 'cancelled', 'returned', 'abandoned', 'trashed'];
  const revenue = orders.reduce((sum, order) => sum + Number(order.price || 0) + Number(order.delivery_fee || 0), 0);
  const confirmedCount = (counts.confirmed || 0) + (counts.complete || 0);
  const shippedCount = (counts.shipped || 0) + (counts.delivered || 0);

  if (!password) return (
    <main className="atlas-login min-h-screen px-4 py-10" dir="rtl">
      <div className="atlas-login-card mx-auto max-w-md">
        <div className="atlas-brand-mark"><Activity className="h-7 w-7" /></div>
        <p className="atlas-eyebrow">ATLASIO / OPERATIONS</p>
        <h1>مساحة إدارة الطلبات</h1>
        <p className="atlas-login-copy">أدخل كلمة مرور اللوحة للوصول إلى عمليات الطلبات والشحن والمخزون.</p>
        <form onSubmit={(event) => { event.preventDefault(); void loadOrders(passwordInput); }} className="space-y-4">
          <label className="atlas-field-label" htmlFor="dashboard-password">كلمة مرور اللوحة</label>
          <input id="dashboard-password" type="password" value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} placeholder="••••••••" className="atlas-input" autoFocus />
          <button type="submit" disabled={loading || !passwordInput} className="atlas-primary-button w-full">{loading && <Loader2 className="h-5 w-5 animate-spin" />} دخول إلى اللوحة</button>
        </form>
        {error && <p className="atlas-error mt-4 text-center">{error}</p>}
      </div>
    </main>
  );

  return (
    <main className="atlas-dashboard" dir="rtl">
      <aside className="atlas-sidebar">
        <div className="atlas-sidebar-brand">
          <div className="atlas-brand-mark small"><Activity className="h-5 w-5" /></div>
          <div><strong>atlasio</strong><span>commerce OS</span></div>
        </div>
        <div className="atlas-workspace"><span className="atlas-workspace-dot" /> مساحة العمليات <ChevronDown className="h-3.5 w-3.5" /></div>
        <nav className="atlas-nav" aria-label="التنقل الرئيسي">
          <p className="atlas-nav-label">نظرة عامة</p>
          <button type="button" className="atlas-nav-item active"><LayoutDashboard className="h-[18px] w-[18px]" /> لوحة الطلبات <span className="atlas-nav-count">{orders.length}</span></button>
          <button type="button" className="atlas-nav-item" onClick={() => setStatus('confirmed')}><ClipboardList className="h-[18px] w-[18px]" /> الطلبات المؤكدة <span className="atlas-nav-count">{confirmedCount}</span></button>
          <p className="atlas-nav-label">الأدوات</p>
          <button type="button" className="atlas-nav-item" onClick={() => { setStatus('shipped'); setSettingsOpen(false); }}><Truck className="h-[18px] w-[18px]" /> الشحن و EcoTrack</button>
          <button type="button" className="atlas-nav-item" onClick={() => setSettingsOpen(true)}><Box className="h-[18px] w-[18px]" /> المخزون</button>
          <button type="button" className={`atlas-nav-item ${settingsOpen ? 'active' : ''}`} onClick={() => setSettingsOpen(true)}><Settings className="h-[18px] w-[18px]" /> الإعدادات</button>
        </nav>
        <div className="atlas-sidebar-bottom">
          <div className="atlas-user"><div className="atlas-avatar">A</div><div><strong>Atlasio Admin</strong><span>مدير المتجر</span></div></div>
          <button type="button" className="atlas-logout" onClick={() => { sessionStorage.removeItem('atlasio:dashboard-password'); setPassword(''); }}><LogOut className="h-4 w-4" /> تسجيل الخروج</button>
        </div>
      </aside>

      <section className="atlas-content">
        <header className="atlas-header">
          <div><p className="atlas-breadcrumb">لوحة التحكم <span>/</span> الطلبات</p><h1>صباح الخير، Atlasio <span>✦</span></h1><p>تابع أداء متجرك وحرّك الطلبات من مكان واحد.</p></div>
          <div className="atlas-header-actions">
            <button type="button" className="atlas-icon-button" title="تحديث الطلبات" onClick={() => void loadOrders()}><RefreshCw className="h-[18px] w-[18px]" /></button>
            <button type="button" className="atlas-outline-button" onClick={() => void syncStatuses()} disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> مزامنة EcoTrack</button>
            <button type="button" className="atlas-outline-button" onClick={() => setSettingsOpen((value) => !value)}><Settings className="h-4 w-4" /> الإعدادات</button>
            <button type="button" className="atlas-primary-button" onClick={() => void shipAll()} disabled={loading}><Truck className="h-4 w-4" /> شحن المؤكدين</button>
          </div>
        </header>

        {error && <div className="atlas-alert"><X className="h-4 w-4" /><span>{error}</span><button type="button" onClick={() => setError('')}><X className="h-4 w-4" /></button></div>}

        <div className="atlas-stat-grid">
          <article className="atlas-stat-card accent-blue"><div className="atlas-stat-icon"><ClipboardList className="h-5 w-5" /></div><div><span>إجمالي الطلبات</span><strong>{orders.length}</strong><small>كل الطلبات المسجلة</small></div></article>
          <article className="atlas-stat-card accent-amber"><div className="atlas-stat-icon"><PackageCheck className="h-5 w-5" /></div><div><span>بانتظار المعالجة</span><strong>{counts.abandoned || 0}</strong><small>تحتاج متابعة</small></div></article>
          <article className="atlas-stat-card accent-green"><div className="atlas-stat-icon"><Check className="h-5 w-5" /></div><div><span>مؤكدة أو مكتملة</span><strong>{confirmedCount}</strong><small>{shippedCount} في الشحن أو تم التسليم</small></div></article>
          <article className="atlas-stat-card accent-purple"><div className="atlas-stat-icon"><WalletCards className="h-5 w-5" /></div><div><span>قيمة الطلبات</span><strong>{new Intl.NumberFormat('ar-DZ', { notation: 'compact', maximumFractionDigits: 1 }).format(revenue)} <em>دج</em></strong><small>السعر + التوصيل</small></div></article>
        </div>

        <section className="atlas-panel atlas-shipping-panel">
          <div className="atlas-section-heading"><div><span className="atlas-section-kicker"><Truck className="h-3.5 w-3.5" /> تجهيز الشحن</span><h2>أرسل الطلبات المؤكدة</h2></div><button type="button" className="atlas-text-button" onClick={() => setSettingsOpen(true)}>إدارة الشركات <ChevronDown className="h-4 w-4 -rotate-90" /></button></div>
          <div className="atlas-shipping-controls">
            <label className="atlas-control"><span>شركة التوصيل</span><select value={selectedProviderId} onChange={(event) => { setSelectedProviderId(event.target.value); void refreshStock(event.target.value); }} className="atlas-select"><option value="">اختر الشركة</option>{providers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label className="atlas-check-control"><input type="checkbox" checked={shipFromStock} onChange={(event) => setShipFromStock(event.target.checked)} disabled={!stockProducts.length} /><span><strong>الشحن من المخزون</strong><small>{stockProducts.length ? `${stockProducts.length} منتجات متاحة` : 'لا توجد منتجات متاحة'}</small></span></label>
            <label className="atlas-control"><span>منتج المخزون</span><select value={selectedStockProductId} onChange={(event) => setSelectedStockProductId(event.target.value)} disabled={!shipFromStock || !stockProducts.length} className="atlas-select"><option value="">اختر المنتج</option>{stockProducts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.quantity}</option>)}</select></label>
            <button type="button" className="atlas-dark-button" onClick={() => void shipAll()} disabled={loading || !selectedProviderId}><Truck className="h-4 w-4" /> تنفيذ الشحن</button>
          </div>
        </section>

        <section className="atlas-panel atlas-orders-panel">
          <div className="atlas-section-heading orders-heading"><div><span className="atlas-section-kicker"><ClipboardList className="h-3.5 w-3.5" /> مركز الطلبات</span><h2>كل الطلبات</h2></div><span className="atlas-result-count">عرض {visibleOrders.length} من {orders.length}</span></div>
          <div className="atlas-filter-bar">
            <div className="atlas-search"><Search className="h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث بالاسم، الهاتف، الحملة..." /></div>
            <div className="atlas-status-filters"><SlidersHorizontal className="h-4 w-4" />{statusOptions.slice(0, 6).map((item) => <button key={item} type="button" className={status === item ? 'active' : ''} onClick={() => setStatus(item)}>{statusLabels[item]}{item !== 'all' && <b>{counts[item] || 0}</b>}</button>)}</div>
            <select aria-label="فلترة حالة الطلب" value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | 'all')} className="atlas-mobile-status">{statusOptions.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
          </div>
          {loading && orders.length === 0 ? <div className="atlas-empty"><Loader2 className="h-7 w-7 animate-spin" /><p>جاري تحميل الطلبات...</p></div> : visibleOrders.length === 0 ? <div className="atlas-empty"><ClipboardList className="h-9 w-9" /><p>لا توجد طلبات مطابقة</p><small>جرّب تغيير الفلتر أو كلمة البحث.</small></div> : <div className="atlas-order-list">{visibleOrders.map((order) => {
            const expanded = expandedId === order.id;
            const location = [order.wilaya, order.commune].filter(Boolean).join('، ');
            return <article className={`atlas-order-card ${expanded ? 'expanded' : ''}`} key={order.id}>
              <div className="atlas-order-main">
                <button type="button" className="atlas-order-toggle" onClick={() => setExpandedId(expanded ? null : order.id)} aria-expanded={expanded}><ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} /></button>
                <div className="atlas-order-id"><span>طلب #{order.id}</span><small>{formatDate(order.created_at)}</small></div>
                <div className="atlas-order-customer"><div className="atlas-customer-avatar"><UserRound className="h-4 w-4" /></div><div><strong>{order.full_name || 'عميل بدون اسم'}</strong><span>{order.phone}</span></div></div>
                <div className="atlas-order-location"><MapPin className="h-4 w-4" /><span>{location || 'لم يحدد العنوان'}</span></div>
                <div className="atlas-order-value"><strong>{new Intl.NumberFormat('ar-DZ').format(Number(order.price || 0))} دج</strong><span>{order.campaign || 'طلب مباشر'}</span></div>
                <span className={`atlas-status status-${order.status}`}>{statusLabels[order.status]}</span>
                <div className="atlas-order-actions"><button type="button" title="تعديل الطلب" onClick={() => startEditing(order)}><Pencil className="h-4 w-4" /></button>{order.status !== 'trashed' && <button type="button" title="نقل إلى سلة المهملات" onClick={() => void runAction(order.id, 'trash')}><Trash2 className="h-4 w-4" /></button>}{order.status === 'trashed' && <button type="button" title="استعادة الطلب" onClick={() => void runAction(order.id, 'restore')}><RefreshCw className="h-4 w-4" /></button>}</div>
              </div>
              {expanded && <div className="atlas-order-details"><div><span>الهاتف</span><strong>{order.phone}</strong></div><div><span>المنتج</span><strong>{order.stock_product_name || 'غير مرتبط بالمخزون'}</strong></div><div><span>التوصيل</span><strong>{order.delivery_fee || 0} دج · {order.delivery_type || 'منزلي'}</strong></div><div><span>EcoTrack</span><strong>{order.ecotrack_tracking ? `${order.ecotrack_tracking} · ${ecoStatusLabel(order.ecotrack_status)}` : 'غير مرفوع'}</strong></div><div className="atlas-detail-actions"><select value={order.status} onChange={(event) => void updateStatus(order.id, event.target.value as OrderStatus)} className="atlas-select"><option value="abandoned">غير مكتملة</option><option value="confirmed">مؤكدة</option><option value="complete">مكتملة</option><option value="not_responding">لا يستجيب</option><option value="cancelled">ملغاة</option><option value="shipped">مرفوعة إلى EcoTrack</option><option value="delivered">تم التسليم</option><option value="returned">مرتجعة</option></select>{['confirmed', 'complete'].includes(order.status) && <button type="button" className="atlas-small-action primary" onClick={() => void runAction(order.id, 'ship')}><Truck className="h-3.5 w-3.5" /> شحن</button>}{['shipped', 'delivered'].includes(order.status) && <button type="button" className="atlas-small-action" onClick={() => void runAction(order.id, 'unship')}><RefreshCw className="h-3.5 w-3.5" /> إلغاء الشحن</button>}</div></div>}
            </article>;
          })}</div>}
        </section>

        {settingsOpen && <div className="atlas-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setSettingsOpen(false); }}><section className="atlas-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="atlas-modal-header"><div><span className="atlas-section-kicker"><Settings className="h-3.5 w-3.5" /> مساحة Atlasio</span><h2 id="settings-title">الإعدادات والشحن</h2></div><button type="button" className="atlas-close-button" onClick={() => setSettingsOpen(false)}><X className="h-5 w-5" /></button></div><form onSubmit={saveSettings} className="atlas-settings-form"><div className="atlas-provider-list"><div className="atlas-form-heading"><strong>شركات التوصيل</strong><div className="flex items-center gap-3"><button type="button" className="atlas-text-button" onClick={() => void saveProviderProfile()} disabled={savingSettings}>حفظ الشركة</button><button type="button" className="atlas-text-button" onClick={startNewProvider}>+ شركة جديدة</button></div></div>{providers.length ? providers.map((item) => <button key={item.id} type="button" className={`atlas-provider-row ${editingProviderId === item.id ? 'selected' : ''}`} onClick={() => selectProviderForEdit(item)}><span className="atlas-provider-logo"><Truck className="h-4 w-4" /></span><span><strong>{item.name}</strong><small>{item.provider} {item.tokenConfigured ? '· متصل' : '· يحتاج توكن'}</small></span><ChevronDown className="h-4 w-4 -rotate-90" /></button>) : <p className="atlas-muted">أضف شركة توصيل للبدء.</p>}</div><div className="atlas-form-grid"><label className="atlas-control"><span>اسم الشركة</span><input className="atlas-input" value={providerNameDraft} onChange={(event) => setProviderNameDraft(event.target.value)} placeholder="مثال: Yalidine" /></label><label className="atlas-control"><span>Provider code</span><input className="atlas-input" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="navexdelivery" /></label><label className="atlas-control full"><span>API token {tokenConfigured &&         <small>(محفوظ مسبقاً، اتركه فارغاً للإبقاء عليه)</small>}</span><input className="atlas-input" value={token} onChange={(event) => setToken(event.target.value)} type="password" placeholder="أدخل التوكن" /></label><label className="atlas-control full"><span>أسعار التوصيل · JSON</span><textarea className="atlas-textarea" value={feeText} onChange={(event) => setFeeText(event.target.value)} rows={5} /></label></div><div className="atlas-modal-footer"><button type="button" className="atlas-outline-button" onClick={() => setSettingsOpen(false)}>إلغاء</button><button type="submit" className="atlas-primary-button" disabled={savingSettings}>{savingSettings && <Loader2 className="h-4 w-4 animate-spin" />} حفظ الإعدادات</button></div></form></section></div>}

        {editing && <div className="atlas-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}><section className="atlas-modal atlas-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="atlas-modal-header"><div><span className="atlas-section-kicker"><Pencil className="h-3.5 w-3.5" /> تحديث البيانات</span><h2 id="edit-title">تعديل الطلب #{editing.id}</h2></div><button type="button" className="atlas-close-button" onClick={() => setEditing(null)}><X className="h-5 w-5" /></button></div><form onSubmit={saveEdit} className="atlas-settings-form"><div className="atlas-form-grid"><label className="atlas-control"><span>اسم العميل</span><input className="atlas-input" value={editForm.fullName} onChange={(event) => setEditForm({ ...editForm, fullName: event.target.value })} /></label><label className="atlas-control"><span>رقم الهاتف</span><input className="atlas-input" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} /></label><label className="atlas-control"><span>الولاية</span><select className="atlas-select" value={editForm.wilaya} onChange={(event) => { const wilaya = event.target.value; setEditForm({ ...editForm, wilaya, commune: '' }); void fetch(`/api/orders?resource=communes&wilaya=${encodeURIComponent(wilaya)}`).then((response) => response.ok ? response.json() : Promise.reject(new Error('communes'))).then((data: { communes?: Array<{ name: string; hasStopDesk: boolean }> }) => setEditCommunes(data.communes || [])).catch(() => setEditCommunes([])); }}>{WILAYAS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="atlas-control"><span>البلدية</span><select className="atlas-select" value={editForm.commune} onChange={(event) => setEditForm({ ...editForm, commune: event.target.value })}><option value="">اختر البلدية</option>{editCommunes.map((item) => <option key={item.name} value={item.name}>{item.name}{item.hasStopDesk ? ' · Stop Desk' : ''}</option>)}</select></label><label className="atlas-control"><span>سعر الطلب</span><input className="atlas-input" type="number" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} /></label><label className="atlas-control"><span>رسوم التوصيل</span><input className="atlas-input" type="number" value={editForm.deliveryFee} onChange={(event) => setEditForm({ ...editForm, deliveryFee: event.target.value })} /></label></div><div className="atlas-modal-footer"><button type="button" className="atlas-outline-button" onClick={() => setEditing(null)}>إلغاء</button><button type="submit" className="atlas-primary-button" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin" />} حفظ التعديل</button></div></form></section></div>}
      </section>
    </main>
  );
}
