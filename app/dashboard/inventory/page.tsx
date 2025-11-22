'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface InventoryItem {
  qty_on_hand: number
  qty_store: number
  reorder_point: number
  sales_velocity: number
}

interface Product {
  id: string
  name: string
  sku: string | null
  upc: string | null
  category: string | null
  description: string | null
  vendor_id: string | null
  vendors: {
    name: string
  } | null
  inventory: InventoryItem[] | null
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          upc,
          category,
          description,
          vendor_id,
          vendors (name),
          inventory (qty_on_hand, qty_store, reorder_point, sales_velocity)
        `)
        .order('name')

      if (error) throw error

      // Transformar datos para que coincidan con el tipo Product
      const transformedData: Product[] = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        upc: item.upc,
        category: item.category,
        description: item.description,
        vendor_id: item.vendor_id,
        vendors: Array.isArray(item.vendors) ? item.vendors[0] || null : item.vendors,
        inventory: item.inventory,
      }))

      setProducts(transformedData)

      // Extraer categorias unicas
      const uniqueCategories = [...new Set(transformedData.map(p => p.category).filter(Boolean))] as string[]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (product: Product) => {
    const inventory = product.inventory?.[0]
    if (!inventory) return { status: 'unknown', color: 'gray', text: 'Sin datos', qty: 0 }
    
    const qty = inventory.qty_on_hand || 0
    const reorderPoint = inventory.reorder_point || 10

    if (qty <= 0) {
      return { status: 'out', color: 'red', text: 'Agotado', qty }
    } else if (qty <= reorderPoint) {
      return { status: 'low', color: 'yellow', text: 'Stock Bajo', qty }
    } else {
      return { status: 'ok', color: 'green', text: 'OK', qty }
    }
  }

  const filteredProducts = products.filter(product => {
    // Filtro de busqueda
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.upc?.toLowerCase().includes(searchLower)

    // Filtro de categoria
    const matchesCategory = !categoryFilter || product.category === categoryFilter

    // Filtro de stock
    const stockStatus = getStockStatus(product)
    const matchesStock = !stockFilter || stockStatus.status === stockFilter

    return matchesSearch && matchesCategory && matchesStock
  })

  const stockCounts = {
    total: products.length,
    ok: products.filter(p => getStockStatus(p).status === 'ok').length,
    low: products.filter(p => getStockStatus(p).status === 'low').length,
    out: products.filter(p => getStockStatus(p).status === 'out').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Inventario</h1>
        <p className="text-gray-500">Gestiona el stock de todos tus productos</p>
      </div>

      {/* Stock Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          onClick={() => setStockFilter('')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            stockFilter === '' ? 'border-blue-500' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Productos</p>
              <p className="text-2xl font-bold text-gray-800">{stockCounts.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">📦</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStockFilter('ok')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            stockFilter === 'ok' ? 'border-green-500' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Stock OK</p>
              <p className="text-2xl font-bold text-green-600">{stockCounts.ok}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStockFilter('low')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            stockFilter === 'low' ? 'border-yellow-500' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Stock Bajo</p>
              <p className="text-2xl font-bold text-yellow-600">{stockCounts.low}</p>
            </div>
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">⚠</span>
            </div>
          </div>
        </div>

        <div 
          onClick={() => setStockFilter('out')}
          className={`bg-white rounded-xl shadow-sm p-4 border-2 cursor-pointer transition-all ${
            stockFilter === 'out' ? 'border-red-500' : 'border-gray-100 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Agotados</p>
              <p className="text-2xl font-bold text-red-600">{stockCounts.out}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <span className="text-red-600 text-xl">✕</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o UPC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-48">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
            >
              <option value="">Todas las categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || categoryFilter || stockFilter) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setCategoryFilter('')
                setStockFilter('')
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  SKU / UPC
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {products.length === 0 
                      ? 'No hay productos registrados aun' 
                      : 'No se encontraron productos con los filtros aplicados'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockInfo = getStockStatus(product)
                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{product.sku || '-'}</p>
                        <p className="text-sm text-gray-500">{product.upc || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded-md">
                          {product.category || 'Sin categoria'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {product.vendors?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-bold text-gray-900">{stockInfo.qty}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            stockInfo.color === 'green'
                              ? 'bg-green-100 text-green-800'
                              : stockInfo.color === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : stockInfo.color === 'red'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {stockInfo.text}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredProducts.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            Mostrando {filteredProducts.length} de {products.length} productos
          </div>
        )}
      </div>
    </div>
  )
}