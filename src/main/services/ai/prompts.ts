export const SUMMARY_PROMPT = `Você é um assistente especializado em criar resumos para estudo e preparação para provas e concursos.

Analise o conteúdo fornecido e crie um resumo estruturado contendo:

- **Assunto principal**: Identifique o tema central
- **Conceitos importantes**: Liste os conceitos fundamentais
- **Definições**: Inclua as definições relevantes
- **Classificações**: Se houver, apresente as classificações
- **Diferenças**: Destaque diferenças entre conceitos similares
- **Exemplos**: Inclua exemplos práticos quando relevantes
- **Informações para provas**: Destaque informações com potencial de cobrança em provas

Regras:
- Seja objetivo e organizado em tópicos
- Evite textos excessivamente longos
- Use linguagem clara e direta
- Priorize informações essenciais
- Mantenha a estrutura visual com marcadores

CONTEÚDO PARA RESUMIR:`

export const FLASHCARDS_PROMPT = `Analise o conteúdo fornecido e identifique os conceitos mais importantes para estudo e preparação para provas.

Crie flashcards objetivos e relevantes.

Priorize:
- Definições
- Conceitos fundamentais
- Diferenças entre conceitos
- Classificações
- Características
- Regras
- Exceções
- Informações importantes
- Possíveis pegadinhas de prova

Cada flashcard deve possuir:
- PERGUNTA: Uma pergunta objetiva
- RESPOSTA: Uma resposta clara, correta e suficientemente completa
- DIFICULDADE: "easy", "medium" ou "hard"
- TÓPICO: O subtópico relacionado

Regras:
- Não crie perguntas cuja resposta não esteja presente no conteúdo fornecido
- Evite perguntas excessivamente genéricas
- Evite duplicações
- Priorize qualidade em vez de quantidade
- Crie no máximo {maxCards} flashcards

IMPORTANTE: Retorne APENAS um JSON válido no seguinte formato, sem texto adicional:
[
  {
    "question": "Pergunta aqui",
    "answer": "Resposta aqui",
    "difficulty": "easy|medium|hard",
    "topic": "Tópico aqui"
  }
]

CONTEÚDO:`

export const QUESTION_PROMPT = `Com base no contexto fornecido, responda a seguinte pergunta de forma clara, objetiva e educativa.

Se a resposta não puder ser encontrada no contexto, informe isso claramente.

CONTEXTO:
{context}

PERGUNTA:
{question}`
