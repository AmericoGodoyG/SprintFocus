import { ipcMain, dialog } from 'electron'
import { readFileSync, statSync } from 'fs'

export function registerPdfIPC(): void {
  ipcMain.handle('pdf:selectFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filepath = result.filePaths[0]
    const stats = statSync(filepath)

    // Limit: 50MB
    if (stats.size > 50 * 1024 * 1024) {
      return { error: 'Arquivo muito grande. O limite é de 50MB.' }
    }

    const filename = filepath.split(/[\\/]/).pop() || 'unknown.pdf'

    return {
      filepath,
      filename,
      fileSize: stats.size
    }
  })

  ipcMain.handle('pdf:extractText', async (_, filepath: string) => {
    try {
      const data = new Uint8Array(readFileSync(filepath))

      // Dynamic import of pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist')

      const loadingTask = pdfjsLib.getDocument({ data })
      const pdf = await loadingTask.promise

      let fullText = ''
      const pageCount = pdf.numPages

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
        fullText += pageText + '\n\n'
      }

      const trimmedText = fullText.trim()

      if (trimmedText.length === 0) {
        return {
          text: '',
          pageCount,
          warning: 'Nenhum texto selecionável encontrado. O PDF pode ser baseado em imagem. OCR será suportado em versão futura.'
        }
      }

      return {
        text: trimmedText,
        pageCount,
        warning: null
      }
    } catch (error) {
      return {
        text: '',
        pageCount: 0,
        warning: `Erro ao extrair texto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      }
    }
  })
}
