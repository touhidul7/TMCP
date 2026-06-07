"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bot, X, Send, CornerDownLeft, Sparkles, MessageSquare, AlertCircle, Key, Trash2 } from "lucide-react";

export default function Tassistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **Tassistant**, your AI guide to the TMCP Gateway. Ask me anything about workspaces, tool accounts, agent API keys, custom REST configurations, or how to troubleshoot gateway errors!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);

  // Load OpenRouter key from localStorage and listen to updates
  const loadKey = () => {
    const key = localStorage.getItem("tmcp_openrouter_key") || "";
    setOpenrouterKey(key);
  };

  useEffect(() => {
    loadKey();

    // Listen for changes from the settings page
    window.addEventListener("tmcp_openrouter_key_changed", loadKey);
    return () => {
      window.removeEventListener("tmcp_openrouter_key_changed", loadKey);
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    if (!openrouterKey) {
      setError("Please configure your OpenRouter API Key in the Settings page.");
      return;
    }

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setIsLoading(true);
    setError("");

    try {
      // We only send the message history to the backend endpoint, keeping the backend stateless
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openrouterKey,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply.content }]);
      } else {
        setError(data.error || "Failed to receive response from assistant");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear chat history?")) {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I am **Tassistant**, your AI guide to the TMCP Gateway. Ask me anything about workspaces, tool accounts, agent API keys, custom REST configurations, or how to troubleshoot gateway errors!"
        }
      ]);
      setError("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionChips = [
    "How does the approvals queue work?",
    "How to fix a 401 error?",
    "How to connect IMAP Email?",
    "How to add an agent permission?",
    "What built-in tools are available?",
    "How to connect GitHub?"
  ];

  // A basic custom Markdown parser to render bold, code blocks, inline code, and lists nicely in JSX
  const parseMarkdown = (text) => {
    if (!text) return "";
    
    // Split text by code blocks: ```code```
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // If it's a code block
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split("\n");
        // Remove optional language identifier from first line (e.g. ```json)
        const firstLine = lines[0].trim();
        const codeLines = ["json", "javascript", "python", "bash", "sh", "curl", "http"].includes(firstLine.toLowerCase())
          ? lines.slice(1)
          : lines;
        
        return (
          <div key={index} className="my-3 rounded overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-[11px] leading-relaxed">
            {firstLine && (
              <div className="bg-surface-container border-b border-outline-variant px-3 py-1 text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                {firstLine}
              </div>
            )}
            <pre className="p-3 overflow-x-auto text-primary whitespace-pre">
              <code>{codeLines.join("\n").trim()}</code>
            </pre>
          </div>
        );
      }
      
      // For standard text, parse inline code `code`, bold **bold**, bullet lines, and paragraphs
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1.5">
          {lines.map((line, lIndex) => {
            let processedLine = line;
            
            // Check for list bullet
            const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
            if (isBullet) {
              processedLine = line.trim().substring(2);
            }
            
            // Render inline formats: bold **text** and inline `code`
            const inlineParts = processedLine.split(/(\*\*.*?\*\*|`.*?`)/g);
            const renderedLine = inlineParts.map((subPart, sIndex) => {
              if (subPart.startsWith("**") && subPart.endsWith("**")) {
                return <strong key={sIndex} className="font-bold text-on-surface">{subPart.slice(2, -2)}</strong>;
              }
              if (subPart.startsWith("`") && subPart.endsWith("`")) {
                return (
                  <code key={sIndex} className="bg-surface-container border border-outline-variant px-1 py-0.5 rounded text-[10px] font-mono text-tertiary">
                    {subPart.slice(1, -1)}
                  </code>
                );
              }
              return subPart;
            });

            if (isBullet) {
              return (
                <ul key={lIndex} className="list-disc pl-4 text-xs text-on-surface-variant">
                  <li>{renderedLine}</li>
                </ul>
              );
            }
            
            if (line.trim() === "") {
              return <div key={lIndex} className="h-1" />;
            }
            
            return <p key={lIndex} className="text-xs text-on-surface-variant leading-relaxed">{renderedLine}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
          isOpen 
            ? "bg-error text-on-error hover:scale-105" 
            : "bg-primary text-on-primary hover:scale-110 glow-primary animate-pulse"
        }`}
        title="Tassistant AI Guide"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[380px] h-[520px] max-h-[calc(100vh-100px)] rounded-xl border border-outline-variant bg-surface-container/90 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-slide-up transition-all">
          
          {/* Header */}
          <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  Tassistant Guide
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                </h3>
                <p className="text-[9px] text-on-surface-variant uppercase font-mono tracking-wider">TMCP Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/40">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                )}
                
                <div className={`p-3 rounded-lg text-xs space-y-1 ${
                  m.role === "user" 
                    ? "bg-primary text-on-primary rounded-tr-none font-medium shadow"
                    : "bg-surface-container border border-outline-variant/30 rounded-tl-none"
                }`}>
                  {m.role === "user" ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    parseMarkdown(m.content)
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary animate-spin" />
                </div>
                <div className="p-3 bg-surface-container border border-outline-variant/30 rounded-lg rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-error-container text-on-error-container border border-error/20 rounded-lg text-[11px] flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Chat Error</p>
                  <p className="opacity-90 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips (Shown only when chat is idle and key exists) */}
          {openrouterKey && messages.length === 1 && !isLoading && (
            <div className="px-4 py-2.5 border-t border-outline-variant/30 bg-surface-container-lowest/50 space-y-1.5">
              <p className="text-[9px] font-semibold text-on-surface-variant uppercase font-mono tracking-wider">Quick Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-full text-[10px] text-on-surface-variant hover:text-primary transition-all text-left cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Key Not Set Warning Panel */}
          {!openrouterKey && (
            <div className="p-4 border-t border-outline-variant bg-surface-container-high/60 flex flex-col items-center text-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center text-warning">
                <Key className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface">OpenRouter Key Required</p>
                <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-[280px]">
                  Tassistant requires an OpenRouter API key to converse. Please enter your key on the settings page.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard/settings");
                }}
                className="w-full py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Input Panel */}
          {openrouterKey && (
            <div className="p-3 bg-surface-container-high border-t border-outline-variant flex items-end gap-2 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Tassistant... (Press Enter)"
                disabled={isLoading}
                className="flex-1 bg-surface-container-lowest border border-outline-variant/70 rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:border-primary outline-none max-h-24 resize-none min-h-[36px]"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="h-[36px] w-[36px] bg-primary text-on-primary rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
