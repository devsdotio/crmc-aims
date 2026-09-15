-- Allow free-text "Other" category labels on project misc expenses.
DO $$ BEGIN
  ALTER TYPE "project_expense_category" ADD VALUE 'other';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
