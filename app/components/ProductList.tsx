'use client'

import { updateStock, deleteProduct } from '@/app/actions/inventory'
import { Minus, Plus, Trash2, Package } from 'lucide-react'
import { useState } from 'react'

type Product = {
    id: number
    name: string
    quantity: number
    price: number
}

export default function ProductList({ initialProducts }: { initialProducts: Product[] }) {
    // We strictly use server actions for mutation, so local state for list isn't strictly necessary if we revalidate path.
    // However, fast persistent updates are UX gold. The revalidatePath in server action handles the data refresh.
    // We'll trust the server data passed down.

    // Optimistic UI could be added here but for simplicity and robustness we rely on server revalidation which Next.js handles effectively.

    // We do need loading states for individual item actions to prevent spamming
    const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({})
    const [deleteId, setDeleteId] = useState<number | null>(null)

    async function handleStock(id: number, amount: number) {
        setLoadingMap(prev => ({ ...prev, [id]: true }))
        await updateStock(id, amount)
        setLoadingMap(prev => ({ ...prev, [id]: false }))
    }

    function handleDeleteClick(id: number) {
        setDeleteId(id)
    }

    async function confirmDelete() {
        if (deleteId === null) return

        const id = deleteId
        setLoadingMap(prev => ({ ...prev, [id]: true }))
        setDeleteId(null) // Close modal immediately

        await deleteProduct(id)
        setLoadingMap(prev => ({ ...prev, [id]: false }))
    }

    if (initialProducts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-zinc-500 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <Package size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Add your first item to get started</p>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialProducts.map((product) => (
                <div
                    key={product.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg transition-all duration-300 group"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">{product.name}</h3>
                            <p className="text-zinc-500 font-medium">${product.price.toFixed(2)}</p>
                        </div>
                        <button
                            onClick={() => handleDeleteClick(product.id)}
                            className="text-zinc-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                        <span className="text-sm font-medium text-zinc-500">In Stock</span>
                        <span className={`text-2xl font-bold ${product.quantity < 5 ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
                            {product.quantity}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button
                            onClick={() => handleStock(product.id, -1)}
                            disabled={loadingMap[product.id] || product.quantity <= 0}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Minus size={18} />
                            Sell
                        </button>
                        <button
                            onClick={() => handleStock(product.id, 1)}
                            disabled={loadingMap[product.id]}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95"
                        >
                            <Plus size={18} />
                            Stock
                        </button>
                    </div>
                </div>
            ))}

            {/* Delete Confirmation Modal */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-red-100 dark:bg-red-900/20 rounded-full text-red-600 dark:text-red-400">
                                <Trash2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Delete Product</h3>
                                <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                                    Are you sure you want to delete this product? This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 px-4 py-2.5 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
