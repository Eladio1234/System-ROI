-- ====================================================================
-- ESQUEMA DE BASE DE DATOS: SISTEMA ROI (DECISION SUPPORT SYSTEM)
-- Compatible con PostgreSQL y Supabase
-- ====================================================================

-- 1. Tabla de Canales de Marketing (Catálogo Maestro)
CREATE TABLE IF NOT EXISTS canales_marketing (
    id SERIAL PRIMARY KEY,
    nombre_canal VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserción de canales iniciales requeridos por el algoritmo
INSERT INTO canales_marketing (id, nombre_canal) VALUES
    (1, 'Redes Sociales'),
    (2, 'Televisión'),
    (3, 'Radio')
ON CONFLICT (id) DO UPDATE SET nombre_canal = EXCLUDED.nombre_canal;

-- 2. Tabla de Campañas
CREATE TABLE IF NOT EXISTS campanas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre_campana VARCHAR(255) NOT NULL,
    fecha_inicio DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'Completada',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Rendimiento por Canal (Métricas de Desempeño)
CREATE TABLE IF NOT EXISTS rendimiento_canales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_campana UUID NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
    id_canal INT NOT NULL REFERENCES canales_marketing(id) ON DELETE RESTRICT,
    inversion NUMERIC(12, 2) NOT NULL CHECK (inversion >= 0),
    ganancia NUMERIC(12, 2) NOT NULL CHECK (ganancia >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Auditoría / Historial de Simulaciones
CREATE TABLE IF NOT EXISTS historial_simulaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL,
    presupuesto_ingresado NUMERIC(14, 2) NOT NULL CHECK (presupuesto_ingresado > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices recomendados para optimización de consultas analíticas
CREATE INDEX IF NOT EXISTS idx_rendimiento_canal ON rendimiento_canales(id_canal);
CREATE INDEX IF NOT EXISTS idx_rendimiento_campana ON rendimiento_canales(id_campana);
CREATE INDEX IF NOT EXISTS idx_simulaciones_usuario ON historial_simulaciones(id_usuario);
