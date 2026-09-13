# Atlasio Order Workflow

أصبحت دورة الطلب مقسمة منطقياً إلى ثلاث طبقات مستقلة مع إبقاء `status` القديم للتوافق مع الواجهة الحالية.

| الطبقة | أمثلة | الهدف |
|---|---|---|
| حالة الطلب | `abandoned`, `complete`, `confirmed`, `cancelled`, `trashed` | معرفة وضع الطلب التجاري |
| التأكيد | `confirmation_status`, `contact_result`, `contact_attempts`, `last_contacted_at`, `follow_up_at` | تسجيل عمل الاتصال والنتيجة |
| الشحن | `shipment_status`, `ecotrack_status`, `ecotrack_tracking` | معرفة وضع الشحنة خارجياً وداخلياً |
| الدفع | `payment_status` | إبقاء طريقة الدفع منفصلة عن الطلب والشحن |

## مسار التأكيد

يستطيع العامل تسجيل نتيجة اتصال عبر `PATCH /api/orders` باستخدام:

```json
{
  "action": "contact",
  "id": 123,
  "result": "confirmed"
}
```

القيم المدعومة هي `contacted`, `confirmed`, `no_answer`, `busy`, `call_later`, `wrong_number`, و`refused`.

تأكيد الطلب يحوله إلى `status = confirmed` ويجعله جاهزاً للشحن. عدم الإجابة لا يلغي الطلب، بل يزيد عدد المحاولات ويسجل وقت الاتصال. الرفض أو الرقم الخاطئ يحولان حالة التأكيد إلى `cancelled`.

## سجل الأحداث

يتم تسجيل الأحداث في `atlasio_order_events`. ويمكن قراءة Timeline عبر:

```text
GET /api/orders?resource=events&orderId=<id>
```

لا يعتمد العامل على JSON الخام؛ تعرض الواجهة رسالة بشرية وتاريخ الحدث.

## الشحن

لا يعاد الطلب من صفحة التأكيد إلى حالة الشحن إلا بعد نجاح استجابة مزود الشحن. عند نجاح EcoTrack تحفظ الواجهة والخادم رقم التتبع، وتصبح `shipment_status = shipped`. عند إلغاء الرفع تصبح حالة الشحن `cancelled` وتبقى حالة الطلب `confirmed`.

يجب تعيين متغيرات البيئة التالية في Vercel، وعدم وضعها في ملفات العميل:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

تستعمل صفحة الهبوط `POST /api/telegram` لإرسال أو تعديل الإشعار. إذا لم تكن المتغيرات موجودة، يجب ألا تُعرض الأسرار في المتصفح أو Git.

## التحقق المحلي

```text
pnpm run check
pnpm run test
pnpm run build
```

يجب تنفيذ migration `migrations/001_order_workflow.sql` على بيئة قاعدة البيانات عند الحاجة. الـ API يحتوي أيضاً على `CREATE/ALTER IF NOT EXISTS` للتوافق مع النشر الحالي.
