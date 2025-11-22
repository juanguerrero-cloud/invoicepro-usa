'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Facturas', href: '/dashboard/invoices', icon: '📄' },
  { name: 'Inventario', href: '/dashboard/inventory', icon: '📦' },
  { name: 'Ordenes', href: '/dashboard/orders', icon: '🛒' },
  { name: 'Proveedores', href: '/dashboard/vendors', icon: '🏢' },
  { name: 'Productos', href: '/dashboard/products', icon: '📋' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-gray-900 text-white transition-all duration-300 flex flex-col`}>
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full p-2 flex-shrink-0">
            <span className="text-2xl">🚀</span>
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg">InvoicePro</h1>
              <p className="text-xs text-gray-400">USA</p>
            </div>
          )}
        </div>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  {!collapsed && <span className="font-medium">{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          {collapsed ? '→' : '← Colapsar'}
        </button>
      </div>
    </aside>
  )
}