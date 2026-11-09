# Armario: tu armario digital (PWA para iPhone)

App personal para organizar la ropa, recibir outfits según el tiempo y tu estilo, y probártelos con IA. **Coste: 0 €.** No usa frameworks ni backend: todos tus datos se quedan en tu iPhone.

## Ponerla en marcha (gratis, ~10 min)

1. Crea un repositorio en GitHub (por ejemplo `armario`) y sube **todos** los archivos de esta carpeta.
2. Ve a **Settings → Pages → Branch: `main` / root → Save**.
3. Al minuto la tienes en `https://TU-USUARIO.github.io/armario/`.
4. Ábrela en **Safari** en el iPhone → botón Compartir → **Añadir a pantalla de inicio**.
   A partir de ahí ábrela siempre desde ese icono: va a pantalla completa, funciona sin conexión y Safari no borra los datos.

> Para probarla en el ordenador: `python3 -m http.server` dentro de la carpeta y abre `http://localhost:8000`.

## Novedades v2

- **Descanso de prendas:** cuando te pones una prenda, queda bloqueada al menos 2 días (lo cambias en Perfil → Planificación). Calzado, abrigos, accesorios y pijamas no descansan. En Armario, las prendas que descansan salen atenuadas con los días que les faltan.
- **Plan de varios días:** la pestaña Plan prepara 3 días de golpe (de 1 a 7, configurable), cada uno con su tiempo y su uso (Diario, Salir, Formal, Deporte, Pijama). Ninguna prenda se repite dentro del periodo de descanso.
- **Usos:** cada prenda puede servir para varios usos (Diario, Salir, Formal, Deporte, Pijama) y puedes filtrar el armario por uso.
- **Accesorios:** relojes, collares, pulseras, anillos, pendientes, gafas, gorras, cinturones, bolsos y bufandas. Se añaden solos a los outfits según el día (bufanda si hace frío, gafas si hay sol, solo reloj y gorra en deporte…).
- **Identificación automática:** con la clave gratuita de IA, cada foto se identifica sola (tipo, accesorio, nombre, color y usos). Sin clave, la app intenta adivinarlo por la forma y tú lo confirmas.
- **Tu estilo:** un test con tus estilos, cómo te gusta que te quede la ropa, tu colorimetría (piel, venas, pelo, ojos) y tus medidas. **Analizar mi cara** (con IA) afina tus colores y te da consejos. Todo esto se usa para elegir outfits y en «Pruébatelo».
- **Ubicación:** automática por GPS o una ciudad que eliges en Perfil.

## Cómo se usa

- **Armario → +**: haz una foto a la prenda sola o elige varias de Fotos. El fondo se quita en el propio móvil. La primera vez se descarga el modelo, unos segundos; luego queda guardado.
  - **Lo más rápido:** en la app Fotos, mantén pulsada la prenda → **Copiar** → en Armario, **Pegar recorte**. Llega ya sin fondo.
  - Comprueba que el tipo y el color estén bien y pulsa Guardar.
- **Plan**: un outfit por día según el tiempo, el uso de ese día, tu estilo y tus gustos. 🔀 cambia uno, 👎 lo descarta y aprende.
  - 👍 / 👎 enseñan a la app lo que te gusta.
  - **Me lo pongo** lo apunta en el calendario y no te lo repetirá en los próximos días.
  - **Pruébatelo** junta tu foto y las prendas en una imagen y copia el texto. Pulsa *Enviar a Gemini*, elige la app de Gemini (gratis), pega el texto y te genera la foto con ese outfit.
- **Calendario**: lo que te has puesto cada día y las prendas que más (y menos) usas.
- **Perfil**: tu foto de cuerpo entero, tu estilo en texto, los colores que evitas y la copia de seguridad.

## IA opcional (gratis)

Sin IA, la app monta los outfits con su propio motor de reglas, sin internet. Si quieres que una IA los combine teniendo en cuenta tu estilo descrito con palabras:

1. Saca una clave gratuita en https://aistudio.google.com/apikey
2. Pégala en **Perfil → IA** y aparecerá el botón **✨ Pedir a la IA** en Hoy.

Modelo por defecto: `gemini-flash-latest`. Si Google lo cambia, escribe ahí otro modelo Flash gratuito.
Ten en cuenta que en el plan gratuito Google puede usar lo que envías para mejorar sus modelos. Solo se envía la lista de prendas en texto, nunca las fotos.

## Actualizar la app

Si cambias algo en el código, sube el número de `V` en `sw.js` (`armario-v2`, `v3`…). Si no, el iPhone seguirá usando la versión guardada.

## Copia de seguridad

**Perfil → Exportar** descarga un `.json` con todo, fotos incluidas. Hazlo de vez en cuando: si borras la app o cambias de móvil, la recuperas con **Importar**.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Esqueleto y barra de pestañas |
| `app.css` | Estilos (modo claro y oscuro automáticos) |
| `app.js` | Toda la lógica: IndexedDB, procesado de fotos, motor de outfits, vistas |
| `sw.js` | Modo sin conexión y caché del modelo de quitar fondos |
| `manifest.webmanifest`, `icons/` | Instalación en pantalla de inicio |

Optimizaciones: sin dependencias en la carga inicial (unos 60 KB en total, iconos incluidos). La librería de quitar fondos solo se descarga si hace falta. Las fotos se guardan recortadas y en WebP, en dos tamaños: miniatura de 240 px para la cuadrícula y 640 px para los outfits. Las miniaturas se cargan de forma diferida y el tiempo se guarda en caché durante 1 hora.

Quitar fondos usa `@imgly/background-removal` (licencia AGPL; sin problema para uso personal).
