---
name: playwright-cli
description: Ejecuta pruebas visuales de extremo a extremo (E2E), levanta servidores de desarrollo locales y captura pantallas (screenshots) del sitio en ejecución para validar cambios de diseño y maquetación. Actívala automáticamente cuando el usuario pida "comprueba si se ve bien", "haz un test visual", "abre el navegador para revisar" o cuando el agente necesite validar de forma autónoma una refactorización frontend compleja.
---

# Playwright CLI Skill (Visual Feedback Loop)

## Core Directive
Utiliza Playwright para interactuar con el entorno en ejecución de la aplicación, capturar el estado visual y asegurar que los componentes renderizados coincidan con los estándares de diseño esperados.

## Cuándo activar esta skill
- Tras aplicar cambios mayores de CSS, Tailwind o migraciones de componentes UI.
- Cuando el usuario solicite explícitamente una verificación visual o una prueba E2E de interfaz.

## Proceso de Ejecución
1. **Detección del Servidor:** Identifica el script para inicializar el servidor local (ej. `npm run dev`, `vite`, etc.) si no está corriendo actualmente.
2. **Navegación Controlada:** Abre una instancia de navegador a la URL local correspondiente (ej. `http://localhost:5173`).
3. **Captura Visual:** Toma capturas de pantalla de la página completa, así como capturas específicas en resoluciones de móvil (390px ancho) y escritorio (1440px ancho).
4. **Bucle de Autocorrección:** Si la captura revela elementos rotos, texto desbordado o desalineaciones respecto a las directrices de `design-taste-frontend`, el agente debe modificar el código fuente y repetir la prueba hasta que el renderizado sea perfecto.
