# Reglas y Criterios Permanentes de Desarrollo para PsiGestor

Este documento define los estándares arquitectónicos, de calidad de código, interfaces y flujo de trabajo obligatorios y permanentes para cualquier desarrollo o modificación en **PsiGestor**.

---

## 1. Arquitectura y Organización

- **Arquitectura Modular (Feature-Based):**
  - Cada funcionalidad debe contar con su propio módulo o carpeta (`features/<feature-name>/`).
  - Separación estricta de responsabilidades entre componentes, servicios, modelos e interfaces.
- **Separación de Archivos:**
  - Cada componente debe contar obligatoriamente con sus tres archivos independientes: `.ts` (lógica), `.html` (estructura/presentación) y `.scss` (estilos).
- **Tamaño de Componentes:**
  - Evitar componentes o archivos monolíticos o excesivamente extensos. Ningún archivo de vista debe concentrar múltiples responsabilidades ni cientos de líneas de lógica ajena a su presentación.
- **Componentes Reutilizables:**
  - Extraer tarjetas, barras de navegación, modales, métricas y controles repetitivos a componentes standalone reutilizables cuando aporten claridad y valor.
- **Rol de las Páginas Contenedoras (e.g. `PsicologoPage`):**
  - Debe actuar únicamente como un contenedor y coordinador de alto nivel de rutas, datos generales y navegación; nunca concentrar lógica de formularios, calendarios o modales en su interior.

---

## 2. Código Limpio y Buenas Prácticas (Clean Code & SOLID)

- **Principios SOLID:**
  - Responsabilidad Única (SRP): cada componente, servicio y método debe tener una sola razón para cambiar.
  - Inversión de Dependencias: inyectar servicios reutilizables.
- **Principio DRY:**
  - Evitar duplicar código, transformaciones de fecha/hora, modelos o lógica de negocio.
- **Claridad y Nombres Descriptivos:**
  - Nombres explícitos para variables, métodos, componentes, `@Input` y `@Output`.
- **Estructura y Extensión de Métodos:**
  - Métodos cortos, con propósitos específicos y evitando anidaciones innecesarias de `if/else`.
- **Tipado Fuerte en TypeScript:**
  - Uso estricto de interfaces y modelos (`Availability`, `Student`, `User`, etc.).
  - Prohibido abusar de `any`. Si un tipo no existe o es externo, tiparlo con una interfaz clara.
- **Higiene de Código:**
  - Eliminar código muerto, métodos obsoletos, imports huérfanos y variables sin utilizar.
  - Mantener coherencia con las convenciones ya establecidas en el proyecto.

---

## 3. Diseños e Interfaces de Usuario (Figma & UX)

- **Fidelidad Estricta a Figma:**
  - Respetar colores institucionales (e.g. `#0F2942`, `#0284C7`), tipografías, bordes redondeados, sombras, espaciados y estados visuales del diseño aprobado.
- **Consistencia Visual:**
  - Mantener la misma identidad visual en todas las pantallas (botones primarios, badges de estado, avatars, cabeceras oscuras).
- **Reutilización:**
  - Usar los componentes compartidos ya creados (`HeaderDarkComponent`, `BottomNavComponent`, etc.).
- **Diseño Mobile-First Responsivo:**
  - Interfaces fluidas, sin desbordamientos horizontales, adaptadas para interacción táctil en dispositivos móviles.
- **Prohibición de Alteraciones Arbitrarias:**
  - No modificar ni simplificar pantallas o flujos aprobados sin autorización explícita del usuario.

---

## 4. Backend, API y Base de Datos

- **Arquitectura de Backend Compartido:**
  - Un único backend en Flask (`backend/`) y una única base de datos PostgreSQL (`database/`) compartidos por la app web (`frontend/`) y la app móvil (`mobile/`).
- **Contratos de API Intactos:**
  - No modificar endpoints, métodos HTTP, parámetros, estructuras JSON de solicitud/respuesta ni mecanismos de autenticación sin autorización previa.
- **Reutilización de Servicios:**
  - Reutilizar `CalendarService`, `AuthService` y servicios existentes manteniendo sus contratos.
- **No Duplicar Lógica del Backend:**
  - Las reglas de negocio, validaciones cruzadas y persistencia residen en el backend. El cliente no debe duplicar lógica de negocio compleja que pertenece al servidor.
- **Aislamiento de Entornos:**
  - Cuando una tarea esté delimitada a `mobile/`, está terminantemente prohibido alterar archivos de `frontend/`, `backend/` o `database/`.

---

## 5. Flujo de Trabajo Obligatorio

### Antes de Programar:
1. **Análisis Profundo:** Inspeccionar el código y arquitectura existente, revisando componentes y dependencias.
2. **Identificación:** Identificar qué componentes atómicos, modales y servicios intervienen.
3. **Propuesta Estructurada:** Planear la separación modular antes de escribir código.
4. **Mínimo Impacto:** Tocar únicamente los archivos indispensables.

### Después de Programar:
1. **Comprobación de Tipos:** Ejecutar `npx tsc -p tsconfig.app.json --noEmit` y garantizar 0 errores de compilación.
2. **Compilación de la Aplicación:** Ejecutar `npx ng build --configuration development` y asegurar compilación limpia (código de salida 0).
3. **Auditoría de Conexiones:** Comprobar que todos los `@Input()`, `@Output()` y eventos estén enlazados.
4. **Verificación de No Regresión:** Confirmar que no se haya roto ninguna funcionalidad previa.
5. **Informe Transparente:** Detallar con precisión los archivos creados, modificados o eliminados.
6. **Guía de Pruebas:** Proporcionar los casos de prueba manuales para que el usuario valide antes del siguiente paso.

---

## 6. Regla Fundamental

> **No sacrificar la calidad del código por terminar más rápido.**
> Se prioriza siempre una solución modular, mantenible, escalable, limpia y debidamente verificada frente a soluciones inmediatas que vuelvan a concentrar la aplicación en archivos gigantescos.
