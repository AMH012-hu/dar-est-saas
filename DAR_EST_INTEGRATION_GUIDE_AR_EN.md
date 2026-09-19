# DAR.EST — دليل الربط مع موقع خارجي

## الفكرة بسرعة

أصبح DAR.EST جاهزاً للربط مع أي موقع عقارات أو Landing Page أو نموذج تواصل خارجي من خلال **REST Integration API** مستقل. الموقع الخارجي يستطيع:

1. قراءة العقارات المنشورة والمتاحة فقط.
2. قراءة تفاصيل عقار منشور.
3. إرسال بيانات العميل من نموذج التواصل إلى CRM داخل DAR.EST.
4. ربط العميل بالعقار الذي شاهده، مع حفظ مصدر العميل والرقم الخارجي لمنع التكرار.

المسار الأساسي هو:

```text
https://YOUR-DAR-EST-DOMAIN/api/integrations/v1
```

وفي النشر الحالي يستبدل `YOUR-DAR-EST-DOMAIN` بدومين DAR.EST الفعلي. يمكن فتح صفحة التعليمات من داخل النظام عبر:

```text
/sales/integrations
```

---

## قبل الربط

### 1. معرفة Company Slug

افتح **Sales Center → Website integration**. ستجد `Company slug` الخاص بالشركة. لا تستخدم اسم الشركة العادي؛ استخدم قيمة الـslug كما تظهر في مركز التكامل.

مثال:

```text
companySlug = porto-golf
```

### 2. إعداد مفتاح الكتابة

أضف متغيراً سرياً في إعدادات خادم DAR.EST:

```text
DAR_EST_INTEGRATION_API_KEY=ضع_مفتاحاً_عشوائياً_طويلاً_هنا
```

لا تضع المفتاح في HTML أو JavaScript الذي يصل إلى المتصفح. يجب أن يظل داخل **backend الموقع الآخر** فقط.

للسماح بالطلبات من المتصفح إلى نقاط القراءة العامة، اضبط قائمة الدومينات المسموح بها:

```text
DAR_EST_INTEGRATION_ALLOWED_ORIGINS=https://partner.example.com
```

إذا كان هناك أكثر من موقع:

```text
DAR_EST_INTEGRATION_ALLOWED_ORIGINS=https://partner.example.com,https://landing.example.com
```

بعد حفظ المتغيرات، أعد تشغيل خادم DAR.EST. نقطة الصحة التالية يجب أن تعيد `ok: true`:

```text
GET /api/integrations/v1/health
```

---

## نقاط API

| الطريقة | المسار | الحماية | الاستخدام |
|---|---|---|---|
| `GET` | `/health` | عامة | التأكد من أن طبقة التكامل تعمل |
| `GET` | `/openapi.json` | عامة | تحميل مواصفة OpenAPI |
| `GET` | `/properties?company=SLUG` | عامة | عرض العقارات المنشورة والمتاحة |
| `GET` | `/properties/:id?company=SLUG` | عامة | عرض تفاصيل عقار واحد |
| `POST` | `/leads` | API key | إدخال عميل جديد إلى CRM |
| `POST` | `/inquiries` | API key | اسم بديل لنفس عملية إدخال العميل |

### قراءة العقارات

```bash
curl 'https://YOUR-DAR-EST-DOMAIN/api/integrations/v1/properties?company=porto-golf'
```

شكل الاستجابة:

```json
{
  "ok": true,
  "data": [
    {
      "id": 12,
      "name": "Chalet A-12",
      "address": "Porto Golf",
      "propertyType": "Chalet",
      "status": "available",
      "areaSqm": 145,
      "priceEgp": 8500000,
      "description": "...",
      "images": ["https://.../image-1.jpg"],
      "paymentPlan": { "deposit": 20, "years": 6 },
      "videoUrl": null,
      "virtualTourUrl": null,
      "floorPlanUrl": "https://.../floor-plan.pdf",
      "latitude": "30.1",
      "longitude": "31.2",
      "updatedAt": "2026-09-19T00:00:00.000Z"
    }
  ],
  "meta": { "count": 1, "companySlug": "porto-golf" }
}
```

لا تعيد هذه النقطة الوحدات غير المنشورة أو المباعة؛ لذلك يمكن استخدامها مباشرة في موقع العملاء.

### قراءة عقار واحد

```bash
curl 'https://YOUR-DAR-EST-DOMAIN/api/integrations/v1/properties/12?company=porto-golf'
```

إذا كان العقار غير منشور أو لم يعد متاحاً، تعود استجابة `404` بدلاً من كشف بياناته الداخلية.

---

## إرسال العميل من الموقع الآخر إلى CRM

يجب تنفيذ هذا الطلب من **backend الموقع الآخر** وليس من كود المتصفح:

```bash
curl -X POST 'https://YOUR-DAR-EST-DOMAIN/api/integrations/v1/leads' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer DAR_EST_INTEGRATION_API_KEY_VALUE' \
  -d '{
    "companySlug": "porto-golf",
    "propertyId": 12,
    "name": "Ahmed Ali",
    "phone": "+201001234567",
    "email": "ahmed@example.com",
    "message": "أرغب في معرفة نظام السداد وحجز معاينة.",
    "source": "partner-website",
    "externalId": "partner-form-2026-00042",
    "preferredPropertyType": "Chalet",
    "preferredLocation": "Porto Golf",
    "budgetMinIls": 5000000,
    "budgetMaxIls": 9000000
  }'
```

بعد نجاح الطلب:

- ينشأ العميل في **Sales Center → CRM** بمرحلة `new`.
- يسجل النشاط كـ`Website lead` مع نص الرسالة.
- إذا أرسلت `propertyId` صحيحاً لعقار منشور، يضاف العقار إلى **Property interests**.
- يحفظ `source` لمعرفة الموقع الذي جلب العميل.
- إذا أرسلت نفس `externalId` مرة أخرى، لا ينشأ عميل مكرر؛ تعود الاستجابة `duplicate: true`.

استجابة نجاح جديدة:

```json
{
  "ok": true,
  "data": {
    "created": true,
    "duplicate": false,
    "salesClientId": 184,
    "propertyId": 12,
    "source": "partner-website"
  }
}
```

استجابة تكرار:

```json
{
  "ok": true,
  "data": {
    "created": false,
    "duplicate": true,
    "salesClientId": 184,
    "source": "partner-website"
  }
}
```

---

## مثال Node.js داخل Backend الموقع الآخر

```ts
const DAR_EST_URL = process.env.DAR_EST_URL!;
const DAR_EST_API_KEY = process.env.DAR_EST_API_KEY!;

export async function sendLeadToDarEst(input: {
  propertyId?: number;
  name: string;
  phone: string;
  email?: string;
  message: string;
  externalId: string;
}) {
  const response = await fetch(`${DAR_EST_URL}/api/integrations/v1/leads`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DAR_EST_API_KEY}`,
    },
    body: JSON.stringify({
      companySlug: "porto-golf",
      ...input,
      source: "partner-website",
    }),
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.code || "DAR_EST_LEAD_FAILED");
  return payload.data;
}
```

ملاحظة: `DAR_EST_API_KEY` في هذا المثال هو secret داخل backend الموقع الآخر، وليس `VITE_` variable ولا قيمة frontend.

---

## مثال React لقراءة وعرض العقارات

```tsx
const response = await fetch(
  `${import.meta.env.VITE_DAR_EST_URL}/api/integrations/v1/properties?company=porto-golf`
);
const { data: properties } = await response.json();

return properties.map((property: any) => (
  <article key={property.id}>
    <img src={property.images?.[0]} alt={property.name} />
    <h2>{property.name}</h2>
    <p>{property.priceEgp?.toLocaleString("en-EG")} EGP</p>
  </article>
));
```

الـfrontend لا يحتاج إلى API key عند قراءة العقارات المنشورة. إذا كان الموقع يحتاج إلى فلاتر أو caching، يفضل تنفيذ القراءة من backend الموقع الآخر ثم تمرير البيانات إلى الواجهة.

---

## أكواد الأخطاء

| HTTP | الكود | المعنى |
|---:|---|---|
| `400` | `COMPANY_SLUG_REQUIRED` | لم يتم إرسال company slug |
| `400` | `INVALID_PROPERTY_ID` | رقم العقار غير صحيح |
| `400` | `INVALID_LEAD` | بيانات النموذج غير مكتملة أو غير صحيحة |
| `401` | `INTEGRATION_API_KEY_INVALID` | المفتاح مفقود أو غير صحيح |
| `404` | `COMPANY_NOT_FOUND` | company slug غير موجود |
| `404` | `PROPERTY_NOT_FOUND` | العقار غير منشور أو لم يعد متاحاً |
| `429` | `LEAD_RATE_LIMITED` | تجاوز 30 إرسال lead في الدقيقة من نفس IP |
| `500` | `LEAD_CREATE_FAILED` | خطأ داخلي؛ استخدم `requestId` في البلاغ |

كل خطأ يعيد `requestId` للمساعدة في تتبع المشكلة من سجلات الخادم.

---

## خطوات التشغيل المختصرة بالعربي

1. افتح `/sales/integrations` وخذ `Company slug`.
2. ضع `DAR_EST_INTEGRATION_API_KEY` في secrets الخاصة بخادم DAR.EST.
3. ضع دومين الموقع الآخر في `DAR_EST_INTEGRATION_ALLOWED_ORIGINS`.
4. في الموقع الآخر، استخدم `GET /properties` لعرض العقارات المنشورة.
5. اجعل نموذج التواصل يرسل من backend الموقع الآخر إلى `POST /leads`.
6. مرر `propertyId` و`externalId` حتى يرتبط العميل بالعقار ولا يتكرر.
7. اختبر أولاً على نموذج واحد، ثم راجع **Sales Center → CRM** وتأكد من ظهور العميل والمصدر والنشاط.

## Short English checklist

1. Open `/sales/integrations` and copy the company slug.
2. Add `DAR_EST_INTEGRATION_API_KEY` to DAR.EST server secrets.
3. Add the partner origin to `DAR_EST_INTEGRATION_ALLOWED_ORIGINS`.
4. Use `GET /properties` to render published inventory.
5. Send the partner contact form from its backend to `POST /leads`.
6. Pass `propertyId` and a stable `externalId` for property linking and deduplication.
7. Submit one test lead and verify the CRM client, source, activity, and property interest.

---

## ملاحظات مهمة

- واجهات التكامل لا تعيد بيانات العملاء أو الفريق أو العقارات غير المنشورة.
- مفتاح التكامل لا يظهر في صفحة `/sales/integrations`؛ الصفحة تعرض اسم المتغير فقط.
- أسعار العقارات في واجهة التكامل تستخدم اسم `priceEgp`، وتبقى القيمة المخزنة في النظام كما هي حالياً.
- يمكن استخدام `/openapi.json` مع Postman أو Swagger لتوليد عميل API.
- إذا احتجت إلى استقبال webhook من نظام خارجي آخر، اجعله يحول payload إلى صيغة `POST /leads` بدلاً من ربط قاعدة البيانات مباشرة.
