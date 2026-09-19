# دليل التشغيل العربي — DAR.EST SaaS

هذا المشروع نسخة SaaS عامة للتطوير والعرض. التطبيق مبني باستخدام React وTypeScript وExpress وtRPC وDrizzle وMySQL.

> **تنبيه:** النسخة المحلية مناسبة للتطوير والـPortfolio. أي شخص يملك كامل ملفات نسخة Local يستطيع تعديل الكود على جهازه؛ الحماية الحقيقية من المستخدمين تكون عند تشغيل Backend وقاعدة البيانات على خادم تملكه أنت.

## المتطلبات

- Node.js 22 أو أحدث.
- pnpm 10 أو أحدث.
- Docker Desktop وDocker Compose، أو MySQL 8 مثبت محليًا.
- Git للرفع إلى GitHub.

## تشغيل سريع على Linux/macOS

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d mysql
pnpm db:push
pnpm dev
```

افتح:

```text
http://localhost:3000
```

أنشئ أول حساب من:

```text
http://localhost:3000/register
```

ثم سجّل الدخول من:

```text
http://localhost:3000/login
```

يمكن استخدام سكربت التشغيل المختصر:

```bash
chmod +x start-local.sh
START_MYSQL=1 ./start-local.sh
```

## Windows

1. ثبّت Node.js وpnpm وDocker Desktop.
2. انسخ `.env.example` إلى `.env`.
3. راجع `JWT_SECRET` و`DATABASE_URL`.
4. شغّل `start-local.bat`.

## إعدادات البيئة

أهم القيم في `.env`:

```env
DATABASE_URL=mysql://darest:darest_local_password@127.0.0.1:3307/darest
JWT_SECRET=ضع_قيمة_عشوائية_طويلة_هنا
OWNER_EMAIL=ammarhalawa760@gmail.com
```

لا ترفع `.env` إلى GitHub. ارفع `.env.example` فقط، ولا تضع فيه مفاتيح حقيقية.

## حماية Owner

كل إجراءات Owner الحساسة محمية من الـBackend، وليس من الواجهة فقط. البريد المسموح به هو قيمة `OWNER_EMAIL`، والمضبوط افتراضيًا على:

```text
ammarhalawa760@gmail.com
```

أي حساب آخر، حتى لو كان Admin أو Manager، يحصل على `FORBIDDEN` عند استدعاء إجراءات Owner. لا تضع كلمة مرور قاعدة البيانات أو `JWT_SECRET` الحقيقي على GitHub.

## تشغيل Ollama Agent

المشروع يستخدم **Ollama Cloud** اختياريًا لمساعد العقارات، وليس Ollama المحلي مباشرة.

1. أنشئ مفتاحًا من [Ollama Cloud API keys](https://ollama.com/settings/keys).
2. أضفه إلى `.env`:

```env
OLLAMA_CLOUD_API_KEY=ضع_المفتاح_هنا
```

3. أعد تشغيل التطبيق:

```bash
pnpm dev
```

أمثلة:

```text
رشح لي عقارات متاحة حتى 1000000 جنيه
دول بنفس رينج المساحة؟
اعرضهم مرة أخرى
```

الميزة اختيارية. إذا لم تضف المفتاح، يعمل التطبيق الأساسي وتصبح إجابات الوكيل غير متاحة فقط.

## فحص المشروع

```bash
pnpm check
pnpm test
pnpm build
```

اختبار Ollama الخارجي اختياري:

```bash
RUN_OLLAMA_CLOUD_INTEGRATION=true pnpm test -- server/ollamaCloud.integration.test.ts
```

## رفع المشروع إلى GitHub باستخدام SSH

تأكد من اتصال GitHub:

```bash
ssh -T git@github.com
```

المفروض تظهر رسالة شبيهة بـ:

```text
Hi AMH012-hu! You've successfully authenticated, but GitHub does not provide shell access.
```

أنشئ Repository عام على GitHub باسم `dar-est-saas`، ثم من مجلد المشروع نفّذ:

```bash
git init
git branch -M main
git add .
git commit -m "Initial DAR.EST SaaS public release"
git remote add origin git@github.com:AMH012-hu/dar-est-saas.git
git push -u origin main
```

إذا ظهر:

```text
error: remote origin already exists
```

استخدم:

```bash
git remote set-url origin git@github.com:AMH012-hu/dar-est-saas.git
git push -u origin main
```

تأكد من الرابط:

```bash
git remote -v
```

## تنظيف المستودع العام

قبل كل Push:

```bash
git status --short
git ls-files | grep -E '(^|/)\.env$|node_modules|\.db$|\.sqlite$' || true
```

لا ترفع:

- `.env` أو أي API key.
- قاعدة بيانات أو بيانات عملاء حقيقية.
- `node_modules` أو `dist` أو ملفات Logs.
- إثباتات الدفع أو المستندات الشخصية.
- ملاحظات داخلية أو كلمات مرور.

للدليل الكامل باللغة الإنجليزية راجع [`README.md`](README.md)، ولإرشادات المساهمة راجع [`CONTRIBUTING.md`](CONTRIBUTING.md).
