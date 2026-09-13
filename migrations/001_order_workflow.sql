-- Atlasio order workflow foundation.
-- The API also applies these changes idempotently for existing deployments.

ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS confirmation_status VARCHAR(32) NOT NULL DEFAULT 'pending';
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_result VARCHAR(32) NOT NULL DEFAULT 'not_contacted';
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS contact_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS shipment_status VARCHAR(32) NOT NULL DEFAULT 'not_ready';
ALTER TABLE atlasio_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(32) NOT NULL DEFAULT 'cash_on_delivery';

CREATE TABLE IF NOT EXISTS atlasio_order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  event_type VARCHAR(64) NOT NULL,
  from_value VARCHAR(64),
  to_value VARCHAR(64),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS atlasio_order_events_order_id_idx
  ON atlasio_order_events (order_id, created_at DESC);
