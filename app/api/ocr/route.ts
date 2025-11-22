import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 })
    }

    // Extraer el base64 sin el prefijo
    const base64Image = image.replace(/^data:image\/\w+;base64,/, '')
    
    // Detectar el tipo de imagen
    const mimeTypeMatch = image.match(/^data:(image\/\w+);base64,/)
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg'

    // Llamar a Gemini API con el modelo correcto
    const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,

      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Analiza esta imagen de una factura y extrae la siguiente información en formato JSON. 
                  
IMPORTANTE: Responde SOLO con el JSON, sin texto adicional, sin markdown, sin backticks.

El JSON debe tener esta estructura exacta:
{
  "vendorName": "nombre del proveedor/vendedor",
  "vendorAddress": "direccion del proveedor",
  "vendorPhone": "telefono del proveedor",
  "vendorEmail": "email del proveedor",
  "customerName": "nombre del cliente/a quien se le vende",
  "customerAddress": "direccion del cliente",
  "invoiceNumber": "numero de factura",
  "invoiceDate": "fecha de la factura",
  "dueDate": "fecha de vencimiento si existe",
  "subtotal": 0,
  "tax": 0,
  "discount": 0,
  "total": 0,
  "products": [
    {
      "quantity": 1,
      "description": "descripcion del producto",
      "unitPrice": 0,
      "totalPrice": 0
    }
  ],
  "paymentTerms": "terminos de pago si existen",
  "notes": "notas adicionales si existen"
}

Si no encuentras algún campo, déjalo como string vacío "" o 0 para números.
Extrae TODOS los productos que aparezcan en la factura.
Los precios deben ser números, no strings.`
                },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        }),
      }
    )

    const geminiData = await geminiResponse.json()

    if (geminiData.error) {
      return NextResponse.json({ error: geminiData.error.message }, { status: 500 })
    }

    // Extraer el texto de la respuesta de Gemini
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Limpiar el texto (quitar posibles backticks de markdown)
    let cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    // Parsear el JSON
    let parsedData
    try {
      parsedData = JSON.parse(cleanedText)
    } catch (parseError) {
      // Si falla el parseo, devolver el texto raw
      return NextResponse.json({
        success: true,
        rawText: responseText,
        parsedData: {
          vendorName: '',
          vendorAddress: '',
          vendorPhone: '',
          vendorEmail: '',
          customerName: '',
          customerAddress: '',
          invoiceNumber: '',
          invoiceDate: '',
          dueDate: '',
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          products: [],
          paymentTerms: '',
          notes: '',
          parseError: 'No se pudo parsear la respuesta automaticamente'
        },
      })
    }

    return NextResponse.json({
      success: true,
      rawText: responseText,
      parsedData: parsedData,
    })
  } catch (error: any) {
    console.error('OCR Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}