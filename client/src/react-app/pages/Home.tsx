import { useState, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/react-app/components/ui/select';
import { Label } from '@/react-app/components/ui/label';
import { Loader2 } from 'lucide-react';

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
  value: 1900,
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(236,253,245,0.95),_transparent_52%),linear-gradient(135deg,_#fff7ed_0%,_#fdf2f8_48%,_#ecfdf5_100%)]">
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 md:p-8 border border-pink-100">
            <h1 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-800" dir="rtl">
              حوّل شرفتك إلى حديقة ملونة خلال أسابيع! 🌸
            </h1>

            <div className="md:hidden mb-6 rounded-xl bg-gradient-to-br from-emerald-50 to-pink-50 p-5 text-center" dir="rtl">
              <p className="text-4xl" aria-hidden="true">🌸🌿</p>
              <p className="mt-2 font-semibold text-emerald-800">باك الربيع الملكي</p>
              <p className="mt-1 text-sm text-gray-600">بذور مختارة لشرفة مليئة بالحياة</p>
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
                    سعر الباك: 1900 دج
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
            <div className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-emerald-700 via-emerald-600 to-pink-400 p-1 shadow-2xl">
              <div className="rounded-[1.35rem] bg-white/95 p-10 text-center" dir="rtl">
                <p className="text-7xl" aria-hidden="true">🌸</p>
                <h2 className="mt-5 text-3xl font-bold text-emerald-900">ازرع فرحتك</h2>
                <p className="mt-3 text-lg leading-8 text-gray-600">باك واحد، أربعة أنواع من الزهور، وبداية سهلة لحديقتك.</p>
                <div className="mt-7 grid grid-cols-2 gap-3 text-sm font-semibold text-emerald-800">
                  <span className="rounded-xl bg-emerald-50 px-3 py-3">بذور أصلية</span>
                  <span className="rounded-xl bg-pink-50 px-3 py-3">الدفع عند الاستلام</span>
                </div>
              </div>
            </div>
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
