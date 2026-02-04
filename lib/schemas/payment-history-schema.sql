-- Enhanced payment history schema - works with existing payments table
-- Create payment_transactions table for detailed payment history
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    membership_id INTEGER REFERENCES memberships(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('membership_fee', 'renewal', 'additional_payment', 'refund', 'penalty')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Online')),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    receipt_number VARCHAR(100) UNIQUE,
    created_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create member_payment_summary table for quick access to payment totals
CREATE TABLE IF NOT EXISTS member_payment_summary (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE UNIQUE,
    total_paid DECIMAL(10,2) DEFAULT 0 CHECK (total_paid >= 0),
    total_pending DECIMAL(10,2) DEFAULT 0 CHECK (total_pending >= 0),
    last_payment_date TIMESTAMP,
    last_payment_amount DECIMAL(10,2) DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_transactions_member_id ON payment_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_date ON payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_member_payment_summary_member_id ON member_payment_summary(member_id);

-- Create trigger to update member_payment_summary
CREATE OR REPLACE FUNCTION update_member_payment_summary()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO member_payment_summary (
        member_id, total_paid, total_pending, last_payment_date, last_payment_amount, payment_count
    )
    SELECT 
        NEW.member_id,
        COALESCE(SUM(CASE WHEN payment_status = 'completed' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0),
        MAX(CASE WHEN payment_status = 'completed' THEN transaction_date END),
        (SELECT amount FROM payment_transactions WHERE member_id = NEW.member_id AND payment_status = 'completed' ORDER BY transaction_date DESC LIMIT 1),
        COUNT(*)
    FROM payment_transactions WHERE member_id = NEW.member_id
    ON CONFLICT (member_id) DO UPDATE SET
        total_paid = EXCLUDED.total_paid,
        total_pending = EXCLUDED.total_pending,
        last_payment_date = EXCLUDED.last_payment_date,
        last_payment_amount = EXCLUDED.last_payment_amount,
        payment_count = EXCLUDED.payment_count,
        updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_member_payment_summary_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_member_payment_summary();

CREATE TRIGGER update_member_payment_summary_updated_at 
    BEFORE UPDATE ON member_payment_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();