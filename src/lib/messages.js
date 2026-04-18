// LinkedIn message templates by status

export const messages = {
  msg1: {
    es: (name, club) =>
      `Hola ${name}, qué bueno conectar. Veo que trabajas en el mundo del fútbol, igual que yo. ¿Cómo va la temporada por ${club}?`,
    en: (name, club) =>
      `Hey ${name}, great to connect! I see you work in the football world, just like me. How's the season going at ${club}?`,
  },
  msg2: {
    es: (name, club) =>
      `Hola ${name}, te escribí hace unos días. ¿Cómo gestionáis el contenido visual en ${club}? ¿Lo lleváis internamente o trabajáis con alguien externo para las piezas más especiales?`,
    en: (name, club) =>
      `Hey ${name}, I reached out a few days ago. How do you manage visual content at ${club}? Do you handle it in-house or work with external creators for special pieces?`,
  },
  msg3: {
    es: (name, _club) =>
      `Hola ${name}, entiendo que estás con mil cosas. Si en algún momento quieres ver cómo algunos clubes están usando el arte para que sus hinchas paren el scroll, aquí estaré. Suerte con lo que viene.`,
    en: (name, _club) =>
      `Hey ${name}, I understand you're busy. If you ever want to see how some clubs are using art to stop their fans from scrolling past, I'll be here. Best of luck with what's ahead.`,
  },
  diagnostico: {
    es: (_name, club) =>
      `¿Cómo gestionáis el contenido visual en ${club}? ¿Lo lleváis internamente o trabajáis con alguien externo para las piezas más especiales?`,
    en: (_name, club) =>
      `How do you manage visual content at ${club}? Do you handle it in-house or work with external creators for your most special pieces?`,
  },
  propuesta: {
    es: (name, _club) =>
      `Perfecto ${name}, para que la reunión sea útil para los dos: creo ilustraciones vectoriales para clubes como Real Madrid y Boca Juniors, listas para publicar en menos de 5 horas. Retainer mensual desde $669 USD. ¿Coordinamos 20 minutos esta semana?`,
    en: (name, _club) =>
      `Perfect ${name}, so our call is useful for both of us — I create vector illustrations for clubs like Real Madrid and Boca Juniors, ready to publish in under 5 hours. Monthly retainer from $669 USD. Can we coordinate 20 minutes this week?`,
  },
}

// Stage notes for clients
export const stageNotes = {
  brief: {
    es: 'Solicitar: referencias visuales, colores del club, jugador o momento a ilustrar, formato final.',
    en: 'Request: visual references, club colors, player or moment to illustrate, final format.',
  },
  boceto: {
    es: 'Compartir boceto inicial. Esperar aprobación antes de vectorizar.',
    en: 'Share initial sketch. Wait for approval before vectorizing.',
  },
  vector: {
    es: 'En proceso de vectorización. Tiempo estimado: 3-5 horas.',
    en: 'Vectorization in progress. Estimated time: 3-5 hours.',
  },
  entrega: {
    es: 'Ilustración lista. Enviar PNG 1080x1350px + versión sin marca de agua.',
    en: 'Illustration ready. Send PNG 1080x1350px + version without watermark.',
  },
  factura: {
    es: 'Enviar factura al email del cliente con los datos del retainer.',
    en: 'Send invoice to client email with retainer details.',
  },
  pagado: {
    es: '¡Pago recibido! Proyecto del mes completado.',
    en: 'Payment received! Monthly project completed.',
  },
}
