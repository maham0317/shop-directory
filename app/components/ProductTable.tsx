'use client'

import { useState, useMemo } from 'react'
import { Search, Trash2, Minus, Plus, X, ChevronDown, Edit2 } from 'lucide-react'
import { deleteProduct, updateStock, updateManualPrice, updateProductName, updateProductQuantity } from '../actions/inventory'

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

    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [editName, setEditName] = useState('')
    const [editQuantity, setEditQuantity] = useState('')

    // Restock State
    const [restockingId, setRestockingId] = useState<number | null>(null)
    const [restockAmount, setRestockAmount] = useState('')

    // Pagination State
    const [visibleCount, setVisibleCount] = useState(50)

    const filteredProducts = useMemo(() => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [products, searchTerm])

    const visibleProducts = filteredProducts.slice(0, visibleCount)

    function handleLoadMore() {
        setVisibleCount(prev => prev + 50)
    }

    async function handleDelete(id: number) {
        if (confirm('Are you sure you want to delete this product?')) {
            setLoadingId(id)
            await deleteProduct(id)
            setLoadingId(null)
        }
    }

    async function handleRestockSubmit(id: number) {
        const amount = parseInt(restockAmount)
        if (isNaN(amount) || amount <= 0) return

        setLoadingId(id)
        await updateStock(id, amount)
        setLoadingId(null)
        setRestockingId(null)
        setRestockAmount('')
    }

    async function handlePriceUpdate(id: number, newValue: string) {
        const price = parseFloat(newValue)
        if (!isNaN(price)) {
            await updateManualPrice(id, price)
        }
        setEditingPrice(null)
    }

    async function saveEdit() {
        if (!editingProduct) return

        // Update Name
        if (editName !== editingProduct.name) {
            await updateProductName(editingProduct.id, editName)
        }

        // Update Quantity
        const newQty = parseInt(editQuantity)
        if (!isNaN(newQty) && newQty !== editingProduct.quantity) {
            await updateProductQuantity(editingProduct.id, newQty)
        }

        setEditingProduct(null)
    }

    function startEdit(product: Product) {
        setEditingProduct(product)
        setEditName(product.name)
        setEditQuantity(product.quantity.toString())
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
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setVisibleCount(50) // Reset pagination on search
                        }}
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
                        {visibleProducts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                                    No products found.
                                </td>
                            </tr>
                        ) : (
                            visibleProducts.map((product) => (
                                <tr key={product.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                    {editingProduct?.id === product.id ? (
                                        <>
                                            <td className="px-6 py-4">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    placeholder="Product Name"
                                                    className="w-full px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-blue-50/10 dark:bg-blue-900/10 focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    value={editQuantity}
                                                    onChange={e => setEditQuantity(e.target.value)}
                                                    className="w-20 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                                />
                                            </td>
                                            <td colSpan={3} className="px-6 py-4 text-zinc-500">
                                                Editing...
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={saveEdit} className="text-green-600 hover:text-green-700 font-medium text-sm">Save</button>
                                                <button onClick={() => setEditingProduct(null)} className="text-zinc-500 hover:text-zinc-600 font-medium text-sm">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 text-zinc-900 dark:text-white font-medium cursor-pointer" onClick={() => startEdit(product)}>
                                                {product.name}
                                                <div className="flex gap-2 items-center mt-1">
                                                    <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 hover:border-blue-300 transition-colors">
                                                        Click to Edit
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                                {restockingId === product.id ? (
                                                    <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 shadow-lg p-2 rounded-lg absolute z-10 border border-zinc-200 dark:border-zinc-700 min-w-[200px]">
                                                        <span className="text-sm font-bold whitespace-nowrap">{product.quantity} + </span>
                                                        <input
                                                            autoFocus
                                                            type="number"
                                                            className="w-20 px-2 py-1 text-sm border-2 border-green-500 rounded bg-white dark:bg-zinc-900 outline-none"
                                                            placeholder="Qty"
                                                            value={restockAmount}
                                                            onChange={e => setRestockAmount(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && handleRestockSubmit(product.id)}
                                                        />
                                                        <button
                                                            onClick={() => handleRestockSubmit(product.id)}
                                                            className="bg-green-500 hover:bg-green-600 text-white p-1.5 rounded transition-colors"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => setRestockingId(null)}
                                                            className="text-zinc-400 hover:text-zinc-600 p-1 rounded"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.quantity < 5 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
                                                        {product.quantity}
                                                    </span>
                                                )}
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
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => startEdit(product)}
                                                        className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                        title="Edit Product"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setRestockingId(product.id)
                                                            setRestockAmount('')
                                                        }}
                                                        disabled={loadingId === product.id}
                                                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 dark:text-green-400 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-30"
                                                        title="Add Stock"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id)}
                                                        disabled={loadingId === product.id}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-30"
                                                        title="Delete Product"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {visibleCount < filteredProducts.length && (
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center bg-zinc-50 dark:bg-zinc-900/50">
                    <button
                        onClick={handleLoadMore}
                        className="flex items-center gap-2 px-6 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 transition-all"
                    >
                        <ChevronDown size={16} /> Load More Products
                    </button>
                </div>
            )}
        </div>
    )
}
