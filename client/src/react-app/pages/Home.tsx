import { useState, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import { trackMetaPixelEventOnce } from '@/react-app/lib/meta-pixel';
import { ChevronLeft, ChevronRight, Loader2, Play } from 'lucide-react';
import {
  DEFAULT_PRODUCT,
  ProductLandingConfig,
  formatCountdown,
  getOfferEndsAt,
  getPixelStorageKey,
  getProductCampaignLabel,
  getProductEventData,
  getProductLeadMessageStorageKey,
  getProductOfferPrice,
  getProductSessionLeadId,
  resetProductSessionLeadId,
} from '@/react-app/product-config';

type YouTubePlayerInstance = {
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
};

type YouTubeIframeApi = {
  Player: new (
    iframe: HTMLIFrameElement,
    options: {
      events: {
        onReady: (event: { target: YouTubePlayerInstance }) => void;
      };
    },
  ) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeIframeApiPromise: Promise<YouTubeIframeApi> | null = null;

const loadYouTubeIframeApi = (): Promise<YouTubeIframeApi> => {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeIframeApiPromise) return youtubeIframeApiPromise;

  youtubeIframeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previousCallback?.();
      } catch {
        // An unrelated callback must not prevent this player from initializing.
      }
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('YouTube IFrame API did not initialize'));
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      youtubeIframeApiPromise = null;
      reject(new Error('Could not load YouTube IFrame API'));
    };
    document.head.appendChild(script);
  });

  return youtubeIframeApiPromise;
};

function YouTubeEmbedPlayer({ videoId }: { videoId: string }) {
  const [activated, setActivated] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!activated || !iframeRef.current) return;
    let isMounted = true;
    let player: YouTubePlayerInstance | null = null;

    void loadYouTubeIframeApi()
      .then((youtube) => {
        if (!isMounted || !iframeRef.current) return;
        player = new youtube.Player(iframeRef.current, {
          events: {
            onReady: (event) => event.target.setPlaybackRate(1.3),
          },
        });
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
      player?.destroy();
    };
  }, [activated]);

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;

  return (
    <section className="ecom12-video-card" dir="rtl" aria-labelledby="ecom12-video-title">
      <div className="ecom12-video-heading">
        <h2 id="ecom12-video-title">شاهدوا الفراولة الأناناسية</h2>
        <p>فيديو قصير عن الـ Pineberry النادرة</p>
      </div>
      <div className="ecom12-video-stage">
        {activated ? (
          <iframe
            ref={iframeRef}
            src={embedUrl}
            title="فيديو قصير عن فراولة Pineberry الأناناسية"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className="ecom12-video-poster"
            onClick={() => setActivated(true)}
            aria-label="تشغيل فيديو Pineberry"
          >
            <img
              src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
              alt="معاينة فيديو Pineberry"
              loading="lazy"
              decoding="async"
            />
            <span className="ecom12-video-play" aria-hidden="true"><Play fill="currentColor" /></span>
          </button>
        )}
      </div>
      <p className="ecom12-video-speed-note">تُطلب سرعة تشغيل 1.3× عند دعمها من YouTube.</p>
    </section>
  );
}

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

const PHONE_PATTERN = /^(0[567]\d{8}|\+213[567]\d{8})$/;


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
  draftSync?: boolean;
}): Promise<boolean> => {
  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, sourceUrl: window.location.href }),
    });
    return response.ok;
  } catch {
    return false;
  }
};

type OrderPayload = Parameters<typeof saveOrder>[0];

const telegramMessageIdFallbacks = new Map<string, number>();

const syncTelegramOrderMessage = async (
  product: ProductLandingConfig,
  leadId: string,
  text: string,
): Promise<boolean> => {
  const storageKey = getProductLeadMessageStorageKey(product, leadId);
  const cacheKey = `${product.slug}:${leadId}`;
  let messageId = telegramMessageIdFallbacks.get(cacheKey) || 0;
  try {
    messageId = Number(window.sessionStorage.getItem(storageKey)) || messageId;
  } catch {
    // The in-memory map still lets this page edit the same Telegram message.
  }

  try {
    const response = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        messageId
          ? { action: 'edit', messageId, text }
          : { action: 'send', text },
      ),
    });
    const data = (await response.json().catch(() => null)) as {
      messageId?: unknown;
      result?: { message_id?: unknown };
    } | null;
    if (!response.ok) return false;

    const returnedMessageId = Number(
      data?.messageId ?? data?.result?.message_id ?? messageId,
    );
    if (Number.isInteger(returnedMessageId) && returnedMessageId > 0) {
      telegramMessageIdFallbacks.set(cacheKey, returnedMessageId);
      try {
        window.sessionStorage.setItem(storageKey, String(returnedMessageId));
      } catch {
        // The in-memory map still prevents duplicate messages in this page.
      }
    }
    return true;
  } catch {
    return false;
  }
};

const buildAbandonedOrderMessage = (order: OrderPayload) =>
  `🟡 طلب غير مكتمل\n🆔 رقم المتابعة: ${order.leadId}\n🏷️ الحملة: ${order.campaign}\n💰 السعر: ${order.price} دج\n🚚 توصيل للمنزل: ${order.deliveryFee || 'يحدد بعد اختيار الولاية'} دج\n👤 الاسم: ${order.fullName || 'لم يُدخل بعد'}\n📍 الولاية: ${order.wilaya || 'لم تُحدد بعد'}\n🏘️ البلدية: ${order.commune || 'لم تُحدد بعد'}\n📞 الهاتف: ${order.phone}\n🎁 الكتيب المجاني: ${order.giftBooklet ? 'نعم' : 'لا'}\n⏳ الحالة: غير مكتمل — تُحدّث هذه الرسالة نفسها أثناء تعبئة النموذج`;

const fireFacebookEventOnce = (
  product: ProductLandingConfig,
  eventName: string,
  dedupeKey: string,
  parameters: Record<string, unknown> = {},
) => {
  trackMetaPixelEventOnce(
    getPixelStorageKey(product, dedupeKey),
    eventName,
    parameters,
  );
};

function ImageSlider({ images, compact = false }: { images: ProductLandingConfig['images']; compact?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = images[activeIndex];

  useEffect(() => {
    if (isPaused) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [images.length, isPaused]);

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl ${compact ? 'w-full' : 'w-full max-w-xl'}`} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <img
        src={activeSlide.src}
        alt={activeSlide.alt}
        width={1024}
        height={1536}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 767px) calc(100vw - 2rem), 50vw"
        className="aspect-[4/3] w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-12 text-white" dir="rtl">
        <span className="text-sm font-bold">{activeSlide.label}</span>
        <span className="rounded-full bg-black/60 px-3 py-1 text-xs" dir="ltr">{activeIndex + 1} / {images.length}</span>
      </div>
      <button type="button" onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg" aria-label="الصورة السابقة"><ChevronLeft className="h-5 w-5" /></button>
      <button type="button" onClick={() => setActiveIndex((activeIndex + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg" aria-label="الصورة التالية"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8" role="tablist" aria-label="اختيار صورة">
        {images.map((slide, index) => (
          <button key={slide.src} type="button" role="tab" aria-selected={activeIndex === index} aria-label={`عرض ${slide.label}`} onClick={() => setActiveIndex(index)} className={`h-2.5 rounded-full transition-all ${activeIndex === index ? 'w-7 bg-white' : 'w-2.5 bg-white/60 hover:bg-white'}`} />
        ))}
      </div>
    </div>
  );
}


export default function Home({ product = DEFAULT_PRODUCT, design = 'default' }: { product?: ProductLandingConfig; design?: 'default' | 'ecom12' }) {
  const [fullName, setFullName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [phone, setPhone] = useState('');
  const [communes, setCommunes] = useState<Array<{ name: string; hasStopDesk: boolean }>>([]);
  const [deliveryFees, setDeliveryFees] = useState<Record<string, { home: number; stopDesk: number }>>({});
  const [deliveryFeesStatus, setDeliveryFeesStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const deliveryType = 'home' as const;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedBundleQuantity, setSelectedBundleQuantity] = useState(1);
  const searchParams = new URLSearchParams(window.location.search);
  const isLimitedOffer = design !== 'ecom12' && product.limitedOffer?.enabled === true && searchParams.get('offer') === 'limited';
  const [limitedOfferEndsAt] = useState(() => getOfferEndsAt(product, 'limited', isLimitedOffer));
  const [giftOfferEndsAt] = useState(() => getOfferEndsAt(product, 'gift', product.gift?.enabled === true));
  const [giftBookletSelected, setGiftBookletSelected] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoFocusedPhoneRef = useRef(false);
  const userInteractedRef = useRef(false);
  const facebookLeadSentRef = useRef(false);
  const viewContentSentRef = useRef(false);
  const activeDraftLeadIdRef = useRef<string | null>(null);
  const pendingDraftSyncRef = useRef<OrderPayload | null>(null);
  const draftSyncTimerRef = useRef<number | null>(null);
  const draftSyncPromiseRef = useRef<Promise<void> | null>(null);
  const limitedOfferActive = Boolean(limitedOfferEndsAt && currentTime < limitedOfferEndsAt);
  const giftOfferActive = Boolean(giftOfferEndsAt && currentTime < giftOfferEndsAt);
  const baseOfferPrice = isLimitedOffer && !limitedOfferActive ? product.compareAtPrice || product.price : getProductOfferPrice(product, searchParams, isLimitedOffer);
  const selectedBundle = product.bundles?.find((bundle) => bundle.quantity === selectedBundleQuantity) || product.bundles?.[0];
  const offerPrice = design === 'ecom12' && selectedBundle ? selectedBundle.price : baseOfferPrice;
  const compareAtTotal = product.compareAtPrice ? product.compareAtPrice * (design === 'ecom12' ? selectedBundle?.quantity || 1 : 1) : undefined;
  const campaignLabel = design === 'ecom12' && selectedBundle
    ? `${product.tracking.campaignName} - ${selectedBundle.label}`
    : getProductCampaignLabel(product, offerPrice, isLimitedOffer);
  const productEventData = getProductEventData(product, offerPrice);
  const initiateCheckoutSentRef = useRef(false);

  const phoneError = phone ? validatePhone(phone) : '';
  const rawWilayaCode = wilaya.match(/^\s*(\d{1,2})/)?.[1] || '';
  const selectedWilayaCode = rawWilayaCode ? String(Number(rawWilayaCode)) : '';
  const selectedFee = deliveryFees[selectedWilayaCode] || { home: 0, stopDesk: 0 };
  const hasDeliveryFee = Boolean(selectedWilayaCode) && Object.prototype.hasOwnProperty.call(deliveryFees, selectedWilayaCode);
  const deliveryFee = selectedFee.home;

  const getActiveDraftLeadId = () => {
    if (!activeDraftLeadIdRef.current) {
      activeDraftLeadIdRef.current = getProductSessionLeadId(product);
    }
    return activeDraftLeadIdRef.current;
  };

  const runPendingDraftSync = async (): Promise<void> => {
    if (draftSyncPromiseRef.current) return draftSyncPromiseRef.current;

    const syncTask = (async () => {
      while (pendingDraftSyncRef.current) {
        const draft = pendingDraftSyncRef.current;
        pendingDraftSyncRef.current = null;
        if (await saveOrder(draft)) {
          await syncTelegramOrderMessage(
            product,
            draft.leadId,
            buildAbandonedOrderMessage(draft),
          );
        }
      }
    })();

    draftSyncPromiseRef.current = syncTask;
    try {
      await syncTask;
    } finally {
      if (draftSyncPromiseRef.current === syncTask) {
        draftSyncPromiseRef.current = null;
      }
      if (pendingDraftSyncRef.current && !isSubmitting) {
        void runPendingDraftSync();
      }
    }
  };

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
        setDeliveryFeesStatus('ready');
      })
      .catch(() => setDeliveryFeesStatus('error'));
  }, []);

  useEffect(() => {
    if (!wilaya) {
      setCommunes([]);
        setCommune('');
        return;
    }
    setCommune('');
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
    if (viewContentSentRef.current) return;
    viewContentSentRef.current = true;
    fireFacebookEventOnce(product, 'ViewContent', 'view-content', productEventData);
  }, []);

  const trackInitiateCheckout = () => {
    if (initiateCheckoutSentRef.current) {
      return;
    }

    const hasMeaningfulInput = Boolean(phone.trim() || fullName.trim() || wilaya || commune);
    if (!hasMeaningfulInput) {
      return;
    }

    initiateCheckoutSentRef.current = true;
    fireFacebookEventOnce(product, 'InitiateCheckout', `initiate-checkout:${offerPrice}:${phone.trim() || 'no-phone'}`, {
      ...productEventData,
      lead_source: phone.trim() ? 'form_started' : 'form_engaged',
    });
  };

  useEffect(() => {
    if (!phone && !fullName && !wilaya && !commune) {
      return;
    }
    trackInitiateCheckout();
  }, [phone, fullName, wilaya, commune]);

  useEffect(() => {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      facebookLeadSentRef.current = false;
      return;
    }

    if (PHONE_PATTERN.test(trimmedPhone) && !facebookLeadSentRef.current && !submitted) {
      facebookLeadSentRef.current = true;
      fireFacebookEventOnce(product, 'Lead', `lead:${trimmedPhone}`, {
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
    const digitCount = trimmedPhone.replace(/\D/g, '').length;
    if (!trimmedPhone || submitted || isSubmitting) return;
    if (digitCount < 3 && !activeDraftLeadIdRef.current) return;

    const draft: OrderPayload = {
      leadId: getActiveDraftLeadId(),
      status: 'abandoned',
      price: offerPrice,
      campaign: campaignLabel,
      phone: trimmedPhone,
      fullName: fullName.trim() || undefined,
      wilaya: wilaya || undefined,
      commune: commune.trim() || undefined,
      deliveryFee,
      deliveryType,
      giftBooklet: giftBookletSelected && giftOfferActive,
      draftSync: true,
    };

    pendingDraftSyncRef.current = draft;
    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
    }
    draftSyncTimerRef.current = window.setTimeout(() => {
      draftSyncTimerRef.current = null;
      void runPendingDraftSync();
    }, 700);

    return () => {
      if (draftSyncTimerRef.current !== null) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }
    };
  }, [
    phone,
    fullName,
    wilaya,
    commune,
    offerPrice,
    campaignLabel,
    deliveryFee,
    deliveryType,
    giftBookletSelected,
    giftOfferActive,
    submitted,
    isSubmitting,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = validatePhone(phone);
    if (validationMessage || !wilaya || !commune.trim()) {
      alert(validationMessage || 'يرجى إكمال الولاية والبلدية');
      return;
    }

    if (deliveryFeesStatus !== 'ready' || !hasDeliveryFee) {
      alert(deliveryFeesStatus === 'loading'
        ? 'يرجى الانتظار حتى يتم تحميل رسوم التوصيل ثم أعد المحاولة.'
        : 'تعذّر تحديد رسوم التوصيل لهذه الولاية. أعد تحميل الصفحة وحاول مرة أخرى.');
      return;
    }

    trackInitiateCheckout();
    const trimmedPhone = phone.trim();
    const leadId = getActiveDraftLeadId();
    fireFacebookEventOnce(product, 'Purchase', `purchase:${leadId}`, productEventData);
    setIsSubmitting(true);

    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
      draftSyncTimerRef.current = null;
    }
    pendingDraftSyncRef.current = null;
    if (draftSyncPromiseRef.current) {
      await draftSyncPromiseRef.current;
    }

    const message = `✅ طلب مكتمل\n🆔 رقم المتابعة: ${leadId}\n🏷️ الحملة: ${campaignLabel}\n💰 السعر: ${offerPrice} دج\n🚚 توصيل للمنزل: ${deliveryFee} دج\n👤 الاسم: ${fullName || '—'}\n📍 الولاية: ${wilaya || '—'}\n🏘️ البلدية: ${commune.trim() || '—'}\n📞 رقم الهاتف: ${trimmedPhone}\n🎁 الكتيب المجاني: ${giftBookletSelected && giftOfferActive ? 'نعم' : 'لا'}\n✅ الحالة: جاهز للتأكيد الهاتفي`;
    const orderSaved = await saveOrder({
      leadId,
      status: 'complete',
      price: offerPrice,
      campaign: campaignLabel,
      phone: trimmedPhone,
      fullName,
      wilaya,
      commune: commune.trim(),
      deliveryFee,
      deliveryType,
      giftBooklet: giftBookletSelected && giftOfferActive,
    });

    if (orderSaved) {
      setSubmitted(true);
      setFullName('');
      setWilaya('');
      setCommune('');
      setPhone('');
      facebookLeadSentRef.current = false;
      resetProductSessionLeadId(product);
      activeDraftLeadIdRef.current = null;
    } else {
      alert('تعذر تسجيل الطلب، يرجى المحاولة مرة أخرى.');
      setIsSubmitting(false);
      return;
    }

    try {
      const telegramSent = await syncTelegramOrderMessage(product, leadId, message);
      if (telegramSent) {
        const messageStorageKey = getProductLeadMessageStorageKey(product, leadId);
        telegramMessageIdFallbacks.delete(`${product.slug}:${leadId}`);
        try {
          window.sessionStorage.removeItem(messageStorageKey);
        } catch {
          // The order is complete even if local tracking storage is unavailable.
        }
      }
    } catch (error) {
      console.warn('Telegram notification failed after order save', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${design === 'ecom12' ? 'ecom12-landing' : ''}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,253,245,0.95),_transparent_52%),linear-gradient(135deg,_#fff7ed_0%,_#fdf2f8_48%,_#ecfdf5_100%)]">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      {design === 'ecom12' && (
        <div className="ecom12-announcement" role="note" dir="rtl">
          <div className="ecom12-marquee-content">
            <div className="ecom12-marquee-item"><span>Pineberry النادرة</span><span aria-hidden="true">●</span><span>الدفع عند الاستلام</span></div>
            <div className="ecom12-marquee-item" aria-hidden="true"><span>Pineberry النادرة</span><span aria-hidden="true">●</span><span>الدفع عند الاستلام</span></div>
            <div className="ecom12-marquee-item" aria-hidden="true"><span>Pineberry النادرة</span><span aria-hidden="true">●</span><span>الدفع عند الاستلام</span></div>
          </div>
        </div>
      )}

      <div className={`relative z-10 container mx-auto px-4 py-8 max-w-6xl ${design === 'ecom12' ? 'ecom12-content' : ''}`}>
        <div className={`grid md:grid-cols-2 gap-8 items-start ${design === 'ecom12' ? 'ecom12-layout' : ''}`}>
          <div className={`order-2 md:order-none bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-pink-100 ${design === 'ecom12' ? 'ecom12-copy-card' : ''}`}>
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-3 text-gray-800" dir="rtl">
              {design === 'ecom12' ? 'بذور الفراولة البيضاء الأناناسية | Pineberry' : product.headline} 🍓🤍🍍
            </h1>
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-center shadow-sm" dir="rtl">
              <p className="text-base font-extrabold text-emerald-800">🍓🤍🍍 {design === 'ecom12' ? 'صنف نادر بنكهة فراولة ولمسة أناناس خفيفة' : product.subheadline}</p>
            </div>

            {design !== 'ecom12' && (
              <p className="mb-5 text-center text-sm leading-6 text-gray-600" dir="rtl">
                {product.description}
              </p>
            )}

            {design === 'ecom12' && (
              <div className="ecom12-purchase-facts" dir="rtl" aria-label="معلومات المنتج والطلب">
                <span>📦 حوالي 200–300 بذرة في العلبة</span>
                <span>🚚 التوصيل المعتاد: يوم إلى يومين</span>
                <span>↩️ ضمان استبدال عند وجود مشكلة بالمنتج</span>
              </div>
            )}

            {design === 'ecom12' && (
              <a
                className="ecom12-cta"
                href="#lead-form"
                dir="rtl"
                onClick={() =>
                  fireFacebookEventOnce(
                    product,
                    'AddToCart',
                    'ecom12-add-to-cart',
                    productEventData,
                  )
                }
              >
                اطلب الآن
              </a>
            )}

            {isLimitedOffer && (
              <div className={`mb-5 rounded-xl border p-3 text-center ${limitedOfferActive ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`} dir="rtl">
                {limitedOfferActive ? (
                  <>
                    <p className="text-sm font-bold text-amber-800">عرض خاص لزوار الصفحة: {product.price} {product.currency} بدل {product.compareAtPrice || product.price} {product.currency}</p>
                    <p className="mt-1 text-xs text-amber-700">ينتهي السعر المخفض خلال <span className="font-bold tabular-nums">{formatCountdown(limitedOfferEndsAt! - currentTime)}</span></p>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-700">انتهى العرض الخاص — السعر الحالي: {product.compareAtPrice || product.price} {product.currency}</p>
                )}
              </div>
            )}

            {submitted ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-semibold text-green-600 mb-2" dir="rtl">تم استلام طلبك!</h2>
                <p className="text-gray-600" dir="rtl">سنتصل بك قريباً</p>
                <Button 
                  onClick={() => {
                    resetProductSessionLeadId(product);
                    activeDraftLeadIdRef.current = null;
                    setSubmitted(false);
                  }}
                  className="mt-4 bg-pink-500 hover:bg-pink-600"
                >
                  طلب جديد
                </Button>
              </div>
            ) : (
              <div className="rounded-3xl border border-pink-100 bg-white/95 p-4 shadow-[0_8px_30px_rgba(244,114,182,0.08)] ring-1 ring-white/60 md:p-6">
                {design === 'ecom12' && <div className="ecom12-order-header" dir="rtl"><h2>استمارة الطلب</h2></div>}
                <form id="lead-form" onSubmit={handleSubmit} onFocus={trackInitiateCheckout} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-2 text-base font-bold text-gray-800">
                      <span className="text-lg">📱</span>
                      <span>رقم الهاتف</span>
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-pink-500">📱</span>
                      <Input
                        ref={phoneInputRef}
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        placeholder="رقم الهاتف"
                        className="border-2 border-pink-200 bg-pink-50/30 px-4 py-3 pr-12 text-right text-base font-medium shadow-sm transition focus:border-pink-500 focus:ring-4 focus:ring-pink-100 placeholder:text-gray-400"
                        dir="rtl"
                        aria-invalid={Boolean(phoneError)}
                      />
                    </div>
                    {phone && phoneError && (
                      <p className="text-sm text-red-600" dir="rtl">{phoneError}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2 text-base font-bold text-gray-800">
                      <span className="text-lg">👤</span>
                      <span>الاسم</span>
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-lg text-emerald-600">👤</span>
                      <Input
                        id="fullName"
                        type="text"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="أدخل اسمك الكامل"
                        className="border-2 border-emerald-200 bg-emerald-50/40 px-4 py-3 pr-12 text-right text-base font-medium shadow-sm transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="wilaya" className="text-base font-bold text-gray-800">الولاية</Label>
                      <select
                        id="wilaya"
                        value={wilaya}
                        onChange={(event) => setWilaya(event.target.value)}
                        className="h-12 w-full rounded-4xl border-2 border-amber-200 bg-amber-50/40 px-4 text-right text-base font-medium shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                        dir="rtl"
                      >
                        <option value="">اختر الولاية</option>
                        {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="commune" className="text-base font-bold text-gray-800">البلدية</Label>
                      <select
                        id="commune"
                        value={commune}
                        onChange={(event) => setCommune(event.target.value)}
                        disabled={!wilaya || communes.length === 0}
                        className="h-12 w-full rounded-4xl border-2 border-amber-200 bg-amber-50/40 px-4 text-right text-base font-medium shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-70"
                        dir="rtl"
                      >
                        <option value="">{!wilaya ? 'اختر الولاية أولاً' : communes.length ? 'اختر البلدية من القائمة' : 'جاري تحميل بلديات EcoTrack...'}</option>
                        {communes.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
                      </select>
                    </div>
                  </div>

                {design === 'ecom12' && product.bundles && (
                  <div className="ecom12-package-grid" dir="rtl" aria-label="اختر عدد العلب">
                    {product.bundles.map((bundle) => (
                      <button
                        key={bundle.quantity}
                        type="button"
                        aria-pressed={selectedBundle?.quantity === bundle.quantity}
                        onClick={() => setSelectedBundleQuantity(bundle.quantity)}
                        className={`ecom12-package-option ${selectedBundle?.quantity === bundle.quantity ? 'selected' : ''}`}
                      >
                        <span className="ecom12-package-label">{design === 'ecom12' ? `${bundle.quantity} علبة` : bundle.label}</span>
                        <span className="ecom12-package-price">{bundle.price} {product.currency}</span>
                      </button>
                    ))}
                  </div>
                )}

                {design === 'ecom12' && (
                  <p className="ecom12-seed-note" dir="rtl">
                    كل علبة تحتوي على حوالي 200 إلى 300 بذرة. يختلف الإنبات حسب جودة البذور وطريقة الزراعة والظروف المناسبة؛ ولا يمكن ضمان إنبات كل بذرة.
                  </p>
                )}

                <div className={`text-center py-3 px-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 ${design === 'ecom12' ? 'ecom12-price-summary' : ''}`} dir="rtl">
                  <p className="text-base font-semibold text-gray-800">
                    {design === 'ecom12' ? 'سعر الباقة:' : 'سعر المنتج:'} <span className="text-xl font-extrabold text-emerald-700">{offerPrice} {product.currency}</span>
                  </p>
                  {compareAtTotal && offerPrice < compareAtTotal && (
                    <p className="mt-1 text-xs font-semibold text-gray-500">
                      <span className="line-through">{compareAtTotal} {product.currency}</span>
                      <span className="mx-2 rounded-full bg-rose-100 px-2 py-1 text-rose-700">خصم {Math.round(((compareAtTotal - offerPrice) / compareAtTotal) * 100)}%</span>
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-emerald-200 pt-3 text-sm font-semibold text-gray-700" dir="rtl">
                    <span>التوصيل إلى المنزل</span>
                    <span className="text-gray-900">
                      {deliveryFeesStatus === 'ready' && hasDeliveryFee
                        ? `${deliveryFee} ${product.currency}`
                        : !wilaya
                          ? 'يُحسب بعد اختيار الولاية'
                          : deliveryFeesStatus === 'loading'
                            ? 'جارٍ احتسابه…'
                            : deliveryFeesStatus === 'error'
                              ? 'تعذّر تحميل الرسم'
                              : 'غير متاح لهذه الولاية'}
                    </span>
                  </div>
                  {deliveryFeesStatus === 'ready' && hasDeliveryFee ? (
                    <p className="ecom12-final-total mt-2 text-lg font-black text-gray-950">
                      الإجمالي النهائي: {offerPrice + deliveryFee} {product.currency}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs font-semibold text-gray-600">
                      {!wilaya
                        ? 'اختر الولاية لعرض المبلغ النهائي شامل التوصيل'
                        : deliveryFeesStatus === 'loading'
                          ? 'سيظهر المبلغ النهائي بعد احتساب التوصيل'
                          : 'لا يمكن تأكيد الإجمالي حتى تتوفر رسوم التوصيل'}
                    </p>
                  )}
                </div>

                {design !== 'ecom12' && giftOfferActive && (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2" dir="rtl">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-right">
                        <p className="text-xs font-bold text-amber-900">🎁 {product.gift?.title}</p>
                        <p className="text-[11px] text-amber-800">{product.gift?.valueLabel} · {product.gift?.description}</p>
                      </div>
                      <button type="button" onClick={() => setGiftBookletSelected((value) => !value)} className={`min-w-[145px] rounded-lg px-4 py-2.5 text-sm font-extrabold transition shadow-sm ${giftBookletSelected ? 'bg-emerald-600 text-white ring-2 ring-emerald-200' : 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600 hover:shadow-md'}`}>{giftBookletSelected ? 'تمت الإضافة ✓' : 'أضفه مجاناً لطلبي'}</button>
                    </div>
                    <p className="mt-1 text-[10px] text-amber-700">متوفر مجاناً لمدة {formatCountdown(giftOfferEndsAt! - currentTime)}</p>
                  </div>
                )}

                {design !== 'ecom12' && (
                  <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4" dir="rtl">
                    {product.trustBadges.map((badge, index) => (
                      <div key={`${badge}-${index}`} className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-2 py-2">
                        <p className="text-[11px] font-bold text-emerald-800">{badge}</p>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white font-black text-lg py-6 shadow-lg shadow-orange-300/50 transition-all duration-200 active:scale-[0.99]"
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

                {design !== 'ecom12' && <div className="mt-4 overflow-hidden rounded-2xl border border-pink-200 bg-gradient-to-br from-white via-pink-50/70 to-emerald-50/80 p-4 shadow-sm" dir="rtl">
                  <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-center shadow-sm">
                    <p className="text-[15px] font-bold text-emerald-800">🍓🤍🍍 {product.resultTitle}</p>
                  </div>

                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-pink-600">محتوى الباك</p>
                      <p className="text-sm font-semibold text-gray-800">{product.features.length} أنواع متنوعة</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-600 shadow-sm">أعداد تقريبية</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {product.features.map((flower) => (
                      <div key={flower.name} className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/80 p-2.5 shadow-sm">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl shadow-inner ${flower.accent}`} aria-hidden="true">
                          {flower.emoji}
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <p className="text-sm font-extrabold text-gray-900">{flower.name}</p>
                          <p className="mt-0.5 text-[11px] text-gray-600">{flower.details} · {flower.area}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-center text-[11px] leading-5 text-gray-500">قد يختلف العدد قليلاً حسب حجم البذور والدفعة.</p>
                </div>}

                {design !== 'ecom12' && <p className="text-center text-sm text-gray-600 mt-4" dir="rtl">
                  الدفع عند الاستلام. سنتصل بك قبل الشحن لتأكيد الطلب والتوصيل.
                </p>}
              </form>
            </div>
            )}
            {design === 'ecom12' && <YouTubeEmbedPlayer videoId="u_yHscxu_pc" />}
          </div>

          <div className={`order-1 md:order-none flex justify-center items-start sticky top-8 ${design === 'ecom12' ? 'ecom12-image-column' : ''}`}>
            <ImageSlider images={product.images} />
          </div>
          {design === 'ecom12' && (
            <div className="ecom12-features-grid" dir="rtl">
              <div className="ecom12-feature-item"><span aria-hidden="true">🌿</span><strong>طبيعية 100%</strong></div>
              <div className="ecom12-feature-item"><span aria-hidden="true">🌱</span><strong>زراعة منزلية</strong></div>
              <div className="ecom12-feature-item"><span aria-hidden="true">📦</span><strong>توصيل مضمون</strong></div>
            </div>
          )}
        </div>

        {design !== 'ecom12' && <section className="mt-8 rounded-2xl bg-white/90 p-5 shadow-lg md:p-6" dir="rtl">
          <div className="flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-right">
            <div>
              <p className="text-sm font-semibold text-pink-600">{product.resultEyebrow}</p>
              <h2 className="mt-1 text-xl font-bold text-gray-800">{product.resultTitle}</h2>
            </div>
            <p className="text-sm leading-6 text-gray-600">{product.resultDescription}</p>
          </div>
        </section>}
      </div>
    </div>
  );
}
