BEGIN;

DO $$
DECLARE
  category_udt text;
BEGIN
  SELECT c.udt_name
  INTO category_udt
  FROM information_schema.columns c
  WHERE c.table_schema = current_schema()
    AND c.table_name = 'store_expenses'
    AND c.column_name = 'category';

  IF category_udt IS NOT NULL AND category_udt <> 'text' THEN
    EXECUTE 'ALTER TABLE public.store_expenses ALTER COLUMN category TYPE text USING category::text';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.expense_category_options (
  id text NOT NULL,
  "orgId" text NOT NULL,
  name text NOT NULL,
  "colorKey" text NOT NULL DEFAULT 'default',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT expense_category_options_pkey PRIMARY KEY (id),
  CONSTRAINT expense_category_options_orgid_fkey FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS expense_category_options_orgid_name_key
  ON public.expense_category_options ("orgId", name);

CREATE INDEX IF NOT EXISTS expense_category_options_orgid_idx
  ON public.expense_category_options ("orgId");

INSERT INTO public.expense_category_options (id, "orgId", name, "colorKey")
SELECT
  gen_random_uuid()::text,
  org.id,
  defaults.name,
  defaults."colorKey"
FROM public.organizations org
CROSS JOIN (
  VALUES
    ('Rent', 'blue'),
    ('Electricity', 'gold'),
    ('Employee Salary', 'green'),
    ('Cleaning', 'cyan'),
    ('Miscellaneous', 'default'),
    ('Stationery', 'purple')
) AS defaults(name, "colorKey")
ON CONFLICT ("orgId", name) DO NOTHING;

COMMIT;