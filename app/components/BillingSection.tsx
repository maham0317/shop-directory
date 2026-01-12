'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, Printer, Plus, Minus, Trash2, ShoppingCart, Save, History, X } from 'lucide-react'
import { saveBill, getBills } from '../actions/inventory'

interface Product {
    id: number
    name: string
    quantity: number
    price: number
    purchasePrice: number
    manualPrice: number
}

interface CartItem {
    productId: number
    name: string
    quantity: number
    price: number // This can be edited
}

interface Bill {
    id: number
    customerName: string | null
    totalAmount: number
    createdAt: Date
    items: any[]
}

interface BillingSectionProps {
    products: Product[]
}

export default function BillingSection({ products }: BillingSectionProps) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [qtyDetails, setQtyDetails] = useState(1)
    const [manualPriceOverride, setManualPriceOverride] = useState<string>('')

    // New States
    const [isSaving, setIsSaving] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [recentBills, setRecentBills] = useState<Bill[]>([])
    const [customerName, setCustomerName] = useState('')

    // Filter products for the search dropdown
    const productOptions = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    function addToCart() {
        if (!selectedProduct) return

        const priceToUse = manualPriceOverride
            ? parseFloat(manualPriceOverride)
            : (selectedProduct.manualPrice > 0 ? selectedProduct.manualPrice : selectedProduct.price)

        const newItem: CartItem = {
            productId: selectedProduct.id,
            name: selectedProduct.name,
            quantity: qtyDetails,
            price: priceToUse
        }

        setCart(prev => [...prev, newItem])

        // Reset inputs
        setSelectedProduct(null)
        setSearchTerm('')
        setQtyDetails(1)
        setManualPriceOverride('')
    }

    function updateQuantity(index: number, change: number) {
        setCart(prev => {
            const newCart = [...prev]
            const item = newCart[index]
            const newQty = item.quantity + change

            if (newQty <= 0) {
                return newCart.filter((_, i) => i !== index)
            }

            // Optional: Check stock constraint if increasing
            if (change > 0) {
                const product = products.find(p => p.id === item.productId)
                if (product && newQty > product.quantity) {
                    alert(`Insufficient stock. Available: ${product.quantity}`)
                    return prev
                }
            }

            newCart[index] = { ...item, quantity: newQty }
            return newCart
        })
    }

    function removeFromCart(index: number) {
        setCart(prev => prev.filter((_, i) => i !== index))
    }

    function handlePrint() {
        window.print()
    }

    async function handleSaveBill() {
        if (cart.length === 0) return

        if (!confirm('Are you sure you want to save this bill? This will deduct stock.')) return

        setIsSaving(true)
        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

        const result = await saveBill({
            customerName,
            totalAmount,
            items: cart.map(item => ({
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                total: item.price * item.quantity
            }))
        })

        if (result.success) {
            alert('Bill Saved Successfully!')
            setCart([])
            setCustomerName('')
        } else {
            alert(`Failed to save bill: ${result.error}`)
        }
        setIsSaving(false)
    }

    async function fetchHistory() {
        setShowHistory(true)
        const res = await getBills()
        if (res.success && res.data) {
            setRecentBills(res.data)
        }
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    return (
        <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-zinc-800/50 flex justify-between items-center">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                    New Bill
                </h2>
                <button
                    onClick={fetchHistory}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                >
                    <History size={18} /> Recent Bills
                </button>
            </div>

            <div className="p-6 grid lg:grid-cols-2 gap-8">
                {/* Product Selection Area */}
                <div className="space-y-6">
                    <div className="space-y-2 relative">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Product</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search to add product..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                            />
                        </div>
                        {/* Dropdown results */}
                        {searchTerm && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 max-h-60 overflow-y-auto">
                                {productOptions.length > 0 ? (
                                    productOptions.map(product => (
                                        <button
                                            key={product.id}
                                            onClick={() => {
                                                setSelectedProduct(product)
                                                setSearchTerm(product.name)
                                                setManualPriceOverride(product.manualPrice > 0 ? product.manualPrice.toString() : product.price.toString())
                                            }}
                                            className="w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-sm flex justify-between items-center group transition-colors"
                                        >
                                            <span className="font-medium text-zinc-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300">{product.name}</span>
                                            <span className="text-zinc-500 dark:text-zinc-400">Stock: {product.quantity}</span>
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-3 text-sm text-zinc-500">No products found</div>
                                )}
                            </div>
                        )}
                    </div>

                    {selectedProduct && (
                        <div className="bg-purple-50 dark:bg-purple-900/10 rounded-xl p-6 border border-purple-100 dark:border-purple-900/20 animate-in fade-in slide-in-from-top-4 duration-300">
                            <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100 mb-4">{selectedProduct.name}</h3>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="text-xs uppercase tracking-wide text-purple-800/60 dark:text-purple-200/60 font-bold mb-1 block">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={qtyDetails}
                                        onChange={(e) => setQtyDetails(parseInt(e.target.value) || 1)}
                                        className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs uppercase tracking-wide text-purple-800/60 dark:text-purple-200/60 font-bold mb-1 block">Price (User Editable)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={manualPriceOverride}
                                        onChange={(e) => setManualPriceOverride(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={addToCart}
                                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Add to Bill
                            </button>
                        </div>
                    )}
                </div>

                {/* The Bill / Receipt Area */}
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 p-6 flex flex-col h-full">
                    {/* Customer Name Input (Optional) */}
                    <div className="mb-4">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1 block">Customer Name / Phone</label>
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Printable Section */}
                    <div id="printable-bill" className="flex-1 bg-white p-6 shadow-sm mb-6 font-mono text-sm leading-relaxed text-zinc-900">
                        <div className="text-center mb-6 border-b-2 border-dashed border-zinc-300 pb-4">
                            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">MH</h1>
                            <p className="text-sm font-bold text-zinc-700">Stationery And Accessories</p>
                            <p className="text-xs text-zinc-500 mt-2 max-w-[200px] mx-auto leading-tight">
                                Arain Building Chowk near Ashfaq General Store, Bilal Gunj, Data Gunj Baksh Town, Lahore
                            </p>
                            <p className="text-xs text-zinc-500 mt-1 font-semibold">0310-1476667 Muhammad Hassan</p>
                            {customerName && <p className="text-xs text-zinc-800 mt-2 border-t border-dashed border-zinc-300 pt-1">Customer: {customerName}</p>}
                        </div>

                        <div className="mb-4">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-200">
                                        <th className="pb-2 pl-2 w-1/3">Item</th>
                                        <th className="pb-2 text-center">Qty</th>
                                        <th className="pb-2 text-right">Price</th>
                                        <th className="pb-2 text-right">Total</th>
                                        <th className="pb-2 text-center w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="border-b border-zinc-100/50 group hover:bg-zinc-50 transition-colors">
                                            <td className="py-2 pl-2 pr-2 font-medium text-zinc-700">{item.name}</td>
                                            <td className="py-2 text-center">
                                                <div className="flex items-center justify-center gap-2 bg-zinc-100 rounded-md px-2 py-1 w-fit mx-auto">
                                                    <button
                                                        onClick={() => updateQuantity(idx, -1)}
                                                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-zinc-600 hover:text-red-500 hover:bg-red-50 shadow-sm transition-all"
                                                        title="Decrease"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="w-6 text-center font-bold text-zinc-800">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(idx, 1)}
                                                        className="w-6 h-6 flex items-center justify-center rounded bg-white text-zinc-600 hover:text-green-500 hover:bg-green-50 shadow-sm transition-all"
                                                        title="Increase"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-2 text-right text-zinc-600">{item.price.toFixed(2)}</td>
                                            <td className="py-2 text-right font-semibold text-zinc-900">{(item.price * item.quantity).toFixed(2)}</td>
                                            <td className="py-2 text-center">
                                                <button
                                                    onClick={() => removeFromCart(idx)}
                                                    className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remove Item"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mr-0 ml-auto w-1/2 border-t-2 border-zinc-900 pt-2 mt-4 space-y-1">
                            <div className="flex justify-between font-bold text-lg">
                                <span>TOTAL:</span>
                                <span>{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-4 border-t border-zinc-200 text-center text-xs text-zinc-500 space-y-1">
                            <p>Thank you for shopping!</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                        <button
                            onClick={() => setCart([])}
                            disabled={cart.length === 0}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Clear
                        </button>

                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                onClick={handleSaveBill}
                                disabled={cart.length === 0 || isSaving}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Save size={18} /> {isSaving ? 'Saving...' : 'Save Bill'}
                            </button>
                            <button
                                onClick={handlePrint}
                                disabled={cart.length === 0}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                <Printer size={18} /> Print
                            </button>
                        </div>
                        <style jsx global>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                #printable-bill, #printable-bill * {
                                    visibility: visible;
                                }
                                #printable-bill {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100%;
                                    box-shadow: none;
                                }
                            }
                         `}</style>
                    </div>
                </div>
            </div>

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Recent Bills</h3>
                            <button onClick={() => setShowHistory(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {recentBills.length === 0 ? (
                                <p className="text-center text-zinc-500">No bills found.</p>
                            ) : (
                                <div className="space-y-6">
                                    {(() => {
                                        const groupedBills: { label: string; bills: Bill[] }[] = []

                                        // Sort bills by date descending just in case
                                        const sortedBills = [...recentBills].sort((a, b) =>
                                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                        )

                                        sortedBills.forEach(bill => {
                                            const date = new Date(bill.createdAt)
                                            const today = new Date()
                                            const yesterday = new Date()
                                            yesterday.setDate(today.getDate() - 1)

                                            let label = date.toLocaleDateString('en-GB') // DD/MM/YYYY

                                            if (date.toDateString() === today.toDateString()) {
                                                label = 'Today'
                                            } else if (date.toDateString() === yesterday.toDateString()) {
                                                label = 'Yesterday'
                                            }

                                            const lastGroup = groupedBills[groupedBills.length - 1]
                                            if (lastGroup && lastGroup.label === label) {
                                                lastGroup.bills.push(bill)
                                            } else {
                                                groupedBills.push({ label, bills: [bill] })
                                            }
                                        })

                                        return groupedBills.map((group, groupIdx) => (
                                            <div key={groupIdx}>
                                                <h4 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3 bg-zinc-50 dark:bg-zinc-800/50 py-1 px-2 rounded w-fit">
                                                    {group.label}
                                                </h4>
                                                <div className="space-y-3 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800">
                                                    {group.bills.map(bill => (
                                                        <div key={bill.id} className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors bg-white dark:bg-black/20">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="font-bold text-zinc-900 dark:text-white">Bill #{bill.id}</p>
                                                                        <span className="text-xs text-zinc-400 font-mono">
                                                                            {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{bill.customerName || 'Walk-in'}</p>
                                                                </div>
                                                                <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                                                    {bill.totalAmount.toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div className="mt-2 text-sm text-zinc-500 border-t border-zinc-100 dark:border-zinc-800 pt-2">
                                                                <div className="flex flex-col gap-1">
                                                                    {bill.items.map((i: any, idx: number) => (
                                                                        <div key={idx} className="flex justify-between">
                                                                            <span>{i.quantity} x {i.productName}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
