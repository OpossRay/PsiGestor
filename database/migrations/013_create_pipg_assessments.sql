-- =============================================================================
-- Migracion 012: Evaluaciones P-IPG de Gordon
-- Una unica evaluacion por estudiante.
-- Las evaluaciones completadas son inmutables.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pipg_assessments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    direct_scores JSONB,
    percentile_scores JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pipg_assessment_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE RESTRICT,

    CONSTRAINT pipg_assessment_status_check
        CHECK (status IN ('in_progress', 'completed')),

    CONSTRAINT pipg_assessment_completion_check
        CHECK (
            (status = 'in_progress' AND completed_at IS NULL)
            OR
            (status = 'completed' AND completed_at IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_pipg_assessments_status
ON pipg_assessments(status);

CREATE OR REPLACE FUNCTION prevent_completed_pipg_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'completed' THEN
        RAISE EXCEPTION
            'Una evaluacion P-IPG completada no puede modificarse ni eliminarse.';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.student_id <> OLD.student_id THEN
        RAISE EXCEPTION
            'La evaluacion P-IPG no puede cambiar de estudiante.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_completed_pipg_changes
ON pipg_assessments;

CREATE TRIGGER trg_prevent_completed_pipg_changes
BEFORE UPDATE OR DELETE ON pipg_assessments
FOR EACH ROW
EXECUTE FUNCTION prevent_completed_pipg_changes();
