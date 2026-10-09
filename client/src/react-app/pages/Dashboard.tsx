import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Archive,
  AlertCircle,
  Check,
  Play,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileDown,
  Info,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Package,
  Pencil,
  Phone,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";

type OrderStatus =
  | "abandoned"
  | "complete"
  | "confirmed"
  | "not_responding"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "returned"
  | "trashed";
type ProviderProfile = {
  id: string;
  name: string;
  provider: string;
  token?: string;
  tokenConfigured?: boolean;
  deliveryFees?: Record<string, { home: number; stopDesk: number }>;
};
type StockProduct = {
  id: number;
  name: string;
  sku: string | null;
  quantity: number;
  active: boolean;
};
type OrderEvent = {
  id: number;
  order_id: number;
  event_type: string;
  message: string;
  created_at: string;
};
type ShipmentUpdate = {
  id: number;
  order_id: number;
  tracking: string;
  source: string;
  status: string | null;
  reason: string | null;
  details: string | null;
  station: string | null;
  driver: string | null;
  driver_phone: string | null;
  desk_phone: string | null;
  activity_date: string | null;
  activity_time: string | null;
  postponed_to: string | null;
  raw_payload: Record<string, unknown>;
  created_at: string;
};
type Order = {
  id: number;
  lead_id: string;
  status: OrderStatus;
  status_before_trash: OrderStatus | null;
  trashed_at: string | null;
  campaign: string;
  price: number;
  delivery_fee: number;
  delivery_type: string | null;
  phone: string;
  full_name: string | null;
  wilaya: string | null;
  commune: string | null;
  ecotrack_tracking: string | null;
  ecotrack_status: string | null;
  ecotrack_driver: string | null;
  ecotrack_driver_phone: string | null;
  ecotrack_desk_phone: string | null;
  ecotrack_station: string | null;
  ecotrack_last_note: string | null;
  ecotrack_last_activity_at: string | null;
  ecotrack_last_synced_at: string | null;
  gift_booklet: boolean;
  shipping_provider_id: string | null;
  shipping_provider_name: string | null;
  stock_product_id: number | null;
  stock_product_name: string | null;
  ship_from_stock: boolean;
  confirmation_status?: string;
  contact_result?: string;
  contact_attempts?: number;
  last_contacted_at?: string | null;
  follow_up_at?: string | null;
  shipment_status?: string;
  payment_status?: string;
  created_at: string;
  updated_at: string;
};

const statusLabels: Record<OrderStatus | "all", string> = {
  all: "الكل",
  abandoned: "يحتاج تأكيد",
  complete: "يحتاج تأكيد",
  confirmed: "مؤكدة",
  not_responding: "يحتاج متابعة",
  cancelled: "ملغاة",
  shipped: "مرفوعة إلى EcoTrack",
  delivered: "تم التسليم",
  returned: "مرتجعة",
  trashed: "سلة المهملات",
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const customerSmsMessage =
  "السلام عليكم، طلبيتكم لبذور الأزهار قيد التجهيز يرجى إنتظار مكالمة عامل التوصيل";
const ecoStatusLabel = (value: string | null) =>
  ({
    created: "تم إنشاء الشحنة",
    delivered: "تم التسليم",
    returned: "مرتجعة",
    cancelled: "ملغاة في EcoTrack",
    pending: "قيد الانتظار",
  })[value || ""] ||
  value ||
  "غير مرفوعة";
const escapeHtml = (value: unknown) =>
  String(value ?? "—").replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character
  );
const WILAYAS = [
  "01 - أدرار",
  "02 - الشلف",
  "03 - الأغواط",
  "04 - أم البواقي",
  "05 - باتنة",
  "06 - بجاية",
  "07 - بسكرة",
  "08 - بشار",
  "09 - البليدة",
  "10 - البويرة",
  "11 - تمنراست",
  "12 - تبسة",
  "13 - تلمسان",
  "14 - تيارت",
  "15 - تيزي وزو",
  "16 - الجزائر",
  "17 - الجلفة",
  "18 - جيجل",
  "19 - سطيف",
  "20 - سعيدة",
  "21 - سكيكدة",
  "22 - سيدي بلعباس",
  "23 - عنابة",
  "24 - قالمة",
  "25 - قسنطينة",
  "26 - المدية",
  "27 - مستغانم",
  "28 - المسيلة",
  "29 - معسكر",
  "30 - ورقلة",
  "31 - وهران",
  "32 - البيض",
  "33 - إليزي",
  "34 - برج بوعريريج",
  "35 - بومرداس",
  "36 - الطارف",
  "37 - تندوف",
  "38 - تيسمسيلت",
  "39 - الوادي",
  "40 - خنشلة",
  "41 - سوق أهراس",
  "42 - تيبازة",
  "43 - ميلة",
  "44 - عين الدفلى",
  "45 - النعامة",
  "46 - عين تموشنت",
  "47 - غرداية",
  "48 - غليزان",
  "49 - تيميمون",
  "50 - برج باجي مختار",
  "51 - أولاد جلال",
  "52 - بني عباس",
  "53 - عين صالح",
  "54 - عين قزام",
  "55 - تقرت",
  "56 - جانت",
  "57 - المغير",
  "58 - المنيعة",
];

export default function Dashboard() {
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("atlasio:dashboard-password") || ""
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [section, setSection] = useState<
    | "orders"
    | "incomplete"
    | "trash"
    | "confirmation"
    | "shipping"
    | "tracking"
    | "returns"
    | "completed"
    | "analytics"
  >("orders");
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<
    | "all"
    | "today"
    | "yesterday"
    | "7d"
    | "30d"
    | "this_month"
    | "last_month"
    | "custom"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shippingNotice, setShippingNotice] = useState<{
    type: "loading" | "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixelIdDraft, setPixelIdDraft] = useState("");
  const [savingPixelId, setSavingPixelId] = useState(false);
  const [pixelNotice, setPixelNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [provider, setProvider] = useState("navexdelivery");
  const [token, setToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [providerNameDraft, setProviderNameDraft] = useState("");
  const [editingProviderId, setEditingProviderId] = useState("");
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedStockProductId, setSelectedStockProductId] = useState("");
  const [shipFromStock, setShipFromStock] = useState(true);
  const [orderShippingModes, setOrderShippingModes] = useState<
    Record<number, "stock" | "without_stock">
  >({});
  const [feeText, setFeeText] = useState("{}");
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [shipmentUpdates, setShipmentUpdates] = useState<ShipmentUpdate[]>([]);
  const [shipmentBusy, setShipmentBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const goToSection = (
    nextSection:
      | "orders"
      | "incomplete"
      | "trash"
      | "confirmation"
      | "shipping"
      | "tracking"
      | "returns"
      | "completed"
      | "analytics"
  ) => {
    setSection(nextSection);
    setStatus("all");
    setSelectedIds([]);
    setDrawerOpen(false);
  };
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    wilaya: "",
    commune: "",
    price: "",
    deliveryFee: "",
  });
  const [editCommunes, setEditCommunes] = useState<
    Array<{ name: string; hasStopDesk: boolean }>
  >([]);
  const startEditing = (order: Order) => {
    setEditing(order);
    setEditForm({
      fullName: order.full_name || "",
      phone: order.phone,
      wilaya: order.wilaya || "",
      commune: order.commune || "",
      price: String(order.price),
      deliveryFee: String(order.delivery_fee || 0),
    });
    setEditCommunes([]);
    void fetch(
      `/api/orders?resource=communes&wilaya=${encodeURIComponent(order.wilaya || "")}`
    )
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("communes"))
      )
      .then(
        (data: { communes?: Array<{ name: string; hasStopDesk: boolean }> }) =>
          setEditCommunes(data.communes || [])
      )
      .catch(() => setEditCommunes([]));
  };

  const authHeaders = (nextPassword = password) => ({
    "X-Dashboard-Password": nextPassword,
  });

  const loadOrders = async (nextPassword = password) => {
    if (!nextPassword) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        headers: authHeaders(nextPassword),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "كلمة المرور غير صحيحة"
            : data.error || "تعذر تحميل الطلبات"
        );
      setOrders(data.orders || []);
      sessionStorage.setItem("atlasio:dashboard-password", nextPassword);
      setPassword(nextPassword);
      await loadSettings(nextPassword);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تحميل الطلبات"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async (nextPassword = password) => {
    if (!nextPassword) return;
    const response = await fetch("/api/orders?resource=settings", {
      headers: authHeaders(nextPassword),
    });
    if (!response.ok) return;
    const data = await response.json();
    setPixelIdDraft(data.pixelId || "");
    setProvider(data.provider || "navexdelivery");
    setShipFromStock(data.shippingMode !== "without_stock");
    setOrderShippingModes({});
    setTokenConfigured(Boolean(data.tokenConfigured));
    setFeeText(JSON.stringify(data.deliveryFees || {}, null, 2));
    setProviders(data.providers || []);
    setActiveProviderId(data.activeProviderId || data.providers?.[0]?.id || "");
    setSelectedProviderId(
      data.activeProviderId || data.providers?.[0]?.id || ""
    );
    const activeProvider =
      (data.providers || []).find(
        (item: ProviderProfile) => item.id === (data.activeProviderId || "")
      ) || (data.providers || [])[0];
    setProviderNameDraft(activeProvider?.name || "");
    setEditingProviderId(activeProvider?.id || "");
    const stockProviderId =
      data.activeProviderId || data.providers?.[0]?.id || "";
    const stockResponse = await fetch(
      `/api/orders?resource=stock&providerId=${encodeURIComponent(stockProviderId)}`,
      { headers: authHeaders(nextPassword) }
    );
    const stockData = await stockResponse.json().catch(() => ({}));
    if (!stockResponse.ok) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError(stockData.error || "تعذر جلب منتجات المخزون من الشركة النشطة");
      return;
    }
    const nextProducts = stockData.products || [];
    setStockProducts(nextProducts);
    setSelectedStockProductId(
      nextProducts[0] ? String(nextProducts[0].id) : ""
    );
  };

  useEffect(() => {
    if (password) void loadOrders(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!password) return;
    const timer = window.setInterval(
      () => {
        void syncStatuses();
      },
      15 * 60 * 1000
    );
    return () => window.clearInterval(timer);
    // The interval intentionally follows the authenticated dashboard session only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);

  const saveProviderProfile = async () => {
    const name = providerNameDraft.trim();
    const providerCode = provider.trim().toLowerCase();
    const providerToken = token.trim();
    if (!name || !providerCode || (!providerToken && !editingProviderId)) {
      setError("أدخل اسم الشركة وProvider والتوكن");
      return;
    }
    setSavingSettings(true);
    setError("");
    try {
      const id = editingProviderId || `provider-${Date.now()}`;
      const nextProviders = [
        ...providers.filter(item => item.id !== id),
        { id, name, provider: providerCode, token: providerToken },
      ];
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "settings",
          providers: nextProviders,
          activeProviderId: activeProviderId || id,
          shippingMode: shipFromStock ? "stock" : "without_stock",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ شركة التوصيل");
      setProviders(data.providers || []);
      setActiveProviderId(data.activeProviderId || id);
      setSelectedProviderId(data.activeProviderId || id);
      setEditingProviderId(id);
      setToken("");
      setTokenConfigured(true);
      await refreshStock(data.activeProviderId || id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ شركة التوصيل"
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const saveShippingMode = async (useStock: boolean) => {
    setShipFromStock(useStock);
    setOrderShippingModes({});
    setSavingSettings(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "settings",
          shippingMode: useStock ? "stock" : "without_stock",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ وضع الشحن");
      setShipFromStock(data.shippingMode !== "without_stock");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "تعذر حفظ وضع الشحن"
      );
    } finally {
      setSavingSettings(false);
    }
  };
  const refreshStock = async (providerId: string) => {
    if (!providerId) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError("اختر شركة توصيل نشطة أولاً");
      return;
    }
    try {
      const response = await fetch(
        `/api/orders?resource=stock&providerId=${encodeURIComponent(providerId)}`,
        { headers: authHeaders() }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "تعذر جلب منتجات المخزون من الشركة");
      const nextProducts = data.products || [];
      setStockProducts(nextProducts);
      setSelectedStockProductId(
        nextProducts[0] ? String(nextProducts[0].id) : ""
      );
      if (nextProducts.length === 0)
        setError(
          "لم تُرجع الشركة كتالوج منتجات؛ يمكن استخدام الشحن من stock مباشرة، أو أضف منتجاً محلياً إذا أردت تتبع الكمية."
        );
      else setError("");
    } catch (requestError) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر جلب كتالوج منتجات الشركة؛ يمكنك متابعة الشحن من stock مباشرة"
      );
    }
  };

  const startNewProvider = () => {
    setEditingProviderId("");
    setProviderNameDraft("");
    setProvider("");
    setToken("");
    setTokenConfigured(false);
    setStockProducts([]);
    setSelectedStockProductId("");
    setShipFromStock(false);
  };

  const selectProviderForEdit = (item: ProviderProfile) => {
    setEditingProviderId(item.id);
    setProviderNameDraft(item.name);
    setProvider(item.provider);
    setToken("");
    setActiveProviderId(item.id);
    setSelectedProviderId(item.id);
    setTokenConfigured(Boolean(item.tokenConfigured));
    void refreshStock(item.id);
  };

  const savePixelId = async () => {
    const pixelId = pixelIdDraft.trim();
    if (pixelId && !/^\d{8,20}$/.test(pixelId)) {
      setPixelNotice({
        type: "error",
        message: "أدخل معرّف Pixel مكوّناً من 8 إلى 20 رقماً، أو اتركه فارغاً للتعطيل.",
      });
      return;
    }
    setSavingPixelId(true);
    setPixelNotice(null);
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "settings", pixelId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ معرّف Pixel");
      setPixelIdDraft(data.pixelId || "");
      setPixelNotice({
        type: "success",
        message: pixelId
          ? "تم الحفظ. سيُستخدم المعرّف الجديد عند إعادة تحميل صفحة المتجر."
          : "تم تعطيل Meta Pixel للزيارات الجديدة.",
      });
    } catch (requestError) {
      setPixelNotice({
        type: "error",
        message:
          requestError instanceof Error
            ? requestError.message
            : "تعذر حفظ معرّف Pixel",
      });
    } finally {
      setSavingPixelId(false);
    }
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    try {
      let deliveryFees: unknown = {};
      try {
        deliveryFees = JSON.parse(feeText || "{}");
      } catch {
        throw new Error("صيغة أسعار التوصيل غير صحيحة؛ استخدم JSON صالحاً");
      }
      const providerProfiles = providers.map(item => ({
        id: item.id,
        name: item.name,
        provider: item.provider,
        token: item.id === editingProviderId ? token : "",
      }));
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "settings",
          providers: providerProfiles,
          activeProviderId,
          provider,
          token,
          deliveryFees,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ الإعدادات");
      setProvider(data.provider || provider);
      setToken("");
      setTokenConfigured(Boolean(data.tokenConfigured));
      setFeeText(JSON.stringify(data.deliveryFees || {}, null, 2));
      setProviders(data.providers || []);
      setActiveProviderId(data.activeProviderId || activeProviderId);
      setSelectedProviderId(data.activeProviderId || activeProviderId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ الإعدادات"
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: editing.id,
          ...editForm,
          price: Number(editForm.price),
          deliveryFee: Number(editForm.deliveryFee),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الطلب");
      setOrders(current =>
        current.map(order => (order.id === editing.id ? data.order : order))
      );
      setEditing(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تعديل الطلب"
      );
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (
    id: number,
    action: "ship" | "unship" | "trash" | "restore",
    shippingModeOverride?: "stock" | "without_stock"
  ) => {
    setLoading(true);
    setError("");
    const isShippingAction = action === "ship" || action === "unship";
    if (isShippingAction)
      setShippingNotice({
        type: "loading",
        title: action === "ship" ? "جارٍ رفع الطلب" : "جارٍ إلغاء الرفع",
        message:
          action === "ship"
            ? "يتم إرسال بيانات الطلب إلى EcoTrack، يرجى الانتظار قليلاً."
            : "يتم طلب إلغاء الشحنة من EcoTrack.",
      });
    try {
      const shippingMode =
        action === "ship"
          ? shippingModeOverride ||
            orderShippingModes[id] ||
            (shipFromStock ? "stock" : "without_stock")
          : undefined;
      if (action === "ship" && shippingMode)
        setOrderShippingModes(current => ({ ...current, [id]: shippingMode }));
      const shouldUseStock = shippingMode === "stock";
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          providerId: action === "ship" ? selectedProviderId : undefined,
          shippingMode,
          stockProductId:
            action === "ship" && shouldUseStock
              ? Number(selectedStockProductId)
              : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      setOrders(current =>
        current.map(order => (order.id === id ? data.order : order))
      );
      if (isShippingAction) {
        const tracking = data.order?.ecotrack_tracking;
        setShippingNotice({
          type: "success",
          title: action === "ship" ? "تم شحن الطلب بنجاح" : "تم إلغاء الرفع",
          message:
            action === "ship"
              ? tracking
                ? `تم قبول الطلب من EcoTrack. رقم التتبع: ${tracking}`
                : "تم قبول الطلب من EcoTrack وتسجيله كمرفوع."
              : "تم إلغاء الشحنة من EcoTrack بنجاح.",
        });
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "تعذر تنفيذ العملية";
      setError(message);
      if (isShippingAction)
        setShippingNotice({
          type: "error",
          title: action === "ship" ? "تعذر شحن الطلب" : "تعذر إلغاء الرفع",
          message: `${message}. لم يتم تأكيد العملية، يمكنك المحاولة مجدداً.`,
        });
    } finally {
      setLoading(false);
    }
  };

  const shipAll = async () => {
    setLoading(true);
    setError("");
    try {
      const shouldUseStock = shipFromStock;
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shipAll",
          providerId: selectedProviderId,
          shippingMode: shouldUseStock ? "stock" : "without_stock",
          stockProductId: shouldUseStock
            ? Number(selectedStockProductId)
            : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر شحن الطلبات");
      await loadOrders();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر شحن الطلبات"
      );
    } finally {
      setLoading(false);
    }
  };

  const syncStatuses = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/orders?resource=sync", {
        headers: authHeaders(),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        synced?: number;
        matched?: number;
        total?: number;
        providers?: Array<{ provider: string; error?: string }>;
      };
      if (!response.ok) throw new Error(data.error || "تعذرت مزامنة EcoTrack");
      await loadOrders();
      const providerError = data.providers?.find(item => item.error)?.error;
      if (providerError) throw new Error(providerError);
      setShippingNotice({
        type: "success",
        title: "تمت مزامنة EcoTrack",
        message: `تم فحص ${data.total || 0} شحنة، وتحديث ${data.synced || 0} طلبية (${data.matched || 0} مطابقة).`,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذرت مزامنة EcoTrack"
      );
    } finally {
      setSyncing(false);
    }
  };

  const dateRange = useMemo(() => {
    if (datePreset === "all") return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    if (datePreset === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
    if (datePreset === "7d") start.setDate(start.getDate() - 6);
    if (datePreset === "30d") start.setDate(start.getDate() - 29);
    if (datePreset === "this_month") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    }
    if (datePreset === "last_month") {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
    }
    if (datePreset === "custom") {
      const customStart = dateFrom ? new Date(`${dateFrom}T00:00:00`) : start;
      const customEnd = dateTo ? new Date(`${dateTo}T23:59:59.999`) : end;
      return { start: customStart, end: customEnd };
    }
    return { start, end };
  }, [dateFrom, datePreset, dateTo]);

  const visibleOrders = useMemo(
    () =>
      orders.filter(order => {
        const inSection =
          section === "trash"
            ? order.status === "trashed"
            : section === "incomplete"
              ? ["abandoned", "not_responding"].includes(order.status)
              : section === "confirmation"
                ? ["abandoned", "complete"].includes(order.status)
                : section === "shipping"
                  ? order.status === "confirmed" ||
                    order.shipment_status === "failed"
                  : section === "tracking"
                    ? Boolean(order.ecotrack_tracking) &&
                      !["returned", "delivered"].includes(order.status)
                    : section === "returns"
                      ? order.status === "returned"
                      : section === "completed"
                        ? order.status === "delivered"
                        : section === "analytics"
                          ? order.status !== "trashed"
                          : order.status !== "trashed";
        const matchesStatus = status === "all" || order.status === status;
        const normalizedQuery = query.trim().toLowerCase();
        const haystack = [
          order.lead_id,
          order.phone,
          order.full_name,
          order.wilaya,
          order.commune,
          order.campaign,
          order.ecotrack_tracking,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const createdAt = new Date(order.created_at).getTime();
        const matchesDate =
          !dateRange ||
          (createdAt >= dateRange.start.getTime() &&
            createdAt <= dateRange.end.getTime());
        return (
          inSection &&
          matchesStatus &&
          matchesDate &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      }),
    [dateRange, orders, query, section, status]
  );
  const counts = orders.reduce<Record<string, number>>((result, order) => {
    result[order.status] = (result[order.status] || 0) + 1;
    return result;
  }, {});
  const confirmationQueueCount = orders.filter(order =>
    ["abandoned", "complete"].includes(order.status)
  ).length;
  const followUpCount = orders.filter(order =>
    ["not_responding"].includes(order.status)
  ).length;
  const shippingQueueCount = orders.filter(
    order => order.status === "confirmed" || order.shipment_status === "failed"
  ).length;
  const trackingQueueCount = orders.filter(
    order =>
      Boolean(order.ecotrack_tracking) &&
      !["delivered", "returned"].includes(order.status)
  ).length;
  const sectionTitle =
    section === "orders"
      ? "الواردة"
      : section === "incomplete"
        ? "تحتاج متابعة"
        : section === "trash"
          ? "سلة المهملات"
          : section === "confirmation"
            ? "التأكيد"
            : section === "shipping"
              ? "الشحن"
              : section === "tracking"
                ? "التتبع"
                : section === "returns"
                  ? "المرتجعات"
                  : section === "completed"
                    ? "تم التسليم"
                    : "التحليلات";
  const sectionDescription =
    section === "orders"
      ? "كل الطلبات غير المحذوفة — ابدأ من طابور العمل اليومي"
      : section === "incomplete"
        ? "طلبات لم تُحسم بعد وتحتاج متابعة أو محاولة اتصال جديدة"
        : section === "trash"
          ? "الطلبات المحذوفة مؤقتاً ويمكن استرجاعها"
          : section === "confirmation"
            ? "اعمل على الطلبات التي تحتاج اتصالاً ثم انقل المؤكد منها للشحن"
            : section === "shipping"
              ? "الطلبات المؤكدة التي تنتظر الرفع أو تحتاج إعادة محاولة"
              : section === "tracking"
                ? "تابع الشحنات المرفوعة وآخر حالة معروفة"
                : section === "returns"
                  ? "الشحنات المرتجعة التي تحتاج قراراً أو متابعة"
                  : section === "completed"
                    ? "أرشيف الطلبات المسلّمة — خارج طوابير العمل اليومية"
                    : "مؤشرات تشغيلية مبنية على الطلبات المحملة حالياً";

  const activeOrder = orders.find(order => order.id === activeOrderId) || null;
  const confirmedCount = counts.confirmed || 0;
  const shippedCount = counts.shipped || 0;
  const deliveredCount = counts.delivered || 0;
  const totalOrderCount = orders.filter(
    order => order.status !== "trashed"
  ).length;
  const confirmedLifecycleCount = orders.filter(order =>
    ["confirmed", "shipped", "delivered", "returned"].includes(order.status)
  ).length;
  const confirmationRate = totalOrderCount
    ? Math.round((confirmedLifecycleCount / totalOrderCount) * 100)
    : 0;
  const statusTone = (value: OrderStatus) =>
    value === "confirmed"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
      : value === "shipped"
        ? "bg-blue-100 text-blue-800 ring-blue-300"
        : value === "abandoned" || value === "not_responding"
          ? "bg-slate-100 text-slate-700 ring-slate-300"
          : value === "cancelled" || value === "returned" || value === "trashed"
            ? "bg-rose-100 text-rose-800 ring-rose-300"
            : value === "delivered"
              ? "bg-emerald-200 text-emerald-900 ring-emerald-400"
              : "bg-white text-slate-700 ring-slate-300";
  const statusCardTone = (value: OrderStatus) =>
    value === "delivered"
      ? "bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 shadow-emerald-200"
      : value === "shipped"
        ? "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 shadow-blue-200"
        : value === "returned"
          ? "bg-gradient-to-br from-rose-100 via-rose-50 to-orange-100 shadow-rose-200"
          : value === "confirmed"
            ? "bg-gradient-to-br from-teal-100 via-emerald-50 to-green-100 shadow-emerald-200"
            : value === "cancelled"
              ? "bg-gradient-to-br from-rose-100 via-rose-50 to-slate-100 shadow-rose-100"
              : "bg-white shadow-slate-100";
  const statusAvatarTone = (value: OrderStatus) =>
    value === "delivered"
      ? "bg-emerald-200 text-emerald-900"
      : value === "shipped"
        ? "bg-blue-200 text-blue-900"
        : value === "returned" || value === "cancelled"
          ? "bg-rose-200 text-rose-900"
          : value === "confirmed"
            ? "bg-teal-200 text-teal-900"
            : "bg-slate-200 text-slate-800";
  const statusEdge = (value: OrderStatus) =>
    value === "delivered"
      ? "border-emerald-400"
      : value === "shipped"
        ? "border-blue-400"
        : value === "returned"
          ? "border-rose-400"
          : value === "confirmed"
            ? "border-teal-300"
            : "border-slate-300";
  const trackingStatusLabel = (order: Order) => {
    if (!order.ecotrack_tracking) return "غير مرفوعة";
    const raw = String(order.ecotrack_status || "").toLowerCase();
    if (/paye_et_archive|payed|paiements_prets/.test(raw))
      return "تم التحصيل والأرشفة";
    if (
      order.status === "delivered" ||
      /livre_non_encaisse|livred|delivered|livr/.test(raw)
    )
      return "تم التسليم";
    if (order.status === "returned" || /retour|return/.test(raw))
      return "مرتجعة";
    if (order.status === "cancelled" || /cancel|annul/.test(raw))
      return "ملغاة";
    if (/suspendu|echec|refus|absent|failed/.test(raw))
      return "معلّقة أو فاشلة";
    if (/livraison|out_for/.test(raw)) return "للتسليم";
    if (/cours|transit|hub|picked|ramass|transferred|vers_/.test(raw))
      return "بالطريق";
    if (/stop.?desk/.test(raw)) return "للاستلام";
    return "مرفوعة";
  };
  const loadShipmentDetails = async (order: Order) => {
    if (!order.ecotrack_tracking) {
      setShipmentUpdates([]);
      return;
    }
    setShipmentBusy(true);
    try {
      const response = await fetch(
        `/api/orders?resource=shipment&orderId=${order.id}`,
        { headers: authHeaders() }
      );
      const data = (await response.json().catch(() => ({}))) as {
        order?: Order;
        updates?: ShipmentUpdate[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "تعذر جلب تفاصيل الشحنة");
      if (data.order)
        setOrders(current =>
          current.map(item =>
            item.id === order.id ? (data.order as Order) : item
          )
        );
      setShipmentUpdates(data.updates || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر جلب تفاصيل الشحنة"
      );
    } finally {
      setShipmentBusy(false);
    }
  };
  const openOrder = (order: Order) => {
    setActiveOrderId(order.id);
    setOrderEvents([]);
    setShipmentUpdates([]);
    setCommentDraft("");
    void fetch(`/api/orders?resource=events&orderId=${order.id}`, {
      headers: authHeaders(),
    })
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("events"))
      )
      .then((data: { events?: OrderEvent[] }) =>
        setOrderEvents(data.events || [])
      )
      .catch(() => setOrderEvents([]));
    if (order.ecotrack_tracking) void loadShipmentDetails(order);
  };
  const closeOrder = () => {
    setActiveOrderId(null);
    setEditing(null);
    setOrderEvents([]);
    setShipmentUpdates([]);
    setCommentDraft("");
  };
  const startWork = () => {
    const next =
      orders.find(order => ["abandoned", "complete"].includes(order.status)) ||
      orders.find(order => ["not_responding"].includes(order.status)) ||
      orders.find(
        order =>
          order.status === "confirmed" || order.shipment_status === "failed"
      ) ||
      orders.find(
        order =>
          Boolean(order.ecotrack_tracking) &&
          !["delivered", "returned"].includes(order.status)
      );
    if (!next) {
      setError("لا توجد طلبات تحتاج إلى إجراء حالياً");
      return;
    }
    const nextSection = ["abandoned", "complete"].includes(next.status)
      ? "confirmation"
      : ["not_responding"].includes(next.status)
        ? "incomplete"
        : next.status === "confirmed"
          ? "shipping"
          : "tracking";
    setSection(nextSection);
    setStatus("all");
    openOrder(next);
  };
  const recordContact = async (order: Order, result: string) => {
    setContactBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "contact", id: order.id, result }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "تعذر تسجيل نتيجة الاتصال");
      setOrders(current =>
        current.map(item => (item.id === order.id ? data.order : item))
      );
      const eventsResponse = await fetch(
        `/api/orders?resource=events&orderId=${order.id}`,
        { headers: authHeaders() }
      );
      const eventsData = await eventsResponse.json().catch(() => ({}));
      setOrderEvents(eventsData.events || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تسجيل نتيجة الاتصال"
      );
    } finally {
      setContactBusy(false);
    }
  };
  const addOrderComment = async (order: Order) => {
    const note = commentDraft.trim();
    if (!note) return;
    setCommentBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", id: order.id, note }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        events?: OrderEvent[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ التعليق");
      setOrderEvents(data.events || []);
      setCommentDraft("");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "تعذر حفظ التعليق"
      );
    } finally {
      setCommentBusy(false);
    }
  };
  const visibleIds = visibleOrders.map(order => order.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const toggleSelected = (id: number) =>
    setSelectedIds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  const toggleSelectAll = () =>
    setSelectedIds(current =>
      allVisibleSelected
        ? current.filter(id => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  const bulkUpdate = async (
    nextStatus: OrderStatus | null,
    action: "trash" | "restore" | null = null
  ) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    setError("");
    try {
      const results = await Promise.all(
        selectedIds.map(async id => {
          const body = action ? { id, action } : { id, status: nextStatus };
          const response = await fetch("/api/orders", {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(data.error || "تعذر تنفيذ العملية الجماعية");
          return { id, order: data.order };
        })
      );
      setOrders(current =>
        current.map(order => {
          const result = results.find(item => item.id === order.id);
          return result?.order || order;
        })
      );
      setSelectedIds([]);
      setActiveOrderId(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تنفيذ العملية الجماعية"
      );
    } finally {
      setBulkBusy(false);
    }
  };

  const exportSelectedOrdersPdf = async () => {
    const selectedOrders = selectedIds
      .map(id => orders.find(order => order.id === id))
      .filter((order): order is Order => Boolean(order));
    if (!selectedOrders.length) return;
    const totalValue = selectedOrders.reduce(
      (sum, order) => sum + order.price + (order.delivery_fee || 0),
      0
    );
    const reportRows = selectedOrders
      .map(
        order => `
      <article class="order-row">
        <div class="row-title"><strong>طلبية #${escapeHtml(order.id)}</strong><span>${escapeHtml(statusLabels[order.status])}</span></div>
        <div class="fields"><div><b>التاريخ</b>${escapeHtml(formatDate(order.created_at))}</div><div><b>الاسم</b>${escapeHtml(order.full_name || "بدون اسم")}</div><div><b>الهاتف</b><span dir="ltr">${escapeHtml(order.phone)}</span></div><div><b>الموقع</b>${escapeHtml([order.wilaya, order.commune].filter(Boolean).join("، ") || "غير محدد")}</div><div class="amount"><b>الإجمالي</b>${escapeHtml(order.price + (order.delivery_fee || 0))} دج</div></div>
      </article>`
      )
      .join("");
    const reportStyles = `@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#1f2937;font-family:Arial,"Tahoma",sans-serif;font-size:11px;line-height:1.5}.report{width:794px;margin:0 auto;background:#fff;padding:32px}.header{border-bottom:2px solid #1f2937;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:end}.brand{font-size:22px;font-weight:800;letter-spacing:.04em}.subtitle{color:#6b7280;font-size:10px}.summary{display:flex;justify-content:space-between;border-bottom:1px solid #9ca3af;padding:8px 0;margin-bottom:14px;font-weight:700}.order-row{border-bottom:1px solid #d1d5db;padding:10px 0;break-inside:avoid}.row-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px}.row-title span{border:1px solid #9ca3af;border-radius:999px;padding:1px 8px;font-size:10px}.fields{display:grid;grid-template-columns:1.1fr 1.4fr 1.2fr 2fr 1fr;gap:8px;align-items:start}.fields div{min-width:0}.fields b{display:block;color:#6b7280;font-size:9px;font-weight:400;margin-bottom:2px}.fields .amount{font-weight:800;text-align:left}.footer{color:#9ca3af;text-align:center;margin-top:16px;font-size:9px}`;
    const reportContainer = document.createElement("div");
    reportContainer.dir = "rtl";
    reportContainer.style.cssText =
      "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;";
    reportContainer.innerHTML = `<style>${reportStyles}</style><main class="report"><header class="header"><div><div class="brand">Atlasio</div><div class="subtitle">تقرير مختصر للطلبيات المحددة</div></div><div class="subtitle">${escapeHtml(new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(new Date()))}</div></header><section class="summary"><span>عدد الطلبيات: ${selectedOrders.length}</span><span>الإجمالي: ${totalValue} دج</span></section>${reportRows}<p class="footer">تقرير داخلي مختصر — Atlasio</p></main>`;
    document.body.appendChild(reportContainer);
    try {
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve())
      );
      const canvas = await html2canvas(reportContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: 794,
        windowWidth: 794,
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 8;
      const pageHeight = 297 - margin * 2;
      const imageWidth = 210 - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const image = canvas.toDataURL("image/jpeg", 0.94);
      let remainingHeight = imageHeight;
      let position = margin;
      pdf.addImage(image, "JPEG", margin, position, imageWidth, imageHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        position = margin - (imageHeight - remainingHeight);
        pdf.addPage();
        pdf.addImage(image, "JPEG", margin, position, imageWidth, imageHeight);
        remainingHeight -= pageHeight;
      }
      pdf.save(`atlasio-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
      setShippingNotice({
        type: "success",
        title: "تم تحميل التقرير المختصر",
        message: `تم تصدير ${selectedOrders.length} طلبية بالمعلومات الأساسية فقط.`,
      });
    } catch (exportError) {
      console.error("PDF export error", exportError);
      setError(
        "تعذر إنشاء ملف PDF؛ حاول مرة أخرى أو اسمح بالتنزيلات من المتصفح"
      );
    } finally {
      reportContainer.remove();
    }
  };

  if (!password)
    return (
      <main className="min-h-screen bg-[#f4f6f5] px-4 py-16" dir="rtl">
        <div className="mx-auto max-w-md rounded-[28px] border border-white bg-white p-8 shadow-[0_24px_80px_-35px_rgba(15,23,42,.25)]">
          <div className="mb-7 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
              <Package className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-black text-slate-950">لوحة الطلبات</h1>
            <p className="mt-2 text-sm text-slate-500">
              أدخل كلمة المرور لإدارة طلبات Atlasio.
            </p>
          </div>
          <form
            onSubmit={event => {
              event.preventDefault();
              void loadOrders(passwordInput);
            }}
            className="space-y-4"
          >
            <input
              type="password"
              value={passwordInput}
              onChange={event => setPasswordInput(event.target.value)}
              placeholder="كلمة مرور اللوحة"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-right outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !passwordInput}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 font-bold text-white transition active:scale-[.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />} دخول
            </button>
          </form>
          {error && (
            <p className="mt-4 text-center text-sm font-semibold text-rose-600">
              {error}
            </p>
          )}
        </div>
      </main>
    );

  return (
    <main
      className="admin-dashboard min-h-screen bg-[#f4f6f5] text-slate-950"
      dir="rtl"
      onTouchStart={event => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={event => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && start - end > 70)
          setDrawerOpen(true);
        if (start !== null && end !== undefined && end - start > 70)
          setDrawerOpen(false);
        touchStartX.current = null;
      }}
    >
      {shippingNotice && (
        <div
          className={`fixed inset-x-3 top-3 z-[90] mx-auto max-w-md rounded-2xl border p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-6 sm:top-6 ${shippingNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : shippingNotice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : shippingNotice.type === "loading" ? "border-blue-200 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-950"}`}
          role="status"
        >
          <div className="flex items-start gap-3">
            {shippingNotice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : shippingNotice.type === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            ) : shippingNotice.type === "loading" ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{shippingNotice.title}</p>
              <p className="mt-1 text-xs font-bold leading-5 opacity-80">
                {shippingNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShippingNotice(null)}
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="إغلاق الإشعار"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <aside className="hidden w-[238px] shrink-0 flex-col bg-[#0d1a17] p-5 text-white lg:flex">
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 font-black text-[#0d1a17]">
              A
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">Atlasio</p>
              <p className="text-[10px] text-emerald-200/60">OPERATIONS</p>
            </div>
          </div>
          <nav className="space-y-2 text-sm font-semibold">
            <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
              سير العمل
            </p>
            <button
              type="button"
              onClick={() => goToSection("orders")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "orders" ? "bg-white/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <ClipboardList className="h-4 w-4" /> الواردة{" "}
              <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {totalOrderCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("confirmation")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "confirmation" ? "bg-white/10 text-amber-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Phone className="h-4 w-4" /> التأكيد{" "}
              <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {confirmationQueueCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("shipping")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "shipping" ? "bg-white/10 text-blue-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Truck className="h-4 w-4" /> الشحن{" "}
              <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {shippingQueueCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("tracking")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "tracking" ? "bg-white/10 text-violet-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <RefreshCw className="h-4 w-4" /> التتبع{" "}
              <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {trackingQueueCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => goToSection("incomplete")}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "incomplete" ? "bg-white/10 text-orange-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              <Package className="h-4 w-4" /> تحتاج متابعة{" "}
              <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                {followUpCount}
              </span>
            </button>
            <div className="my-3 border-t border-white/10 pt-3">
              <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
                الأرشيف والتقارير
              </p>
              <button
                type="button"
                onClick={() => goToSection("completed")}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "completed" ? "bg-white/10 text-violet-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <CheckCircle2 className="h-4 w-4" /> تم التسليم{" "}
                <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                  {counts.delivered || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToSection("returns")}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "returns" ? "bg-white/10 text-rose-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Archive className="h-4 w-4" /> المرتجعات{" "}
                <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                  {counts.returned || 0}
                </span>
              </button>
              <button
                type="button"
                onClick={() => goToSection("analytics")}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "analytics" ? "bg-white/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Info className="h-4 w-4" /> التقارير
              </button>
              <button
                type="button"
                onClick={() => goToSection("trash")}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "trash" ? "bg-white/10 text-rose-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
              >
                <Trash2 className="h-4 w-4" /> المحذوفات{" "}
                <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
                  {counts.trashed || 0}
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => void syncStatuses()}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <RefreshCw className="h-4 w-4" /> مزامنة EcoTrack
            </button>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                setDrawerOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4" /> الإعدادات
            </button>
          </nav>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
            <p className="font-bold text-emerald-300">EcoTrack</p>
            <p className="mt-1 text-slate-400">
              {tokenConfigured ? "متصل وجاهز للشحن" : "يحتاج إعداد التوكن"}
            </p>
          </div>
        </aside>
        <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">
                  ATLASIO / {sectionTitle}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  {sectionTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="hidden h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition active:scale-95 sm:flex lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> الأدوات
              </button>
            </div>
          </header>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">{sectionDescription}</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                عرض {visibleOrders.length} من {orders.length} طلب
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="hidden items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition active:scale-95 hover:bg-emerald-600 sm:flex"
            >
              <Truck className="h-4 w-4" /> شحن المؤكدين
            </button>
          </div>
          {section === "orders" && (
            <section className="mb-5 rounded-[26px] bg-slate-950 p-3 text-white shadow-xl shadow-slate-950/10 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
                    DAILY WORK QUEUE
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    طابور العمل اليومي
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={startWork}
                  className="flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-400 px-3 py-2.5 text-xs font-black text-slate-950 transition active:scale-95 hover:bg-emerald-300"
                >
                  <Play className="h-4 w-4" /> ابدأ العمل
                </button>
              </div>
              <p className="mb-3 text-xs font-semibold text-slate-400">
                ابدأ من أول طابور يحتوي على طلبات تحتاج إجراءً.
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => goToSection("confirmation")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-amber-200">
                    تحتاج تأكيد
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {confirmationQueueCount}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("shipping")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-emerald-200">
                    جاهزة للرفع
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {
                      orders.filter(
                        order =>
                          order.status === "confirmed" ||
                          order.shipment_status === "failed"
                      ).length
                    }
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("tracking")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-blue-200">
                    قيد التوصيل
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {
                      orders.filter(
                        order =>
                          Boolean(order.ecotrack_tracking) &&
                          !["delivered", "returned"].includes(order.status)
                      ).length
                    }
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("incomplete")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-orange-200">
                    تحتاج متابعة
                  </p>
                  <p className="mt-1 text-2xl font-black">{followUpCount}</p>
                </button>
              </div>
            </section>
          )}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-bold text-slate-400">في هذا القسم</p>
              <p className="mt-2 text-2xl font-black">
                {section === "orders"
                  ? orders.filter(order => order.status !== "trashed").length
                  : visibleOrders.length}
              </p>
            </div>
            <div className="rounded-[22px] bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-bold text-emerald-700">مؤكدة</p>
              <p className="mt-2 text-2xl font-black text-emerald-800">
                {confirmedCount}
              </p>
            </div>
            <div className="rounded-[22px] bg-blue-50 p-4 ring-1 ring-blue-100">
              <p className="text-xs font-bold text-blue-700">مرفوعة</p>
              <p className="mt-2 text-2xl font-black text-blue-800">
                {shippedCount}
              </p>
            </div>
            <div className="rounded-[22px] bg-violet-50 p-4 ring-1 ring-violet-100">
              <p className="text-xs font-bold text-violet-700">تم التسليم</p>
              <p className="mt-2 text-2xl font-black text-violet-800">
                {deliveredCount}
              </p>
            </div>
          </div>
          {section === "analytics" && (
            <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400">
                  إجمالي الطلبات
                </p>
                <p className="mt-1 text-2xl font-black">
                  {orders.filter(item => item.status !== "trashed").length}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-emerald-700">
                  نسبة التأكيد
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-900">
                  {confirmationRate}%
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-blue-700">مرفوعة</p>
                <p className="mt-1 text-2xl font-black text-blue-900">
                  {shippedCount}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-violet-700">
                  تم التسليم
                </p>
                <p className="mt-1 text-2xl font-black text-violet-900">
                  {deliveredCount}
                </p>
              </div>
            </section>
          )}
          <section className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <p className="text-xs font-black text-slate-700">
                {section === "orders" ? "كل الطلبات الواردة" : sectionTitle}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {section === "orders"
                  ? "استخدم أزرار البطاقة للانتقال للخطوة التالية فقط"
                  : "هذه القائمة تعرض الطلبات التي تنتمي لهذه المرحلة"}
              </p>
            </div>
            {section === "orders" && (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                {visibleOrders.length} طلب
              </span>
            )}
            {section === "trash" && (
              <p className="px-3 py-2 text-xs font-bold text-rose-700">
                الأرشيف المؤقت — يمكنك استرجاع الطلب من تفاصيله
              </p>
            )}
            {section === "incomplete" && (
              <p className="px-3 py-2 text-xs font-bold text-amber-700">
                جرّب الاتصال مجدداً أو انقل الطلب إلى الملغاة من التفاصيل
              </p>
            )}
          </section>
          <section className="mb-5 flex items-center gap-2 rounded-[22px] bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ابحث بالاسم، الهاتف، الولاية أو التتبع"
                className="w-full rounded-2xl bg-slate-50 py-3 pl-4 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
              aria-label="الفلاتر"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${allVisibleSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-400"}`}
                aria-label="تحديد الكل"
              >
                {allVisibleSelected && <Check className="h-4 w-4" />}
              </button>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {selectedIds.length
                    ? `تم تحديد ${selectedIds.length} طلب`
                    : "تحديد الطلبات"}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {selectedIds.length
                    ? "اختر إجراءً يطبق على المحدد"
                    : "يمكنك تنفيذ الإجراءات على عدة طلبات معاً"}
                </p>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={exportSelectedOrdersPdf}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="تصدير الطلبات المحددة إلى PDF"
                >
                  <FileDown className="h-4 w-4" /> تصدير PDF
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate("confirmed")}
                  className="rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  تأكيد المحدد
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate("cancelled")}
                  className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء المحدد
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate(null, "trash")}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> نقل للسلة
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
          <section className="mb-5 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-1 text-xs font-black text-slate-500">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" />{" "}
                الفترة
              </span>
              <select
                value={datePreset}
                onChange={event =>
                  setDatePreset(event.target.value as typeof datePreset)
                }
                className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">كل الفترات</option>
                <option value="today">اليوم</option>
                <option value="yesterday">أمس</option>
                <option value="7d">آخر 7 أيام</option>
                <option value="30d">آخر 30 يوماً</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر السابق</option>
                <option value="custom">تحديد مخصص</option>
              </select>
              {datePreset === "custom" && (
                <>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    من
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={event => setDateFrom(event.target.value)}
                      className="rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    إلى
                    <input
                      type="date"
                      value={dateTo}
                      onChange={event => setDateTo(event.target.value)}
                      className="rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="mr-auto rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100"
              >
                مسح
              </button>
            </div>
            {datePreset !== "all" && (
              <p className="mt-2 px-1 text-[11px] font-bold text-emerald-700">
                يتم عرض {visibleOrders.length} طلب حسب الفترة المحددة
              </p>
            )}
          </section>
          {error && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {loading && orders.length === 0 ? (
            <div className="rounded-[24px] bg-white p-14 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              جارٍ تحميل الطلبات...
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-[24px] bg-white p-14 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              لا توجد طلبات في هذا القسم.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map(order => (
                <article
                  key={order.id}
                  className={`rounded-2xl border bg-white p-2.5 shadow-sm ring-1 transition hover:shadow-md sm:rounded-[24px] sm:p-4 ${statusEdge(order.status)} ${statusCardTone(order.status)} ${selectedIds.includes(order.id) ? "ring-emerald-300" : "ring-slate-200/70"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <button
                        type="button"
                        onClick={event => {
                          event.stopPropagation();
                          toggleSelected(order.id);
                        }}
                        className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${selectedIds.includes(order.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-400"}`}
                        aria-label={
                          selectedIds.includes(order.id)
                            ? "إلغاء تحديد الطلب"
                            : "تحديد الطلب"
                        }
                      >
                        {selectedIds.includes(order.id) && (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openOrder(order)}
                        className="min-w-0 flex-1 text-right"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-black ${statusAvatarTone(order.status)}`}
                          >
                            {(order.full_name || "ز").slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              {
                                (order.full_name || "زبون")
                                  .trim()
                                  .split(/\s+/)[0]
                              }
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openOrder(order)}
                      className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="فتح تفاصيل الطلب"
                    >
                      <span className="hidden text-[10px] font-black sm:inline">
                        تفاصيل
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${order.phone}`}
                        onClick={event => event.stopPropagation()}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                        aria-label={`الاتصال بـ ${order.full_name || "العميل"}`}
                        title="اتصال"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`sms:${order.phone}?body=${encodeURIComponent(customerSmsMessage)}`}
                        onClick={event => event.stopPropagation()}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                        aria-label={`إرسال رسالة إلى ${order.full_name || "العميل"}`}
                        title="رسالة SMS"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </a>
                      <p className="mr-1 text-base font-black text-slate-950">
                        {order.price + (order.delivery_fee || 0)}{" "}
                        <span className="text-[10px] font-bold text-slate-400">
                          دج
                        </span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${statusTone(order.status)}`}
                    >
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-xs font-semibold text-slate-400">
                          {order.shipping_provider_name ||
                            "شركة التوصيل غير محددة"}
                        </p>
                        {order.ecotrack_tracking && (
                          <span className="truncate text-[10px] font-bold text-blue-600">
                            رقم التتبع: {order.ecotrack_tracking}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        إجراءات الطلب
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!order.ecotrack_tracking &&
                        ["abandoned", "complete", "not_responding"].includes(
                          order.status
                        ) && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                void recordContact(order, "confirmed")
                              }
                              disabled={loading || contactBusy}
                              className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{" "}
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void recordContact(order, "refused")
                              }
                              disabled={loading || contactBusy}
                              className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5 shrink-0" /> رفض
                            </button>
                          </>
                        )}
                      {order.status === "confirmed" &&
                        !order.ecotrack_tracking && (
                          <button
                            type="button"
                            onClick={() => void runAction(order.id, "ship")}
                            disabled={loading}
                            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <Truck className="h-3.5 w-3.5 shrink-0" /> رفع
                          </button>
                        )}
                      {order.ecotrack_tracking && (
                        <button
                          type="button"
                          onClick={() => openOrder(order)}
                          className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-blue-50 px-2 py-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          <Truck className="h-3.5 w-3.5 shrink-0" /> تتبع
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          openOrder(order);
                          startEditing(order);
                        }}
                        className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-blue-50 px-2 py-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">تعديل الطلب</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openOrder(order)}
                        className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Truck className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">تفاصيل</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-[min(92vw,390px)] overflow-y-auto bg-white p-5 shadow-2xl transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">
              ATLASIO
            </p>
            <h2 className="mt-1 text-xl font-black">الأدوات</h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-5 space-y-2 border-b border-slate-100 pb-5">
          <p className="px-1 text-xs font-black text-slate-400">سير العمل</p>
          {[
            ["orders", "الواردة", totalOrderCount, ClipboardList],
            ["confirmation", "التأكيد", confirmationQueueCount, Phone],
            ["shipping", "الشحن", shippingQueueCount, Truck],
            ["tracking", "التتبع", trackingQueueCount, RefreshCw],
            ["incomplete", "تحتاج متابعة", followUpCount, Package],
          ].map(item => {
            const key = item[0] as typeof section;
            const label = item[1] as string;
            const count = item[2] as number;
            const Icon = item[3] as typeof ClipboardList;
            return (
              <button
                key={key}
                type="button"
                onClick={() => goToSection(key)}
                className={`flex w-full items-center justify-between rounded-2xl p-4 text-right text-sm font-black ${section === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700"}`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" /> {label}
                </span>
                <span>{count}</span>
              </button>
            );
          })}
          <p className="mt-4 px-1 text-xs font-black text-slate-400">
            الأرشيف والتقارير
          </p>
          <button
            type="button"
            onClick={() => goToSection("completed")}
            className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "completed" ? "bg-violet-50 text-violet-800" : "bg-slate-50 text-slate-700"}`}
          >
            <span className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" /> تم التسليم
            </span>
            <span>{counts.delivered || 0}</span>
          </button>
          <button
            type="button"
            onClick={() => goToSection("returns")}
            className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "returns" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}
          >
            <span className="flex items-center gap-3">
              <Archive className="h-5 w-5" /> المرتجعات
            </span>
            <span>{counts.returned || 0}</span>
          </button>
          <button
            type="button"
            onClick={() => goToSection("analytics")}
            className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "analytics" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}
          >
            <span className="flex items-center gap-3">
              <Info className="h-5 w-5" /> التقارير
            </span>
          </button>
          <button
            type="button"
            onClick={() => goToSection("trash")}
            className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "trash" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}
          >
            <span className="flex items-center gap-3">
              <Trash2 className="h-5 w-5" /> المحذوفات
            </span>
            <span>{counts.trashed || 0}</span>
          </button>
        </div>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              void syncStatuses();
              setDrawerOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-2xl bg-blue-50 p-4 text-right text-sm font-black text-blue-700"
          >
            <span className="flex items-center gap-3">
              <RefreshCw
                className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`}
              />{" "}
              مزامنة حالات EcoTrack
            </span>
            <span className="text-xs text-blue-400">الآن</span>
          </button>
          <button
            type="button"
            onClick={() => void shipAll()}
            disabled={loading}
            className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 p-4 text-right text-sm font-black text-white disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <Truck className="h-5 w-5" /> شحن الطلبات المؤكدة
            </span>
            <span>{confirmedCount}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true);
            setDrawerOpen(false);
          }}
          className="mt-6 flex w-full items-center justify-between rounded-2xl bg-slate-950 p-4 text-right text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-700"
        >
          <span className="flex items-center gap-3">
            <Settings className="h-5 w-5" /> إعدادات المتجر
          </span>
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
      </aside>
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setSettingsOpen(false)}
        >
          <section
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[30px] bg-[#f7faf8] p-5 shadow-2xl sm:rounded-[30px] sm:p-7"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">
                  ATLASIO / SETTINGS
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  إعدادات المتجر
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  إدارة معرّف Meta Pixel وشركات التوصيل ومخزون الشحن.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
                <span>{error}</span>
                <button type="button" onClick={() => setError("")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">معرّف Meta Pixel</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    يُستخدم لربط زيارات المتجر وأحداث الطلبات بحساب Meta. التغيير يُطبّق عند إعادة تحميل صفحة المتجر.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">Meta</span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="flex-1 text-xs font-black text-slate-500">
                  Pixel ID
                  <input
                    value={pixelIdDraft}
                    onChange={event => setPixelIdDraft(event.target.value)}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="مثال: 837444182648161"
                    dir="ltr"
                    aria-label="معرّف Meta Pixel"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold tracking-wide outline-none focus:border-blue-400 focus:bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void savePixelId()}
                  disabled={savingPixelId}
                  className="self-end rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {savingPixelId ? "جارٍ الحفظ..." : "حفظ معرّف Pixel"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">يجب أن يكون المعرّف أرقاماً فقط. اتركه فارغاً إذا أردت إيقاف التتبع.</p>
              {pixelNotice && (
                <p className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${pixelNotice.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} role="status">
                  {pixelNotice.message}
                </p>
              )}
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-black text-slate-900">
                    الشركات المرتبطة
                  </h3>
                  <button
                    type="button"
                    onClick={startNewProvider}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white"
                  >
                    + شركة جديدة
                  </button>
                </div>
                {providers.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200">
                    لا توجد شركة توصيل بعد.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {providers.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => selectProviderForEdit(item)}
                        className={`min-h-[108px] rounded-2xl p-4 text-right transition ${editingProviderId === item.id ? "bg-slate-950 text-white shadow-lg" : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-emerald-300"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black">
                            {item.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${editingProviderId === item.id ? "bg-white/15 text-emerald-200" : item.tokenConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                          >
                            {item.tokenConfigured ? "متصل" : "يحتاج توكن"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                {editingProviderId ? (
                  <>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-600">
                          تفاصيل الشركة
                        </p>
                        <h3 className="mt-1 text-lg font-black">
                          {providerNameDraft || "شركة التوصيل"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void refreshStock(
                            selectedProviderId || activeProviderId
                          )
                        }
                        className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> تحديث المخزون
                      </button>
                    </div>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-700">
                          المنتجات المتاحة
                        </p>
                        <p className="mt-2 text-2xl font-black text-emerald-900">
                          {stockProducts.length}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <p className="text-xs font-bold text-blue-700">
                          إجمالي الكمية
                        </p>
                        <p className="mt-2 text-2xl font-black text-blue-900">
                          {stockProducts.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-black text-slate-500">
                        اسم الشركة
                        <input
                          value={providerNameDraft}
                          onChange={event =>
                            setProviderNameDraft(event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <label className="block text-xs font-black text-slate-500">
                        Provider
                        <input
                          value={provider}
                          onChange={event => setProvider(event.target.value)}
                          dir="ltr"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <label className="block text-xs font-black text-slate-500">
                        التوكن
                        <input
                          type="password"
                          value={token}
                          onChange={event => setToken(event.target.value)}
                          placeholder="اتركه فارغاً للإبقاء على التوكن الحالي"
                          dir="ltr"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveProviderProfile()}
                        disabled={savingSettings}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        {savingSettings && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}{" "}
                        حفظ بيانات الشركة
                      </button>
                    </div>
                    <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs font-black text-amber-800">
                        طريقة الشحن
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void saveShippingMode(true)}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black ${shipFromStock ? "bg-emerald-500 text-white" : "bg-white text-slate-500"}`}
                        >
                          من stock
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveShippingMode(false)}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black ${!shipFromStock ? "bg-blue-500 text-white" : "bg-white text-slate-500"}`}
                        >
                          بدون stock
                        </button>
                      </div>
                      <select
                        value={selectedStockProductId}
                        onChange={event =>
                          setSelectedStockProductId(event.target.value)
                        }
                        disabled={!shipFromStock || stockProducts.length === 0}
                        className="mt-3 w-full rounded-xl bg-white px-3 py-3 text-xs font-bold disabled:opacity-60"
                      >
                        <option value="">
                          {stockProducts.length
                            ? "منتج اختياري — stock مباشر"
                            : "الشركة لا توفر كتالوج منتجات؛ stock مباشر"}
                        </option>
                        {stockProducts.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} · المتاح {item.quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center">
                    <Settings className="h-10 w-10 text-slate-300" />
                    <h3 className="mt-4 font-black text-slate-700">
                      اختر شركة توصيل
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      اضغط على إحدى البطاقات لعرض التوكن، تفاصيل الاتصال،
                      ومعلومات المخزون.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {activeOrder && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-6"
          onClick={closeOrder}
        >
          <div
            className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-4 shadow-2xl sm:p-5"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-600">
                  {activeOrder.lead_id}
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {activeOrder.full_name || "زبون بدون اسم"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeOrder}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400">الهاتف</p>
                <p className="mt-1 text-sm font-black" dir="ltr">
                  {activeOrder.phone}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[10px] font-bold text-emerald-700">
                  الإجمالي
                </p>
                <p className="mt-1 text-lg font-black text-emerald-900">
                  {activeOrder.price + (activeOrder.delivery_fee || 0)}{" "}
                  <span className="text-xs">دج</span>
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400">العنوان</p>
                <p className="mt-1 text-sm font-bold">
                  {activeOrder.wilaya || "—"}
                  {activeOrder.commune ? `، ${activeOrder.commune}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-bold text-slate-500">الحالة</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusTone(activeOrder.status)}`}
              >
                {statusLabels[activeOrder.status]}
              </span>
            </div>
            {activeOrder.ecotrack_tracking && (
              <div className="mt-2 rounded-2xl bg-blue-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-700">
                    حالة التتبع
                  </span>
                  <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">
                    {trackingStatusLabel(activeOrder)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-blue-100 pt-2">
                  <span className="text-[10px] font-bold text-blue-700">
                    رقم التتبع
                  </span>
                  <span
                    className="max-w-[190px] truncate text-xs font-black text-blue-900"
                    dir="ltr"
                  >
                    {activeOrder.ecotrack_tracking}
                  </span>
                </div>
              </div>
            )}
            {activeOrder.ecotrack_tracking && (
              <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700">
                    تفاصيل شركة التوصيل
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadShipmentDetails(activeOrder)}
                    disabled={shipmentBusy}
                    className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`mr-1 inline h-3 w-3 ${shipmentBusy ? "animate-spin" : ""}`}
                    />{" "}
                    تحديث
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <span>
                    العامل:{" "}
                    <b className="text-slate-700">
                      {activeOrder.ecotrack_driver || "—"}
                    </b>
                  </span>
                  <span>
                    هاتف العامل:{" "}
                    <b dir="ltr" className="text-slate-700">
                      {activeOrder.ecotrack_driver_phone || "—"}
                    </b>
                  </span>
                  <span>
                    هاتف المكتب:{" "}
                    <b dir="ltr" className="text-slate-700">
                      {activeOrder.ecotrack_desk_phone || "—"}
                    </b>
                  </span>
                  <span>
                    المحطة:{" "}
                    <b className="text-slate-700">
                      {activeOrder.ecotrack_station || "—"}
                    </b>
                  </span>
                </div>
                {activeOrder.ecotrack_last_note && (
                  <p className="rounded-xl bg-amber-50 p-2 text-[10px] font-bold text-amber-900">
                    آخر تعليق: {activeOrder.ecotrack_last_note}
                  </p>
                )}
                <details open className="rounded-xl border border-slate-100">
                  <summary className="cursor-pointer px-2.5 py-2 text-[10px] font-black text-slate-600">
                    تاريخ التتبع والتعليقات ({shipmentUpdates.length})
                  </summary>
                  <div className="max-h-64 space-y-2 overflow-y-auto border-t border-slate-100 p-2.5">
                    {shipmentUpdates.length === 0 ? (
                      <p className="text-[10px] font-bold text-slate-400">
                        لا توجد تحديثات من الشركة بعد.
                      </p>
                    ) : (
                      shipmentUpdates.map(item => (
                        <div
                          key={item.id}
                          className="border-r-2 border-blue-300 pr-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-blue-800">
                              {item.reason || item.status || "تحديث"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {item.activity_date || ""}{" "}
                              {item.activity_time || ""}
                            </span>
                          </div>
                          {item.details && (
                            <p className="mt-1 text-[10px] font-bold text-slate-600">
                              {item.details}
                            </p>
                          )}
                          {(item.driver ||
                            item.station ||
                            item.postponed_to) && (
                            <p className="mt-1 text-[9px] font-semibold text-slate-500">
                              {item.driver ? `العامل: ${item.driver}` : ""}
                              {item.station ? ` · المحطة: ${item.station}` : ""}
                              {item.postponed_to
                                ? ` · تأجيل إلى: ${item.postponed_to}`
                                : ""}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            )}
            <section className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800">ملاحظات الطلب</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    أضف ملاحظة داخلية لفريق المتابعة.
                  </p>
                </div>
                <MessageCircle className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                value={commentDraft}
                onChange={event => setCommentDraft(event.target.value)}
                placeholder="اكتب تعليقاً على الطلب..."
                maxLength={1000}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  {commentDraft.length}/1000
                </span>
                <button
                  type="button"
                  disabled={commentBusy || !commentDraft.trim()}
                  onClick={() => void addOrderComment(activeOrder)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {commentBusy ? "جارٍ الحفظ..." : "إضافة تعليق"}
                </button>
              </div>
              <details open className="mt-3 rounded-xl border border-slate-200 bg-white">
                <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-black text-slate-600">
                  سجل النشاط ({orderEvents.length})
                </summary>
                <div className="space-y-2 border-t border-slate-100 p-3">
                {orderEvents.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400">
                    لا توجد ملاحظات أو تحديثات مسجلة بعد.
                  </p>
                ) : (
                  orderEvents.map(event => (
                    <div
                      key={event.id}
                      className="border-r-2 border-emerald-300 pr-2"
                    >
                      <p className="text-xs font-bold text-slate-700">
                        {event.message}
                      </p>
                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        {formatDate(event.created_at)}
                      </p>
                    </div>
                  ))
                )}
                </div>
              </details>
            </section>
            <div className="mt-4 space-y-2">
              {activeOrder.status === "confirmed" &&
                !activeOrder.ecotrack_tracking && (
                  <>
                    <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-black text-slate-700">
                        جاهزية الشحن
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                        <span
                          className={
                            activeOrder.full_name
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.full_name ? "✓" : "×"} الاسم
                        </span>
                        <span
                          className={
                            activeOrder.phone
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.phone ? "✓" : "×"} الهاتف
                        </span>
                        <span
                          className={
                            activeOrder.wilaya
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.wilaya ? "✓" : "×"} الولاية
                        </span>
                        <span
                          className={
                            activeOrder.commune
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.commune ? "✓" : "×"} البلدية
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          !activeOrder.full_name ||
                          !activeOrder.phone ||
                          !activeOrder.wilaya ||
                          !activeOrder.commune
                        }
                        onClick={() =>
                          void runAction(activeOrder.id, "ship", "stock")
                        }
                        className="rounded-2xl bg-emerald-500 px-3 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        شحن من Stock
                      </button>
                      <button
                        type="button"
                        disabled={
                          !activeOrder.full_name ||
                          !activeOrder.phone ||
                          !activeOrder.wilaya ||
                          !activeOrder.commune
                        }
                        onClick={() =>
                          void runAction(
                            activeOrder.id,
                            "ship",
                            "without_stock"
                          )
                        }
                        className="rounded-2xl bg-blue-50 px-3 py-3 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        شحن بدون Stock
                      </button>
                    </div>
                  </>
                )}
              {activeOrder.ecotrack_tracking &&
                !["delivered", "returned"].includes(activeOrder.status) && (
                  <button
                    type="button"
                    onClick={() => void runAction(activeOrder.id, "unship")}
                    className="w-full rounded-2xl bg-orange-50 px-3 py-3 text-xs font-black text-orange-700"
                  >
                    إلغاء الرفع من EcoTrack
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md space-y-3 rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-600">
                  تعديل مختصر
                </p>
                <h2 className="mt-1 text-lg font-black">بيانات الطلب</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-black text-slate-500">
              الاسم
              <input
                value={editForm.fullName}
                onChange={event =>
                  setEditForm({ ...editForm, fullName: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-black text-slate-500">
                سعر المنتج
                <input
                  required
                  type="number"
                  min="0"
                  value={editForm.price}
                  onChange={event =>
                    setEditForm({ ...editForm, price: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                  dir="ltr"
                />
              </label>
              <label className="block text-xs font-black text-slate-500">
                التوصيل
                <input
                  required
                  type="number"
                  min="0"
                  value={editForm.deliveryFee}
                  onChange={event =>
                    setEditForm({
                      ...editForm,
                      deliveryFee: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                  dir="ltr"
                />
              </label>
            </div>
            <label className="block text-xs font-black text-slate-500">
              الهاتف
              <input
                required
                value={editForm.phone}
                onChange={event =>
                  setEditForm({ ...editForm, phone: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                dir="ltr"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-black text-slate-500">
                الولاية
                <select
                  required
                  value={editForm.wilaya}
                  onChange={event => {
                    setEditForm({
                      ...editForm,
                      wilaya: event.target.value,
                      commune: "",
                    });
                    setEditCommunes([]);
                    void fetch(
                      `/api/orders?resource=communes&wilaya=${encodeURIComponent(event.target.value)}`
                    )
                      .then(response =>
                        response.ok
                          ? response.json()
                          : Promise.reject(new Error("communes"))
                      )
                      .then(
                        (data: {
                          communes?: Array<{
                            name: string;
                            hasStopDesk: boolean;
                          }>;
                        }) => setEditCommunes(data.communes || [])
                      )
                      .catch(() => setEditCommunes([]));
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-bold"
                >
                  <option value="">اختر الولاية</option>
                  {WILAYAS.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-black text-slate-500">
                البلدية
                <select
                  required
                  value={editForm.commune}
                  onChange={event =>
                    setEditForm({ ...editForm, commune: event.target.value })
                  }
                  disabled={!editForm.wilaya || editCommunes.length === 0}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-bold"
                >
                  <option value="">
                    {editCommunes.length
                      ? "اختر البلدية"
                      : "اختر الولاية أولاً"}
                  </option>
                  {editCommunes.map(item => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                حفظ التعديل
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
