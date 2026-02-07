-- Migration: Add Cheque to payment_mode check constraint
-- Date: 2025-02-07

-- Drop the existing check constraint for payments table
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_mode_check;

-- Add the new check constraint with Cheque included for payments table
ALTER TABLE payments ADD CONSTRAINT payments_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Online', 'Cheque'));

-- Drop the existing check constraint for payment_transactions table
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_payment_mode_check;

-- Add the new check constraint with Cheque included for payment_transactions table
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_payment_mode_check 
CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Online', 'Cheque'));
