# Vessel — подробная инструкция, что и куда

У тебя есть архив `vessel-app.zip`. Внутри — код всего сайта. Разархивируй его
(двойной клик на zip, или "Извлечь всё") — получится папка `vessel-app` с файлами.

Важно понять главное: **эти файлы не нужно "открывать" по одному вручную**.
Их нужно один раз целиком загрузить в GitHub, а дальше Netlify сам возьмёт их
оттуда и соберёт сайт. Ты не редактируешь файлы построчно — только вставляешь
несколько ключей/паролей в нужные места (шаги ниже).

---

## ШАГ 1. Supabase — база данных, аккаунты, фото

1. supabase.com → создать проект (ты уже это делаешь).
2. Когда проект создан, слева в меню открой **SQL Editor** → **New query**.
3. Открой файл `vessel-app/supabase/schema.sql` в любом текстовом редакторе
   (Блокнот / TextEdit подойдут), скопируй **весь текст**, вставь в окно
   SQL Editor в Supabase → нажми **Run**.
   → Это создаёт таблицы для профилей, целей и качеств.

### 1b. Хранилище для фото
1. Слева в меню Supabase открой **Storage** → **New bucket**.
2. Название бакета: `avatars` (именно так, строчными буквами).
3. Включи **Public bucket** → Create.
4. Вернись в **SQL Editor** → New query → скопируй только нижнюю часть
   файла `schema.sql` (раздел, который начинается с `-- PHOTO STORAGE`)
   → Run. Это разрешает каждому пользователю загружать только свои фото.

### 1c. Скопировать ключи
Слева: **Project Settings → API**. Тебе нужны три значения — скопируй их
куда-то (например, в заметки), они понадобятся на шаге 4:
- `Project URL`
- `anon public` key
- `service_role` key (⚠️ секретный, никому не показывай и не публикуй)

---

## ШАГ 2. Stripe — оплата подписки $4.99/мес

1. stripe.com → создать аккаунт.
2. **Product catalog → Add product**:
   - Name: Vessel Premium
   - Price: 4.99 USD, recurring, monthly
   - Save → открой созданный продукт → скопируй **Price ID** (вид `price_1AbC...`)
3. **Developers → API keys** → скопируй **Secret key** (вид `sk_live_...` или `sk_test_...`).
4. **Developers → Webhooks → Add endpoint** — этот шаг доделаешь на шаге 5,
   после того как появится адрес сайта. Пока просто запомни, что сюда нужно
   будет вернуться.

---

## ШАГ 3. GitHub — куда загружаются файлы кода

1. github.com → зарегистрируйся, если нет аккаунта.
2. **New repository** → назови, например, `vessel-app` → Create repository
   (оставь его приватным, если не хочешь, чтобы код был виден всем).
3. На странице пустого репозитория нажми **"uploading an existing file"**.
4. Открой на компьютере разархивированную папку `vessel-app`, выдели **все
   файлы и папки внутри неё** (не саму папку vessel-app, а её содержимое:
   `pages`, `lib`, `supabase`, `package.json`, `netlify.toml`, `.env.example`,
   `README.md`) → перетащи их в окно загрузки на GitHub.
5. Внизу нажми **Commit changes**.

Теперь весь код лежит в твоём GitHub-репозитории — это то место, откуда
Netlify будет брать код для сайта.

---

## ШАГ 4. Netlify — сборка сайта

1. netlify.com → войти (можно через GitHub-аккаунт, это удобнее всего).
2. **Add new site → Import an existing project → Deploy with GitHub**
   → выбери репозиторий `vessel-app`.
3. Настройки сборки подхватятся сами (из `netlify.toml`). Ничего не меняй,
   просто прокрути вниз.
4. **Не нажимай Deploy сразу** — сначала добавь переменные окружения:
   **Site settings → Environment variables → Add a variable**, и добавь по
   одной штуке — всего 7 переменных (названия точно такие же, как в файле
   `.env.example`):

   | Переменная | Откуда взять |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project URL (шаг 1c) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon public key (шаг 1c) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role key (шаг 1c) |
   | `STRIPE_SECRET_KEY` | Stripe → Secret key (шаг 2.3) |
   | `STRIPE_PRICE_ID` | Stripe → Price ID (шаг 2.2) |
   | `STRIPE_WEBHOOK_SECRET` | появится на шаге 5 (пока оставь пустым) |
   | `NEXT_PUBLIC_SITE_URL` | появится после первого деплоя, впишешь его следующим шагом |

5. Нажми **Deploy site**. Через 1–2 минуты появится ссылка вида
   `https://random-name-12345.netlify.app` — это уже рабочий сайт.
6. Скопируй эту ссылку → вернись в Environment variables → впиши её в
   `NEXT_PUBLIC_SITE_URL` → **Trigger deploy** ещё раз (Deploys → Trigger deploy
   → Deploy site), чтобы изменение применилось.

---

## ШАГ 5. Домен + завершение Stripe

1. В Netlify: **Domain management → Add a domain → Buy a new domain** —
   выбери и купи домен прямо здесь.
2. Когда домен подключится (обычно быстро), обнови `NEXT_PUBLIC_SITE_URL`
   на новый домен (так же как в шаге 4.6).
3. Вернись в Stripe → **Developers → Webhooks → Add endpoint**:
   - URL: `https://ТВОЙ-ДОМЕН/api/stripe-webhook`
   - события: `checkout.session.completed`, `customer.subscription.deleted`
   - Add endpoint → скопируй **Signing secret** → впиши в Netlify как
     `STRIPE_WEBHOOK_SECRET` → снова Trigger deploy.

---

## Всё. Как проверить, что работает
1. Открой свой домен → должна открыться главная страница.
2. Зарегистрируйся → попади в личный кабинет.
3. Добавь 3 "цели" — четвёртая должна предложить оформить подписку.
4. Загрузи фото — оно должно сохраниться и показываться при следующем входе.

Если на каком-то шаге появится ошибка — пришли скриншот, разберём вместе.
