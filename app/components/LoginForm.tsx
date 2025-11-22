'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          alert('Registro exitoso! Revisa tu email para confirmar tu cuenta.')
          setIsSignUp(false)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        if (data.user) {
          router.push('/dashboard')
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-white rounded-full p-4 mb-4 shadow-lg">
            <span className="text-5xl">🚀</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">
            InvoicePro USA
          </h1>
          <p className="text-emerald-400 text-xl font-semibold">
            {isSignUp ? 'Crea tu cuenta' : 'Inicia sesion'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10">
          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900 text-base bg-gray-50 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white outline-none transition-all"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">
                Contrasena
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-900 text-base bg-gray-50 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:bg-white outline-none transition-all"
                placeholder="Minimo 6 caracteres"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl font-medium text-center text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#124f31' }}
              className="w-full text-white font-bold text-lg py-4 rounded-xl shadow-lg hover:opacity-90 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none"
            >
              {loading ? 'Procesando...' : (isSignUp ? 'CREAR CUENTA' : 'INICIAR SESION')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-gray-600 mb-2">
              {isSignUp ? 'Ya tienes una cuenta?' : 'No tienes cuenta?'}
            </p>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError(null)
              }}
              style={{ color: '#124f31' }}
              className="font-bold text-lg underline transition-all hover:opacity-70"
            >
              {isSignUp ? 'Inicia sesion aqui' : 'Registrate gratis'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Crea una cuenta nueva para comenzar a usar InvoicePro
          </p>
        </div>
      </div>
    </div>
  )
}