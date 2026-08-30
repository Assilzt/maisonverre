import { useState, FormEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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

const PRODUCT_IMAGE = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=1600&q=85';
const BACKGROUND_IMAGE = '/manus-storage/atlasio-garden-reference_dee58042.jpg';
const BRAND_MARK = '/manus-storage/atlasio-mark_0e71dd64.png';
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

const fireFacebookLead = () => {
  const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;

  if (typeof fbq === 'function') {
    fbq('track', 'Lead');
  }
};

export default function Home() {
  const [fullName, setFullName] = useState('');
  const [wilaya, setWilaya] = useState('');
  const [commune, setCommune] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const abandonedOrderSentRef = useRef(false);
  const facebookLeadSentRef = useRef(false);

  const availableCommunes = wilaya ? WILAYA_COMMUNES[wilaya] ?? [] : [];
  const phoneError = phone ? validatePhone(phone) : '';

  useEffect(() => {
    if (!wilaya) {
      setCommune('');
      return;
    }

    setCommune((currentCommune) => {
      if (!currentCommune) {
        return '';
      }

      return availableCommunes.includes(currentCommune) ? currentCommune : '';
    });
  }, [wilaya, availableCommunes]);

  useEffect(() => {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      abandonedOrderSentRef.current = false;
      facebookLeadSentRef.current = false;
      return;
    }

    if (PHONE_PATTERN.test(trimmedPhone) && !abandonedOrderSentRef.current) {
      abandonedOrderSentRef.current = true;

      const abandonedMessage = `⚠️ Abandoned Order\n📞 Phone: ${trimmedPhone}${fullName ? `\n👤 Name: ${fullName}` : ''}${wilaya ? `\n📍 Wilaya: ${wilaya}` : ''}${commune ? `\n🏘️ Commune: ${commune}` : ''}`;

      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: abandonedMessage,
        }),
      }).catch(() => undefined);
    }

    if (PHONE_PATTERN.test(trimmedPhone) && !facebookLeadSentRef.current && !submitted) {
      facebookLeadSentRef.current = true;
      fireFacebookLead();
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      abandonedOrderSentRef.current = false;
      facebookLeadSentRef.current = false;
    }
  }, [phone, fullName, wilaya, commune, submitted]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = validatePhone(phone);
    if (validationMessage) {
      return;
    }

    setIsSubmitting(true);

    const message = `طلب جديد 🌸\nالاسم: ${fullName || '—'}\nالولاية: ${wilaya || '—'}\nالبلدية: ${commune || '—'}\nرقم الهاتف: ${phone}`;

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
        setSubmitted(true);
        setFullName('');
        setWilaya('');
        setCommune('');
        setPhone('');
        abandonedOrderSentRef.current = false;
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
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
        }}
      >
        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 md:py-8 max-w-6xl">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-md" dir="rtl">
          <div className="flex items-center gap-3">
            <img src={BRAND_MARK} alt="" aria-hidden="true" className="h-11 w-11 object-contain" />
            <div>
              <p className="font-display text-lg font-extrabold tracking-tight text-emerald-950">Atlasio</p>
              <p className="text-xs font-medium text-emerald-900/65">باكات البذور الأصلية</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm font-semibold text-emerald-950/75 sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#E88962]" aria-hidden="true" />
            الدفع عند الاستلام
          </div>
        </header>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="float-in paper-card rounded-[2rem_0.8rem_2rem_0.8rem] p-6 md:p-9 shadow-warm">
            <div className="mb-6 flex items-center justify-between gap-4" dir="rtl">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E88962]/15 px-3 py-1.5 text-xs font-bold text-[#9a4c35]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#E88962]" aria-hidden="true" />
                باك الربيع الملكي
              </span>
              <span className="text-xs font-semibold tracking-[0.12em] text-emerald-950/50">01 / 03</span>
            </div>

            <h1 className="font-display mb-4 text-right text-3xl font-extrabold leading-[1.18] tracking-tight text-emerald-950 md:text-5xl" dir="rtl">
              حوّل شرفتك إلى حديقة ملونة خلال أسابيع.
            </h1>
            <p className="mb-6 max-w-md text-right text-base leading-8 text-emerald-950/70 md:text-lg" dir="rtl">
              بذور أصلية وسريعة النمو، مختارة باش تعطيك أول لون أخضر بلا تعقيد.
            </p>

            <div className="mb-6 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-emerald-900/15" />
              <span className="text-lg text-[#E88962]">✦</span>
              <span className="h-px w-16 bg-emerald-900/15" />
            </div>

            <div className="md:hidden mb-6 w-full">
              <img 
                src={PRODUCT_IMAGE}
                alt="باك الربيع الملكي"
                className="rounded-xl shadow-lg w-full h-auto object-cover"
                style={{ maxHeight: '400px' }}
                loading="eager"
              />
            </div>

            {submitted ? (
                  <div className="text-center py-8" dir="rtl">
                <div className="mb-4 text-5xl text-[#E88962]">✦</div>
                <h2 className="font-display mb-2 text-xl font-extrabold text-emerald-900">تم استلام طلبك!</h2>
                <p className="text-emerald-950/65">سنتصل بك قريباً لتأكيد التفاصيل.</p>
                <Button 
                  onClick={() => setSubmitted(false)}
                  className="mt-5 bg-[#E88962] text-white hover:bg-[#d87550]"
                >
                  طلب جديد
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
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

                {wilaya && (
                  <div className="space-y-2">
                    <Label htmlFor="commune">البلدية</Label>
                    <Select value={commune} onValueChange={(value) => setCommune(value)} disabled={!availableCommunes.length}>
                      <SelectTrigger id="commune" className="text-right" dir="rtl">
                        <SelectValue placeholder="اختر البلدية" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCommunes.map((item) => (
                          <SelectItem key={item} value={item} className="text-right">
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="rounded-xl border border-emerald-900/10 bg-emerald-50/75 px-4 py-3" dir="rtl">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-emerald-950/65">السعر شامل البذور والتغليف</p>
                    <p className="text-base font-extrabold text-emerald-950">1900 دج <span className="font-medium text-emerald-950/55">+ 500 دج توصيل</span></p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="focus-warm w-full bg-[#E88962] py-6 text-lg font-extrabold text-white shadow-[0_10px_24px_rgba(232,137,98,0.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d87550] active:scale-[0.98]"
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

                <div className="mt-5 flex items-center justify-center gap-3 text-center text-xs font-semibold text-emerald-950/60" dir="rtl">
                  <span>الدفع عند الاستلام</span><span className="text-[#E88962]">•</span><span>تأكيد هاتفي سريع</span>
                </div>
              </form>
            )}
          </div>

          <div className="float-in float-in-delay hidden items-start justify-center md:flex md:sticky md:top-8">
            <div className="relative w-full max-w-lg">
              <div className="organic-frame overflow-hidden border-[10px] border-[#fbf4e8] bg-[#fbf4e8] shadow-warm">
                <img 
                  src={PRODUCT_IMAGE}
                  alt="باك الربيع الملكي فوق سطح خشبي"
                  className="aspect-[4/5] w-full object-cover"
                  loading="eager"
                />
              </div>
              <div className="absolute -bottom-5 -left-4 rounded-xl bg-[#E88962] px-4 py-3 text-right text-sm font-extrabold leading-6 text-white shadow-lg" dir="rtl">
                <span className="block text-xs font-medium text-white/80">خلي البداية بسيطة</span>
                بذور قليلة، فرق كبير.
              </div>
              <div className="mt-10 flex items-center justify-between border-t border-emerald-950/15 pt-4 text-xs font-bold text-emerald-950/60" dir="rtl">
                <span>اختار الباك</span><span className="text-[#E88962]">←</span><span>عطينا معلوماتك</span><span className="text-[#E88962]">←</span><span>نعيطو لك</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
