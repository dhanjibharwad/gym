-- Create members table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(15) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE CHECK (date_of_birth <= CURRENT_DATE),
    address TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(15),
    profile_photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create membership_plans table
CREATE TABLE IF NOT EXISTS membership_plans (
    id SERIAL PRIMARY KEY,
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    duration_months INTEGER NOT NULL CHECK (duration_months > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES membership_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL CHECK (end_date > start_date),
    trainer_assigned VARCHAR(255),
    batch_time VARCHAR(50) CHECK (batch_time IN ('Morning', 'Evening', 'Flexible')),
    membership_type VARCHAR(100) CHECK (membership_type IN ('Gym Only', 'Gym + Personal Training')),
    locker_required BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'suspended')),
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    membership_id INTEGER REFERENCES memberships(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    paid_amount DECIMAL(10,2) NOT NULL CHECK (paid_amount >= 0),
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Online')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'full', 'refunded')),
    next_due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_payment_amount CHECK (paid_amount <= total_amount)
);

-- Create medical_info table
CREATE TABLE IF NOT EXISTS medical_info (
    id SERIAL PRIMARY KEY,
    member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
    medical_conditions TEXT,
    injuries_limitations TEXT,
    additional_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone_number);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_memberships_member_id ON memberships(member_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_payments_membership_id ON payments(membership_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default membership plans
INSERT INTO membership_plans (plan_name, duration_months, price) VALUES
('Monthly', 1, 1500.00),
('3 Months', 3, 4000.00),
('6 Months', 6, 7500.00),
('1 Year', 12, 14000.00)
ON CONFLICT DO NOTHING;