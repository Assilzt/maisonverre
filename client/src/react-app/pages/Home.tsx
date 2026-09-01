import { useState, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { Label } from '@/react-app/components/ui/label';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const WILAYAS = [
  'الجزائر', 'وهران', 'قسنطينة', 'عنابة', 'البليدة', 'باتنة', 'سطيف', 'سيدي بلعباس', 'بسكرة', 'تلمسان',
  'أدرار', 'الأغواط', 'أم البواقي', 'بجاية', 'بشار', 'البويرة', 'بومرداس', 'برج بوعريريج',
  'تبسة', 'تيارت', 'تيزي وزو', 'تيبازة', 'تيسمسيلت', 'تندوف', 'تيميمون',
  'الجلفة', 'جانت', 'جيجل', 'خنشلة', 'سعيدة', 'سكيكدة', 'سوق أهراس', 'الشلف', 'الطارف',
  'عين الدفلى', 'عين تموشنت', 'عين صالح', 'عين قزام', 'غرداية', 'غليزان', 'قالمة',
  'مستغانم', 'المسيلة', 'معسكر', 'ميلة', 'المدية', 'المغير', 'المنيعة', 'النعامة', 'الوادي', 'ورقلة',
  'إليزي', 'أولاد جلال', 'البيض', 'بني عباس', 'برج باجي مختار', 'تمنراست', 'تقرت'
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

const PRODUCT_IMAGE = '/manus-storage/MAIN_7c24329e.jpeg';
const PROOF_IMAGE = '/manus-storage/atlasio-proof_a5825fcc.jpeg';
const PROOF_IMAGE_2 = '/manus-storage/atlasio-proof2_bad12e06.jpeg';

const IMAGE_SLIDES = [
  { src: PRODUCT_IMAGE, alt: 'باك الربيع الملكي', label: 'الصورة الرئيسية' },
  { src: PROOF_IMAGE, alt: 'زهرة برتقالية مزروعة في أصيص', label: 'نتيجة زراعة 1' },
  { src: PROOF_IMAGE_2, alt: 'شتلات صغيرة نامية في أصيص', label: 'نتيجة زراعة 2' },
] as const;

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

const PRODUCT_EVENT_DATA: Record<string, unknown> = {
  content_name: 'باك الربيع الملكي',
  content_ids: ['atlasio-spring-pack'],
  content_type: 'product',
  value: 2700,
  currency: 'DZD',
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

function ImageCarousel({ className = '' }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeSlide = IMAGE_SLIDES[activeIndex];

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % IMAGE_SLIDES.length);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [isPaused]);

  const goToPrevious = () => {
    setActiveIndex((currentIndex) => (currentIndex - 1 + IMAGE_SLIDES.length) % IMAGE_SLIDES.length);
  };

  const goToNext = () => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % IMAGE_SLIDES.length);
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white shadow-2xl ${className}`}
      role="region"
      aria-label="معرض صور المنتج ونتائج الزراعة"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <img
        key={activeSlide.src}
        src={activeSlide.src}
        alt={activeSlide.alt}
        className="aspect-square w-full object-contain bg-white"
        loading="eager"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white" dir="rtl">
          {activeSlide.label}
        </span>
        <span className="rounded-full bg-black/55 px-3 py-1 text-xs text-white" dir="ltr" aria-live="polite">
          {activeIndex + 1} / {IMAGE_SLIDES.length}
        </span>
      </div>

      <button
        type="button"
        onClick={goToPrevious}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        aria-label="الصورة السابقة"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={goToNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        aria-label="الصورة التالية"
      >
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-8" role="tablist" aria-label="اختيار الصورة">
        {IMAGE_SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-label={`عرض ${slide.label}`}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${activeIndex === index ? 'w-7 bg-white' : 'w-2.5 bg-white/60 hover:bg-white/90'}`}
          />
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const facebookLeadSentRef = useRef(false);
  const initiateCheckoutSentRef = useRef(false);

  const phoneError = phone ? validatePhone(phone) : '';

  useEffect(() => {
    fireFacebookEventOnce('ViewContent', 'view-content', PRODUCT_EVENT_DATA);
  }, []);

  const trackInitiateCheckout = () => {
    if (initiateCheckoutSentRef.current) {
      return;
    }

    initiateCheckoutSentRef.current = true;
    fireFacebookEventOnce('InitiateCheckout', 'initiate-checkout', PRODUCT_EVENT_DATA);
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
        ...PRODUCT_EVENT_DATA,
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

    const leadStorageKey = `atlasio:telegram-lead:${trimmedPhone}`;

    try {
      if (window.sessionStorage.getItem(leadStorageKey)) {
        return;
      }

      // Mark before sending so React re-renders or repeated input events cannot duplicate the lead.
      window.sessionStorage.setItem(leadStorageKey, '1');
    } catch {
      // Continue without deduplication if browser storage is unavailable.
    }

    const leadMessage = `📥 رقم مهتم جديد\n📞 الهاتف: ${trimmedPhone}`;

    void fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: leadMessage,
      }),
    }).catch(() => undefined);
  }, [phone, submitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = validatePhone(phone);
    if (validationMessage) {
      return;
    }

    trackInitiateCheckout();
    setIsSubmitting(true);

    const message = `طلب جديد 🌸\nالاسم: ${fullName || '—'}\nالولاية: ${wilaya || '—'}\nالبلدية: ${commune.trim() || '—'}\nرقم الهاتف: ${phone}`;

    try {
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

      if (response.ok) {
        fireFacebookEventOnce('Purchase', `purchase:${phone}`, PRODUCT_EVENT_DATA);
        setSubmitted(true);
        setFullName('');
        setWilaya('');
        setCommune('');
        setPhone('');
        facebookLeadSentRef.current = false;
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
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://019c59e5-a441-7ab2-aa7d-eeda79331ce2.mochausercontent.com/flower-background.png)',
        }}
      >
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-pink-100">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-800" dir="rtl">
              حوّل شرفتك إلى حديقة ملونة خلال أسابيع! 🌸
            </h1>

            <div className="md:hidden mb-6 w-full">
              <ImageCarousel className="shadow-lg" />
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
              <form onSubmit={handleSubmit} onFocus={trackInitiateCheckout} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    type="tel"
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
                  <Label htmlFor="commune">البلدية (اختياري)</Label>
                  <Input
                    id="commune"
                    type="text"
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder="اكتب اسم البلدية"
                    className="text-right"
                    dir="rtl"
                  />
                </div>

                <div className="text-center py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <p className="text-base font-semibold text-gray-800" dir="rtl">
                    سعر الباك: 2700 دج
                  </p>
                </div>

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
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 15 بذرة</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">مارغريت</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 1900 بذرة</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">كوزموس</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 200 بذرة</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-xs shadow-sm">
                      <span className="font-medium text-gray-800">قتيفة (كوليوس)</span>
                      <span className="whitespace-nowrap font-semibold text-emerald-700">حوالي 680 بذرة</span>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-[11px] leading-5 text-gray-500">قد يختلف العدد قليلاً حسب حجم البذور والدفعة.</p>
                </div>

                <p className="text-center text-xs leading-6 text-gray-600" dir="rtl">
                  الزينيا والكوسموس والقتيفة محبة للدفء؛ قد تزهر من الصيف إلى الخريف المبكر حسب المنطقة والعناية. المارغريت تفضّل الجو المعتدل وقد يقل إزهارها مع الحر الشديد.
                </p>

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
                    'اطلب باكك الآن'
                  )}
                </Button>

                <p className="text-center text-sm text-gray-600 mt-4" dir="rtl">
                  الدفع عند الاستلام. البذور أصلية وسريعة النمو.
                </p>
              </form>
            )}
          </div>

          <div className="hidden md:flex justify-center items-start sticky top-8">
            <ImageCarousel className="max-w-lg w-full" />
          </div>
        </div>

        <section className="mt-10 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-pink-100 p-6 md:p-8" dir="rtl">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold text-pink-600 mb-2">من نتائج الزراعة</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">شاهدوا النتيجة بأعينكم</h2>
            <p className="text-sm md:text-base text-gray-600 leading-7">
              صورة مشاركة من تجربة زراعة حقيقية. النتائج تختلف حسب النوع، الموسم، والعناية.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 max-w-3xl mx-auto">
            <figure className="overflow-hidden rounded-2xl bg-white shadow-lg border border-pink-100">
              <img
                src="/manus-storage/atlasio-proof_a5825fcc.jpeg"
                alt="زهرة برتقالية مزروعة في أصيص"
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />
              <figcaption className="px-4 py-3 text-center text-sm text-gray-600">
                صورة مشاركة من تجربة زراعة
              </figcaption>
            </figure>

            <figure className="overflow-hidden rounded-2xl bg-white shadow-lg border border-pink-100">
              <img
                src="/manus-storage/atlasio-proof2_bad12e06.jpeg"
                alt="شتلات صغيرة نامية في أصيص"
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />
              <figcaption className="px-4 py-3 text-center text-sm text-gray-600">
                صورة مشاركة من تجربة زراعة
              </figcaption>
            </figure>
          </div>
        </section>
      </div>
    </div>
  );
}
