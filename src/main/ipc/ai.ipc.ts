import { ipcMain } from 'electron'
import * as settingsRepo from '../database/repositories/settings.repo'
import { getAIProvider } from '../services/ai/ai-provider.interface'

export function registerAiIPC(): void {
  ipcMain.handle('ai:generateSummary', async (_, text: string) => {
    try {
      const provider = await getAIProvider()
      if (!provider) {
        return { error: 'Nenhum provedor de IA configurado. Configure uma API Key nas Configurações.' }
      }
      const summary = await provider.generateSummary(text)
      return { summary }
    } catch (error) {
      return { error: `Erro ao gerar resumo: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }
    }
  })

  ipcMain.handle('ai:generateFlashcards', async (_, text: string, maxCards?: number) => {
    try {
      const provider = await getAIProvider()
      if (!provider) {
        return { error: 'Nenhum provedor de IA configurado. Configure uma API Key nas Configurações.' }
      }
      const maxFlashcards = maxCards || parseInt(settingsRepo.getSetting('ai_max_flashcards') || '20')
      const flashcards = await provider.generateFlashcards(text, maxFlashcards)
      return { flashcards }
    } catch (error) {
      return { error: `Erro ao gerar flashcards: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }
    }
  })

  ipcMain.handle('ai:askQuestion', async (_, question: string, context: string) => {
    try {
      const provider = await getAIProvider()
      if (!provider) {
        return { error: 'Nenhum provedor de IA configurado. Configure uma API Key nas Configurações.' }
      }
      const answer = await provider.askQuestion(question, context)
      return { answer }
    } catch (error) {
      return { error: `Erro ao processar pergunta: ${error instanceof Error ? error.message : 'Erro desconhecido'}` }
    }
  })
}
