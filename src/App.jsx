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

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2c.6 5.6 4.4 9.4 10 10-5.6.6-9.4 4.4-10 10-.6-5.6-4.4-9.4-10-10 5.6-.6 9.4-4.4 10-10Z" />
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

function MascotPlaceholder() {
  return (
    <div className="mascot-wrap" aria-label="Espacio reservado para la mascota Akitor">
      <div className="mascot-glow" />
      <div className="mascot-card">
        <div className="mascot-face">
          <span className="ear left" />
          <span className="ear right" />
          <span className="eye left" />
          <span className="eye right" />
          <span className="nose" />
          <span className="smile" />
        </div>
      </div>
      <div className="mascot-badge">
        <SparkleIcon />
        <span>Tu mascota<br /><strong>AKITOR</strong></span>
      </div>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([initialMessage]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [interactionMode, setInteractionMode] = useState(null);
  const [isListening, setIsListening] = useState(false);
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
        await new Promise((resolve) => setTimeout(resolve, 900));
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content:
              "¡Gracias por contarme! La interfaz está lista. Conecta tu API para recibir respuestas personalizadas de Akitor.",
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

      const data = await response.json();
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
            <MascotPlaceholder />
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
                      <div className="typing" aria-label="Akitor está escribiendo">
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
