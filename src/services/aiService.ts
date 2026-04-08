import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AppState, ChatMessage } from "../types";

export const aiService = {
  async getAdvice(state: AppState, userMessage: string, history: ChatMessage[] = []) {
    // Check for user-provided keys
    const geminiKey = state.settings.geminiApiKey || process.env.GEMINI_API_KEY || '';
    const openaiKey = state.settings.openaiApiKey;

    if (!geminiKey && !openaiKey) {
      return "No se ha configurado ninguna clave de API (API Key). Por favor, ve a la sección de Configuración y añade tu clave de Google Gemini para usar el asesor.";
    }

    // Prepare a summary of the business data for context
    const totalSales = state.sales.reduce((acc, s) => acc + s.total, 0);
    const totalExpenses = state.expenses.reduce((acc, e) => acc + e.amount, 0);
    const totalIncomes = state.incomes.reduce((acc, i) => acc + i.amount, 0);
    const inventoryCount = state.products.reduce((acc, p) => acc + p.variants.reduce((vAcc, v) => vAcc + v.stock, 0), 0);
    const lowStockProducts = state.products.filter(p => p.variants.some(v => v.stock < 5)).map(p => p.name);

    const systemInstruction = `
      Eres un Asesor de Negocios experto para una marca de ropa llamada "ModaFlow".
      Tu objetivo es ayudar al dueño del negocio a tomar mejores decisiones basadas en sus datos.
      
      DATOS ACTUALES DEL NEGOCIO:
      - Ventas Totales: S/${totalSales.toFixed(2)}
      - Gastos Totales: S/${totalExpenses.toFixed(2)}
      - Ingresos Extra: S/${totalIncomes.toFixed(2)}
      - Balance Neto Estimado: S/${(totalSales + totalIncomes - totalExpenses).toFixed(2)}
      - Total de Prendas en Inventario: ${inventoryCount}
      - Productos con bajo stock (menos de 5 unidades): ${lowStockProducts.length > 0 ? lowStockProducts.join(', ') : 'Ninguno'}
      
      INSTRUCCIONES:
      1. Sé natural, conversacional y amigable, como un socio de confianza o un amigo experto en negocios.
      2. Habla de forma relajada y fluida, como en una conversación normal de WhatsApp o chat.
      3. **MÁXIMO 3 LÍNEAS:** Resume todo de forma muy directa. No te extiendas nunca más de 3 líneas de texto.
      4. Si el usuario pregunta sobre sus datos, dáselos de forma integrada en la charla (ej: "Oye, tus ventas van en S/1500, ¡nada mal!").
      5. Usa emojis ocasionalmente para que la conversación se sienta más humana y cercana (🚀, 👕, 💰, etc.).
      6. Si el usuario pide consejos, enfócate en lo más importante para mejorar ventas o ahorrar dinero.
      7. Responde siempre en español de forma cercana.
    `;

    // If OpenAI key is provided, use OpenAI
    if (openaiKey) {
      try {
        const openai = new OpenAI({ apiKey: openaiKey, dangerouslyAllowBrowser: true });
        
        const messages: any[] = [
          { role: "system", content: systemInstruction },
          ...history.slice(-10).map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ];

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages,
          max_tokens: 150,
        });

        return response.choices[0].message.content || "Lo siento, no pude procesar tu solicitud.";
      } catch (error) {
        console.error("OpenAI Service Error:", error);
        return "Error al conectar con ChatGPT. Verifica tu API Key.";
      }
    }

    // Default to Gemini
    const customAi = new GoogleGenAI({ apiKey: geminiKey });
    const model = "gemini-3-flash-preview";

    // Format history for Gemini
    const contents = history.slice(-10).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    try {
      const response = await customAi.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });

      return response.text || "Lo siento, no pude procesar tu solicitud en este momento.";
    } catch (error: any) {
      console.error("AI Service Error:", error);
      
      // Check for common API key errors
      if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid API key')) {
        return "La clave de API (API Key) parece ser inválida. Por favor, verifícala en la sección de Configuración.";
      }
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        return "Se ha alcanzado el límite de uso de la IA. Intenta de nuevo en unos minutos o usa tu propia API Key.";
      }

      return "Hubo un error al conectar con el asesor de IA. Verifica tu conexión a internet o que tu API Key sea correcta en Configuración.";
    }
  }
};
