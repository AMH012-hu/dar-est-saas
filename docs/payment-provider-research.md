# بحث أولي: بوابات الدفع المناسبة لـ DAR.EST في إسرائيل

تم التحقق في 16 أغسطس 2026 من الصفحات الرسمية الآتية:

| المزوّد | ما تؤكده الوثائق الرسمية | الرابط |
|---|---|---|
| PayPlus | يدعم تعليمات دفع متكررة، API للمطورين، نماذج تحصيل متعددة، إشعارات فشل وتحديث بطاقات. توفر الوثائق أرقام بطاقات Sandbox للنجاح والرفض. | https://www.payplus.co.il/en/recurring-payments ؛ https://docs.payplus.co.il/reference/sandbox-credit-card-numbers |
| Tranzila | يدعم صفحة دفع مستضافة/iframe متوافقة مع PCI DSS، عملة ILS برمز `1`، tokenization، وإشعار خادم غير متزامن. | https://docs.tranzila.com/docs/payments-and-billing/iframe-integration-directng |
| Cardcom | توثق API لصفحات Low Profile، webhook، عملة ILS برمز `1`، وواجهات للمدفوعات المتكررة. | https://secure.cardcom.solutions/swagger/ |
| Stripe | لدى Stripe منتج Billing للاشتراكات، لكن تكامل Manus التجريبي الجاهز غير متاح لحساب المستخدم الإقليمي الحالي، ويلزم حساب Stripe ومفاتيح خاصة إذا اختير. | https://stripe.com/billing ؛ https://stripe.com/resources/more/payments-in-israel |

## ملاحظة قرار

لم تُجمع هنا أسعار أو شروط تعاقدية ملزمة. قبل الشراء يجب مقارنة الرسوم، تسوية المدفوعات، الفواتير الضريبية، طرق الدفع المحلية، واتفاقية التاجر مباشرةً مع المزوّد المختار.

## PayPal

توضح وثائق PayPal الرسمية أن التكامل المناسب لشراء خطة واحدة هو Orders API v2: ينشئ الخادم الطلب، يوافق العميل عليه، ثم يلتقط الخادم الدفع. يجب ألا تعتمد المنصة على عودة المتصفح وحدها، بل تتحقق من حالة الطلب/عملية الالتقاط وتستخدم Webhook موثقاً مع التحقق من التوقيع قبل fulfillment.

المراجع الرسمية:

- إنشاء الطلب: https://developer.paypal.com/api/orders/v2/orders-create
- تكامل Orders API: https://developer.paypal.com/api/rest/integration/orders-api
- Webhooks: https://developer.paypal.com/api/rest/webhooks
- حسابات Sandbox: https://developer.paypal.com/sandbox-testing/accounts

القرار: سنبني PayPal في Sandbox أولاً، وسنحتاج `PAYPAL_CLIENT_ID` و`PAYPAL_CLIENT_SECRET` و`PAYPAL_WEBHOOK_ID` للإنتاج. لا تُخزن هذه القيم في الكود أو Git.
