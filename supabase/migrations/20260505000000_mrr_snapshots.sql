CREATE TABLE IF NOT EXISTS mrr_snapshots (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT        NOT NULL,
  month         DATE        NOT NULL,
  amount        NUMERIC     NOT NULL DEFAULT 0,
  clients_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, month)
);
