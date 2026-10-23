---
name: design-taste-frontend
description: Activa esta skill de forma automática cuando el usuario solicite crear componentes de interfaz, layouts, estilos CSS o modificar el frontend. Sirve para evitar el "slop" visual, plantillas genéricas y asegurar una jerarquía visual premium.
---

# Taste Skill (Frontend Architecture)

## Cuándo activar esta skill
- Al generar componentes UI, páginas web o flujos de frontend.
- Al refactorizar estilos CSS, Tailwind, o configuraciones de temas (Dark/Light mode).

## Directrices de Diseño (Anti-Slop)
- **Evitar lo genérico:** No uses degradados púrpuras/azules saturados "SaaS modernos" predeterminados a menos que se soliciten explícitamente.
- **Tipografía:** Prioriza escalas tipográficas limpias, tracking ajustado en títulos grandes (`tracking-tight`) y suficiente interlineado en bloques de texto (`leading-relaxed`).
- **Espaciado:** Usa un sistema de espaciado estricto (múltiplos de 4 u 8px) para mantener el ritmo visual.
- **Micro-interacciones:** Sugiere o implementa transiciones suaves (`transition-all duration-200`) en elementos interactivos como botones y enlaces.
