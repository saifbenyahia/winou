# Konnect Local Testing

## Environment

Backend:

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in:
   - `KONNECT_API_KEY`
   - `KONNECT_BASE_URL`
   - `KONNECT_RECEIVER_WALLET_ID`
   - `KONNECT_WEBHOOK_URL`
   - `KONNECT_SUCCESS_URL`
   - `KONNECT_FAIL_URL`
   - `FRONTEND_URL`
   - `BACKEND_URL`

Frontend:

1. Copy `front/.env.example` to `front/.env`
2. Confirm `VITE_API_URL=http://localhost:5000`

Recommended sandbox base URL from current Konnect docs:

- `https://api.sandbox.konnect.network/api/v2`

## Start the app

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd front
npm install
npm run dev
```

## Database notes

- The backend runtime schema initializer adds or upgrades:
  - `campaigns.current_amount`
  - `donations`
  - `payment_webhook_events`
- On an existing database, the initializer also backfills `current_amount` from legacy paid pledges plus paid donations.
- On a fresh database, you can apply `schema.sql` first and then start the backend.

## MVP payment flow

1. Make sure the campaign is `ACTIVE`
2. Sign in as a normal user
3. Open a campaign details page
4. Enter a TND amount and click `Contribuer avec Konnect`
5. Hive.tn creates a pending donation row and requests a Konnect hosted checkout session
6. The browser redirects to Konnect `payUrl`
7. Konnect calls the backend webhook with `payment_ref`
8. Hive.tn fetches payment details from Konnect and finalizes the donation idempotently
9. The campaign funding only increases once, when the donation becomes `PAID`

## Webhook behavior

- Endpoint: `GET /api/payments/konnect/webhook`
- Konnect sends `payment_ref` as a query parameter
- Hive.tn stores the webhook event, then calls `GET /payments/:paymentId` on Konnect
- The webhook alone is never treated as proof of payment
- Duplicate webhooks are safe because the donation row is locked and the campaign amount is only incremented on the first transition to `PAID`

## Status refresh when webhook is not reachable

If your local machine is not publicly reachable, the frontend can still refresh the payment status manually.

Available status endpoints:

- `GET /api/payments/konnect/status/:paymentRef`
- `GET /api/payments/konnect/status?donation_id=...`
- `GET /api/payments/konnect/status?order_id=...`

Practical local-dev fallback:

1. Complete the hosted payment on Konnect
2. Open `/payment/success`
3. Hive.tn will try to verify using the stored `payment_ref`
4. If the payment is still pending, click `Relancer la verification`

You can also hit the backend manually:

```bash
curl http://localhost:5000/api/payments/konnect/status/<payment_ref>
```

## Sandbox assumptions

- This MVP assumes one-time `immediate` TND payments only
- Amounts are sent in millimes
- Konnect sandbox credentials and wallet IDs are configured correctly
- Success and failure redirect URLs are wired for best-effort UX, but backend verification remains the source of truth

## Phase-1 limitations

- Authenticated donations only
- No recurring payments
- No reward claim / fulfillment flow
- No refunds
- No milestone release or escrow flow
- No multi-provider abstraction beyond the Konnect-ready donation model
