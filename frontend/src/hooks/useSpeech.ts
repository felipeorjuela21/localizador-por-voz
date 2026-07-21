import { useCallback, useRef, useState } from "react";
import { transcribirAudio } from "../lib/api";

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

type Cb = (texto: string) => void;
type CbErr = (e: string) => void;
type CbEstado = (s: string) => void;

export function useSpeech() {
  const [escuchando, setEscuchando] = useState(false);
  const [grabando, setGrabando] = useState(false);
  const [transcribiendo, setTranscribiendo] = useState(false);
  const [soportado] = useState(() => getRecognition() !== null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // --- Reconocimiento nativo del navegador (Chrome/Android/PC) ---
  const escuchar = useCallback((onResultado: Cb, onError?: CbErr, onEstado?: CbEstado) => {
    if (!window.isSecureContext) {
      onError?.("El micrófono requiere HTTPS o localhost. Abre la app en https://…");
      return;
    }
    const rec = getRecognition();
    if (!rec) {
      onError?.("Este navegador no soporta reconocimiento de voz.");
      return;
    }
    recRef.current = rec;
    setEscuchando(true);
    let huboResultado = false;
    let audioIniciado = false;

    rec.onaudiostart = () => {
      audioIniciado = true;
      onEstado?.("Micrófono activo, habla ahora…");
    };
    rec.onspeechstart = () => onEstado?.("Te escucho…");
    rec.onresult = (e: any) => {
      huboResultado = true;
      onResultado(e.results[0][0].transcript);
    };
    rec.onerror = (e: any) => {
      if (e.error === "aborted" && huboResultado) return;
      if (e.error === "no-speech") {
        onError?.(
          audioIniciado
            ? "No detecté voz. Habla más fuerte y cerca, apenas toques el botón."
            : "El micrófono no capturó audio. Revisa el dispositivo de entrada."
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
  }, []);

  // --- Grabar y transcribir (fallback para iPhone y redes que bloquean STT) ---
  // Es un toggle: primer toque graba, segundo toque detiene y transcribe.
  const grabarToggle = useCallback((onResultado: Cb, onError?: CbErr, onEstado?: CbEstado) => {
    const actual = mediaRecRef.current;
    if (actual && actual.state === "recording") {
      actual.stop();
      return;
    }
    if (!window.isSecureContext) {
      onError?.("El micrófono requiere HTTPS. Abre la app por su dirección https://…");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        chunksRef.current = [];
        const r = new MediaRecorder(stream);
        mediaRecRef.current = r;
        r.ondataavailable = (e) => {
          if (e.data.size) chunksRef.current.push(e.data);
        };
        r.onstop = async () => {
          setGrabando(false);
          stream.getTracks().forEach((t) => t.stop());
          mediaRecRef.current = null;
          const blob = new Blob(chunksRef.current, { type: r.mimeType || "audio/mp4" });
          setTranscribiendo(true);
          onEstado?.("Transcribiendo…");
          try {
            const texto = await transcribirAudio(blob);
            if (texto) onResultado(texto);
            else onError?.("No entendí el audio. Intenta de nuevo, hablando claro.");
          } catch (e) {
            onError?.(e instanceof Error ? e.message : "No se pudo transcribir el audio.");
          } finally {
            setTranscribiendo(false);
          }
        };
        r.start();
        setGrabando(true);
        onEstado?.("Grabando… toca de nuevo para terminar.");
      })
      .catch(() => {
        onError?.("No pude acceder al micrófono. Revisa el permiso de micrófono.");
        setGrabando(false);
      });
  }, []);

  const hablar = useCallback((texto: string) => {
    try {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-ES";
      window.speechSynthesis.speak(u);
    } catch {
      // síntesis no disponible; ignorar
    }
  }, []);

  // Elige automáticamente: reconocimiento nativo si existe, si no graba y transcribe.
  const escucharAuto = useCallback(
    (onResultado: Cb, onError?: CbErr, onEstado?: CbEstado) => {
      if (soportado) escuchar(onResultado, onError, onEstado);
      else grabarToggle(onResultado, onError, onEstado);
    },
    [soportado, escuchar, grabarToggle]
  );

  // Prueba diagnóstica: nivel de sonido del micrófono en tiempo real (0-100).
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
          onNivel(Math.min(100, Math.round(Math.sqrt(suma / datos.length) * 300)));
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
    []
  );

  return {
    escuchar: escucharAuto,
    hablar,
    escuchando,
    grabando,
    transcribiendo,
    soportado,
    probarMicrofono,
  };
}
