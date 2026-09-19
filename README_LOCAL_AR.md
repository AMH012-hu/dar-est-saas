# DAR.EST SaaS — التشغيل المحلي والرفع إلى GitHub

هذه النسخة هي تطبيق SaaS كامل مبني باستخدام React وExpress وTypeScript وDrizzle. فحص البناء نجح باستخدام `pnpm check` و`pnpm build`.

## نقطة مهمة قبل التشغيل

المشروع **ليس تطبيقاً مستقلاً بقاعدة SQLite** مثل النسخة السابقة. يحتاج إلى:

1. خادم MySQL.
2. قيمة سرية للجلسات `JWT_SECRET`.

لذلك لن يكفي تشغيل ملف JavaScript فقط على جهاز آخر قبل إعداد هذه المتطلبات.

## المتطلبات

- Node.js 22 أو أحدث.
- pnpm 10 أو استخدام `corepack pnpm`.
- MySQL 8 أو Docker Desktop لتشغيل MySQL تلقائياً.
- بيانات OAuth صالحة للمشروع.

## إعداد MySQL باستخدام Docker

إذا كان Docker Desktop مثبتاً:

```bash
docker compose up -d mysql
```

ثم انسخ ملف البيئة:

```bash
cp .env.example .env
```

افتح `.env` وضع قيمة حقيقية لـ `JWT_SECRET`. تسجيل الدخول المحلي موجود عبر `/login` وإنشاء الحساب عبر `/register`. OAuth يظل اختيارياً إذا أردت ربط الدخول الخارجي.

## التشغيل على Linux/macOS

```bash
chmod +x start-local.sh
START_MYSQL=1 ./start-local.sh
```

إذا كان MySQL مثبتاً خارج Docker، استخدم:

```bash
./start-local.sh
```

بعد التشغيل افتح `http://localhost:3000`. قد ينتقل التطبيق تلقائياً إلى منفذ آخر إذا كان 3000 مستخدماً.

## التشغيل على Windows

1. ثبّت Node.js وفعّل Corepack أو ثبّت pnpm.
2. ثبّت MySQL أو Docker Desktop.
3. انسخ `.env.example` إلى `.env` وعدّل القيم.
4. شغّل `start-local.bat`.

لتشغيل MySQL عبر Docker أولاً:

```bash
docker compose up -d mysql
```

## تسجيل الدخول المحلي

افتح `http://localhost:3000/register` لإنشاء أول حساب، ثم استخدم `http://localhost:3000/login`. كلمات المرور تُخزّن كـ hash باستخدام `scrypt` ولا تُحفظ كنص صريح. إذا كان `VITE_OAUTH_PORTAL_URL` مضبوطاً، يبقى زر OAuth متاحاً؛ وإذا لم يكن مضبوطاً، يوجّه زر الدخول إلى النموذج المحلي.

## رفعه إلى GitHub

لا ترفع `.env` أو كلمات مرور MySQL أو مفاتيح OAuth. ملف `.gitignore` يستبعد `.env` وقواعد البيانات وملفات البناء. نفّذ:

```bash
git init
git add .
git commit -m "Prepare DAR.EST SaaS for local development"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

بعد تنزيل المشروع على جهاز آخر، أنشئ `.env` من `.env.example` وأدخل إعداداته الخاصة. لا تشارك نفس `JWT_SECRET` أو كلمات مرور قاعدة البيانات في مستودع عام.

## أوامر التحقق

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm build
corepack pnpm test
```

## التشغيل النهائي السريع

بعد تنزيل المشروع:

```bash
cp .env.example .env
pnpm install
```

عدّل `JWT_SECRET` داخل `.env`، ثم شغّل MySQL عبر Docker:

```bash
docker compose up -d mysql
pnpm db:push
pnpm dev
```

إذا كان المنفذ `3307` مستخدمًا، اختر منفذًا آخر:

```bash
MYSQL_HOST_PORT=3308 docker compose up -d mysql
sed -i 's/127.0.0.1:3307/127.0.0.1:3308/' .env
pnpm db:push
```

أو استخدم سكربت التشغيل:

```bash
START_MYSQL=1 ./start-local.sh
```

ثم افتح `http://localhost:3000/register` لإنشاء أول حساب، وبعدها `/login`. لتجعل الحساب Owner محليًا، نفّذ بعد إنشاء الحساب:

```bash
docker exec -it dar-est-mysql mysql -udarest -pdarest_local_password darest -e "UPDATE users SET role='admin' WHERE email='YOUR_EMAIL@example.com';"
```

## تشغيل DAR.EST Ollama Agent

المشروع يستخدم **Ollama Cloud** وليس Ollama المحلي مباشرة. وظيفة الوكيل هي مساعد العقارات: البحث داخل البيانات المصرح بها، ترتيب النتائج، وفهم أسئلة المتابعة بالعربية والإنجليزية وغيرها. لا يرسل أسماء العملاء أو أرقامهم أو بيانات الاتصال إلى الخدمة؛ يتم تنقية النص والملخص قبل الإرسال.

1. أنشئ مفتاحًا من [Ollama Cloud API keys](https://ollama.com/settings/keys).
2. أضفه إلى `.env`:

```env
OLLAMA_CLOUD_API_KEY=ضع_المفتاح_هنا
```

3. أعد تشغيل الخادم:

```bash
pnpm dev
```

4. افتح الشركة ثم Sales/Property Advisor واستخدم أسئلة مثل:

```text
رشح لي عقارات متاحة حتى 1000000 جنيه
دول بنفس رينج المساحة؟
اعرضهم مرة أخرى
```

اختبار التكامل الاختياري:

```bash
RUN_OLLAMA_CLOUD_INTEGRATION=true pnpm test -- server/ollamaCloud.integration.test.ts
```

الاختبار يحتاج `OLLAMA_CLOUD_API_KEY` حقيقيًا وإنترنت. الاختبارات العادية لا تحتاج المفتاح:

```bash
pnpm test
```

إذا لم تضف المفتاح، يبقى التطبيق يعمل، لكن إجابات الوكيل المعتمدة على Ollama Cloud ستظهر كغير متاحة. البحث الأساسي المحلي والفلترة لا يتطلبان Ollama Cloud.

## ميزات تحتاج مفاتيح إضافية

رفع الملفات والتفريغ الصوتي وتوليد الصور والخرائط تحتاج `BUILT_IN_FORGE_API_URL` و`BUILT_IN_FORGE_API_KEY`. هذه القيم ليست مطلوبة لتسجيل الدخول أو تشغيل العقارات الأساسي، ولا يجب وضع قيم وهمية لها.

## رفع المشروع إلى GitHub

لا ترفع `.env` أو مفاتيح Ollama أو Forge. نفّذ:

```bash
git init
git branch -M main
git add .
git status
git commit -m "Prepare DAR.EST SaaS for local development"
git remote add origin https://github.com/USERNAME/dar-est-saas.git
git push -u origin main
```

استبدل رابط `origin` برابط مستودعك الحقيقي. ملف `.gitignore` يستبعد البيئة والاعتماديات والبناء وقواعد البيانات.
