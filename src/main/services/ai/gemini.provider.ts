import { GoogleGenerativeAI } from '@google/generative-ai'
import { AIProvider, FlashcardAI } from './ai-provider.interface'
import { SUMMARY_PROMPT, FLASHCARDS_PROMPT, QUESTION_PROMPT } from './prompts'

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI
  private model: string
  private temperature: number

  constructor(apiKey: string, model: string, temperature: number) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = model
    this.temperature = temperature
  }

  async generateSummary(text: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { temperature: this.temperature }
    })

    const result = await model.generateContent(SUMMARY_PROMPT + '\n\n' + text)
    const response = result.response
    return response.text()
  }

  async generateFlashcards(text: string, maxCards: number): Promise<FlashcardAI[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: this.temperature,
        responseMimeType: 'application/json'
      }
    })

    const prompt = FLASHCARDS_PROMPT.replace('{maxCards}', maxCards.toString())
    const result = await model.generateContent(prompt + '\n\n' + text)
    const response = result.response
    const responseText = response.text()

    return this.parseFlashcards(responseText)
  }

  async askQuestion(question: string, context: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: { temperature: this.temperature }
    })

    const prompt = QUESTION_PROMPT
      .replace('{context}', context)
      .replace('{question}', question)

    const result = await model.generateContent(prompt)
    return result.response.text()
  }

  private parseFlashcards(text: string): FlashcardAI[] {
    try {
      // Try to extract JSON from the response
      let jsonStr = text.trim()

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```(?:json)?\n?/g, '').trim()
      }

      const parsed = JSON.parse(jsonStr)

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array')
      }

      return parsed.filter((card: unknown) => {
        if (typeof card !== 'object' || card === null) return false
        const c = card as Record<string, unknown>
        return typeof c.question === 'string' && typeof c.answer === 'string'
      }).map((card: Record<string, unknown>) => ({
        question: card.question as string,
        answer: card.answer as string,
        difficulty: (['easy', 'medium', 'hard'].includes(card.difficulty as string))
          ? card.difficulty as string
          : 'medium',
        topic: (card.topic as string) || 'Geral'
      }))
    } catch (error) {
      throw new Error(`Falha ao processar resposta da IA: ${error instanceof Error ? error.message : 'JSON inválido'}`)
    }
  }
}
