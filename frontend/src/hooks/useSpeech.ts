import { useCallback, useRef, useState } from "react";

// La Web Speech API no está en los tipos estándar de TS; la declaramos.
type SpeechRecognition = any;

function getRecognition(): SpeechRecognition | null {
  const w = window as any;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "es-ES";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  return rec;
}

// Traduce los códigos de error de la Web Speech API a mensajes útiles en español.
function mensajeError(codigo: string): string {
  switch (codigo) {
    case "no-speech":
      return "No detecté ninguna voz. Toca el micrófono y habla enseguida, cerca y claro.";
    case "audio-capture":
      return "No encontré un micrófono. Revisa que esté conectado y habilitado.";
    case "not-allowed":
    case "service-not-allowed":
      return "Permiso de micrófono denegado. Actívalo en el candado 🔒 de la barra del navegador.";
    case "network":
      return "Error de red en el reconocimiento de voz. Revisa tu conexión.";
    case "aborted":
      return "Reconocimiento cancelado. Intenta de nuevo.";
    default:
      return `Error de micrófono: ${codigo}`;
  }
}

export function useSpeech() {
  const [escuchando, setEscuchando] = useState(false);
  const [soportado] = useState(() => getRecognition() !== null);
  const recRef = useRef<SpeechRecognition | null>(null);

  const escuchar = useCallback(
    (
      onResultado: (texto: string) => void,
      onError?: (e: string) => void,
      onEstado?: (s: string) => void,
    ) => {
      // El micrófono solo funciona en contexto seguro: https:// o localhost.
      // Si abres la app por la IP de red (http://192.168.x.x:5173) el navegador lo bloquea.
      if (!window.isSecureContext) {
        onError?.(
          "El micrófono requiere HTTPS o localhost. Abre la app en http://localhost:5173, no por la IP de red.",
        );
        return;
      }
      const rec = getRecognition();
      if (!rec) {
        onError?.("Este navegador no soporta reconocimiento de voz. Usa Chrome o Edge.");
        return;
      }
      recRef.current = rec;
      setEscuchando(true);
      let huboResultado = false;
      let audioIniciado = false; // ¿el navegador llegó a capturar audio del micrófono?

      rec.onaudiostart = () => {
        audioIniciado = true;
        onEstado?.("Micrófono activo, habla ahora…");
      };
      rec.onspeechstart = () => onEstado?.("Te escucho…");
      rec.onresult = (e: any) => {
        huboResultado = true;
        const texto = e.results[0][0].transcript;
        onResultado(texto);
      };
      rec.onerror = (e: any) => {
        // "aborted" suele dispararse al reiniciar/cancelar; solo lo mostramos si no hubo resultado.
        if (e.error === "aborted" && huboResultado) return;
        if (e.error === "no-speech") {
          // Distinguimos: ¿el micro captó audio pero no oyó voz, o ni siquiera capturó audio?
          onError?.(
            audioIniciado
              ? "No detecté voz. Habla más fuerte y cerca, apenas toques el botón (no esperes)."
              : "El micrófono no capturó audio. Revisa en Windows el dispositivo de entrada y que no esté silenciado.",
          );
        } else {
          onError?.(mensajeError(e.error));
        }
        setEscuchando(false);
      };
      rec.onend = () => setEscuchando(false);
      try {
        rec.start();
      } catch {
        onError?.("No se pudo iniciar el micrófono. Espera un segundo e intenta de nuevo.");
        setEscuchando(false);
      }
    },
    [],
  );

  const hablar = useCallback((texto: string) => {
    try {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-ES";
      window.speechSynthesis.speak(u);
    } catch {
      // síntesis no disponible; ignorar
    }
  }, []);

  // Prueba diagnóstica: abre el micrófono y reporta el nivel de sonido (0-100)
  // en tiempo real. Sirve para saber si el micro capta audio, sin depender del
  // servicio de reconocimiento. Devuelve una función para detener la prueba.
  const probarMicrofono = useCallback(
    async (onNivel: (n: number) => void, onError?: (e: string) => void): Promise<() => void> => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        await ctx.resume?.();
        const fuente = ctx.createMediaStreamSource(stream);
        const analizador = ctx.createAnalyser();
        analizador.fftSize = 512;
        fuente.connect(analizador);
        const datos = new Uint8Array(analizador.frequencyBinCount);
        let activo = true;
        const medir = () => {
          if (!activo) return;
          analizador.getByteTimeDomainData(datos);
          let suma = 0;
          for (let i = 0; i < datos.length; i++) {
            const x = (datos[i] - 128) / 128;
            suma += x * x;
          }
          const rms = Math.sqrt(suma / datos.length);
          onNivel(Math.min(100, Math.round(rms * 300)));
          requestAnimationFrame(medir);
        };
        medir();
        return () => {
          activo = false;
          stream.getTracks().forEach((t) => t.stop());
          ctx.close();
        };
      } catch (e: any) {
        onError?.(`No pude acceder al micrófono: ${e?.name || e}`);
        return () => {};
      }
    },
    [],
  );

  return { escuchar, hablar, escuchando, soportado, probarMicrofono };
}
