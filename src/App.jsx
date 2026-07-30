import { useEffect, useRef, useState } from "react";

const starterQuestions = [
  "¿Qué puedes hacer por mí?",
  "Necesito ayuda con mi cuenta",
  "Buscar un taladro",
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

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7" />
      <path d="M4 7h16v13H4zM4 11h16M10 10v2M14 10v2" />
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
  const hasFoundProduct = state === "product-found";
  const source = hasFoundProduct
    ? "/assets/akitor-product-found.webm"
    : isSearchingProduct
      ? "/assets/akitor-product-search.webm"
      : "/assets/akitor-animated-transparent.webm";
  const poster = hasFoundProduct
    ? "/assets/akitor-product-found-poster.png"
    : isSearchingProduct
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
        loop={!hasFoundProduct}
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

    const foundProducts =
      data.status === "found" ||
      (data.status === "completed" &&
        (!Array.isArray(data.products) || data.products.length > 0));

    if (foundProducts) {
      setMascotState("product-found");
      await wait(1900);
    }

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

    const baseUrl = __BASE_URL__.replace(/\/+$/, "");
    const apiUrl = baseUrl ? `${baseUrl}/chat` : "";

    try {
      if (!apiUrl) {
        const looksLikeProductSearch =
          /producto|buscar|encontrar|precio|comprar/i.test(cleanText);
        if (looksLikeProductSearch) {
          setMascotState("product-search");
          await wait(3000);
          setMascotState("product-found");
          await wait(1900);
        } else {
          await wait(900);
        }
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: looksLikeProductSearch
              ? "¡Encontré una opción que podría ayudarte!"
              : "¡Gracias por contarme! La interfaz está lista. Conecta tu API para recibir respuestas personalizadas de Akitor.",
            products: looksLikeProductSearch
              ? [
                  {
                    id: "MOCK-TALADRO-001",
                    name: "Taladro inalámbrico 20 V",
                    description: "Incluye batería, cargador y estuche.",
                    price: 799,
                    currency: "GTQ",
                    availability: "Disponible",
                  },
                ]
              : undefined,
          },
        ]);
        return;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: cleanText,
        }),
      });

      if (!response.ok) {
        const apiError = await response.json().catch(() => null);
        const detail =
          typeof apiError?.detail === "string"
            ? apiError.detail
            : `La API respondió con estado ${response.status}.`;
        throw new Error(detail);
      }

      const initialData = await response.json();
      const data = await resolveProductSearch(initialData, apiUrl);
      const reply = data.output ?? data.reply ?? data.message ?? data.content;
      if (!reply) throw new Error("La API no devolvió una respuesta válida.");

      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: reply,
          products: data.products,
        },
      ]);
    } catch (requestError) {
      const message =
        requestError instanceof TypeError && requestError.message === "Failed to fetch"
          ? "No fue posible conectar con la API. Verifica que el servidor esté disponible."
          : requestError.message;
      setError(message || "Ocurrió un error. Inténtalo nuevamente.");
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
                      <div className="message-content">
                        <div className="message-bubble">{message.content}</div>
                        {message.products?.map((product) => (
                          <article className="product-card" key={product.id}>
                            <div className="product-visual">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt="" />
                              ) : (
                                <ProductIcon />
                              )}
                            </div>
                            <div className="product-info">
                              <span className="product-status">{product.availability ?? "Disponible"}</span>
                              <h3>{product.name}</h3>
                              {product.description && <p>{product.description}</p>}
                              {product.price != null && (
                                <strong className="product-price">
                                  {new Intl.NumberFormat("es-GT", {
                                    style: "currency",
                                    currency: product.currency ?? "GTQ",
                                  }).format(product.price)}
                                </strong>
                              )}
                            </div>
                            {product.productUrl && (
                              <a href={product.productUrl} target="_blank" rel="noreferrer">
                                Ver producto
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
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
                        className={`typing ${
                          mascotState === "product-search"
                            ? "product-search"
                            : mascotState === "product-found"
                              ? "product-found"
                              : ""
                        }`}
                        aria-label={
                          mascotState === "product-search"
                            ? "Akitor está buscando productos"
                            : mascotState === "product-found"
                              ? "Akitor encontró productos"
                            : "Akitor está escribiendo"
                        }
                      >
                        {mascotState === "product-search" && <strong>Buscando productos</strong>}
                        {mascotState === "product-found" && <strong>¡Productos encontrados!</strong>}
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
