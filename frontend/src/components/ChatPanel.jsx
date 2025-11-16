import React, { useState, useRef, useEffect } from "react";

export default function ChatPanel({ messages, onSend, role }) {
  const [text, setText] = useState("");
  const ref = useRef();

  useEffect(() => {
    ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div className="chat-panel">
      <h3>Chat</h3>

      <div className="chat" ref={ref}>
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.from === role ? "me" : "other"}`}>
            <strong>{m.from}:</strong> {m.text}
          </div>
        ))}
      </div>

      <div className="controls">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text) {
              onSend(text);
              setText("");
            }
          }}
          placeholder="Type..."
          style={{ flex: 1 }}
        />
        <button
          onClick={() => {
            onSend(text);
            setText("");
          }}
          disabled={!text}
        >
          Send
        </button>
      </div>
    </div>
  );
}
