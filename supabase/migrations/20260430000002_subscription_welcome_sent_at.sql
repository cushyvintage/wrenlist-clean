-- Track when we sent the subscription welcome email so duplicate Stripe
-- webhook deliveries (Stripe retries on non-2xx) don't double-send.

alter table profiles
  add column if not exists subscription_welcome_sent_at timestamptz;

comment on column profiles.subscription_welcome_sent_at is 'When the subscription welcome email was sent. Used by the Stripe webhook to dedupe sends across duplicate checkout.session.completed deliveries.';
