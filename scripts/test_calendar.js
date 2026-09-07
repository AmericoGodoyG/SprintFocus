const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

delete process.env['ELECTRON_RENDERER_URL'];

// Require compiled main bundle to initialize database and IPC
require('../out/main/index.js');

const ARTIFACTS_DIR = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\440c6c35-9e98-418f-b00d-401877fae8d1';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const testResults = [];

function recordTest(suite, testName, passed, details = '') {
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${status}] [${suite}] ${testName} ${details ? '(' + details + ')' : ''}`);
  testResults.push({ suite, testName, passed, details });
}

app.whenReady().then(async () => {
  console.log('\n======================================================');
  console.log('       INICIANDO TESTES DO CALENDÁRIO SPRINTFOCUS     ');
  console.log('======================================================\n');

  let win = null;
  for (let i = 0; i < 30; i++) {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      win = wins[0];
      break;
    }
    await sleep(200);
  }

  if (!win) {
    console.error('ERRO FATAL: Nenhuma janela do Electron encontrada.');
    app.quit();
    process.exit(1);
  }

  win.setSize(1280, 850);
  win.show();

  async function exec(code) {
    return await win.webContents.executeJavaScript(code);
  }

  async function capture(filename) {
    try {
      const image = await win.webContents.capturePage();
      const targetPath = path.join(ARTIFACTS_DIR, filename);
      fs.writeFileSync(targetPath, image.toPNG());
      console.log(`   📸 Screenshot salvo: ${filename}`);
    } catch (e) {
      console.error('Erro ao capturar screenshot:', e);
    }
  }

  await sleep(1500);

  try {
    // 1. Navegação para a rota do Calendário
    await exec(`window.location.hash = '#/calendar'`);
    await sleep(800);

    const onCalendar = await exec(`window.location.hash === '#/calendar'`);
    recordTest('Navegação', 'Acesso à rota #/calendar', onCalendar);

    // 2. Renderização dos Componentes do Calendário
    const calendarHeader = await exec(`(() => {
      const monthH2 = document.querySelector('div[class*="monthDisplay"] h2');
      const weekdays = Array.from(document.querySelectorAll('div[class*="weekDayName"]')).map(el => el.innerText.trim());
      const dayCells = document.querySelectorAll('div[class*="dayCell"]');
      const todayCell = document.querySelector('div[class*="today"]');
      return {
        monthText: monthH2 ? monthH2.innerText : '',
        weekdays,
        dayCount: dayCells.length,
        hasToday: Boolean(todayCell)
      };
    })()`);

    recordTest('Renderização', 'Cabeçalho do mês e ano visível', Boolean(calendarHeader.monthText), calendarHeader.monthText);
    recordTest('Renderização', '7 Dias da Semana presentes (Dom a Sáb)', calendarHeader.weekdays.length === 7 && calendarHeader.weekdays[0].toUpperCase() === 'DOM', calendarHeader.weekdays.join(', '));
    recordTest('Renderização', 'Grid de Dias renderizado (35 ou 42 células)', calendarHeader.dayCount >= 28, `${calendarHeader.dayCount} dias`);
    recordTest('Renderização', 'Destaque visual do dia de Hoje', calendarHeader.hasToday);

    // 3. Navegação de Meses
    const initialMonth = calendarHeader.monthText;
    await exec(`(() => {
      const prevBtn = document.querySelector('button[title="Mês anterior"]');
      if (prevBtn) prevBtn.click();
    })()`);
    await sleep(400);

    const prevMonthText = await exec(`(() => {
      const h2 = document.querySelector('div[class*="monthDisplay"] h2');
      return h2 ? h2.innerText : '';
    })()`);
    recordTest('Navegação Mês', 'Botão Mês Anterior retrocede o mês', prevMonthText !== initialMonth, `De "${initialMonth}" para "${prevMonthText}"`);

    // Botão Hoje
    await exec(`(() => {
      const todayBtn = document.querySelector('button[class*="todayBtn"]');
      if (todayBtn) todayBtn.click();
    })()`);
    await sleep(400);

    const restoredMonth = await exec(`(() => {
      const h2 = document.querySelector('div[class*="monthDisplay"] h2');
      return h2 ? h2.innerText : '';
    })()`);
    recordTest('Navegação Mês', 'Botão "Hoje" retorna ao mês atual', restoredMonth === initialMonth, restoredMonth);

    // 4. Teste de To Do List
    // 4.1 Adicionar Tarefa
    await exec(`(() => {
      const input = document.querySelector('input[class*="todoInput"]');
      if (!input) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'Revisar algoritmos de ordenação');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await sleep(200);

    await exec(`(() => {
      const plusBtn = document.querySelector('button[class*="todoPlusBtn"]');
      if (plusBtn) plusBtn.click();
    })()`);
    await sleep(400);

    const taskAdded = await exec(`(() => {
      const tasks = Array.from(document.querySelectorAll('span[class*="todoText"]')).map(e => e.innerText.trim());
      return tasks.includes('Revisar algoritmos de ordenação');
    })()`);
    recordTest('To Do List', 'Adicionar nova tarefa na lista', taskAdded);

    // 4.2 Marcar Tarefa como Concluída (Checkbox no dia atual)
    await exec(`(() => {
      const checkboxes = Array.from(document.querySelectorAll('button[class*="todoCheckbox"]'));
      if (checkboxes.length > 0) checkboxes[checkboxes.length - 1].click();
    })()`);
    await sleep(400);

    const isTaskCompleted = await exec(`(() => {
      const checkedBoxes = document.querySelectorAll('button[class*="todoCheckboxChecked"]');
      const checkedTexts = document.querySelectorAll('span[class*="todoTextChecked"]');
      return checkedBoxes.length > 0 && checkedTexts.length > 0;
    })()`);
    recordTest('To Do List', 'Marcar tarefa como concluída (checkbox)', isTaskCompleted);

    // 4.3 Editar Tarefa
    await exec(`(() => {
      const editBtns = Array.from(document.querySelectorAll('button[aria-label="Editar tarefa"]'));
      if (editBtns.length > 0) editBtns[editBtns.length - 1].click();
    })()`);
    await sleep(300);

    await exec(`(() => {
      const editInput = document.querySelector('input[class*="todoEditInput"]');
      if (!editInput) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(editInput, 'Revisar algoritmos de ordenação (Concluído)');
      editInput.dispatchEvent(new Event('input', { bubbles: true }));
      editInput.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    await sleep(200);

    await exec(`(() => {
      const saveBtn = document.querySelector('button[aria-label="Salvar alteração"]');
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(400);

    const taskEdited = await exec(`(() => {
      const tasks = Array.from(document.querySelectorAll('span[class*="todoText"]')).map(e => e.innerText.trim());
      return tasks.some(t => t.includes('(Concluído)'));
    })()`);
    recordTest('To Do List', 'Editar texto de uma tarefa', taskEdited);

    // 4.4 Seleção de Outro Dia e Proteção Read-Only
    await exec(`(() => {
      const cells = Array.from(document.querySelectorAll('div[class*="dayCell"]'));
      // Encontrar uma célula que não seja hoje
      const otherCell = cells.find(c => !c.className.includes('today'));
      if (otherCell) otherCell.click();
    })()`);
    await sleep(400);

    const readOnlyInfo = await exec(`(() => {
      const badge = document.querySelector('span[class*="readOnlyBadge"]');
      return {
        hasBadge: Boolean(badge),
        badgeText: badge ? badge.innerText : ''
      };
    })()`);
    recordTest('To Do List', 'Bloqueio de check em dias que não são hoje ("Somente no dia atual")', readOnlyInfo.hasBadge, readOnlyInfo.badgeText);

    // Voltar para hoje
    await exec(`(() => {
      const todayCell = document.querySelector('div[class*="today"]');
      if (todayCell) todayCell.click();
    })()`);
    await sleep(400);

    // 5. Teste de Integração de Sessões e Heatmap
    // Inserir uma sessão completada no banco de dados via window.api para hoje
    await exec(`(async () => {
      try {
        const now = new Date();
        const session = await window.api.createSession({
          subject_id: null,
          topic_id: null,
          started_at: now.toISOString(),
          planned_minutes: 50,
          session_type: 'study',
          cycle_number: 1
        });
        if (session && session.id) {
          await window.api.finishSession(session.id, new Date(now.getTime() + 50 * 60000).toISOString(), 50, 'completed');
        }
      } catch (e) {
        console.error('Erro ao criar sessão de teste:', e);
      }
    })()`);
    await sleep(600);

    // Recarregar sessões no calendário navegando para o mês anterior e voltando
    await exec(`(() => {
      const prevBtn = document.querySelector('button[title="Mês anterior"]');
      if (prevBtn) prevBtn.click();
    })()`);
    await sleep(400);
    await exec(`(() => {
      const todayBtn = document.querySelector('button[class*="todayBtn"]');
      if (todayBtn) todayBtn.click();
    })()`);
    await sleep(600);

    // Verificar se o dia de hoje exibe a intensidade e o tempo estudado
    const todayStudyInfo = await exec(`(() => {
      const today = document.querySelector('div[class*="today"]');
      if (!today) return null;
      const timeBadge = today.querySelector('span[class*="dayTimeBadge"]');
      const flame = today.querySelector('svg[aria-label="Dia estudado"]');
      const classes = today.className;
      return {
        hasTimeBadge: Boolean(timeBadge),
        timeText: timeBadge ? timeBadge.innerText : '',
        hasFlame: Boolean(flame),
        classes
      };
    })()`);

    const hasHeatmapIntensity = Boolean(todayStudyInfo && (
      todayStudyInfo.classes.includes('intensity_medium') ||
      todayStudyInfo.classes.includes('intensity_low') ||
      todayStudyInfo.classes.includes('intensity_high')
    ));

    recordTest('Integração Sessões', 'Badge de tempo estudado exibido no dia (ex: 50m)', Boolean(todayStudyInfo?.hasTimeBadge), todayStudyInfo?.timeText || 'não encontrado');
    recordTest('Integração Sessões', 'Ícone de Fogo (Flame) exibido no dia estudado', Boolean(todayStudyInfo?.hasFlame));
    recordTest('Integração Sessões', 'Cálculo de Intensidade do Heatmap funcionando (.intensity_medium)', hasHeatmapIntensity, todayStudyInfo?.classes);

    // 6. Teste do Badge de Sequência (Streak)
    const streakInfo = await exec(`(() => {
      const streakCount = document.querySelector('span[class*="streakCount"]');
      return streakCount ? streakCount.innerText : '';
    })()`);
    recordTest('Streak', 'Contador de Sequência Atual exibindo dias consecutivos', streakInfo.includes('dia'), streakInfo);

    // Screenshot final do calendário
    await capture('calendar_verified_e2e.png');

    // 7. Limpeza da tarefa de teste
    await exec(`(() => {
      const deleteBtns = Array.from(document.querySelectorAll('button[aria-label="Excluir tarefa"]'));
      if (deleteBtns.length > 0) deleteBtns[deleteBtns.length - 1].click();
    })()`);
    await sleep(400);

    // Resumo final
    console.log('\n======================================================');
    console.log('             RELATÓRIO DE TESTES DO CALENDÁRIO        ');
    console.log('======================================================');
    const total = testResults.length;
    const passed = testResults.filter(t => t.passed).length;
    const failed = testResults.filter(t => !t.passed).length;

    console.log(`Total de Testes: ${total}`);
    console.log(`Aprovados:       ${passed}`);
    console.log(`Falhas:          ${failed}`);
    console.log(`Taxa de Sucesso: ${((passed / total) * 100).toFixed(1)}%\n`);

    setTimeout(() => {
      app.quit();
      process.exit(failed > 0 ? 1 : 0);
    }, 1000);

  } catch (err) {
    console.error('Erro na execução do teste do calendário:', err);
    app.quit();
    process.exit(1);
  }
});
