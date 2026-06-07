-- Add columns to tool_account_credentials table for SSH-specific credentials
ALTER TABLE tool_account_credentials
ADD COLUMN IF NOT EXISTS encrypted_private_key text,
ADD COLUMN IF NOT EXISTS encrypted_private_key_passphrase text,
ADD COLUMN IF NOT EXISTS encrypted_password text,
ADD COLUMN IF NOT EXISTS encrypted_sudo_password text;
