-- =============================================================================
-- Seed 004: Cuentas de Alumnos de prueba oficiales para PsiGestor (Desarrollo Local)
-- =============================================================================

-- 1. Alumna de prueba: Ana Lopez Hernandez
INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    student_id,
    is_active
)
SELECT
    'ana.lopez@itescam.edu.mx',
    'scrypt:32768:8:1$VElecOKIffMmz4Kk$20cc66b5516bd383b41694ffc5591473d01c5c3df106c50c058e1f32b5c7d4c231ac1b30de456353914aa5da1486b0a4f87861b10fc22d605a746791ae31c8b7',
    'Ana Lopez Hernandez',
    'alumno',
    s.id,
    TRUE
FROM students s
WHERE s.student_id = 'TEST2026001'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'ana.lopez@itescam.edu.mx'
  );

-- 2. Alumno de prueba: Estudiante Ficticio Siete
INSERT INTO users (
    email,
    password_hash,
    name,
    role,
    student_id,
    is_active
)
SELECT
    'alumno.prueba@itescam.edu.mx',
    'scrypt:32768:8:1$VElecOKIffMmz4Kk$20cc66b5516bd383b41694ffc5591473d01c5c3df106c50c058e1f32b5c7d4c231ac1b30de456353914aa5da1486b0a4f87861b10fc22d605a746791ae31c8b7',
    'Estudiante Ficticio Siete',
    'alumno',
    s.id,
    TRUE
FROM students s
WHERE s.student_id = 'TEST2026007'
  AND NOT EXISTS (
      SELECT 1 FROM users u WHERE u.email = 'alumno.prueba@itescam.edu.mx'
  );
