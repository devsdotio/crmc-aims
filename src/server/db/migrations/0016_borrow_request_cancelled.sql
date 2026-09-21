-- Allow requesters to cancel pending borrow requests
ALTER TYPE "public"."borrow_request_status" ADD VALUE IF NOT EXISTS 'cancelled';
