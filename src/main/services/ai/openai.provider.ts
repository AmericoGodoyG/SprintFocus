import OpenAI from 'openai'
import { AIProvider, FlashcardAI } from './ai-provider.interface'
import { SUMMARY_PROMPT, FLASHCARDS_PROMPT, QUESTION_PROMPT } from './prompts'

export class OpenAIProvider implements AIProvider {
  private client: OpenAI
  private model: string
  private temperature: number

  constructor(apiKey: string, model: string, temperature: number) {
    this.client = new OpenAI({ apiKey })
    this.model = model
    this.temperature = temperature
  }

  async generateSummary(text: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: text }
      ]
    })

    return completion.choices[0]?.message?.content || ''
  }

  async generateFlashcards(text: string, maxCards: number): Promise<FlashcardAI[]> {
    const prompt = FLASHCARDS_PROMPT.replace('{maxCards}', maxCards.toString())

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt + '\n\nRetorne o JSON dentro de um objeto com a chave "flashcards".' },
        { role: 'user', content: text }
      ]
    })

    const responseText = completion.choices[0]?.message?.content || '[]'
    return this.parseFlashcards(responseText)
  }

  async askQuestion(question: string, context: string): Promise<string> {
    const prompt = QUESTION_PROMPT
      .replace('{context}', context)
      .replace('{question}', question)

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    return completion.choices[0]?.message?.content || ''
  }

  private parseFlashcards(text: string): FlashcardAI[] {
    try {
      let jsonStr = text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/```(?:json)?\n?/g, '').trim()
      }

      const parsed = JSON.parse(jsonStr)

      // Handle both array and { flashcards: [...] } formats
      const cards = Array.isArray(parsed) ? parsed : (parsed.flashcards || [])

      return cards.filter((card: unknown) => {
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
