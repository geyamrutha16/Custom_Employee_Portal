ALTER TABLE zoho_tokens
  ADD COLUMN user_id INT NULL AFTER id,
  ADD CONSTRAINT fk_zoho_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  ADD INDEX idx_zoho_tokens_user (user_id);

ALTER TABLE zoho_tokens
  DROP INDEX uq_zoho_tokens_app_name,
  ADD UNIQUE KEY uq_zoho_tokens_user_app (user_id, app_name);
