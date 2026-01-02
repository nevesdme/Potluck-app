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

    // Fetch responses
    const fetchResponses = async () => {
        const { data, error } = await supabase
            .from('responses')
            .select('*')
            .order('created_at')

        if (error) {
            console.error(error)
            return
        }

        setResponses(data || [])
    }

    // Load name from localStorage
    useEffect(() => {
        const storedName = localStorage.getItem('potluck_name')
        if (storedName) setName(storedName)
    }, [])

    // Realtime updates
    useEffect(() => {
        fetchResponses()

        const channel = supabase
            .channel('responses')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'responses' },
                fetchResponses
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    // Add or update dish
    const handleSubmit = async () => {
        if (!name.trim()) {
            alert('Please enter your name')
            return
        }

        let result

        if (editingId) {
            result = await supabase
                .from('responses')
                .update({ category, dish })
                .eq('id', editingId)
        } else {
            result = await supabase.from('responses').insert({
                name,
                category,
                dish,
            })
        }

        if (result.error) {
            alert(result.error.message)
            return
        }

        localStorage.setItem('potluck_name', name)

        setDish('')
        setCategory('Main')
        setEditingId(null)
    }

    const handleEdit = (r: Response) => {
        setEditingId(r.id)
        setCategory(r.category)
        setDish(r.dish)
        setName(r.name)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this dish?')) return
        await supabase.from('responses').delete().eq('id', id)
    }

    // Counts
    const counts = {
        Main: responses.filter(r => r.category === 'Main').length,
        Appetizer: responses.filter(r => r.category === 'Appetizer').length,
        Dessert: responses.filter(r => r.category === 'Dessert').length,
        Drink: responses.filter(r => r.category === 'Drink').length,
    }

    const totalPeople = Array.from(new Set(responses.map(r => r.name))).length

    const grouped: Record<string, Response[]> = {}
    responses.forEach(r => {
        if (!grouped[r.name]) grouped[r.name] = []
        grouped[r.name].push(r)
    })

    return (
        <main className="max-w-xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-2 text-center">🍽️ Potluck RSVP</h1>
            <p className="text-center mb-4 text-gray-700 dark:text-gray-300">
                Total people attending: {totalPeople}
            </p>

            <div className="mb-6 p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-semibold mb-2">Total dishes</h2>
                <ul className="flex justify-between text-sm">
                    <li>Main: {counts.Main}</li>
                    <li>Appetizer: {counts.Appetizer}</li>
                    <li>Dessert: {counts.Dessert}</li>
                    <li>Drink: {counts.Drink}</li>
                </ul>
            </div>

            {/* Form */}
            <div className="mb-6 p-4 border rounded bg-white dark:bg-gray-700">
                <label className="block mb-3">
                    <span className="font-medium">Name:</span>
                    <input
                        className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </label>

                <h2 className="font-semibold mb-2">
                    {editingId ? 'Edit Dish' : 'Add a Dish'}
                </h2>

                <div className="mb-2">
                    Category:
                    {['Main', 'Appetizer', 'Dessert', 'Drink'].map(cat => (
                        <button
                            key={cat}
                            type="button"
                            className={`ml-2 px-2 py-1 border rounded ${category === cat
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white dark:bg-gray-600'
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
                        className="ml-2 border rounded px-2 py-1 bg-gray-50 dark:bg-gray-600"
                        value={dish}
                        onChange={e => setDish(e.target.value)}
                    />
                </label>

                <button
                    className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
                    onClick={handleSubmit}
                >
                    {editingId ? 'Update Dish' : 'Add Dish'}
                </button>
            </div>

            {/* Responses */}
            <div className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
                <h2 className="font-semibold mb-2">All Responses</h2>

                {Object.entries(grouped).map(([person, dishes]) => (
                    <div key={person} className="mb-2">
                        <p className="font-semibold">{person}</p>
                        <ul className="ml-4">
                            {dishes.map(d => (
                                <li key={d.id} className="flex justify-between">
                                    <span>
                                        {d.category} ({d.dish || '-'})
                                    </span>
                                    <span className="space-x-1">
                                        <button
                                            className="px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded"
                                            onClick={() => handleEdit(d)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded"
                                            onClick={() => handleDelete(d.id)}
                                        >
                                            Delete
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </main>
    )
}
