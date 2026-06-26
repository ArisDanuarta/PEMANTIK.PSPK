-- Menambahkan nilai enum 'feedback' ke tipe log_source

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'log_source') 
    AND enumlabel = 'feedback'
  ) THEN
    ALTER TYPE log_source ADD VALUE 'feedback';
  END IF;
END $$;
