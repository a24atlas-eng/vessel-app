# Что вписать в .env — по порядку

У тебя уже созданы аккаунты в Supabase, Stripe, GitHub, Netlify. Осталось собрать
7 значений и вставить их в Netlify → Environment variables (или в файл .env,
если загружаешь через "Import from a .env file", как обсуждали).

---

## В Supabase нужно донастроить продукты (новая структура таблиц)

1. Зайди в свой проект Supabase → **SQL Editor → New query**.
2. Открой файл `supabase/schema.sql` из этого архива → скопируй **весь текст**
   заново → вставь → Run. Он теперь включает поля для даты фото и годового
   доступа — безопасно перезапустить, если уже запускала раньше версию.
3. Если ещё не создавала bucket для фото: **Storage → New bucket** → имя
   `avatars` → Public → Create → потом в SQL Editor запусти отдельно ту часть
   `schema.sql`, что начинается с `-- PHOTO STORAGE`.

### Ключи (Settings → API):
| Переменная | Где взять |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → General → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API Keys → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API Keys → Secret key |

---

## В Stripe теперь нужно создать ДВА продукта (не один)

1. **Product catalog → Add product**:
   - Name: `Vessel Monthly`
   - Price: **4.99 EUR**, **Recurring**, monthly
   - Save → открой продукт → скопируй **Price ID** → это `STRIPE_PRICE_ID_MONTHLY`

2. **Product catalog → Add product** (второй, отдельный):
   - Name: `Vessel Yearly`
   - Price: **49 EUR**, **One time** (не Recurring!)
   - Save → скопируй **Price ID** → это `STRIPE_PRICE_ID_YEARLY`

3. **Developers → API keys** → Secret key → это `STRIPE_SECRET_KEY`

4. Включи возможность самоотмены подписки:
   **Settings → Billing → Customer portal** → Activate test link (или "Activate"
   в боевом режиме) → просто сохрани настройки по умолчанию, ничего менять не
   обязательно. Это то, что позволяет пользователю самому нажать "отменить
   подписку" без твоего участия.

5. Webhook — это последний шаг, после того как сайт уже будет опубликован
   (там появится финальный адрес). Пока пропусти `STRIPE_WEBHOOK_SECRET`.

---

## Финальный список переменных для Netlify

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_PRICE_ID_MONTHLY=...
STRIPE_PRICE_ID_YEARLY=...
STRIPE_WEBHOOK_SECRET=          (оставь пустым пока)
NEXT_PUBLIC_SITE_URL=           (оставь пустым пока)
```

Вставляешь их в Netlify: **Site settings → Environment variables → Add a
variable → Import from a .env file** (или по одной вручную — оба способа
рабочие).

## После первого деплоя (когда сайт уже открывается по ссылке)

1. Скопируй адрес сайта (`https://xxx.netlify.app` или твой купленный домен)
   → впиши его в `NEXT_PUBLIC_SITE_URL` → Netlify → Trigger deploy.
2. Вернись в Stripe → **Developers → Webhooks → Add endpoint**:
   - URL: `https://ТВОЙ-АДРЕС/api/stripe-webhook`
   - события: `checkout.session.completed`, `customer.subscription.deleted`
   - скопируй **Signing secret** → впиши как `STRIPE_WEBHOOK_SECRET` →
     снова Trigger deploy.

---

## Что теперь умеет сайт (коротко)
- Пользователь видит две кнопки: подписка €4.99/мес или разовая покупка
  €49 на год.
- Для месячной подписки — кнопка "Управлять подпиской / отменить", которая
  открывает официальную страницу Stripe, где человек сам отменяет доступ.
- Годовая покупка не требует отмены — она просто истекает через год
  (дата хранится в базе и проверяется автоматически).
- При загрузке фото рядом фиксируется дата и время сохранения, и появляется
  кнопка "Save and download photo of your avatar" — скачивает текущее фото
  файлом.
