--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS validators (
  val_index INTEGER PRIMARY KEY,
  val_group TEXT,
  enabled_epoch INTEGER DEFAULT 0,
  check_started INTEGER DEFAULT 0,
  in_doppelganger BOOL DEFAULT FALSE,
  started_vc BOOL DEFAULT FALSE
);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP INDEX validators;