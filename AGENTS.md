# Payment service instructions

## Ownership

Own payment customers/instruments as provider references, virtual accounts, collections, transfers, beneficiaries, provider routing, fees, webhooks, reconciliation and payment inbox/outbox state. Own only the `parc_payment` database.

## Domain rules

- Payment initiation and webhook processing are idempotent. Enforce unique provider references and internal idempotency keys.
- Authenticate webhook origin using the provider's approved signature scheme; validate timestamps/replay protection when supported. Persist a safe receipt before asynchronous processing.
- Model payment state transitions explicitly; reject impossible or regressive transitions unless a documented provider correction flow permits them.
- Never store CVV, PIN, full card track data or provider secrets. Tokenize instruments and minimize account data.
- Do not mark accounting complete merely because a provider says success. Request ledger posting and track/reconcile the resulting reference.
- Fees and revenue shares must be versioned/effective-dated and calculated with exact arithmetic.

## Database and delivery

- Canonical migrations: `db/migrations/`; generated snapshot: `db/schema/current.sql`.
- Test duplicate/out-of-order webhooks, timeout with unknown provider outcome, retries, concurrent processing, reversals/refunds, reconciliation, tenant isolation and ledger failure.
- Contract changes must include provider mapping and backward-compatibility considerations.
