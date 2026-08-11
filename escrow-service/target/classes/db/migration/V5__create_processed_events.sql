CREATE TABLE IF NOT EXISTS processed_events (
    event_id     VARCHAR(100) NOT NULL,
    event_type   VARCHAR(100) NOT NULL,
    processed_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    producer     VARCHAR(100),

    CONSTRAINT pk_processed_events PRIMARY KEY (event_id)
);

CREATE UNIQUE INDEX idx_processed_events_event_id ON processed_events (event_id);
