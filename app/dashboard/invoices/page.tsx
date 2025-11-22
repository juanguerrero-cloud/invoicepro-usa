'use client'

import { useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface ParsedProduct {
  quantity: number
  description: string
  unitPrice: number
  totalPrice: number
}

interface ParsedInvoice {
  vendorName: string
  vendorAddress: string
  vendorPhone: string
  vendorEmail: string
  customerName: string
  customerAddress: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  subtotal: number
  tax: number
  discount: number
  total: number
  products: ParsedProduct[]
  paymentTerms: string
  notes: string
}

// Funcion para normalizar nombres (quitar espacios extra, puntos, etc.)
function normalizeVendorName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\./g, '')      // Quitar puntos
    .replace(/,/g, '')       // Quitar comas
    .replace(/\s+/g, ' ')    // Multiples espacios a uno solo
    .replace(/INC$/i, '')    // Quitar "INC" al final
    .replace(/LLC$/i, '')    // Quitar "LLC" al final
    .replace(/CORP$/i, '')   // Quitar "CORP" al final
    .trim()
}

// Funcion para normalizar nombres de productos
function normalizeProductName(name: string): string {
  return name
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 50) // Primeros 50 caracteres para comparacion
}

export default function InvoicesPage() {
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rawText, setRawText] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setRawText('')
        setParsedData(null)
        setError(null)
        setSaved(false)
        setSaveStatus('')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImage(reader.result as string)
        setRawText('')
        setParsedData(null)
        setError(null)
        setSaved(false)
        setSaveStatus('')
      }
      reader.readAsDataURL(file)
    }
  }

  const processImage = async () => {
    if (!image) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error processing image')
      }

      setRawText(data.rawText)
      setParsedData(data.parsedData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const saveInvoice = async () => {
    if (!parsedData) return

    setSaving(true)
    setError(null)
    setSaveStatus('Buscando proveedor...')

    try {
      // 1. Buscar o crear vendor con mejor deteccion de duplicados
      let vendorId = null
      if (parsedData.vendorName) {
        setSaveStatus('Verificando proveedor...')
        
        const normalizedNewVendor = normalizeVendorName(parsedData.vendorName)
        
        // Obtener todos los vendors y comparar normalizados
        const { data: allVendors } = await supabase
          .from('vendors')
          .select('id, name')
        
        // Buscar coincidencia normalizada
        const existingVendor = allVendors?.find(v => 
          normalizeVendorName(v.name) === normalizedNewVendor
        )

        if (existingVendor) {
          vendorId = existingVendor.id
          setSaveStatus(`Proveedor encontrado: ${existingVendor.name}`)
        } else {
          // Crear nuevo vendor
          setSaveStatus('Creando proveedor nuevo...')
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
              name: parsedData.vendorName,
              address: parsedData.vendorAddress || '',
              phone: parsedData.vendorPhone || '',
              contact_email: parsedData.vendorEmail || '',
              delivery_days: 3,
            })
            .select()
            .single()

          if (vendorError) throw vendorError
          vendorId = newVendor.id
        }
      }

      // 2. Guardar factura
      setSaveStatus('Guardando factura...')
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          vendor_id: vendorId,
          invoice_number: parsedData.invoiceNumber || `INV-${Date.now()}`,
          invoice_date: parsedData.invoiceDate || new Date().toISOString().split('T')[0],
          total: parsedData.total || 0,
          subtotal: parsedData.subtotal || 0,
          tax: parsedData.tax || 0,
          ocr_raw_text: rawText,
          status: 'processed',
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 3. Procesar cada producto
      if (parsedData.products && parsedData.products.length > 0) {
        // Obtener todos los productos existentes para comparacion
        const { data: allProducts } = await supabase
          .from('products')
          .select('id, name')

        for (let i = 0; i < parsedData.products.length; i++) {
          const product = parsedData.products[i]
          setSaveStatus(`Procesando producto ${i + 1} de ${parsedData.products.length}...`)

          const normalizedNewProduct = normalizeProductName(product.description)

          // Buscar producto existente con nombre similar
          let productId = null
          const existingProduct = allProducts?.find(p => 
            normalizeProductName(p.name) === normalizedNewProduct ||
            normalizeProductName(p.name).includes(normalizedNewProduct.substring(0, 20)) ||
            normalizedNewProduct.includes(normalizeProductName(p.name).substring(0, 20))
          )

          if (existingProduct) {
            productId = existingProduct.id
          } else {
            // Crear producto nuevo
            const { data: newProduct, error: productError } = await supabase
              .from('products')
              .insert({
                name: product.description,
                vendor_id: vendorId,
                category: 'Sin categoria',
              })
              .select()
              .single()

            if (productError) throw productError
            productId = newProduct.id

            // Agregar a la lista local para evitar duplicados en la misma factura
            allProducts?.push({ id: productId, name: product.description })

            // Crear registro de inventario inicial
            await supabase
              .from('inventory')
              .insert({
                product_id: productId,
                qty_on_hand: 0,
                qty_store: 0,
                reorder_point: 10,
                sales_velocity: 1,
              })
          }

          // 4. Guardar linea de factura
          await supabase
            .from('invoice_lines')
            .insert({
              invoice_id: invoice.id,
              product_id: productId,
              description: product.description,
              quantity: product.quantity,
              unit_price: product.unitPrice,
              total_price: product.totalPrice || product.unitPrice * product.quantity,
            })

          // 5. Actualizar inventario (sumar cantidad)
          setSaveStatus(`Actualizando inventario...`)
          const { data: currentInventory } = await supabase
            .from('inventory')
            .select('qty_on_hand')
            .eq('product_id', productId)
            .single()

          if (currentInventory) {
            await supabase
              .from('inventory')
              .update({
                qty_on_hand: (currentInventory.qty_on_hand || 0) + product.quantity,
              })
              .eq('product_id', productId)
          }

          // 6. Registrar historial de precios
          await supabase
            .from('price_history')
            .insert({
              product_id: productId,
              vendor_id: vendorId,
              price: product.unitPrice,
              recorded_at: new Date().toISOString(),
            })
        }
      }

      setSaveStatus('¡Completado!')
      setSaved(true)
    } catch (err: any) {
      setError(err.message)
      setSaveStatus('')
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setImage(null)
    setRawText('')
    setParsedData(null)
    setError(null)
    setSaved(false)
    setSaveStatus('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Facturas</h1>
        <p className="text-gray-500">Sube una imagen de factura para extraer los datos automaticamente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Subir Factura</h2>
          
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {image ? (
              <div className="space-y-4">
                <img
                  src={image}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-gray-500">Click para cambiar imagen</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Arrastra una imagen aqui</p>
                  <p className="text-sm text-gray-400">o haz click para seleccionar</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={processImage}
              disabled={!image || loading}
              style={{ backgroundColor: '#124f31' }}
              className="flex-1 text-white font-medium py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 hover:opacity-90"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Procesando con IA...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Extraer Datos
                </>
              )}
            </button>
            
            {image && (
              <button
                onClick={resetForm}
                className="px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all"
              >
                Limpiar
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Datos Extraidos</h2>
          
          {!parsedData ? (
            <div className="text-center py-12 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Los datos extraidos apareceran aqui</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Vendor */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  value={parsedData.vendorName}
                  onChange={(e) => setParsedData({ ...parsedData, vendorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Invoice Number & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">No. Factura</label>
                  <input
                    type="text"
                    value={parsedData.invoiceNumber}
                    onChange={(e) => setParsedData({ ...parsedData, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="text"
                    value={parsedData.invoiceDate}
                    onChange={(e) => setParsedData({ ...parsedData, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Total */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Total</label>
                <input
                  type="number"
                  step="0.01"
                  value={parsedData.total}
                  onChange={(e) => setParsedData({ ...parsedData, total: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Products */}
              {parsedData.products && parsedData.products.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Productos Detectados ({parsedData.products.length})</label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-700 font-semibold">Cant.</th>
                          <th className="px-3 py-2 text-left text-gray-700 font-semibold">Descripcion</th>
                          <th className="px-3 py-2 text-right text-gray-700 font-semibold">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedData.products.map((product, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900 font-medium">{product.quantity}</td>
                            <td className="px-3 py-2 text-gray-800">{product.description}</td>
                            <td className="px-3 py-2 text-right text-gray-900 font-medium">${product.unitPrice?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Raw Text (collapsible) */}
              <details className="mt-4">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800 font-medium">
                  Ver texto completo extraido
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-700 whitespace-pre-wrap max-h-48 overflow-auto border border-gray-200">
                  {rawText}
                </pre>
              </details>

              {/* Save Status */}
              {saveStatus && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${saved ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-blue-50 border border-blue-200 text-blue-700'}`}>
                  {!saved && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {saveStatus}
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={saveInvoice}
                disabled={saving || saved}
                className={`w-full font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  saved
                    ? 'bg-green-100 text-green-800 border-2 border-green-400'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : saved ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Factura Guardada e Inventario Actualizado
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    Guardar y Actualizar Inventario
                  </>
                )}
              </button>

              {saved && (
                <p className="text-center text-sm text-green-600">
                  ✓ Proveedor verificado ✓ Productos creados ✓ Inventario actualizado ✓ Precios registrados
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}