---
name: web-design-guidelines
description: Revisa el código de la interfaz de usuario (UI) para verificar el cumplimiento de las Directrices de Diseño Web. Actívalo cuando el usuario diga "revisa mi UI", "audita el diseño", "comprueba la accesibilidad (WCAG)" o "busca fallos de UX".
---

# Web Design Guidelines (UI/UX Auditor)

## Cuándo activar esta skill
- Cuando se solicite una revisión de usabilidad, semántica HTML o maquetación responsive.
- Al realizar auditorías de accesibilidad web (contraste, etiquetas ARIA, tamaños de botones).

## Cómo ejecutar la revisión
1. Analiza el archivo del componente o página que el usuario ha indicado.
2. Compara el código contra las reglas modernas de diseño de interfaces.
3. **Formato de salida obligatorio:** Devuelve los hallazgos estrictamente en el formato plano de diagnóstico `archivo:línea` seguido del error y la sugerencia de cambio.

## Reglas Críticas a Evaluar
- **Interactividad:** Los elementos clickeables deben tener un área mínima de interacción de 44x44px.
- **Tipografía:** Contraste mínimo de texto de 4.5:1 (estándar WCAG AA). Tamaños de fuente legibles en móviles.
- **Estructura:** Uso correcto de etiquetas semánticas (`<main>`, `<nav>`, `<header>`, `<h1>-<h6>`).
- **Estados:** Asegurar estilos claros para los estados `:focus`, `:hover` y `:disabled`.
