-- Insert Super Admin
-- Note: Replace the password hash below with a bcrypt hash of your desired password
-- You can generate a bcrypt hash using: https://bcrypt-generator.com/ (use 10 rounds)
-- Or run: node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your_password', 10).then(console.log);"

INSERT INTO public.super_admins (email, password, name, phone, is_active)
VALUES (
    '<your_email@example.com>',  -- Replace with actual email
    '<bcrypt_hashed_password>',   -- Replace with bcrypt hash
    '<Super Admin Name>',          -- Replace with actual name
    '<phone_number>',              -- Replace with phone or NULL
    true
)
ON CONFLICT (email) DO NOTHING;
