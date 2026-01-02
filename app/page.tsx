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
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loadedFromLocal, setLoadedFromLocal] = useState(false) // ensure localStorage runs only on client

    // Fetch all responses
    const fetchResponses = async () => {
        const { data } = await supabase.from('responses').select('*')
        setResponses(data || [])
    }

    // Load my ID from localStorage (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return
        const storedId = localStorage.getItem('potluck_response_id')
        if (storedId) setEditingId(storedId)
        setLoadedFromLocal(true)
    }, [])

    // Realtime subscription
    useEffect(() => {
        fetchResponses()
        const channel = supabase
            .channel('responses')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'responses' },
                () => fetchResponses()
            )
            .subscribe()
        return () => supabase.removeChannel(channel)
    }, [])

    // Handle submit (add or update dish)
    const handleSubmit = async () => {
        if (!name) return alert('Please enter your name')

        if (editingId) {
            // Update existing dish
            await supabase
                .from('responses')
                .update({ category, dish, attending })
                .eq('id', editingId)
        } else {
            // Insert new dish
            const { data } = await supabase
                .from('responses')
                .insert({ name, attending, category, dish })
                .select()
            if (data && data[0] && typeof window !== 'undefined') {
                localStorage.setItem('potluck_response_id', data[0].id)
            }
        }

        // Reset form
        setCategory('Main')
        setDish('')
        setEditingId(null)
    }

    // Handle edit
    const handleEdit = (r: Response) => {
        setEditingId(r.id)
        setCategory(r.category)
        setDish(r.dish)
        setName(r.name)
        setAttending(r.attending)
    }

    // Handle delete
    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this dish?')) {
            await supabase.from('responses').delete().eq('id', id)
            fetchResponses() // ensure UI updates immediately
        }
    }

    // Compute counts
    const counts = {
        Main: responses.filter(r => r.attending && r.category === 'Main').length,
        Appetizer: responses.filter(r => r.attending && r.category === 'Appetizer').length,
        Dessert: responses.filter(r => r.attending && r.category === 'Dessert').length,
        Drink: responses.filter(r => r.attending && r.category === 'Drink').length,
    }

    // Total attending (unique names)
    const totalAttending = responses
        .filter(r => r.attending)
        .map(r => r.name)
        .filter((v, i, a) => a.indexOf(v) === i).length

    // Group responses by name
    const groupedResponses: Record<string, Response[]> = {}
    responses.forEach(r => {
        if (!groupedResponses[r.name]) groupedResponses[r.name] = []
        groupedResponses[r.name].push(r)
    })

    return (
        <main className="max-w-xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-2 text-center">🍽️ Potluck RSVP</h1>
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
            {loadedFromLocal && (
                <div className="mb-6 p-4 border rounded bg-white dark:bg-gray-700">
                    <h2 className="font-semibold mb-2">{editingId ? 'Edit Dish' : 'Add a Dish'}</h2>

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
                            <input type="radio" checked={attending} onChange={() => setAttending(true)} /> Yes
                        </label>
                        <label className="ml-2">
                            <input type="radio" checked={!attending} onChange={() => setAttending(false)} /> No
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
                                Dish:
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
                        {editingId ? 'Update Dish' : 'Add Dish'}
                    </button>
                </div>
            )}

            {/* All Responses */}
            <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-semibold mb-2">All Responses</h2>
                {Object.entries(groupedResponses).map(([person, dishes]) => (
                    <div key={person} className="mb-2">
                        <p className="font-semibold">{person} — {dishes[0].attending ? 'Attending' : 'Not attending'}</p>
                        <ul className="ml-4">
                            {dishes.map(r => (
                                <li key={r.id} className="flex items-center justify-between">
                                    <span>
                                        {r.category} ({r.dish || '-'})
                                    </span>
                                    {r.attending && (
                                        <span className="space-x-1">
                                            <button
                                                className="px-2 py-1 text-sm bg-yellow-500 dark:bg-yellow-600 text-white rounded"
                                                onClick={() => handleEdit(r)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="px-2 py-1 text-sm bg-red-500 dark:bg-red-600 text-white rounded"
                                                onClick={() => handleDelete(r.id)}
                                            >
                                                Delete
                                            </button>
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </main>
    )
}
