import * as settingsRepo from '../../database/repositories/settings.repo'
import { GeminiProvider } from './gemini.provider'
import { OpenAIProvider } from './openai.provider'
import { safeStorage } from 'electron'

export interface FlashcardAI {
  question: string
  answer: string
  difficulty: string
  topic: string
}

export interface AIProvider {
  generateSummary(text: string): Promise<string>
  generateFlashcards(text: string, maxCards: number): Promise<FlashcardAI[]>
  askQuestion(question: string, context: string): Promise<string>
}

function decryptApiKey(provider: string): string | null {
  const isEncrypted = settingsRepo.getSetting(`api_key_${provider}_encrypted`)
  const stored = settingsRepo.getSetting(`api_key_${provider}`)
  if (!stored) return null

  if (isEncrypted === 'true' && safeStorage.isEncryptionAvailable()) {
    try {
      const buffer = Buffer.from(stored, 'base64')
      return safeStorage.decryptString(buffer)
    } catch {
      return null
    }
  }
  return stored
}

export async function getAIProvider(): Promise<AIProvider | null> {
  const providerName = settingsRepo.getSetting('ai_provider') || 'gemini'
  const model = settingsRepo.getSetting('ai_model')
  const temperature = parseFloat(settingsRepo.getSetting('ai_temperature') || '0.7')

  const apiKey = decryptApiKey(providerName)
  if (!apiKey) return null

  switch (providerName) {
    case 'gemini':
      return new GeminiProvider(apiKey, model || 'gemini-2.0-flash', temperature)
    case 'openai':
      return new OpenAIProvider(apiKey, model || 'gpt-4o-mini', temperature)
    default:
      return null
  }
}
