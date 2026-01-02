'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Response = {
    id: string
    name: string
    category: string
    dish: string
}

export default function Page() {
    const [responses, setResponses] = useState<Response[]>([])
    const [name, setName] = useState('')
    const [category, setCategory] = useState('Main')
    const [dish, setDish] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [loadedFromLocal, setLoadedFromLocal] = useState(false) // client-only localStorage

    // Fetch all responses
    const fetchResponses = async () => {
        const { data } = await supabase.from('responses').select('*')
        setResponses(data || [])
    }

    // Load name from localStorage (client-side only)
    useEffect(() => {
        if (typeof window === 'undefined') return

        const storedName = localStorage.getItem('potluck_name')
        if (storedName) setName(storedName)

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

        return () => {
            void supabase.removeChannel(channel)
        }
    }, [])

    // Handle submit (add or update dish)
    const handleSubmit = async () => {
        if (!name) return alert('Please enter your name')

        if (editingId) {
            // Update existing dish
            await supabase
                .from('responses')
                .update({ category, dish })
                .eq('id', editingId)
                .eq('name', name) // only allow update for this name
        } else {
            // Insert new dish
            const { data } = await supabase
                .from('responses')
                .insert({ name, category, dish })
                .select()
            if (data && data[0] && typeof window !== 'undefined') {
                // store name for next dish
                localStorage.setItem('potluck_name', name)
            }
        }

        // Reset form, keep name prefilled
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
    }

    // Handle delete
    const handleDelete = async (id: string, category: string, dish: string) => {
        const dishName = dish || '-'
        if (confirm(`Are you sure you want to delete ${category} (${dishName})?`)) {
            await supabase
                .from('responses')
                .delete()
                .eq('id', id)
                .eq('name', name)
            fetchResponses()
        }
    }

    // Compute counts per category
    const counts = {
        Main: responses.filter(r => r.category === 'Main').length,
        Appetizer: responses.filter(r => r.category === 'Appetizer').length,
        Dessert: responses.filter(r => r.category === 'Dessert').length,
        Drink: responses.filter(r => r.category === 'Drink').length,
    }

    // Total attending = unique names
    const totalAttending = responses
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
                <h2 className="font-semibold mb-2">Total dishes/drinks</h2>
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
                    {/* Name always visible */}
                    <label className="block mb-3">
                        <span className="font-medium">Name:</span>
                        <input
                            type="text"
                            className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </label>

                    {/* Title AFTER name */}
                    <h2 className="font-semibold mb-2">
                        {editingId ? 'Edit Dish' : 'Add a Dish'}
                    </h2>

                    {/* Category */}
                    <div className="mb-2">
                        Category:
                        {['Main', 'Appetizer', 'Dessert', 'Drink'].map(cat => (
                            <button
                                key={cat}
                                type="button"
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

                    {/* Dish name */}
                    <label className="block mb-2">
                        Dish/Drink name (optional):
                        <input
                            type="text"
                            className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                            value={dish}
                            onChange={e => setDish(e.target.value)}
                            placeholder="Optional"
                        />
                    </label>

                    {/* Save button */}
                    <button
                        className="mt-2 px-4 py-2 bg-green-500 dark:bg-green-600 text-white rounded"
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
                        <p className="font-semibold">{person}</p>
                        <ul className="ml-4">
                            {dishes.map(r => (
                                <li key={r.id} className="flex items-center justify-between">
                                    <span>
                                        {r.category} ({r.dish || '-'})
                                    </span>
                                    <span className="space-x-1">
                                        {r.name === name && (
                                            <>
                                                <button
                                                    className="px-1.5 py-0.5 text-xs bg-yellow-500 dark:bg-yellow-600 text-white rounded"
                                                    onClick={() => handleEdit(r)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="px-1.5 py-0.5 text-xs bg-red-500 dark:bg-red-600 text-white rounded"
                                                    onClick={() => handleDelete(r.id, r.category, r.dish)}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="mt-4 p-4 border rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm">
                To edit/delete your dish, just write your name as before and the edit/remove button will appear on your items.
            </div>
        </main>
    )
}
