# Hive.tn Konnect MVP

Hive.tn now includes an MVP hosted-checkout integration for Konnect on top of the existing React + Express + PostgreSQL stack.

## What this adds

- Authenticated users can support `ACTIVE` campaigns with a custom TND amount
- The backend creates a pending donation record before calling Konnect
- Konnect hosted checkout is initiated through `POST /payments/init-payment`
- Webhooks are stored and re-verified through `GET /payments/:paymentId`
- Campaign funding only increases after a donation is confirmed as `PAID`
- Admin and creator views now reflect real paid donation data

## Setup

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in PostgreSQL settings and your Konnect sandbox credentials
3. Optionally copy `front/.env.example` to `front/.env`
4. Start the backend once so the runtime schema initializer can apply payment changes

## Docs

- Local testing and webhook notes: [KONNECT_TESTING.md](./KONNECT_TESTING.md)
- Konnect API docs used for this MVP:
  - https://docs.konnect.network/docs/en/api-integration/endpoints/initiate-payment
  - https://docs.konnect.network/docs/en/api-integration/endpoints/get-payment-details
  - https://docs.konnect.network/docs/en/api-integration/endpoints/webhook
