'use client'

import { useState, useRef } from 'react'
import { Search, Printer, Plus, Trash2, ShoppingCart } from 'lucide-react'

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

interface BillingSectionProps {
    products: Product[]
}

export default function BillingSection({ products }: BillingSectionProps) {
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [qtyDetails, setQtyDetails] = useState(1)
    const [manualPriceOverride, setManualPriceOverride] = useState<string>('')

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

    function removeFromCart(index: number) {
        setCart(prev => prev.filter((_, i) => i !== index))
    }

    function handlePrint() {
        window.print()
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    return (
        <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-purple-50 to-white dark:from-purple-900/10 dark:to-zinc-800/50">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
                    New Bill
                </h2>
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
                    {/* Printable Section */}
                    <div id="printable-bill" className="flex-1 bg-white p-6 shadow-sm mb-6 font-mono text-sm leading-relaxed text-zinc-900">
                        <div className="text-center mb-6 border-b-2 border-dashed border-zinc-300 pb-4">
                            <h1 className="text-2xl font-bold uppercase tracking-wider mb-1">MH Stationery</h1>
                            <p className="text-xs text-zinc-500 font-sans">and Accessories</p>
                        </div>

                        <div className="mb-4">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-zinc-200">
                                        <th className="pb-2 w-1/2">Item</th>
                                        <th className="pb-2 text-center">Qty</th>
                                        <th className="pb-2 text-right">Price</th>
                                        <th className="pb-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cart.map((item, idx) => (
                                        <tr key={idx} className="border-b border-zinc-100/50">
                                            <td className="py-2 pr-2">{item.name}</td>
                                            <td className="py-2 text-center">{item.quantity}</td>
                                            <td className="py-2 text-right">{item.price.toFixed(2)}</td>
                                            <td className="py-2 text-right">{(item.price * item.quantity).toFixed(2)}</td>
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
                            <p>Shop Address Here, City, 12345</p>
                            <p>Phone: +123 456 7890</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-auto flex justify-between items-center gap-4">
                        <button
                            onClick={() => setCart([])}
                            disabled={cart.length === 0}
                            className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Clear Bill
                        </button>
                        <button
                            onClick={handlePrint}
                            disabled={cart.length === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-bold shadow-lg hover:shadow-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:shadow-none"
                        >
                            <Printer size={18} /> Print Bill
                        </button>

                        {/* Print Styles */}
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
        </div>
    )
}
