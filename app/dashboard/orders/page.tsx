'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ProductWithInventory {
  id: string
  name: string
  sku: string
  category: string
  vendor_id: string
  vendors?: {
    id: string
    name: string
  }
  inventory?: {
    qty_on_hand: number
    reorder_point: number
    sales_velocity: number
  }[]
  price_history?: {
    price: number
    vendor_id: string
  }[]
}

interface OrderItem {
  product_id: string
  product_name: string
  current_stock: number
  reorder_point: number
  sales_velocity: number
  suggested_qty: number
  unit_price: number
  total_price: number
  vendor_name: string
  selected: boolean
}

export default function OrdersPage() {
  const [products, setProducts] = useState<ProductWithInventory[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [daysToOrder, setDaysToOrder] = useState(7)
  const [safetyStock, setSafetyStock] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [orderGenerated, setOrderGenerated] = useState(false)

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
          category,
          vendor_id,
          vendors (id, name),
          inventory (qty_on_hand, reorder_point, sales_velocity),
          price_history (price, vendor_id)
        `)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSuggestedOrders = () => {
    const items: OrderItem[] = []

    products.forEach(product => {
      const inventory = product.inventory?.[0]
      const latestPrice = product.price_history?.[0]?.price || 0

      if (!inventory) return

      const qtyOnHand = inventory.qty_on_hand || 0
      const reorderPoint = inventory.reorder_point || 10
      const salesVelocity = inventory.sales_velocity || 1

      // Solo incluir productos que necesitan reorden
      if (qtyOnHand <= reorderPoint) {
        // Formula: (velocidad_ventas * dias) + stock_seguridad - stock_actual
        const suggestedQty = Math.max(
          Math.ceil((salesVelocity * daysToOrder) + safetyStock - qtyOnHand),
          1
        )

        items.push({
          product_id: product.id,
          product_name: product.name,
          current_stock: qtyOnHand,
          reorder_point: reorderPoint,
          sales_velocity: salesVelocity,
          suggested_qty: suggestedQty,
          unit_price: latestPrice,
          total_price: suggestedQty * latestPrice,
          vendor_name: product.vendors?.name || 'Sin proveedor',
          selected: true,
        })
      }
    })

    setOrderItems(items)
    setOrderGenerated(true)
  }

  const updateItemQuantity = (productId: string, newQty: number) => {
    setOrderItems(items =>
      items.map(item =>
        item.product_id === productId
          ? { ...item, suggested_qty: newQty, total_price: newQty * item.unit_price }
          : item
      )
    )
  }

  const toggleItemSelection = (productId: string) => {
    setOrderItems(items =>
      items.map(item =>
        item.product_id === productId
          ? { ...item, selected: !item.selected }
          : item
      )
    )
  }

  const selectedItems = orderItems.filter(item => item.selected)
  const totalOrderValue = selectedItems.reduce((sum, item) => sum + item.total_price, 0)
  const totalItems = selectedItems.reduce((sum, item) => sum + item.suggested_qty, 0)

  const saveOrder = async () => {
    if (selectedItems.length === 0) return

    setGenerating(true)
    try {
      // Agrupar por vendor
      const ordersByVendor = selectedItems.reduce((acc, item) => {
        const vendorName = item.vendor_name
        if (!acc[vendorName]) {
          acc[vendorName] = []
        }
        acc[vendorName].push(item)
        return acc
      }, {} as Record<string, OrderItem[]>)

      // Crear orden para cada vendor
      for (const [vendorName, items] of Object.entries(ordersByVendor)) {
        const vendorTotal = items.reduce((sum, item) => sum + item.total_price, 0)

        const { data: order, error: orderError } = await supabase
          .from('replenishments')
          .insert({
            vendor_id: null, // Podrias buscar el vendor_id aqui
            status: 'pending',
            total_estimated: vendorTotal,
            notes: `Orden generada automaticamente - ${items.length} productos`,
          })
          .select()
          .single()

        if (orderError) throw orderError

        // Crear lineas de orden
        const orderLines = items.map(item => ({
          replenishment_id: order.id,
          product_id: item.product_id,
          qty_suggested: item.suggested_qty,
          unit_price: item.unit_price,
        }))

        const { error: linesError } = await supabase
          .from('replenishment_lines')
          .insert(orderLines)

        if (linesError) throw linesError
      }

      alert('Ordenes guardadas exitosamente!')
      setOrderItems([])
      setOrderGenerated(false)
    } catch (error: any) {
      console.error('Error saving order:', error)
      alert('Error al guardar: ' + error.message)
    } finally {
      setGenerating(false)
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Ordenes Inteligentes</h1>
        <p className="text-gray-500">Genera ordenes de reposicion optimizadas automaticamente</p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Configuracion de Reorden</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dias a cubrir
            </label>
            <input
              type="number"
              value={daysToOrder}
              onChange={(e) => setDaysToOrder(parseInt(e.target.value) || 7)}
              min="1"
              max="30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Cantidad de dias que debe cubrir el pedido</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock de seguridad
            </label>
            <input
              type="number"
              value={safetyStock}
              onChange={(e) => setSafetyStock(parseInt(e.target.value) || 5)}
              min="0"
              max="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Unidades extra de reserva</p>
          </div>

          <div className="flex items-end">
            <button
              onClick={calculateSuggestedOrders}
              style={{ backgroundColor: '#124f31' }}
              className="w-full text-white font-medium py-2.5 px-4 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Calcular Ordenes
            </button>
          </div>
        </div>
      </div>

      {/* Order Results */}
      {orderGenerated && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Productos a Ordenar</p>
              <p className="text-2xl font-bold text-gray-800">{selectedItems.length}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Total Unidades</p>
              <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Valor Estimado</p>
              <p className="text-2xl font-bold text-emerald-600">${totalOrderValue.toFixed(2)}</p>
            </div>
          </div>

          {/* Order Items Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Productos Sugeridos</h3>
              {selectedItems.length > 0 && (
                <button
                  onClick={saveOrder}
                  disabled={generating}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Guardar Orden
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                      <input
                        type="checkbox"
                        checked={orderItems.every(item => item.selected)}
                        onChange={() => {
                          const allSelected = orderItems.every(item => item.selected)
                          setOrderItems(items => items.map(item => ({ ...item, selected: !allSelected })))
                        }}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Producto</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Stock Actual</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Velocidad/Dia</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Cant. Sugerida</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Precio Unit.</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Proveedor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        No hay productos que necesiten reorden en este momento
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item) => (
                      <tr key={item.product_id} className={`hover:bg-gray-50 ${!item.selected ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleItemSelection(item.product_id)}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{item.product_name}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-red-600 font-medium">{item.current_stock}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {item.sales_velocity.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.suggested_qty}
                            onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-center text-gray-900 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          ${item.unit_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          ${item.total_price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {item.vendor_name}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!orderGenerated && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Genera tu primera orden</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Configura los parametros arriba y haz click en "Calcular Ordenes" para ver los productos que necesitan reposicion.
          </p>
        </div>
      )}
    </div>
  )
}