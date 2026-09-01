-- Make visit_actions.action_id nullable — fees.action_id is already nullable,
-- and some fees have no corresponding action record.
ALTER TABLE visit_actions ALTER COLUMN action_id DROP NOT NULL;
