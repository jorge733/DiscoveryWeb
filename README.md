# Discovery

Un viaje inmersivo por todo lo que la web puede hacer. / An immersive journey through everything the web can do.

Un viaje generado en tiempo real en el navegador: un valle de montaña con casi 100 000 briznas de hierba animadas por shaders, un océano con olas de Gerstner que responde al tacto y una galaxia de 100 000 estrellas que siguen la gravedad del cursor. Cielo físico con nubes, postprocesado cinematográfico y audio 100 % procedural (Web Audio API).

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Three.js** + **React Three Fiber**
- Shaders **GLSL** propios (`shaders/`)
- **postprocessing** (bloom, aberración cromática, tone mapping)
- **GSAP** + ScrollTrigger y **Lenis** (scroll suave)
- **Web Audio API** (audio procedural, sin archivos)
- **Tailwind CSS 4**

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Estructura

```
app/                 layout, página y estilos globales
components/scene/    mundos 3D: valle (terreno, hierba) y océano (agua, estrellas, galaxia)
components/ui/       loader, cursor, HUD, secciones, scroll
lib/                 i18n (es/en), estado, terreno, ciclo del día, audio
shaders/             GLSL de hierba, océano, cielo y galaxia
```

## Hoja de ruta

1. ✅ Base: valle 3D, scroll cinemático, cursor, loader, audio, ES/EN
2. ✅ Océano y cielo nocturno + postprocesado (bloom, aberración cromática, ACES)
3. Física (cantera) y audio reactivo al micrófono (eco)
4. Webcam con seguimiento de manos (reflejo) y sensores (brújula)
5. Rendimiento adaptativo, accesibilidad, SEO
6. Publicación final

## Despliegue

Importa el repositorio en [Vercel](https://vercel.com/new); detecta Next.js automáticamente, sin configuración.
