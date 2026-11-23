# Customa — toothpaste, composed by you

Demo store for custom organic toothpaste (a playful nod to Systema). Customers compose their own
Thai-herb formula, dress it in a paper tube + paper box, write on the Le Labo–style labels, and pay
with Stripe. Staff manage orders and answer chat from `/admin`.

## Run it

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

With no `.env.local` the demo works out of the box:

| Missing | Fallback |
| --- | --- |
| Supabase vars | orders, formulas and chat are stored in `.data/db.json`; chat polls every few seconds |
| Stripe vars | the cart shows "Simulate payment (demo)" (development only — production refuses) |
| `ADMIN_PASSWORD` | `/admin` password is `customa` (development only) |

## Pages

| Route | What |
| --- | --- |
| `/` | 3D scroll story: paper tube spins → splits → 12 botanicals orbit with labels → tube reassembles → kraft box rises and folds shut |
| `/compose` | composer with live 3D tube/box preview — herbs ×3 strengths, boosters, size, tube paper + cap, box shape (tuck / sleeve / cylinder) + paper, label text |
| `/quiz` | 5 questions → recommended formula → open in composer |
| `/cart` | one-time or refill every 2/3 months (−10%), tube return (−฿20), Stripe Checkout |
| `/order/success` | confirms the Checkout Session with Stripe (works without a webhook) |
| `/account` | Sign in with Google → orders + timelines, refills (stop/resume), saved formulas, support |
| `/track` | order number + email → status steps, timeline, tracking number (guests) |
| `/f/[slug]` | shared formula (recipe only — personal label text is stripped) |
| `/admin` | lab console: stats, order list/filter/search, compounding sheet with % and grams, status + tracking + timeline notes, support inbox with quick replies |

## Supabase

1. Create a project → **SQL Editor** → run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
2. Copy **Project URL**, **anon key** and **service_role key** into `.env.local` (see `.env.example`).
3. Realtime → make sure *public* Broadcast channels are allowed (default for new projects).

Security model: RLS is on for every table with **no policies**, so the browser's anon key can't read
or write data. All reads/writes go through Next.js API routes with the service-role key. Live chat
uses Realtime **Broadcast**; a customer's channel name contains a random per-thread secret, and the
admin inbox channel name is derived from the server secret.

## Customer accounts (Sign in with Google)

Accounts use Supabase Auth with the Google provider (needs the Supabase vars above).

1. SQL Editor → run [`supabase/migrations/0002_accounts.sql`](supabase/migrations/0002_accounts.sql)
   (links orders/chats to users, adds `saved_formulas`).
2. Google Cloud → Google Auth Platform: create an OAuth client (*Web application*)
   - Authorized JavaScript origin: your site, e.g. `http://localhost:3100`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - While the app is in *Testing*, add test users (or publish the app).
3. Supabase → Authentication → Sign In / Providers → Google: enable, paste Client ID + Secret.
4. Supabase → Authentication → URL Configuration: Site URL = your site; add `<site>/**` to Redirect URLs.

`/account` then shows the customer's orders (including earlier guest orders with the same email),
refills they can stop/resume (Stripe `cancel_at_period_end`), saved formulas and support chat.
Guests can still check out and track orders at `/track`. Account API routes verify the Supabase
access token on every call (`Authorization: Bearer …`).

## Stripe (test mode)

```bash
# .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# forward webhooks (needed for refill renewals; first payment is also confirmed on the success page)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# put the printed whsec_... into STRIPE_WEBHOOK_SECRET
```

Pay with `4242 4242 4242 4242`, any future date, any CVC. Prices are THB and are always recomputed
on the server from `src/lib/catalog.ts`; whatever the browser sends as a price is ignored.
Refill items become a Stripe subscription (`month × 2` or `× 3`); every `invoice.paid` renewal creates
a new paid order linked to the original one.

## Code map

```
src/lib/catalog.ts      herbs, bases, boosters, papers, box shapes, prices
src/lib/formula.ts      formula type, pricing, validation, paste colour, taste profile
src/lib/label.ts        canvas drawing of paper + Le Labo–style labels (used by 3D textures)
src/lib/db.ts           data layer: Supabase or local JSON
src/lib/server.ts       Stripe client, admin session cookie (HMAC), realtime broadcast
src/components/three/   procedural paper tube, folding boxes, herbs, live textures
src/components/hero/    scroll-driven hero (GSAP ScrollTrigger + Lenis + R3F)
src/components/compose/ composer UI + live preview
src/components/admin/   lab console
```

Everything 3D is procedural (no model files), so the first paint stays light. The one exception is
the finale portrait, served from `public/images/smile-bow.jpg` (a stock photo supplied for the
demo — check its licence before using it outside a demo). To use a different photo, change `PHOTO`
in `src/components/three/Smile.tsx` (aspect, teeth centre in uv, teeth width/height) so the brushing
lines up.
