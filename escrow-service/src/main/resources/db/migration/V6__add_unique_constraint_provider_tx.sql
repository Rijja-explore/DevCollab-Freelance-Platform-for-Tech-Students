-- Add UNIQUE constraint to provider_transaction_id in transactions table
ALTER TABLE transactions
    ADD CONSTRAINT uq_transactions_provider_tx_id UNIQUE (provider_transaction_id);
