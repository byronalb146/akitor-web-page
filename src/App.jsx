import { useEffect, useRef, useState } from "react";

const starterQuestions = [
  "¿Qué puedes hacer por mí?",
  "Necesito ayuda con mi cuenta",
  "Quiero conocer sus servicios",
];

const initialMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "¡Hola! Soy Akitor, tu asistente virtual. Estoy aquí para ayudarte de forma rápida y sencilla. ¿Qué necesitas hoy?",
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 14-7-4.2 14-3-5.8L5 12Z" />
      <path d="m11.8 13.1 7-7" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M17 14H7" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </svg>
  );
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const isProductSearchResponse = (data) =>
  data?.intent === "product_search" ||
  data?.type === "product_search" ||
  data?.ui?.animation === "product_search";

function MascotPlaceholder({ state }) {
  const isSearchingProduct = state === "product-search";
  const source = isSearchingProduct
    ? "/assets/akitor-product-search.webm"
    : "/assets/akitor-animated-transparent.webm";
  const poster = isSearchingProduct
    ? "/assets/akitor-product-search-poster.png"
    : "/assets/akitor-poster.png";

  return (
    <div className="mascot-wrap">
      <video
        key={source}
        src={source}
        poster={poster}
        aria-label="Akitor, mascota animada de AKÍ"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      />
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [interactionMode, setInteractionMode] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [mascotState, setMascotState] = useState("idle");
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const resizeTextarea = () => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  };

  const resolveProductSearch = async (initialData, apiUrl) => {
    if (!isProductSearchResponse(initialData)) return initialData;

    setMascotState("product-search");
    const animationStartedAt = Date.now();
    let data = initialData;

    if (data.status === "searching" || data.status === "pending") {
      if (!data.resultUrl) {
        throw new Error(
          "La API indicó una búsqueda de producto, pero no proporcionó resultUrl.",
        );
      }

      const apiBaseUrl = new URL(apiUrl, window.location.origin);
      const resultUrl = new URL(data.resultUrl, apiBaseUrl).toString();

      for (let attempt = 0; attempt < 30; attempt += 1) {
        await wait(1000);
        const resultResponse = await fetch(resultUrl);
        if (!resultResponse.ok) {
          throw new Error("No pudimos consultar el resultado de la búsqueda.");
        }

        data = await resultResponse.json();
        if (data.status === "failed" || data.status === "not_found") {
          break;
        }
        if (
          data.status === "completed" ||
          data.status === "found" ||
          data.status === "not_found"
        ) {
          break;
        }
      }

      if (data.status === "searching" || data.status === "pending") {
        throw new Error("La búsqueda del producto tardó demasiado.");
      }
    }

    const remainingAnimationTime = 1400 - (Date.now() - animationStartedAt);
    if (remainingAnimationTime > 0) await wait(remainingAnimationTime);
    return data;
  };

  const sendMessage = async (text = input) => {
    const cleanText = text.trim();
    if (!cleanText || isSending) return;

    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: cleanText,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setIsSending(true);
    requestAnimationFrame(resizeTextarea);

    const apiUrl = import.meta.env.VITE_CHAT_API_URL;

    try {
      if (!apiUrl) {
        const looksLikeProductSearch =
          /producto|buscar|encontrar|precio|comprar/i.test(cleanText);
        if (looksLikeProductSearch) {
          setMascotState("product-search");
          await wait(2400);
        } else {
          await wait(900);
        }
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: looksLikeProductSearch
              ? "¡Encontré opciones que podrían ayudarte! Conecta la API para mostrar aquí los productos reales."
              : "¡Gracias por contarme! La interfaz está lista. Conecta tu API para recibir respuestas personalizadas de Akitor.",
          },
        ]);
        return;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanText,
          history: messages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) throw new Error("No pudimos conectar con Akitor.");

      const initialData = await response.json();
      const data = await resolveProductSearch(initialData, apiUrl);
      const reply = data.reply ?? data.message ?? data.content;
      if (!reply) throw new Error("La API no devolvió una respuesta válida.");

      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: "assistant", content: reply },
      ]);
    } catch (requestError) {
      setError(requestError.message || "Ocurrió un error. Inténtalo nuevamente.");
    } finally {
      setIsSending(false);
      setMascotState("idle");
      textareaRef.current?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const startVoiceInput = () => {
    setInteractionMode("voice");
    setError("");
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("La entrada por voz no está disponible en este navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-GT";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      setError("No pudimos escuchar tu voz. Inténtalo nuevamente.");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setInteractionMode("text");
      requestAnimationFrame(() => textareaRef.current?.focus());
    };
    recognition.start();
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <section className="chat-card" aria-label="Chat con Akitor">
          <div className="chat-title">
            <div className="avatar">A</div>
            <h1>Akitor</h1>
          </div>

          <div className="mascot-stage">
            <MascotPlaceholder state={mascotState} />
          </div>

          <div className="chat-main">
            {!interactionMode && messages.length === 1 ? (
              <div className="welcome-state">
                <h2>¿Qué quieres hacer hoy?</h2>
                <div className="mode-options">
                  <button onClick={() => {
                    setInteractionMode("text");
                    requestAnimationFrame(() => textareaRef.current?.focus());
                  }}>
                    <KeyboardIcon />
                    <span><strong>Escribir</strong> una pregunta</span>
                  </button>
                  <button onClick={startVoiceInput}>
                    <MicIcon />
                    <span><strong>Hablar</strong> con Akitor</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="messages" aria-live="polite">
                  {messages.map((message) => (
                    <div className={`message-row ${message.role}`} key={message.id}>
                      {message.role === "assistant" && <div className="mini-avatar">A</div>}
                      <div className="message-bubble">{message.content}</div>
                    </div>
                  ))}
                  {messages.length === 1 && (
                    <div className="suggestions">
                      {starterQuestions.map((question) => (
                        <button key={question} onClick={() => sendMessage(question)}>
                          {question}<span>→</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {isSending && (
                    <div className="message-row assistant">
                      <div className="mini-avatar">A</div>
                      <div
                        className={`typing ${mascotState === "product-search" ? "product-search" : ""}`}
                        aria-label={
                          mascotState === "product-search"
                            ? "Akitor está buscando productos"
                            : "Akitor está escribiendo"
                        }
                      >
                        {mascotState === "product-search" && <strong>Buscando productos</strong>}
                        <span /><span /><span />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="composer-area">
                  {error && <p className="error-message" role="alert">{error}</p>}
                  <form className="composer" onSubmit={handleSubmit}>
                    <textarea
                      ref={textareaRef}
                      rows="1"
                      value={input}
                      onChange={(event) => {
                        setInput(event.target.value);
                        resizeTextarea();
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={isListening ? "Te escucho…" : "Escribe o habla con Akitor..."}
                      aria-label="Mensaje para Akitor"
                      disabled={isSending}
                    />
                    <button
                      className={`voice-shortcut ${isListening ? "listening" : ""}`}
                      type="button"
                      onClick={startVoiceInput}
                      aria-label={isListening ? "Escuchando" : "Usar entrada por voz"}
                    >
                      <MicIcon />
                    </button>
                    <button
                      className="send-button"
                      type="submit"
                      disabled={!input.trim() || isSending}
                      aria-label="Enviar mensaje"
                    >
                      <ArrowIcon />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
