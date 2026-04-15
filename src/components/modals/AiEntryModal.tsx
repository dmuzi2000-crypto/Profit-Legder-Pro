import React, { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, X, Check, Loader2, ArrowRight } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useContacts } from '../../hooks/useContacts'
import { useAccounts } from '../../hooks/useAccounts'
import { CATEGORIES } from '../../contexts/AccountsContext'

interface AiEntryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AiPreview {
  details: string
  type: string
  amount: number
  entry_date?: string
  account_id?: string | null
  account_name?: string | null
  contact_id?: string | null
  contact_name?: string | null
}

const VALID_TYPES = ['Revenue', 'Cost of Sales', 'Operational Expenses', 'Other Income', 'Interest Expense', 'Tax Expense'] as const

export default function AiEntryModal({ isOpen, onClose }: AiEntryModalProps) {
  const { addEntry } = useLedger()
  const { contacts } = useContacts()
  const { accounts } = useAccounts()
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<AiPreview | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userInput.trim()) return

    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      toast.error('API Key Missing: VITE_GROQ_API_KEY not found in environment.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "Extract a ledger entry from user text. Return ONLY valid JSON: {\"details\":\"...\",\"type\":\"...\",\"amount\":number, \"entry_date\": \"YYYY-MM-DD\", \"contact_name\": \"...\"}. Type must be one of: Revenue, Cost of Sales, Operational Expenses, Other Income, Interest Expense, Tax Expense. Expenses are negative numbers, income positive. entry_date and contact_name are optional, provide them ONLY if mentioned or implied (e.g. 'paid AWS' implies contact_name: 'AWS'). No explanation, no markdown, just JSON." 
            },
            { role: "user", content: userInput }
          ]
        })
      })

      if (!response.ok) {
        throw new Error('API request failed')
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      
      try {
        // Clean up possible markdown or extra spaces
        const cleanedContent = content.trim().replace(/^```json/, '').replace(/```$/, '').trim()
        const parsed: AiPreview = JSON.parse(cleanedContent)
        
        if (!parsed.details || !parsed.type || typeof parsed.amount !== 'number') {
          throw new Error('Invalid format')
        }
        
        if (parsed.contact_name) {
          const matched = contacts.find(c => c.name.toLowerCase() === parsed.contact_name?.toLowerCase())
          if (matched) {
            parsed.contact_id = matched.id
            parsed.contact_name = matched.name
          }
        }

        // Match account
        const matchedAccount = accounts.find(a => 
          a.name.toLowerCase() === parsed.details.toLowerCase() || 
          a.subcategory.toLowerCase() === parsed.type.toLowerCase()
        )
        if (matchedAccount) {
          parsed.account_id = matchedAccount.id
          parsed.account_name = matchedAccount.name
        }
        
        setPreview(parsed)
      } catch (e) {
        toast.error("Couldn't parse, try rephrasing")
      }
    } catch (err) {
      toast.error("Couldn't parse, try rephrasing")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleConfirm() {
    if (!preview) return
    setIsConfirming(true)

    const entryDate = preview.entry_date || new Date().toISOString().split('T')[0]
    const { error } = await addEntry(
      preview.details, 
      preview.type, 
      preview.amount, 
      entryDate, 
      preview.contact_name || null, 
      'paid', 
      null, 
      preview.account_id || null, 
      preview.account_name || null, 
      null, 
      preview.contact_id || null
    )

    if (error) {
      toast.error(error)
    } else {
      toast.success('Transaction added via AI')
      handleClose()
    }
    setIsConfirming(false)
  }

  function handleClose() {
    setUserInput('')
    setPreview(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div 
      style={{ 
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', 
        backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', zIndex: 1000 
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div 
        style={{ 
          background: 'var(--bg2)', border: '1px solid var(--border2)', 
          borderRadius: 24, padding: 32, width: 520, maxWidth: '95vw',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, background: 'rgba(167,139,250,0.1)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)' 
          }}>
            <Sparkles size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>AI Transaction Entry</h2>
            <p style={{ fontSize: 13, color: 'var(--text3)', margin: 0 }}>Tell me what happened and I'll record it for you.</p>
          </div>
          <button 
            onClick={handleClose}
            style={{ 
              background: 'none', border: 'none', color: 'var(--text3)', 
              cursor: 'pointer', padding: 8, borderRadius: 8 
            }}
          >
            <X size={20} />
          </button>
        </div>

        {!preview ? (
          <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
            <div style={{ position: 'relative' }}>
              <textarea 
                autoFocus
                value={userInput}
                onChange={e => setUserInput(e.target.value)}
                placeholder='e.g. "Paid 1200 for office rent" or "Received 5000 from client for web design"'
                style={{ 
                  width: '100%', height: 120, background: 'var(--bg3)', 
                  border: '1px solid var(--border1)', borderRadius: 16, 
                  padding: 16, color: 'var(--text1)', fontSize: 14, 
                  resize: 'none', fontFamily: 'inherit', outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = 'var(--purple)'}
                onBlur={e => e.currentTarget.style.borderColor = 'var(--border1)'}
              />
              <div style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 10, color: 'var(--text3)' }}>
                Powered by Llama 3.3
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading || !userInput.trim()}
              style={{ 
                marginTop: 20, width: '100%', height: 50, background: 'var(--purple)', 
                border: 'none', borderRadius: 12, color: '#0a0c10', 
                fontSize: 15, fontWeight: 800, cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'transform 0.2s, opacity 0.2s',
                opacity: isLoading || !userInput.trim() ? 0.6 : 1
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Generate Entry
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div style={{ marginTop: 24 }}>
            <div style={{ background: 'var(--bg3)', borderRadius: 16, padding: 20, border: '1px solid var(--border1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>DESCRIPTION</label>
                  <input 
                    value={preview.details} 
                    onChange={e => setPreview({ ...preview, details: e.target.value })}
                    style={{ 
                      width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', 
                      borderRadius: 10, padding: '10px 12px', color: 'var(--text1)', fontSize: 14 
                    }}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>ACCOUNT</label>
                    <select 
                      value={preview.account_id || ''} 
                      onChange={e => {
                        const id = e.target.value
                        const acc = accounts.find(a => a.id === id)
                        setPreview({ ...preview, account_id: id || null, account_name: acc?.name || null })
                      }}
                      style={{ 
                        width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', 
                        borderRadius: 10, padding: '10px 12px', color: 'var(--text1)', fontSize: 14 
                      }}
                    >
                      <option value="">Select Account...</option>
                      {CATEGORIES.map(cat => {
                        const catAccounts = accounts.filter(a => a.category === cat)
                        if (catAccounts.length === 0) return null
                        return (
                          <optgroup key={cat} label={cat.toUpperCase()}>
                            {catAccounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                          </optgroup>
                        )
                      })}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>AMOUNT</label>
                    <input 
                      type="number"
                      value={preview.amount} 
                      onChange={e => setPreview({ ...preview, amount: parseFloat(e.target.value) || 0 })}
                      style={{ 
                        width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', 
                        borderRadius: 10, padding: '10px 12px', color: preview.amount < 0 ? 'var(--red)' : 'var(--green)', 
                        fontSize: 14, fontWeight: 700, textAlign: 'right' 
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>DATE</label>
                    <input 
                      type="date"
                      value={preview.entry_date || new Date().toISOString().split('T')[0]} 
                      onChange={e => setPreview({ ...preview, entry_date: e.target.value })}
                      style={{ 
                        width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', 
                        borderRadius: 10, padding: '10px 12px', color: 'var(--text1)', 
                        fontSize: 14 
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>CONTACT</label>
                    <select 
                      value={preview.contact_id || ''} 
                      onChange={e => {
                        const id = e.target.value
                        const contact = contacts.find(c => c.id === id)
                        setPreview({ ...preview, contact_id: id || null, contact_name: contact?.name || null })
                      }}
                      style={{ 
                        width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', 
                        borderRadius: 10, padding: '10px 12px', color: 'var(--text1)', 
                        fontSize: 14 
                      }}
                    >
                      <option value="">None</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                onClick={() => setPreview(null)}
                style={{ 
                  flex: 1, height: 48, background: 'var(--bg3)', border: '1px solid var(--border2)', 
                  borderRadius: 12, color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Back
              </button>
              <button 
                onClick={handleConfirm}
                disabled={isConfirming}
                style={{ 
                  flex: 2, height: 48, background: 'var(--green)', border: 'none', 
                  borderRadius: 12, color: '#0a0c10', fontWeight: 800, 
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 
                }}
              >
                {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Confirm & Post
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
