-- Idempotente: init_db.py ejecuta las migraciones al arrancar.
ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS attendance_result VARCHAR(16),
    ADD COLUMN IF NOT EXISTS closure_notes TEXT,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_by INTEGER REFERENCES users(id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'appointments_attendance_result_check'
    ) THEN
        ALTER TABLE appointments ADD CONSTRAINT appointments_attendance_result_check
            CHECK (attendance_result IS NULL OR attendance_result IN ('Attended', 'NoShow'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_closed_at ON appointments(closed_at)
WHERE closed_at IS NOT NULL;

-- Un cierre es definitivo, aun si alguna ruta de Sprint anterior intenta
-- actualizar la cita. Las verificaciones en UI no bastan.
CREATE OR REPLACE FUNCTION hu53_block_closed_appointment_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.closed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Una cita cerrada no admite modificaciones ni eliminación.';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS hu53_appointments_immutable ON appointments;
CREATE TRIGGER hu53_appointments_immutable
BEFORE UPDATE OR DELETE ON appointments
FOR EACH ROW EXECUTE FUNCTION hu53_block_closed_appointment_changes();

-- La disponibilidad vinculada a una cita cerrada tampoco puede liberarse
-- o reprogramarse desde endpoints antiguos, si el intervalo coincide.
CREATE OR REPLACE FUNCTION hu53_block_closed_availability_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM appointments a
        WHERE a.closed_at IS NOT NULL
          AND a.date = OLD.date
          AND a.start_time = OLD.start_time
          AND a.end_time = OLD.end_time
    ) THEN
        RAISE EXCEPTION 'El horario pertenece a una cita ya cerrada.';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS hu53_availabilities_closed_immutable ON availabilities;
CREATE TRIGGER hu53_availabilities_closed_immutable
BEFORE UPDATE OR DELETE ON availabilities
FOR EACH ROW EXECUTE FUNCTION hu53_block_closed_availability_changes();
