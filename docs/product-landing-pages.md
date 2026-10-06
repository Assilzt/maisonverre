# Product landing pages

The public landing page is now a reusable template. Product-specific content lives in `client/src/react-app/product-config.ts`, while the form, Wilaya/commune flow, delivery fees, order API, Telegram fallback, Facebook events, and responsive layout remain shared.

## Add a product

Add one `ProductLandingConfig` entry to `PRODUCT_CONFIGS`:

```ts
'new-product': {
  slug: 'new-product',
  name: 'اسم المنتج',
  shortName: 'الاسم المختصر',
  headline: 'العنوان الرئيسي',
  subheadline: 'الجملة المختصرة تحت العنوان',
  description: 'وصف المنتج ودعوة العميل لإكمال الطلب.',
  price: 2500,
  compareAtPrice: 3200,
  bundles: [
    { quantity: 1, price: 2500, label: 'علبة واحدة' },
    { quantity: 2, price: 4200, label: 'علبتان' },
  ],
  currency: 'دج',
  images: [
    { src: '/images/new-product-main.webp', alt: 'وصف الصورة', label: 'المنتج' },
  ],
  features: [
    { name: 'ميزة 1', emoji: '✓', accent: 'bg-emerald-100 text-emerald-700', details: 'التفاصيل', area: 'القيمة' },
  ],
  trustBadges: ['الدفع عند الاستلام', 'نتصل قبل الشحن'],
  resultEyebrow: 'معلومة قصيرة',
  resultTitle: 'النتيجة المتوقعة',
  resultDescription: 'ملاحظات واقعية عن النتائج.',
  gift: {
    enabled: false,
    title: 'هدية مجانية',
    description: 'وصف الهدية',
    valueLabel: 'قيمتها 300 دج',
    durationMinutes: 5,
  },
  limitedOffer: { enabled: true, durationMinutes: 10 },
  tracking: { contentId: 'atlasio-new-product', campaignName: 'حملة المنتج الجديد' },
},
```

After adding the entry, the page is available automatically at:

```text
/p/new-product
```

The root URL `/` continues to show the default product. An unknown product slug shows a safe not-found message instead of silently submitting an order against the wrong product.

The optional `bundles` list describes package quantities and their total prices. The `/ecom12` presentation shows those choices and uses the selected total for order, lead, notification, and Pixel values; the standard `/` presentation keeps its existing single-product price display.

## Required checks before publishing

Run `pnpm check`, `pnpm test`, and `pnpm build`. Verify the new product on a mobile viewport, including the Wilaya and commune selectors, delivery type, price calculation, order submission, and Facebook event content. Images should be optimized WebP files and their paths must be committed or replaced with the project's approved storage paths.

## Design rule

Do not duplicate `Home.tsx` for a new product. If a product needs a genuinely different section, add an optional field to `ProductLandingConfig` and render it in the shared template so bug fixes and conversion improvements continue to apply to every product page.
