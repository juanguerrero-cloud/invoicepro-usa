'use client'

import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export default function Home() {
  const [vendors, setVendors] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        // Obtener vendors
        const { data: vendorsData, error: vendorsError } = await supabase
          .from('vendors')
          .select('*')
        
        if (vendorsError) throw vendorsError
        setVendors(vendorsData || [])

        // Obtener productos
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
        
        if (productsError) throw productsError
        setProducts(productsData || [])

        setLoading(false)
      } catch (error) {
        console.error('Error fetching data:', error)
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            🚀 InvoicePro USA
          </h1>
          <p className="text-neutral-600">
            Prueba de conexión con Supabase
          </p>
        </div>

        {/* Vendors Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-4 flex items-center">
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm mr-3">
              {vendors.length}
            </span>
            Vendors
          </h2>
          <div className="space-y-3">
            {vendors.map((vendor) => (
              <div 
                key={vendor.id} 
                className="border border-neutral-200 rounded-lg p-4 hover:border-primary-400 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900">{vendor.name}</h3>
                <p className="text-sm text-neutral-600 mt-1">{vendor.address}</p>
                <div className="flex gap-4 mt-2 text-sm text-neutral-500">
                  {vendor.email && <span>📧 {vendor.email}</span>}
                  {vendor.phone && <span>📞 {vendor.phone}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-neutral-900 mb-4 flex items-center">
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-sm mr-3">
              {products.length}
            </span>
            Productos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="border border-neutral-200 rounded-lg p-4 hover:border-primary-400 transition-colors"
              >
                <h3 className="font-semibold text-neutral-900">{product.name}</h3>
                <p className="text-sm text-neutral-600 mt-1">{product.description}</p>
                <div className="flex gap-3 mt-2 text-xs text-neutral-500">
                  {product.upc && <span className="bg-neutral-100 px-2 py-1 rounded">UPC: {product.upc}</span>}
                  {product.category && <span className="bg-neutral-100 px-2 py-1 rounded">{product.category}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-primary-800 font-medium">
            ✅ Conexión exitosa con Supabase
          </p>
          <p className="text-primary-600 text-sm mt-1">
            Encontrados: {vendors.length} vendor(s) y {products.length} producto(s)
          </p>
        </div>
      </div>
    </main>
  )
}