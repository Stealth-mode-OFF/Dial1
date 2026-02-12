import React, { useState } from "react";
import { motion } from "framer-motion";
import { getWhisper } from "../whisper";

export function FloatingWhisper() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(true);

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    const r = await getWhisper(input.trim());
    setResponse(r);
    setLoading(false);
  };

  if (minimized) {
    return (
      <motion.button
        className="whisper-fab"
        onClick={() => setMinimized(false)}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
      >
        ⚡
      </motion.button>
    );
  }

  return (
    <motion.div
      className="whisper-float"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
    >
      <div className="whisper-float-header">
        <span>⚡ Našeptávač</span>
        <button onClick={() => setMinimized(true)}>−</button>
      </div>
      <div className="whisper-float-body">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Co říká? (námitka)"
          autoFocus
        />
        <button onClick={handleSubmit} disabled={loading || !input.trim()}>
          {loading ? "..." : "→"}
        </button>
      </div>
      {response && (
        <motion.div
          className="whisper-float-response"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {response}
        </motion.div>
      )}
    </motion.div>
  );
}
