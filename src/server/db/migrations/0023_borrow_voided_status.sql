-- Allow voiding mistaken active custody issues (undo) without hard-deleting audit history.
ALTER TYPE "public"."borrow_transaction_status" ADD VALUE IF NOT EXISTS 'voided';
