---
name: email-design-expert
description: Diseña correos electrónicos HTML corporativos premium (bienvenida, newsletters, técnicos) con UI/UX moderno y espaciados limpios, evitando plantillas genéricas de los 90.
---

# Sistema de Diseño de Email Avanzado (Anti-Genérico)

## 1. Reglas Estructurales Obligatorias
- **Ancho y Alineación:** Contenedor central estricto de `600px`. Todo el contenido debe ir dentro para evitar desparramarse en pantallas grandes.
- **Espaciado Inteligente (White Space):** Prohibido amontonar elementos. Cada bloque de contenido o sección debe separarse con un padding vertical mínimo de `35px` a `50px` para que el diseño "respire".
- **Estilos:** Todo el CSS visual avanzado (colores, bordes redondeados, sombras) debe ser inyectado **en línea (inline CSS)** directamente en las etiquetas HTML para asegurar compatibilidad con Gmail y Outlook.

## 2. Tipografía y Jerarquía
- **Títulos Hero principales:** Tamaño `28px` a `32px`, tipografía limpia (Inter, System-UI o Helvetica), peso `bold` y color oscuro premium (ej. `#111827`).
- **Cuerpo de texto:** Tamaño `15px` o `16px`, interlineado largo (`line-height: 1.6`) para máxima legibilidad. Color gris suave profesional (ej. `#4B5563`).

## 3. Componentes Específicos por Caso de Uso

### A. Correos de Bienvenida (Suscripción)
- **Bloque Superior (Hero):** Imagen o ilustración centrada con un mensaje de bienvenida directo y empático.
- **Cuerpo Modular:** Grid responsivo de 2 columnas o lista de tarjetas con esquinas redondeadas (`border-radius: 12px`) con bordes muy sutiles (`border: 1px solid #E5E7EB`) e iconos minimalistas para explicar los siguientes pasos del usuario.
- **Botón de Acción (CTA):** Botón grande y sólido de altura `48px`, texto en blanco, fondo de color de acento vibrante (morado, azul o verde de la marca) y bordes curvos (`8px`).

### B. Correos de Newsletter (Boletines)
- **Cabecera:** Logotipo de la marca limpio con espaciado amplio.
- **Jerarquía de Contenido:** Una noticia "Hero" principal destacada que abarque todo el ancho, seguida de bloques secundarios divididos por líneas horizontales muy tenues.
- **Estructura:** Bloques combinados de imagen a la izquierda y texto a la derecha con un pequeño botón de lectura.

### C. Correos de Especificaciones Técnicas (Deployment)
- **Foco:** Cero gráficos innecesarios, máxima claridad y orden de lectura técnico.
- **Bloques de Código:** Los comandos de consola, variables de entorno o scripts de despliegue deben ir encapsulados en bloques con etiqueta `<code>`, fondo gris claro (`#F3F4F6`), padding interno de `12px` y fuente monoespaciada (`Courier` o `monospace`).
- **Estructura:** Listas organizadas con viñetas usando **negritas al inicio** para un escaneo visual ultra rápido por parte de los ingenieros.
