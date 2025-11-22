'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { name: 'Facturas', href: '/dashboard/invoices', icon: '📄' },
  { name: 'Inventario', href: '/dashboard/inventory', icon: '📦' },
  { name: 'Ordenes', href: '/dashboard/orders', icon: '🛒' },
  { name: 'Proveedores', href: '/dashboard/vendors', icon: '🏢' },
  { name: 'Productos', href: '/dashboard/products', icon: '📋' },
]

const mobileNavItems = [
  { name: 'Inicio', href: '/dashboard', icon: '🏠' },
  { name: 'Facturas', href: '/dashboard/invoices', icon: '📄' },
  { name: 'Stock', href: '/dashboard/inventory', icon: '📦' },
  { name: 'Ordenes', href: '/dashboard/orders', icon: '🛒' },
  { name: 'Mas', href: '#menu', icon: '☰' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
      } else {
        setUserEmail(session.user.email || null)
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <aside className="hidden lg:flex w-64 min-h-screen bg-gray-900 text-white flex-col fixed left-0 top-0 bottom-0 z-40">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-full p-2">
              <span className="text-2xl">🚀</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">InvoicePro</h1>
              <p className="text-xs text-gray-400">USA</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-emerald-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="bg-gray-900 rounded-full p-1.5">
                <span className="text-lg">🚀</span>
              </div>
              <span className="font-bold text-gray-800">InvoicePro</span>
            </div>
            
            <div className="hidden lg:block">
              <h2 className="text-xl font-bold text-gray-800">Bienvenido</h2>
              <p className="text-sm text-gray-500">Gestiona tu inventario de forma inteligente</p>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700 truncate max-w-[150px]">{userEmail || 'Usuario'}</p>
                <p className="text-xs text-gray-400">Administrador</p>
              </div>
              <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="text-emerald-600 font-bold text-sm lg:text-base">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="hidden sm:block px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-gray-900 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-medium text-white text-sm">Mi cuenta</p>
                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{userEmail}</p>
                </div>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800"
              >
                X
              </button>
            </div>

            <nav className="p-3">
              {menuItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all ${
                    isActive(item.href)
                      ? 'bg-emerald-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleLogout()
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/30 transition-all"
              >
                <span className="text-xl">🚪</span>
                <span className="font-medium">Cerrar sesion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map((item) => {
            if (item.href === '#menu') {
              return (
                <button
                  key={item.name}
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex flex-col items-center justify-center flex-1 py-2 text-gray-400 hover:text-gray-600"
                >
                  <span className="text-xl mb-0.5">{item.icon}</span>
                  <span className="text-xs font-medium">{item.name}</span>
                </button>
              )
            }
            
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-2 transition-colors ${
                  active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className={`text-xs font-medium ${active ? 'text-emerald-600' : ''}`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}