import { createContext, useContext, useState, ReactNode } from 'react'

export type ContactType = 'Customer' | 'Vendor' | 'Both'

export interface Contact {
    id: string
    type: ContactType
    name: string
    email: string
    phone: string
    company: string
    address: string
    balance: number // positive = they owe us (A/R), negative = we owe them (A/P)
    status: 'Active' | 'Inactive'
}

const SEED: Contact[] = [
    { id: '1', type: 'Customer', name: 'James Whitfield', email: 'j.whitfield@acme.com', phone: '+1 555-0101', company: 'Acme Corp', address: '123 Main St, NY', balance: 8400, status: 'Active' },
    { id: '2', type: 'Customer', name: 'Sara Patel', email: 'sara@techwave.io', phone: '+1 555-0142', company: 'TechWave Inc', address: '456 Oak Ave, CA', balance: 12600, status: 'Active' },
    { id: '3', type: 'Customer', name: 'Marco Rossi', email: 'marco@globaltraders.eu', phone: '+44 7700 900', company: 'Global Traders', address: '1 Bond St, London', balance: 3200, status: 'Active' },
    { id: '4', type: 'Vendor', name: 'Office Depot', email: 'ap@officedepot.com', phone: '+1 800-463-3768', company: 'Office Depot', address: '200 Supply Rd, TX', balance: -2100, status: 'Active' },
    { id: '5', type: 'Vendor', name: 'AWS', email: 'billing@aws.amazon.com', phone: '+1 206-266-1000', company: 'Amazon', address: '410 Terry Ave N, WA', balance: -4800, status: 'Active' },
    { id: '6', type: 'Both', name: 'DataSync Ltd', email: 'hello@datasync.io', phone: '+1 555-0199', company: 'DataSync Ltd', address: '77 Tech Blvd, SF', balance: 1500, status: 'Active' },
    { id: '7', type: 'Customer', name: 'Lisa Chen', email: 'lchen@brightmedia.co', phone: '+1 555-0177', company: 'Bright Media', address: '900 Sunset Blvd, LA', balance: 0, status: 'Inactive' },
]

interface ContactsContextType {
    contacts: Contact[]
    addContact: (c: Omit<Contact, 'id'>) => void
    updateContact: (id: string, updates: Partial<Contact>) => void
    deleteContact: (id: string) => void
}

const ContactsContext = createContext<ContactsContextType | null>(null)

export function ContactsProvider({ children }: { children: ReactNode }) {
    const [contacts, setContacts] = useState<Contact[]>(SEED)

    function addContact(c: Omit<Contact, 'id'>) {
        const newContact: Contact = { ...c, id: Date.now().toString() }
        setContacts(prev => [...prev, newContact])
    }

    function updateContact(id: string, updates: Partial<Contact>) {
        setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    }

    function deleteContact(id: string) {
        setContacts(prev => prev.filter(c => c.id !== id))
    }

    return (
        <ContactsContext.Provider value={{ contacts, addContact, updateContact, deleteContact }}>
            {children}
        </ContactsContext.Provider>
    )
}

export function useContacts() {
    const ctx = useContext(ContactsContext)
    if (!ctx) throw new Error('useContacts must be used inside ContactsProvider')
    return ctx
}
