import { useState, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { Label } from '@/react-app/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const WILAYAS = [
  '01 - أدرار', '02 - الشلف', '03 - الأغواط', '04 - أم البواقي', '05 - باتنة', '06 - بجاية', '07 - بسكرة', '08 - بشار', '09 - البليدة', '10 - البويرة',
  '11 - تمنراست', '12 - تبسة', '13 - تلمسان', '14 - تيارت', '15 - تيزي وزو', '16 - الجزائر', '17 - الجلفة', '18 - جيجل', '19 - سطيف', '20 - سعيدة',
  '21 - سكيكدة', '22 - سيدي بلعباس', '23 - عنابة', '24 - قالمة', '25 - قسنطينة', '26 - المدية', '27 - مستغانم', '28 - المسيلة', '29 - معسكر', '30 - ورقلة',
  '31 - وهران', '32 - البيض', '33 - إليزي', '34 - برج بوعريريج', '35 - بومرداس', '36 - الطارف', '37 - تندوف', '38 - تيسمسيلت', '39 - الوادي', '40 - خنشلة',
  '41 - سوق أهراس', '42 - تيبازة', '43 - ميلة', '44 - عين الدفلى', '45 - النعامة', '46 - عين تموشنت', '47 - غرداية', '48 - غليزان', '49 - المغير', '50 - المنيعة',
  '51 - أولاد جلال', '52 - بني عباس', '53 - برج باجي مختار', '54 - تيميمون', '55 - تقرت', '56 - جانت', '57 - عين صالح', '58 - عين قزام'
];

const WILAYA_COMMUNES: Record<string, string[]> = {
  'الجزائر': ['الجزائر الوسطى', 'باب الواد', 'الدار البيضاء', 'حيدرة', 'بئر توتة'],
  'وهران': ['وهران', 'سيدي البشير', 'المرسى', 'سانت أندري', 'أولاد علي'],
  'قسنطينة': ['قسنطينة', 'سطاو', 'عين عرمة', 'حسنى', 'المسيلة'],
  'عنابة': ['عنابة', 'برج حمصي', 'الرويس', 'شراقة', 'مليانة'],
  'البليدة': ['البليدة', 'بوفاريك', 'الحراش', 'المرادية', 'أولاد يعيش'],
  'باتنة': ['باتنة', 'الونشريس', 'أم العمد', 'بوزينة', 'بوحنيفية'],
  'سطيف': ['سطيف', 'قنزات', 'عين الوشام', 'البرواقية', 'بني صاف'],
  'سيدي بلعباس': ['سيدي بلعباس', 'بريمي', 'أولاد ميمون', 'البرمة', 'مطار'],
  'بسكرة': ['بسكرة', 'القل', 'النقايد', 'الحمامات', 'شتمة'],
  'تلمسان': ['تلمسان', 'سبدو', 'المرسى', 'سيدي عبد الرحمن', 'بوحجر'],
  'أدرار': ['أدرار', 'رمال', 'تيميمون', 'رأس الماء', 'قورارة'],
  'الأغواط': ['الأغواط', 'البيضة', 'مشرع', 'الرباح', 'عين مخلوف'],
  'أم البواقي': ['أم البواقي', 'دائرة', 'المطارفة', 'بوجمعة', 'أولاد خليفة'],
  'بجاية': ['بجاية', 'أم الطوب', 'سوق الاثنين', 'البياضة', 'بني مزاب'],
  'بشار': ['بشار', 'سيدي محمد', 'وادي', 'أم الذنيب', 'الشرقية'],
  'البويرة': ['البويرة', 'سوق الحد', 'بئر بوحوش', 'معاوية', 'البرج'],
  'بومرداس': ['بومرداس', 'برج منايل', 'دلس', 'الرابطة', 'الثنية'],
  'برج بوعريريج': ['برج بوعريريج', 'أم الخضر', 'السدرات', 'المنصورة', 'بوغزول'],
  'تبسة': ['تبسة', 'الكريب', 'طرابلس', 'بوشقوف', 'الهواري'],
  'تيارت': ['تيارت', 'أولاد دحام', 'عين بوعمامة', 'الخروب', 'منصورة'],
  'تيزي وزو': ['تيزي وزو', 'بني يني', 'تازغوينت', 'أم الرشراش', 'دمنات'],
  'تيبازة': ['تيبازة', 'المنار', 'زرالدة', 'الثنية', 'غليزان'],
  'تيسمسيلت': ['تيسمسيلت', 'بوسعادة', 'درويش', 'الرمكة', 'برج'],
  'تندوف': ['تندوف', 'المنصورية', 'الزهراء', 'أم الطاعون', 'المرابطين'],
  'تيميمون': ['تيميمون', 'إيين', 'أم الزرار', 'الرباح', 'النجار'],
  'الجلفة': ['الجلفة', 'المدية', 'السعيدة', 'النجمة', 'حاسي الرمل'],
  'جانت': ['جانت', 'بابار', 'الحفصة', 'شمند', 'مصفلة'],
  'جيجل': ['جيجل', 'برني', 'سيدي عيسى', 'إيدير', 'القليعة'],
  'خنشلة': ['خنشلة', 'المدور', 'إفلي', 'المعذر', 'الشميس'],
  'سعيدة': ['سعيدة', 'الرفاعي', 'جميلة', 'أم العسة', 'بريمة'],
  'سكيكدة': ['سكيكدة', 'القلعة', 'الحمام', 'بني بن عزت', 'مـرسي'],
  'سوق أهراس': ['سوق أهراس', 'الحجار', 'تيزي', 'الطريق', 'منزل'],
  'الشلف': ['الشلف', 'الحدود', 'أولاد يحي', 'تازروت', 'بني طابو'],
  'الطارف': ['الطارف', 'بني عدوان', 'السبالة', 'المنصورة', 'الحمام'],
  'عين الدفلى': ['عين الدفلى', 'المرغني', 'أولاد فاس', 'العوينات', 'بني قلة'],
  'عين تموشنت': ['عين تموشنت', 'الرايس', 'بني كيل', 'النجمة', 'تاغية'],
  'عين صالح': ['عين صالح', 'بئر الجير', 'الخروب', 'المنصب', 'المدنية'],
  'عين قزام': ['عين قزام', 'الهمامة', 'الرياح', 'القصور', 'السويدية'],
  'غرداية': ['غرداية', 'توقرت', 'البدية', 'دراغ', 'الزرهوني'],
  'غليزان': ['غليزان', 'المشرع', 'بني يحي', 'سيدي علي', 'مكارم'],
  'قالمة': ['قالمة', 'برقوقة', 'الدائرة', 'تازال', 'مداور'],
  'مستغانم': ['مستغانم', 'سيدي علي', 'الحوض', 'القصبة', 'تيرس'],
  'المسيلة': ['المسيلة', 'حاسي الرمل', 'بني عدي', 'الشط', 'الحداد'],
  'معسكر': ['معسكر', 'حاسي مسعود', 'تامنغست', 'المسعودية', 'بني حواء'],
  'ميلة': ['ميلة', 'القلعة', 'بني جلال', 'سيدي سليمان', 'بني طيف'],
  'المدية': ['المدية', 'سوق', 'دويرة', 'أولاد', 'بويق'],
  'المغير': ['المغير', 'بني مكرر', 'القديد', 'لعثام', 'مغنية'],
  'المنيعة': ['المنيعة', 'اللمرية', 'بني ملال', 'الحاجب', 'شكو'],
  'النعامة': ['النعامة', 'دواودة', 'تفسير', 'المزرعة', 'الردي'],
  'الوادي': ['الوادي', 'بوسعادة', 'النعامة', 'المرسى', 'الحفرة'],
  'ورقلة': ['ورقلة', 'صحراوي', 'الحمام', 'الماي', 'الشعانبة'],
  'إليزي': ['إليزي', 'بني عليه', 'المرجة', 'السبت', 'عين الزعطوط'],
  'أولاد جلال': ['أولاد جلال', 'بني يزك', 'الطاقة', 'الفرقد', 'المدرسة'],
  'البيض': ['البيض', 'الرباح', 'العوينات', 'أم الطور', 'العربان'],
  'بني عباس': ['بني عباس', 'النعاس', 'المرجم', 'عين كرمس', 'المسيد'],
  'برج باجي مختار': ['برج باجي مختار', 'أفلو', 'المنيعة', 'المرسى', 'بنة'],
  'تمنراست': ['تمنراست', 'أم الربيع', 'الواحات', 'الصريح', 'أورلال'],
  'تقرت': ['تقرت', 'الحارث', 'القرية', 'أولاد سعيد', 'بني شيح']
};

const PHONE_PATTERN = /^(0\d{9}|\+213\d{9})$/;

const TELEGRAM_BOT_TOKEN = '8028024261:AAGqUaxed7tsD7PoMb1gQ9QPeVp6tGC8JlQ';
const TELEGRAM_CHAT_ID = '-1003776870179';

const validatePhone = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'رقم الهاتف مطلوب';
  }

  if (!PHONE_PATTERN.test(trimmedValue)) {
    return 'رقم الهاتف غير صالح. مثال: 0551234567 أو +213551234567';
  }

  return '';
};

const DEFAULT_PRICE = 1900;
const SPECIAL_PRICE = 2700;
const LIMITED_OFFER_DURATION_MS = 10 * 60 * 1000;
const isLimitedOffer = new URLSearchParams(window.location.search).get('offer') === 'limited';
const LIMITED_OFFER_STORAGE_KEY = 'atlasio-limited-offer-ends-at';
const GIFT_OFFER_DURATION_MS = 5 * 60 * 1000;
const GIFT_OFFER_STORAGE_KEY = 'atlasio-booklet-gift-ends-at';

const getOfferPrice = () => {
  const requestedPrice = new URLSearchParams(window.location.search).get('price');
  if (isLimitedOffer) return DEFAULT_PRICE;
  return requestedPrice === String(SPECIAL_PRICE) ? SPECIAL_PRICE : DEFAULT_PRICE;
};

const getLimitedOfferEndsAt = () => {
  if (!isLimitedOffer) return null;
  const storedEndsAt = Number(window.localStorage.getItem(LIMITED_OFFER_STORAGE_KEY));
  if (storedEndsAt > 0) return storedEndsAt;
  const endsAt = Date.now() + LIMITED_OFFER_DURATION_MS;
  window.localStorage.setItem(LIMITED_OFFER_STORAGE_KEY, String(endsAt));
  return endsAt;
};

const getGiftOfferEndsAt = () => {
  const storedEndsAt = Number(window.localStorage.getItem(GIFT_OFFER_STORAGE_KEY));
  if (storedEndsAt > 0) return storedEndsAt;
  const endsAt = Date.now() + GIFT_OFFER_DURATION_MS;
  window.localStorage.setItem(GIFT_OFFER_STORAGE_KEY, String(endsAt));
  return endsAt;
};

const formatCountdown = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const getCampaignLabel = (price: number) => {
  if (isLimitedOffer && price === DEFAULT_PRICE) return 'عرض محدود';
  if (price === SPECIAL_PRICE) return 'السعر العادي';
  return 'الرابط الأساسي';
};

const getLeadStorageKey = (phone: string) => `atlasio:telegram-lead:${phone}`;
const getLeadMessageStorageKey = (phone: string) => `atlasio:telegram-message:${phone}`;

const getLeadId = (phone: string) => {
  const storageKey = `atlasio:lead-id:${phone}`;

  try {
    const existingId = window.sessionStorage.getItem(storageKey);
    if (existingId) return existingId;

    const leadId = `AT-${Date.now().toString(36).toUpperCase()}`;
    window.sessionStorage.setItem(storageKey, leadId);
    return leadId;
  } catch {
    return `AT-${Date.now().toString(36).toUpperCase()}`;
  }
};

const getProductEventData = (price: number): Record<string, unknown> => ({
  content_name: 'باك الربيع الملكي',
  content_ids: ['atlasio-spring-pack'],
  content_type: 'product',
  value: price,
  currency: 'DZD',
});

const saveOrder = async (payload: {
  leadId: string;
  status: 'abandoned' | 'complete';
  price: number;
  campaign: string;
  phone: string;
  fullName?: string;
  wilaya?: string;
  commune?: string;
  deliveryFee?: number;
  deliveryType?: 'home' | 'stop_desk';
  giftBooklet?: boolean;
}) => {
  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        sourceUrl: window.location.href,
      }),
    });
  } catch {
    // Telegram remains the immediate fallback alert if the database is unavailable.
  }
};

const fireFacebookEvent = (eventName: string, parameters: Record<string, unknown> = {}) => {
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;

  if (typeof fbq === 'function') {
    fbq('track', eventName, parameters);
  }
};

const fireFacebookEventOnce = (
  eventName: string,
  dedupeKey: string,
  parameters: Record<string, unknown> = {},
) => {
  const storageKey = `atlasio:pixel:${dedupeKey}`;

  try {
    if (window.sessionStorage.getItem(storageKey)) {
      return;
    }

    window.sessionStorage.setItem(storageKey, '1');
  } catch {
    // Tracking must never block the order flow if storage is unavailable.
  }

  fireFacebookEvent(eventName, parameters);
};

const IMAGE_SLIDES = [
  { src: '/images/main-pack.webp', alt: 'باك الربيع الملكي مع أربعة أنواع من الزهور', label: 'الباك الرئيسي' },
  { src: '/images/proof-seedling.webp', alt: 'شتلات صغيرة نامية في أصيص', label: 'بداية النمو' },
] as const;

function ImageSlider({ compact = false }: { compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = IMAGE_SLIDES[activeIndex];

  useEffect(() => {
    if (isPaused) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % IMAGE_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-2xl ${compact ? '' : 'w-full max-w-lg'}`}
      role="region"
      aria-label="صور المنتج ونتائج الزراعة"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <img
        src={activeSlide.src}
        alt={activeSlide.alt}
        className={`w-full object-cover ${compact ? 'aspect-[4/3]' : 'aspect-square'}`}
        loading={activeIndex === 0 ? 'eager' : 'lazy'}
      />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white" dir="rtl">{activeSlide.label}</span>
        <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white" dir="ltr">{activeIndex + 1} / {IMAGE_SLIDES.length}</span>
      </div>
      <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + IMAGE_SLIDES.length) % IMAGE_SLIDES.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg" aria-label="الصورة السابقة">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % IMAGE_SLIDES.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg" aria-label="الصورة التالية">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8" role="tablist" aria-label="اختيار صورة">
        {IMAGE_SLIDES.map((slide, index) => (
          <button key={slide.src} type="button" role="tab" aria-selected={activeIndex === index} aria-label={`عرض ${slide.label}`} onClick={() => setActiveIndex(index)} className={`h-2.5 rounded-full transition-all ${activeIndex === index ? 'w-7 bg-white' : 'w-2.5 bg-white/60 hover:bg-white'}`} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [fullName, setFullName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [phone, setPhone] = useState('');
  const [communes, setCommunes] = useState<Array<{ name: string; hasStopDesk: boolean }>>([]);
  const [deliveryFees, setDeliveryFees] = useState<Record<string, { home: number; stopDesk: number }>>({});
  const [deliveryType, setDeliveryType] = useState<'home' | 'stop_desk'>('home');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [limitedOfferEndsAt] = useState(getLimitedOfferEndsAt);
  const [giftOfferEndsAt] = useState(getGiftOfferEndsAt);
  const [giftBookletSelected, setGiftBookletSelected] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoFocusedPhoneRef = useRef(false);
  const userInteractedRef = useRef(false);
  const facebookLeadSentRef = useRef(false);
  const limitedOfferActive = Boolean(limitedOfferEndsAt && currentTime < limitedOfferEndsAt);
  const giftOfferActive = currentTime < giftOfferEndsAt;
  const offerPrice = isLimitedOffer && !limitedOfferActive ? SPECIAL_PRICE : getOfferPrice();
  const productEventData = getProductEventData(offerPrice);
  const initiateCheckoutSentRef = useRef(false);

  const phoneError = phone ? validatePhone(phone) : '';
  const selectedWilayaCode = wilaya.match(/^\s*(\d{1,2})/)?.[1] || '';
  const selectedFee = deliveryFees[selectedWilayaCode] || { home: 0, stopDesk: 0 };
  const deliveryFee = deliveryType === 'stop_desk' ? selectedFee.stopDesk : selectedFee.home;
  const selectedCommune = communes.find((item) => item.name === commune);
  const canUseStopDesk = Boolean(selectedCommune?.hasStopDesk);

  useEffect(() => {
    void fetch('/api/orders?resource=fees')
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('fees')))
      .then((data: { fees?: Array<{ wilaya_id?: string | number; tarif?: number; tarif_stopdesk?: number }> }) => {
        const mapped: Record<string, { home: number; stopDesk: number }> = {};
        for (const fee of data.fees || []) {
          const code = String(fee.wilaya_id || '').replace(/^0+/, '') || String(fee.wilaya_id || '');
          if (code) mapped[code] = { home: Number(fee.tarif || 0), stopDesk: Number(fee.tarif_stopdesk || fee.tarif || 0) };
        }
        setDeliveryFees(mapped);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!wilaya) {
      setCommunes([]);
        setCommune('');
        setDeliveryType('home');
        return;
    }
    setCommune('');
    setDeliveryType('home');
    void fetch(`/api/orders?resource=communes&wilaya=${encodeURIComponent(wilaya)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('communes')))
      .then((data: { communes?: Array<{ name: string; hasStopDesk: boolean }> }) => setCommunes(data.communes || []))
      .catch(() => setCommunes([]));
  }, [wilaya]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!giftOfferActive && giftBookletSelected) setGiftBookletSelected(false);
  }, [giftOfferActive, giftBookletSelected]);

  useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true;
    };

    window.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (hasAutoFocusedPhoneRef.current || userInteractedRef.current) return;

    const tryFocusPhone = () => {
      if (hasAutoFocusedPhoneRef.current || userInteractedRef.current) return;
      const input = phoneInputRef.current;
      if (!input) return;

      const form = document.getElementById('lead-form');
      const formRect = form?.getBoundingClientRect();
      const isNearViewport = Boolean(formRect) && formRect!.top < window.innerHeight + 180 && formRect!.bottom > 0;

      if (!isNearViewport) return;
      if (document.activeElement && document.activeElement !== document.body && document.activeElement !== input) return;

      input.focus({ preventScroll: true });
      hasAutoFocusedPhoneRef.current = true;
    };

    const timeoutId = window.setTimeout(tryFocusPhone, 5000 + Math.random() * 9000);
    const handleScroll = () => { if (!hasAutoFocusedPhoneRef.current) tryFocusPhone(); };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    fireFacebookEventOnce('ViewContent', `view-content:${offerPrice}`, productEventData);
  }, []);

  const trackInitiateCheckout = () => {
    if (initiateCheckoutSentRef.current) {
      return;
    }

    initiateCheckoutSentRef.current = true;
    fireFacebookEventOnce('InitiateCheckout', `initiate-checkout:${offerPrice}`, productEventData);
  };

  useEffect(() => {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      facebookLeadSentRef.current = false;
      return;
    }

    if (PHONE_PATTERN.test(trimmedPhone) && !facebookLeadSentRef.current && !submitted) {
      facebookLeadSentRef.current = true;
      fireFacebookEventOnce('Lead', `lead:${trimmedPhone}`, {
        ...productEventData,
        lead_source: 'valid_phone',
      });
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      facebookLeadSentRef.current = false;
    }
  }, [phone, submitted]);

  useEffect(() => {
    const trimmedPhone = phone.trim();

    if (!PHONE_PATTERN.test(trimmedPhone) || submitted) {
      return;
    }

    const leadStorageKey = getLeadStorageKey(trimmedPhone);

    try {
      if (window.sessionStorage.getItem(leadStorageKey)) {
        return;
      }

      // Mark before sending so React re-renders or repeated input events cannot duplicate the lead.
      window.sessionStorage.setItem(leadStorageKey, '1');
    } catch {
      // Continue without deduplication if browser storage is unavailable.
    }

    const leadId = getLeadId(trimmedPhone);
    void saveOrder({
      leadId,
      status: 'abandoned',
      price: offerPrice,
      campaign: getCampaignLabel(offerPrice),
      phone: trimmedPhone,
      deliveryFee,
      deliveryType,
      giftBooklet: giftBookletSelected && giftOfferActive,
    });
    const leadMessage = `🟡 طلب غير مكتمل\n🆔 رقم المتابعة: ${leadId}\n🏷️ الحملة: ${getCampaignLabel(offerPrice)}\n💰 السعر: ${offerPrice} دج\n🚚 التوصيل: ${deliveryFee || 'يحدد بعد اختيار الولاية'} دج\n📞 الهاتف: ${trimmedPhone}\n🎁 الكتيب المجاني: ${giftBookletSelected && giftOfferActive ? 'نعم' : 'لا'}\n⏳ الحالة: بانتظار إكمال البيانات والتأكيد`;

    void fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: leadMessage,
      }),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        const messageId = data?.result?.message_id;
        if (response.ok && messageId) {
          try {
            window.sessionStorage.setItem(getLeadMessageStorageKey(trimmedPhone), String(messageId));
          } catch {
            // Telegram delivery should never block the lead flow.
          }
        }
      })
      .catch(() => undefined);
  }, [phone, submitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = validatePhone(phone);
    if (validationMessage || !wilaya || !commune.trim()) {
      alert(validationMessage || 'يرجى إكمال الولاية والبلدية');
      return;
    }

    trackInitiateCheckout();
    setIsSubmitting(true);

    const trimmedPhone = phone.trim();
    const leadId = getLeadId(trimmedPhone);
    const message = `✅ طلب مكتمل\n🆔 رقم المتابعة: ${leadId}\n🏷️ الحملة: ${getCampaignLabel(offerPrice)}\n💰 السعر: ${offerPrice} دج\n🚚 التوصيل: ${deliveryFee} دج (${deliveryType === 'stop_desk' ? 'المكتب' : 'المنزل'})\n👤 الاسم: ${fullName || '—'}\n📍 الولاية: ${wilaya || '—'}\n🏘️ البلدية: ${commune.trim() || '—'}\n📞 رقم الهاتف: ${trimmedPhone}\n🎁 الكتيب المجاني: ${giftBookletSelected && giftOfferActive ? 'نعم' : 'لا'}\n✅ الحالة: جاهز للتأكيد الهاتفي`;
    await saveOrder({
      leadId,
      status: 'complete',
      price: offerPrice,
      campaign: getCampaignLabel(offerPrice),
      phone: trimmedPhone,
      fullName,
      wilaya,
      commune: commune.trim(),
      deliveryFee,
      deliveryType,
      giftBooklet: giftBookletSelected && giftOfferActive,
    });

    try {
      const leadMessageId = window.sessionStorage.getItem(getLeadMessageStorageKey(trimmedPhone));
      let responseOk = false;

      if (leadMessageId) {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            message_id: Number(leadMessageId),
            text: message,
          }),
        });
        responseOk = response.ok;
      } else {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
          }),
        });
        responseOk = response.ok;
      }

      if (responseOk) {
        fireFacebookEventOnce('Purchase', `purchase:${offerPrice}:${trimmedPhone}`, productEventData);
        setSubmitted(true);
        setFullName('');
        setWilaya('');
        setCommune('');
        setPhone('');
        facebookLeadSentRef.current = false;
        window.sessionStorage.removeItem(getLeadStorageKey(trimmedPhone));
        window.sessionStorage.removeItem(getLeadMessageStorageKey(trimmedPhone));
      } else {
        alert('حدث خطأ. يرجى المحاولة مرة أخرى.');
      }
    } catch (error) {
      alert('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,253,245,0.95),_transparent_52%),linear-gradient(135deg,_#fff7ed_0%,_#fdf2f8_48%,_#ecfdf5_100%)]">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-pink-100">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-3 text-gray-800" dir="rtl">
              باك واحد، 4 أنواع زهور، وبداية سهلة لشرفة أجمل 🌸
            </h1>
            <p className="mb-5 text-center text-sm leading-6 text-gray-600" dir="rtl">
              تخيل غير كي يزهر البالكون تاعك… علاش تخليه فارغ؟ اختَر موقعك، ونتصل بك قبل الشحن لتأكيد الطلب.
            </p>

            {isLimitedOffer && (
              <div className={`mb-5 rounded-xl border p-3 text-center ${limitedOfferActive ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`} dir="rtl">
                {limitedOfferActive ? (
                  <>
                    <p className="text-sm font-bold text-amber-800">عرض خاص لزوار الصفحة: 1900 دج بدل 2700 دج</p>
                    <p className="mt-1 text-xs text-amber-700">ينتهي السعر المخفض خلال <span className="font-bold tabular-nums">{formatCountdown(limitedOfferEndsAt! - currentTime)}</span></p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-700">انتهى العرض الخاص — السعر الحالي: 2700 دج</p>
                )}
              </div>
            )}

            <div className="md:hidden mb-6 w-full">
              <ImageSlider compact />
            </div>

            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-semibold text-green-600 mb-2" dir="rtl">تم استلام طلبك!</h2>
                <p className="text-gray-600" dir="rtl">سنتصل بك قريباً</p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                >
                  طلب جديد
                </Button>
              </div>
            ) : (
              <form id="lead-form" onSubmit={handleSubmit} onFocus={trackInitiateCheckout} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    ref={phoneInputRef}
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="0551234567 أو +213551234567"
                    className="text-right"
                    dir="rtl"
                    aria-invalid={Boolean(phoneError)}
                  />
                  {phone && phoneError && (
                    <p className="text-sm text-red-600" dir="rtl">{phoneError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">الاسم</Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="text-right"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wilaya">الولاية</Label>
                  <Select value={wilaya} onValueChange={(value) => setWilaya(value)}>
                    <SelectTrigger id="wilaya" className="text-right" dir="rtl">
                      <SelectValue placeholder="اختر الولاية" />
                    </SelectTrigger>
                    <SelectContent>
                      {WILAYAS.map((w) => (
                        <SelectItem key={w} value={w} className="text-right">
                          {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commune">البلدية</Label>
                  <Select value={commune} onValueChange={(value) => { setCommune(value); const selected = communes.find((item) => item.name === value); if (selected && !selected.hasStopDesk) setDeliveryType('home'); }} disabled={!wilaya || communes.length === 0}>
                    <SelectTrigger id="commune" className="text-right" dir="rtl"><SelectValue placeholder={!wilaya ? 'اختر الولاية أولاً' : communes.length ? 'اختر البلدية من القائمة' : 'جاري تحميل بلديات EcoTrack...'} /></SelectTrigger>
                    <SelectContent>{communes.map((item) => <SelectItem key={item.name} value={item.name} className="text-right">{item.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="text-center py-3 px-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200" dir="rtl">
                  <p className="text-base font-semibold text-gray-800">
                    سعر الباك: <span className="text-xl font-extrabold text-emerald-700">{offerPrice} دج</span>
                  </p>
                  {offerPrice < SPECIAL_PRICE && (
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      <span className="line-through">2700 دج</span>
                      <span className="mx-2 rounded-full bg-rose-100 px-2 py-1 text-rose-700">خصم {Math.round(((SPECIAL_PRICE - offerPrice) / SPECIAL_PRICE) * 100)}%</span>
                    </p>
                  )}
                </div>

                {giftOfferActive && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2" dir="rtl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-right">
                        <p className="text-xs font-bold text-amber-900">🎁 دليل العناية بالزهور مجاناً</p>
                        <p className="text-[11px] text-amber-800">قيمته 300 دج · يساعدك تنجح في الزراعة</p>
                      </div>
                      <button type="button" onClick={() => setGiftBookletSelected((value) => !value)} className={`min-w-[145px] rounded-lg px-4 py-2.5 text-sm font-extrabold transition shadow-sm ${giftBookletSelected ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600 hover:shadow-md'}`}>{giftBookletSelected ? 'تمت الإضافة ✓' : 'أضفه مجاناً لطلبي'}</button>
                    </div>
                    <p className="mt-1 text-[10px] text-amber-700">متوفر مجاناً لمدة {formatCountdown(giftOfferEndsAt - currentTime)}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4" dir="rtl">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2 py-2">
                    <p className="text-[11px] font-bold text-emerald-800">الدفع عند الاستلام</p>
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-2 py-2">
                    <p className="text-[11px] font-bold text-blue-800">نتصل قبل الشحن</p>
                  </div>
                  <div className="rounded-lg border border-pink-100 bg-pink-50/70 px-2 py-2">
                    <p className="text-[11px] font-bold text-pink-800">4 أنواع متنوعة</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-2 py-2">
                    <p className="text-[11px] font-bold text-amber-800">+100 طلبية بلا شكوى</p>
                  </div>
                </div>

                {wilaya && (
                  <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-4" dir="rtl">
                    <p className="text-sm font-bold text-gray-800">اختر طريقة التوصيل</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <label className={`cursor-pointer rounded-lg border p-3 ${deliveryType === 'home' ? 'border-emerald-500 bg-white' : 'border-amber-100 bg-transparent'}`}>
                        <input className="sr-only" type="radio" checked={deliveryType === 'home'} onChange={() => setDeliveryType('home')} />
                        <span className="font-semibold">إلى المنزل</span>
                        <span className="mt-1 block text-xs text-gray-600">{selectedFee.home ? `${selectedFee.home} دج` : 'يحدد حسب الولاية'}</span>
                      </label>
                      <label className={`cursor-pointer rounded-lg border p-3 ${deliveryType === 'stop_desk' ? 'border-emerald-500 bg-white' : 'border-amber-100 bg-transparent'} ${!canUseStopDesk ? 'cursor-not-allowed opacity-50' : ''}`}>
                        <input className="sr-only" type="radio" checked={deliveryType === 'stop_desk'} onChange={() => canUseStopDesk && setDeliveryType('stop_desk')} disabled={!canUseStopDesk} />
                        <span className="font-semibold">إلى المكتب</span>
                        <span className="mt-1 block text-xs text-gray-600">{canUseStopDesk && selectedFee.stopDesk ? `${selectedFee.stopDesk} دج` : 'غير متاح لهذه البلدية'}</span>
                      </label>
                    </div>
                    <p className="text-xs font-medium text-amber-800">التوصيل منفصل عن سعر الباك، ويُحسب حسب الولاية وشركة التوصيل.</p>
                    {deliveryFee > 0 && <p className="text-sm font-bold text-gray-900">المجموع التقريبي: {offerPrice + deliveryFee} دج</p>}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold text-lg py-6"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    'أرسل الطلب للتأكيد'
                  )}
                </Button>

                <div className="mt-4 overflow-hidden rounded-xl border border-pink-200 bg-gradient-to-br from-white via-pink-50/70 to-emerald-50/80 p-4 shadow-sm" dir="rtl">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-pink-600">محتوى الباك</p>
                      <p className="text-sm font-semibold text-gray-800">4 أنواع زهور متنوعة</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm">أعداد تقريبية</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">زينيا قزم F1</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 15 بذرة · حتى 1 م²</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">مارغريت</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 1900 بذرة · حتى 2 م²</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">كوزموس</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 200 بذرة · حتى 6 م²</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">قتيفة (كوليوس)</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 680 بذرة · حتى 3 م²</span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[11px] leading-5 text-gray-500">قد يختلف العدد قليلاً حسب حجم البذور والدفعة.</p>
                </div>

                <p className="text-center text-sm text-gray-600 mt-4" dir="rtl">
                  الدفع عند الاستلام. سنتصل بك قبل الشحن لتأكيد الطلب والتوصيل.
                </p>
              </form>
            )}
          </div>

          <div className="hidden md:flex justify-center items-start sticky top-8">
            <ImageSlider />
          </div>
        </div>

        <section className="mt-8 rounded-2xl bg-white/90 p-5 shadow-lg md:p-6" dir="rtl">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-right">
            <div>
              <p className="text-sm font-semibold text-pink-600">نتائج تختلف حسب العناية</p>
              <h2 className="mt-1 text-xl font-bold text-gray-800">بداية بسيطة، فرق واضح في شرفتك</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600">الزينيا والكوسموس والقتيفة محبة للدفء، والنتائج تختلف حسب النوع والموسم والعناية.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
