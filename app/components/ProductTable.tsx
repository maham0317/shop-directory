'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, Minus, Plus } from 'lucide-react'
import { deleteProduct, updateStock, updateManualPrice } from '../actions/inventory'

interface Product {
    id: number
    name: string
    quantity: number
    price: number
    purchasePrice: number
    manualPrice: number
}

interface ProductTableProps {
    products: Product[]
}

export default function ProductTable({ products }: ProductTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [loadingId, setLoadingId] = useState<number | null>(null)
    // Local state to track edits before saving
    const [editingPrice, setEditingPrice] = useState<{ id: number, value: string } | null>(null)

    const filteredProducts = useMemo(() => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [products, searchTerm])

    async function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this product?')) {
            setLoadingId(id)
            await deleteProduct(id)
            setLoadingId(null)
        }
    }

    async function handleStockChange(id: number, change: number) {
        setLoadingId(id)
        await updateStock(id, change)
        setLoadingId(null)
    }

    async function handlePriceUpdate(id: number, newValue: string) {
        const price = parseFloat(newValue)
        if (!isNaN(price)) {
            await updateManualPrice(id, price)
        }
        setEditingPrice(null)
    }

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
                    Inventory
                </h2>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Qty</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Purchase</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sale</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider w-32">Manual Price</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 text-zinc-900 dark:text-white font-medium">{product.name}</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.quantity < 5 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                            {product.quantity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">{(product.purchasePrice || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300 font-semibold">{(product.price || 0).toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingPrice?.id === product.id ? editingPrice.value : (product.manualPrice || 0)}
                                            onFocus={() => setEditingPrice({ id: product.id, value: (product.manualPrice || 0).toString() })}
                                            onChange={(e) => setEditingPrice({ id: product.id, value: e.target.value })}
                                            onBlur={(e) => handlePriceUpdate(product.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.currentTarget.blur()
                                                }
                                            }}
                                            className="w-24 px-2 py-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button
                                            onClick={() => handleStockChange(product.id, -1)}
                                            disabled={loadingId === product.id || product.quantity <= 0}
                                            className="p-2 text-zinc-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-30"
                                            title="Decrease Stock"
                                        >
                                            <Minus size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleStockChange(product.id, 1)}
                                            disabled={loadingId === product.id}
                                            className="p-2 text-zinc-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-30"
                                            title="Increase Stock"
                                        >
                                            <Plus size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            disabled={loadingId === product.id}
                                            className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                                            title="Delete Product"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
