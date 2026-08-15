# Vessel — каркас проекта

Личный кабинет с логином, лимитом "3 бесплатно / unlimited по подписке" и оплатой через Stripe.
Стек: Next.js (код и сайт) + Supabase (аккаунты и база данных) + Stripe (оплата) + Netlify (хостинг и домен).

## Шаг 1. Supabase (аккаунты + база данных)
1. Зайти на supabase.com → New Project (бесплатный тариф).
2. Project Settings → API → скопировать `Project URL`, `anon public key`, `service_role key`.
3. SQL Editor → New query → вставить содержимое `supabase/schema.sql` → Run.
   Это создаёт таблицы profiles/core_programs/goals и настраивает защиту:
   каждый пользователь видит и редактирует только свои данные.

## Шаг 2. Stripe (оплата)
1. Зайти на stripe.com → создать аккаунт.
2. Products → Add product → например "Vessel Premium", цена ежемесячная (например $4.99/мес) → Save.
   Скопировать `Price ID` (начинается на `price_...`).
3. Developers → API keys → скопировать `Secret key`.
4. Developers → Webhooks → Add endpoint:
   - URL: `https://ТВОЙ-ДОМЕН/api/stripe-webhook` (добавишь после деплоя на Netlify)
   - Событие: `checkout.session.completed`, `customer.subscription.deleted`
   - Скопировать `Signing secret`.

## Шаг 3. GitHub
1. Создать пустой репозиторий на github.com.
2. Загрузить туда все файлы из этой папки (кроме `.env` — его быть не должно в репозитории).

## Шаг 4. Netlify (хостинг + домен)
1. Зайти на netlify.com → Add new site → Import from Git → выбрать репозиторий.
2. Build settings подхватятся из `netlify.toml` автоматически.
3. Site settings → Environment variables → добавить все переменные из `.env.example`
   (значения — те, что скопировала на шагах 1–2). `NEXT_PUBLIC_SITE_URL` — это будет
   твой будущий Netlify-адрес или купленный домен.
4. Deploy site.
5. Domain management → Add a domain → Buy a new domain — купить и подключить домен
   прямо в Netlify (DNS и HTTPS настроятся автоматически).
6. Вернуться в Stripe webhook (шаг 2.4) и вписать финальный URL с доменом.

## Как работает лимит "3 бесплатно"
В `pages/dashboard.js` перед добавлением новой "программы" или "цели" проверяется
`subscription_status` профиля. Если `free` и элементов уже 3 — показывается предложение
оформить подписку (`goCheckout`), которое открывает Stripe Checkout.
После оплаты вебхук (`pages/api/stripe-webhook.js`) сам ставит `subscription_status = active`.

## Что нужно доделать под себя
- Заменить нейтральный текст/цвета на финальный дизайн (можно взять готовый визуал
  из прошлых прототипов и картинки, которые ты сгенерировала).
- Добавить сами изображения аватаров в `public/` и подключить в dashboard.js.
- Локально проверить: `npm install`, затем `npm run dev` (нужен `.env.local` с теми
  же переменными).
