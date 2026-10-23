---
name: image-to-code
description: Convierte imágenes, mockups de Figma o capturas de pantalla de interfaces de usuario en código frontend limpio. Actívalo automáticamente cuando el usuario suba una imagen y pida "pasa esto a código", "crea un componente basado en esta imagen" o "replica este diseño".
---

# Image to Code Skill (Frontend Reverse Engineering)

## Core Directive
Tu objetivo es realizar una ingeniería inversa fiel de la referencia visual proporcionada. No debes generar maquetaciones genéricas de marcador de posición; debes extraer la estructura real del layout, componentes y secciones.

## Cuándo activar esta skill
- Cuando haya una imagen adjunta en el contexto del prompt y se solicite implementación de código frontend.

## Proceso de Ejecución
1. **Análisis Visual:** Escanea el layout de la imagen (encabezados, columnas, espaciados implícitos).
2. **Extracción de Componentes:** Identifica elementos repetitivos (botones, tarjetas, inputs).
3. **Mapeo de Estilos:** Traduce las distancias visuales y alineaciones a clases del framework del proyecto (ej. flex, grid, paddings en Tailwind).
4. **Preservación de Detalles:** Asegura mantener los detalles importantes de la UI original (como radios de borde, opacidades y sutiles sombras).
