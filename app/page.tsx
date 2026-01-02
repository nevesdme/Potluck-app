'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Response = {
    id: string
    name: string
    attending: boolean
    category: string
    dish: string
}

export default function Page() {
    const [responses, setResponses] = useState<Response[]>([])
    const [name, setName] = useState('')
    const [attending, setAttending] = useState(true)
    const [category, setCategory] = useState('Main')
    const [dish, setDish] = useState('')
    const [myId, setMyId] = useState<string | null>(null)

    // Fetch all responses
    const fetchResponses = async () => {
        const { data } = await supabase.from('responses').select('*')
        setResponses(data || [])
    }

    // Load my previous response from localStorage
    useEffect(() => {
        const storedId = localStorage.getItem('potluck_response_id')
        if (storedId) {
            setMyId(storedId)
            supabase
                .from('responses')
                .select('*')
                .eq('id', storedId)
                .then(({ data }) => {
                    if (data && data[0]) {
                        const r = data[0]
                        setName(r.name)
                        setAttending(r.attending)
                        setCategory(r.category || 'Main')
                        setDish(r.dish || '')
                    }
                })
        }
        fetchResponses()
    }, [])

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel('responses')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'responses' },
                () => fetchResponses()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Handle submit
    const handleSubmit = async () => {
        if (!name) return alert('Please enter your name')

        if (myId) {
            // Update existing
            await supabase
                .from('responses')
                .update({ name, attending, category, dish })
                .eq('id', myId)
        } else {
            // Insert new
            const { data } = await supabase
                .from('responses')
                .insert({ name, attending, category, dish })
                .select()
            if (data && data[0]) {
                setMyId(data[0].id)
                localStorage.setItem('potluck_response_id', data[0].id)
            }
        }
    }

    // Compute counts
    const counts = {
        Main: responses.filter(r => r.attending && r.category === 'Main').length,
        Appetizer: responses.filter(r => r.attending && r.category === 'Appetizer').length,
        Dessert: responses.filter(r => r.attending && r.category === 'Dessert').length,
        Drink: responses.filter(r => r.attending && r.category === 'Drink').length,
    }

    // Add total count of people
    const totalAttending = responses.filter(r => r.attending).length

    return (
        <main className="max-w-xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4 text-center">🍽️ Potluck RSVP</h1>

            <p className="text-center mb-4 text-gray-700 dark:text-gray-300">
                Total people attending: {totalAttending}
            </p>

            {/* Live Counts */}
            <div className="mb-6 p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-semibold mb-2">Live Counts</h2>
                <ul className="flex justify-between text-sm">
                    <li>Main: {counts.Main}</li>
                    <li>Appetizer: {counts.Appetizer}</li>
                    <li>Dessert: {counts.Dessert}</li>
                    <li>Drink: {counts.Drink}</li>
                </ul>
            </div>

            {/* RSVP Form */}
            <div className="mb-6 p-4 border rounded bg-white dark:bg-gray-700">
                <h2 className="font-semibold mb-2">Your RSVP</h2>

                <label className="block mb-2">
                    Name:
                    <input
                        type="text"
                        className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </label>

                <div className="mb-2">
                    Attending?
                    <label className="ml-2">
                        <input
                            type="radio"
                            checked={attending}
                            onChange={() => setAttending(true)}
                        />{' '}
                        Yes
                    </label>
                    <label className="ml-2">
                        <input
                            type="radio"
                            checked={!attending}
                            onChange={() => setAttending(false)}
                        />{' '}
                        No
                    </label>
                </div>

                {attending && (
                    <>
                        <div className="mb-2">
                            Category:
                            {['Main', 'Appetizer', 'Dessert', 'Drink'].map(cat => (
                                <button
                                    key={cat}
                                    className={`ml-2 px-2 py-1 border rounded ${category === cat
                                            ? 'bg-blue-500 text-white dark:bg-blue-600'
                                            : 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                                        }`}
                                    onClick={() => setCategory(cat)}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <label className="block mb-2">
                            Dish (optional):
                            <input
                                type="text"
                                className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                                value={dish}
                                onChange={e => setDish(e.target.value)}
                            />
                        </label>
                    </>
                )}

                <button
                    className="mt-2 px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded hover:bg-green-600 dark:hover:bg-green-700"
                    onClick={handleSubmit}
                >
                    Save
                </button>
            </div>

            {/* All Responses */}
            <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-semibold mb-2">All Responses</h2>
                <ul className="text-sm">
                    {responses.map(r => (
                        <li key={r.id}>
                            {r.name} — {r.attending ? `${r.category} (${r.dish || '-'})` : 'Not attending'}
                        </li>
                    ))}
                </ul>
            </div>
        </main>
    )
}
