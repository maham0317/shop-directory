import { getProducts } from './actions/inventory'
import AddProductForm from './components/AddProductForm'
import ProductList from './components/ProductList'
import { LayoutDashboard } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const { data: products } = await getProducts()

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg">
                <LayoutDashboard size={28} />
              </div>
              Shop Inventory
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg ml-1">Manage your stock, track sales, and stay organized.</p>
          </div>
          <AddProductForm />
        </header>

        {/* Content */}
        <section>
          <ProductList initialProducts={products ?? []} />
        </section>
      </div>
    </main>
  )
}
