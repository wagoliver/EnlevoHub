import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/stores/chat.store'
import { aiAPI } from '@/lib/api-client'

export function AIChatBubble() {
  const { isOpen, messages, isLoading, toggleOpen, setOpen, addMessage, setLoading, clearMessages } = useChatStore()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setInput('')
    addMessage({ role: 'user', content: trimmed })
    setLoading(true)

    try {
      // Enviar últimas 6 mensagens como contexto
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const data = await aiAPI.chat(trimmed, history)
      addMessage({ role: 'assistant', content: data.response })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: 'Desculpe, não consegui processar sua pergunta. O serviço de IA pode estar indisponível.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] max-h-[500px] flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl sm:right-6">
          {/* Header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-[#21252d] px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b8a378]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Enlevo IA</p>
                <p className="text-xs text-neutral-400">Assistente do EnlevoHub</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  title="Limpar conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '340px', minHeight: '200px' }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#b8a378]/10">
                  <Sparkles className="h-6 w-6 text-[#b8a378]" />
                </div>
                <p className="text-sm font-medium text-neutral-700">Como posso ajudar?</p>
                <p className="mt-1 text-xs text-neutral-400">Pergunte sobre funcionalidades do EnlevoHub</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {[
                    'Como cadastro um fornecedor?',
                    'Como criar um projeto?',
                    'O que é SINAPI?',
                  ].map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setInput(q)
                        setTimeout(() => handleSend(), 0)
                      }}
                      className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-[#b8a378] hover:text-[#b8a378] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-[#b8a378] text-white rounded-br-md'
                      : 'bg-neutral-100 text-neutral-700 rounded-bl-md'
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-neutral-400" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-neutral-100 p-3">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pergunte algo..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm text-neutral-700 placeholder:text-neutral-400 outline-none disabled:opacity-50"
                maxLength={1000}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#b8a378] text-white transition-all hover:bg-[#a09068] disabled:opacity-30 disabled:hover:bg-[#b8a378]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-neutral-300">
              Qwen3 1.7B — respostas podem conter imprecisões
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleOpen}
        className={cn(
          'fixed bottom-4 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 sm:right-6',
          isOpen
            ? 'bg-neutral-600 hover:bg-neutral-700'
            : 'bg-[#b8a378] hover:bg-[#a09068]'
        )}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Sparkles className="h-6 w-6 text-white" />
        )}
      </button>
    </>
  )
}
