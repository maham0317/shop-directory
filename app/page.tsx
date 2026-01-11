import { getProducts } from './actions/inventory'
import AddProductForm from './components/AddProductForm'
import ProductTable from './components/ProductTable'
import BillingSection from './components/BillingSection'

export default async function Home() {
  const { data: products } = await getProducts()
  const productList = products || []

  return (
    <main className="min-h-screen bg-white dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-8 text-white shadow-2xl">
          <div>
            <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
              MH Stationery
            </h1>
            <p className="text-blue-100 text-lg font-medium opacity-90">
              and Accessories
            </p>
          </div>
          <AddProductForm />
        </header>

        {/* Inventory Section */}
        <ProductTable products={productList} />

        {/* Billing Section */}
        <BillingSection products={productList} />
      </div>
    </main>
  )
}
