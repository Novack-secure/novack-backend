-- Migración para agregar campos card_uuid, status y employee_id a la tabla cards
-- Fecha: 2025-11-07

-- Crear el tipo enum para status si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'card_status_enum') THEN
        CREATE TYPE card_status_enum AS ENUM ('active', 'inactive', 'lost', 'damaged', 'assigned', 'available');
    END IF;
END$$;

-- Agregar columna card_uuid (UUID único de la tarjeta NFC/RFID)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_uuid VARCHAR(255);

-- Agregar índice único para card_uuid después de poblarlo
-- (Se hará después de actualizar los datos existentes)

-- Agregar columna status
ALTER TABLE cards ADD COLUMN IF NOT EXISTS status card_status_enum DEFAULT 'active';

-- Agregar columna employee_id (relación con empleados)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS employee_id UUID;

-- Agregar constraint de foreign key para employee_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_cards_employee'
    ) THEN
        ALTER TABLE cards
        ADD CONSTRAINT fk_cards_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE SET NULL;
    END IF;
END$$;

-- Actualizar datos existentes
-- 1. Establecer card_uuid basado en card_number para tarjetas existentes
UPDATE cards
SET card_uuid = card_number
WHERE card_uuid IS NULL;

-- 2. Establecer status basado en is_active para tarjetas existentes
UPDATE cards
SET status = CASE
    WHEN is_active = true THEN 'active'::card_status_enum
    ELSE 'inactive'::card_status_enum
END
WHERE status IS NULL;

-- 3. Si la tarjeta tiene visitor_id, marcarla como 'assigned'
UPDATE cards
SET status = 'assigned'::card_status_enum
WHERE visitor_id IS NOT NULL;

-- Agregar constraint NOT NULL y UNIQUE para card_uuid después de poblar los datos
ALTER TABLE cards ALTER COLUMN card_uuid SET NOT NULL;

-- Agregar índice único para card_uuid
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'cards_card_uuid_unique'
    ) THEN
        CREATE UNIQUE INDEX cards_card_uuid_unique ON cards(card_uuid);
    END IF;
END$$;

-- Agregar índice para employee_id para mejorar performance en queries
CREATE INDEX IF NOT EXISTS idx_cards_employee_id ON cards(employee_id);

-- Agregar índice para status para mejorar performance en queries de filtrado
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

-- Verificar los cambios
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'cards'
AND column_name IN ('card_uuid', 'status', 'employee_id')
ORDER BY column_name;

-- Mostrar estadísticas de las tarjetas
SELECT
    status,
    COUNT(*) as count
FROM cards
GROUP BY status
ORDER BY status;
