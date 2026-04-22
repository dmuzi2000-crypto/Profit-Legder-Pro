import React, { useState } from 'react'
import { toast } from 'sonner'
import { Sparkles, X, Check, Loader2, ArrowRight } from 'lucide-react'
import { useLedger } from '../../hooks/useLedger'
import { useContacts } from '../../hooks/useContacts'
import { useAccounts } from '../../hooks/useAccounts'
import { CATEGORIES } from '../../contexts/AccountsContext'

function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase().trim()
  if (t.includes(q) || q.includes(t)) return 1
  const qWords = q.split(/\s+/)
  const tWords = t.split(/\s+/)
  const matches = qWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw)))
  return matches.length / Math.max(qWords.length, tWords.length)
}

function fuzzyMatch<T extends { name: string }>(query: string, list: T[], threshold = 0.35): T | null {
  if (!query) return null
  let best: T | null = null
  let bestScore = 0
  for (const item of list) {
    const score = fuzzyScore(query, item.name) 
    if (score > bestScore) { bestScore = score; best = item }
  }
  return bestScore >= threshold ? best : null
}

interface AiEntryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface AiPreview {
  details: string
  type?: string
  amount: number
  entry_date?: string
  account_id?: string | null
  account_name?: string | null
  contact_id?: string | null
  contact_name?: string | null
  _suggestedContact?: { id: string; name: string } | null
  _contactAccepted?: boolean
}

const VALID_TYPES = ['Revenue', 'Cost of Sales', 'Operational Expenses', 'Other Income', 'Interest Expense', 'Tax Expense'] as const

export default function AiEntryModal({ isOpen, onClose }: AiEntryModalProps) {
  const { addEntry } = useLedger()
  const { contacts } = useContacts()
  const { accounts } = useAccounts()
  const [userInput, setUserInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previews, setPreviews] = useState<AiPreview[]>([])
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
      const accountsList = accounts.map(a => `${a.id}: ${a.code} - ${a.name} (${a.category})`).join('\n')
      const contactsList = contacts.map(c => `${c.name} (${c.type}${c.company ? ', ' + c.company : ''})`).join('\n')
      
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
              content: "Extract ledger entries from user text. Return ONLY valid JSON: {\"transactions\": [{\"details\":\"...\",\"account_id\":\"...\",\"account_name\":\"...\",\"amount\":number, \"entry_date\": \"YYYY-MM-DD\", \"contact_name\": \"...\"}]}. \n\n" +
                "Match the transaction to the most relevant account from this list:\n" + accountsList + "\n\n" +
                "Match contact_name from this list if mentioned:\n" + contactsList + "\nIf no match leave contact_name as null.\n\n" +
                "Multiple transactions if user describes multiple. Set account_id (the ID before the colon) and account_name exactly. Expenses are negative numbers, income positive. entry_date and contact_name are optional. No explanation, no markdown, just JSON." 
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
        const cleanedContent = content.trim().replace(/^```json/, '').replace(/```$/, '').trim()
        const parsed = JSON.parse(cleanedContent)
        
        const transactions: AiPreview[] = (parsed.transactions ?? [parsed]).map((t: any) => {
          if (!t.details || typeof t.amount !== 'number') return null
          
          let contact_id = t.contact_id ?? null
          let contact_name = t.contact_name ?? null
          let suggestedContact = null

          if (contact_name) {
            const exact = contacts.find(c => c.name.toLowerCase() === contact_name.toLowerCase())
            if (exact) { 
              contact_id = exact.id
              contact_name = exact.name 
            } else {
              const fuzzy = fuzzyMatch(contact_name, contacts)
              if (fuzzy) suggestedContact = { id: fuzzy.id, name: fuzzy.name }
            }
          } else {
            const fuzzy = fuzzyMatch(t.details, contacts)
            if (fuzzy) suggestedContact = { id: fuzzy.id, name: fuzzy.name }
          }

          if (!t.account_id && t.account_name) {
            const matched = accounts.find(a => a.name.toLowerCase() === t.account_name?.toLowerCase())
              ?? fuzzyMatch(t.account_name, accounts)
            if (matched) { 
              t.account_id = matched.id
              t.account_name = matched.name 
            }
          }
          
          return { ...t, contact_id, contact_name, _suggestedContact: suggestedContact, _contactAccepted: false }
        }).filter(Boolean)

        if (transactions.length === 0) throw new Error('Invalid format')
        setPreviews(transactions)
      } catch (e) {
        toast.error("Couldn't parse, try rephrasing")
      }
    } catch (err) {
      toast.error("Couldn't parse, try rephrasing")
    } finally {
      setIsLoading(false)
    }
  }

  function normalizeType(raw: string): string {
    const t = raw.trim().toLowerCase()
    return VALID_TYPES.find(et => et.toLowerCase() === t) 
      ?? VALID_TYPES.find(et => t.includes(et.toLowerCase().split(' ')[0]))
      ?? 'Operational Expenses'
  }

  async function handleConfirmAll() {
    if (previews.length === 0) return
    setIsConfirming(true)

    const today = new Date().toISOString().split('T')[0]
    let errors = 0

    for (const preview of previews) {
      const entryDate = preview.entry_date || today
      
      let entryType = preview.type || ''
      if (preview.account_id) {
        const acc = accounts.find(a => a.id === preview.account_id)
        if (acc) entryType = acc.subcategory
      }

      const { error } = await addEntry(
        preview.details, 
        normalizeType(entryType), 
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
      if (error) errors++
    }

    if (errors === 0) {
      toast.success(`${previews.length} transaction${previews.length > 1 ? 's' : ''} posted`)
      handleClose()
    } else {
      toast.error(`${errors} transaction(s) failed`)
    }
    setIsConfirming(false)
  }

  function handleClose() {
    setUserInput('')
    setPreviews([])
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

        {previews.length === 0 ? (
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
            {previews.length > 1 && (
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 16, fontFamily: 'DM Mono, monospace', background: 'rgba(245,166,35,0.1)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(245,166,35,0.2)' }}>
                {previews.length} TRANSACTIONS DETECTED
              </div>
            )}

            <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {previews.map((preview, idx) => (
                <div key={idx} style={{ background: 'var(--bg3)', borderRadius: 16, padding: 20, border: '1px solid var(--border1)' }}>
                  {preview._suggestedContact && !preview._contactAccepted && (
                    <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Sparkles size={14} color="var(--purple)" />
                      <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>
                        Suggested contact: <strong style={{ color: 'var(--purple)' }}>{preview._suggestedContact.name}</strong>
                      </span>
                      <button onClick={() => setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, contact_id: p._suggestedContact!.id, contact_name: p._suggestedContact!.name, _contactAccepted: true } : p))}
                        style={{ padding: '3px 10px', background: 'rgba(167,139,250,0.15)', border: '1px solid var(--purple)', borderRadius: 6, color: 'var(--purple)', fontSize: 11, cursor: 'pointer' }}>Accept</button>
                      <button onClick={() => setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, _suggestedContact: null } : p))}
                        style={{ padding: '3px 8px', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}><X size={12} /></button>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, letterSpacing: '0.05em' }}>DESCRIPTION</label>
                      <input 
                        value={preview.details} 
                        onChange={e => setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, details: e.target.value } : p))}
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
                            setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, account_id: id || null, account_name: acc?.name || null } : p))
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
                          onChange={e => setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, amount: parseFloat(e.target.value) || 0 } : p))}
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
                          onChange={e => setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, entry_date: e.target.value } : p))}
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
                            setPreviews(ps => ps.map((p, i) => i === idx ? { ...p, contact_id: id || null, contact_name: contact?.name || null } : p))
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
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button 
                onClick={() => setPreviews([])}
                style={{ 
                  flex: 1, height: 48, background: 'var(--bg3)', border: '1px solid var(--border2)', 
                  borderRadius: 12, color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' 
                }}
              >
                Back
              </button>
              <button 
                onClick={handleConfirmAll}
                disabled={isConfirming}
                style={{ 
                  flex: 2, height: 48, background: 'var(--green)', border: 'none', 
                  borderRadius: 12, color: '#0a0c10', fontWeight: 800, 
                  cursor: isConfirming ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 
                }}
              >
                {isConfirming ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Confirm & Post All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
