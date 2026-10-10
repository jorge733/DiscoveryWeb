export type Lang = "es" | "en";

export const dict = {
  es: {
    loader: {
      loading: "Generando el mundo",
      enter: "Entrar",
      hint: "Recomendado: con sonido y auriculares",
    },
    hud: {
      sound: "Sonido",
      on: "Activado",
      off: "Silencio",
    },
    nav: ["Inicio", "Tiempo real", "Escucha", "Mundos", "Créditos"],
    hero: {
      kicker: "Un experimento sobre lo posible",
      title: "Discovery",
      subtitle: "Un viaje por todo lo que la web puede hacer",
      scroll: "Desliza para comenzar",
    },
    realtime: {
      kicker: "01 — Tiempo real",
      title: "Esto no es un vídeo",
      body: "Cada brizna de hierba, la luz del sol y el viento se calculan ahora mismo en tu navegador, decenas de veces por segundo.",
      action: "Pasa el cursor sobre el prado y abre camino.",
    },
    listen: {
      kicker: "02 — Escucha",
      title: "El viento es código",
      body: "No hay archivos de audio. El viento y los pájaros se sintetizan al instante con la Web Audio API y reaccionan a tus movimientos.",
      action: "Mueve el cursor rápido: levantarás ráfagas.",
    },
    worlds: {
      kicker: "03 — Próximos mundos",
      title: "El viaje continúa",
      soon: "Próximamente",
      items: [
        { name: "Océano", desc: "Agua realista que responde a tu mano." },
        { name: "Cielo nocturno", desc: "Cien mil estrellas que siguen tu gravedad." },
        { name: "Cantera", desc: "Rocas con física real que puedes lanzar." },
        { name: "Eco", desc: "La naturaleza que reacciona a tu voz." },
        { name: "Reflejo", desc: "Tu webcam convertida en paisaje; tus manos, en control." },
        { name: "Brújula", desc: "Inclina tu móvil y el mundo se inclina contigo." },
      ],
    },
    credits: {
      kicker: "04 — Créditos",
      title: "Hecho con la web abierta",
      body: "Next.js · Three.js · React Three Fiber · GLSL · GSAP · Lenis · Web Audio API",
      phase: "Fase 1 de 6",
      top: "Volver al inicio",
    },
  },
  en: {
    loader: {
      loading: "Generating the world",
      enter: "Enter",
      hint: "Best with sound and headphones",
    },
    hud: {
      sound: "Sound",
      on: "On",
      off: "Muted",
    },
    nav: ["Home", "Real time", "Listen", "Worlds", "Credits"],
    hero: {
      kicker: "An experiment on what's possible",
      title: "Discovery",
      subtitle: "A journey through everything the web can do",
      scroll: "Scroll to begin",
    },
    realtime: {
      kicker: "01 — Real time",
      title: "This is not a video",
      body: "Every blade of grass, the sunlight and the wind are being computed right now in your browser, dozens of times per second.",
      action: "Sweep your cursor across the meadow to part it.",
    },
    listen: {
      kicker: "02 — Listen",
      title: "The wind is code",
      body: "There are no audio files. The wind and the birds are synthesized on the fly with the Web Audio API and react to your movements.",
      action: "Move your cursor fast: you'll raise gusts.",
    },
    worlds: {
      kicker: "03 — Upcoming worlds",
      title: "The journey continues",
      soon: "Coming soon",
      items: [
        { name: "Ocean", desc: "Realistic water that responds to your hand." },
        { name: "Night sky", desc: "A hundred thousand stars bending to your gravity." },
        { name: "Quarry", desc: "Rocks with real physics you can throw." },
        { name: "Echo", desc: "Nature that reacts to your voice." },
        { name: "Reflection", desc: "Your webcam turned landscape; your hands, the controls." },
        { name: "Compass", desc: "Tilt your phone and the world tilts with you." },
      ],
    },
    credits: {
      kicker: "04 — Credits",
      title: "Made with the open web",
      body: "Next.js · Three.js · React Three Fiber · GLSL · GSAP · Lenis · Web Audio API",
      phase: "Phase 1 of 6",
      top: "Back to top",
    },
  },
} as const;

export type Dict = (typeof dict)[Lang];
