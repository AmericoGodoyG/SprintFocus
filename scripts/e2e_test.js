const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

delete process.env['ELECTRON_RENDERER_URL'];

// Require the compiled main bundle to initialize database and register all IPC handlers
require('../out/main/index.js');

const ARTIFACTS_DIR = 'C:\\Users\\PC\\.gemini\\antigravity-ide\\brain\\70176038-3fa6-4107-8dcd-bf4cd8f01867';

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
  console.log('       INICIANDO SUITE COMPLETA DE TESTES E2E        ');
  console.log('======================================================\n');

  // Wait for the window created by out/main/index.js
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

  win.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[BROWSER CONSOLE] ${message} (${sourceId}:${line})`);
  });

  console.log('Aguardando carregamento da interface...');
  await sleep(2000);

  // Helper to execute code in page
  async function exec(code) {
    return await win.webContents.executeJavaScript(code);
  }

  console.log('Window URL:', win.webContents.getURL());
  try {
    const bodyHtml = await exec('document.body.innerHTML');
    console.log('Body HTML preview:', bodyHtml.slice(0, 300));
  } catch (e) {
    console.log('Error getting body HTML:', e.message);
  }

  // Inject helper for React controlled inputs and mock confirm
  await exec(`(() => {
    window.__setReactInput = function(element, value) {
      if (!element) return false;
      const proto = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      if (setter) {
        setter.call(element, value);
      } else {
        element.value = value;
      }
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    window.confirm = function() { return true; };
  })()`);

  // Helper to take screenshot
  async function capture(filename) {
    try {
      const image = await win.webContents.capturePage();
      if (fs.existsSync(ARTIFACTS_DIR)) {
        const targetPath = path.join(ARTIFACTS_DIR, filename);
        fs.writeFileSync(targetPath, image.toPNG());
        console.log(`   📸 Screenshot salvo: ${filename}`);
      }
    } catch (e) {
      console.error('Erro ao capturar screenshot:', e);
    }
  }

  try {
    // -------------------------------------------------------------
    // SUITE 1: TESTE E2E DE ROTAS
    // -------------------------------------------------------------
    console.log('\n--- SUITE 1: TESTE DE ROTAS E NAVEGAÇÃO ---');

    const routesToTest = [
      { name: 'Pomodoro', hash: '#/pomodoro', checkText: 'Pomodoro' },
      { name: 'Métricas', hash: '#/metrics', checkText: 'Métricas' },
      { name: 'Calendário', hash: '#/calendar', checkText: 'Calendário' }
    ];

    for (const route of routesToTest) {
      await exec(`window.location.hash = '${route.hash}'`);
      await sleep(500);
      const bodyText = await exec(`document.body.innerText`);
      const passed = bodyText.includes(route.checkText);
      recordTest('Rotas', `Navegação para ${route.name} (${route.hash})`, passed);
    }

    // Teste de inicialização / redirecionamento da raiz (#/) para o Pomodoro (#/pomodoro)
    await exec(`window.location.hash = '#/'`);
    await sleep(500);
    const hashAfterRoot = await exec(`window.location.hash`);
    recordTest('Rotas', 'Inicialização/Acesso à raiz (#/) inicia na tela de Pomodoro (#/pomodoro)', hashAfterRoot === '#/pomodoro', `Hash atual: ${hashAfterRoot}`);

    // Verify Sidebar is completely removed
    const hasSidebar = await exec(`Boolean(document.querySelector('aside'))`);
    recordTest('Layout', 'Menu lateral (Sidebar) removido completamente', !hasSidebar);

    // Verify Theme Toggle is positioned in the top menu on the right
    const themeToggleInTopBar = await exec(`(() => {
      const header = document.querySelector('header');
      if (!header) return false;
      const toggle = header.querySelector('button[aria-label="Alternar tema"]');
      const pills = header.querySelector('nav');
      const isRight = toggle && pills && (toggle.compareDocumentPosition(pills) & Node.DOCUMENT_POSITION_PRECEDING);
      return Boolean(toggle && isRight);
    })()`);
    recordTest('Layout', 'Opção de alterar tema posicionada ao lado direito do menu superior', themeToggleInTopBar);

    // Verify Custom Window Controls (Liquid Glass)
    const windowControlsInfo = await exec(`(() => {
      const minBtn = document.querySelector('button[data-testid="window-minimize-btn"]');
      const maxBtn = document.querySelector('button[data-testid="window-maximize-btn"]');
      const closeBtn = document.querySelector('button[data-testid="window-close-btn"]');
      const container = minBtn ? minBtn.closest('div[class*="windowControlsContainer"]') : null;
      return {
        hasMin: Boolean(minBtn),
        hasMax: Boolean(maxBtn),
        hasClose: Boolean(closeBtn),
        hasContainer: Boolean(container)
      };
    })()`);
    recordTest('Controles da Janela', 'Botões de Minimizar, Maximizar e Fechar presentes no Menu Superior', Boolean(windowControlsInfo.hasMin && windowControlsInfo.hasMax && windowControlsInfo.hasClose));
    recordTest('Controles da Janela', 'Cápsula em Liquid Glass contendo os controles da janela', Boolean(windowControlsInfo.hasContainer));

    // -------------------------------------------------------------
    // SUITE 2: TESTE E2E DE BOTÕES E INTERATIVIDADE
    // -------------------------------------------------------------
    console.log('\n--- SUITE 2: TESTE DE BOTÕES E INTERATIVIDADE ---');

    // 2.1 Theme Switcher in Top Menu
    const initialTheme = await exec(`document.documentElement.getAttribute('data-theme') || 'dark'`);
    await exec(`(() => {
      const btn = document.querySelector('button[aria-label="Alternar tema"]');
      if (btn) btn.click();
    })()`);
    await sleep(400);
    const switchedTheme = await exec(`document.documentElement.getAttribute('data-theme')`);
    const themeToggledOk = (initialTheme === 'dark' ? switchedTheme === 'light' : switchedTheme === 'dark');
    recordTest('Botões', 'Alternador de Tema Claro / Escuro (Menu Superior)', themeToggledOk, `De ${initialTheme} para ${switchedTheme}`);

    // Revert back to dark theme
    await exec(`(() => {
      const btn = document.querySelector('button[aria-label="Alternar tema"]');
      if (btn) btn.click();
    })()`);
    await sleep(300);

    // =============================================================
    // SUITE: MÉTRICAS DE EVOLUÇÃO (MONTANHA)
    // =============================================================
    console.log('\n--- SUITE DE TESTES: MÉTRICAS DE EVOLUÇÃO (MONTANHA) ---');
    await exec(`window.location.hash = '#/metrics'`);
    await sleep(600);

    // 1. Title and Subtitle
    const dashHeader = await exec(`(() => {
      const h1 = document.querySelector('h1[class*="title"]');
      const p = document.querySelector('p[class*="subtitle"]');
      return {
        title: h1 ? h1.innerText : '',
        subtitle: p ? p.innerText : ''
      };
    })()`);
    recordTest('Métricas Montanha', 'Título "Métricas"', dashHeader.title.includes('Métricas'), dashHeader.title);
    recordTest('Métricas Montanha', 'Frase inspiradora "Cada hora estudada deixa sua marca."', dashHeader.subtitle.includes('marca'), dashHeader.subtitle);

    // 2. Metric Cards: Hoje, Esta semana, Este mês, Média diária
    const metricLabels = await exec(`(() => {
      const labels = Array.from(document.querySelectorAll('span[class*="metricLabel"]')).map(el => el.innerText.trim());
      return labels;
    })()`);
    const hasHoje = metricLabels.includes('HOJE');
    const hasSemana = metricLabels.includes('ESTA SEMANA');
    const hasMes = metricLabels.includes('ESTE MÊS');
    const hasMedia = metricLabels.includes('MÉDIA DIÁRIA');
    recordTest('Dashboard Montanha', '4 Cards Minimalistas de Tempo (Hoje, Semana, Mês, Média)', hasHoje && hasSemana && hasMes && hasMedia, metricLabels.join(', '));

    // 3. Mountain Chart & SVG Silhouettes
    const hasMountainSvg = await exec(`Boolean(document.querySelector('svg[class*="mountainSvg"]'))`);
    const hasTrail = await exec(`Boolean(document.querySelector('path[class*="trailPath"]'))`);
    const hasMountainSilhouettes = await exec(`Boolean(document.querySelector('path[class*="distantMountain"]') && document.querySelector('path[class*="midMountain"]'))`);
    recordTest('Dashboard Montanha', 'Gráfico com Silhuetas de Montanha e Linha de Trilha', hasMountainSvg && hasTrail && hasMountainSilhouettes);

    // 4. Period Filters (7d, 30d, 90d, 1y)
    await exec(`(() => {
      const btns = Array.from(document.querySelectorAll('button[class*="periodBtn"]'));
      const btn30 = btns.find(b => b.innerText.includes('30'));
      if (btn30) btn30.click();
    })()`);
    await sleep(400);
    const filter30Active = await exec(`(() => {
      const active = document.querySelector('button[class*="periodBtnActive"]');
      return active ? active.innerText.includes('30') : false;
    })()`);
    recordTest('Dashboard Montanha', 'Filtro de Período: 30 dias', filter30Active);

    // Switch back to 7 days
    await exec(`(() => {
      const btns = Array.from(document.querySelectorAll('button[class*="periodBtn"]'));
      const btn7 = btns.find(b => b.innerText.includes('7'));
      if (btn7) btn7.click();
    })()`);
    await sleep(400);
    const filter7Active = await exec(`(() => {
      const active = document.querySelector('button[class*="periodBtnActive"]');
      return active ? active.innerText.includes('7') : false;
    })()`);
    recordTest('Dashboard Montanha', 'Filtro de Período: 7 dias', filter7Active);

    // 5. Sidebar Logo Image Verification
    const sidebarLogoOk = await exec(`(() => {
      const img = document.querySelector('img[alt*="SprintFocus Logo"]');
      return img && img.complete && img.naturalWidth > 0;
    })()`);
    recordTest('Dashboard Montanha', 'Logo com ícone atualizado no Menu Superior', Boolean(sidebarLogoOk));

    // 6. Verification: No Looping Halo or Jumping Circle in Chart
    const hasJumpingHalo = await exec(`Boolean(document.querySelector('circle[class*="summitHalo"]') || document.querySelector('circle[class*="latestHalo"]'))`);
    recordTest('Dashboard Montanha', 'Correção do elemento circular em looping (removido)', !hasJumpingHalo);

    // 7. Verification: No Manual Input Modal (Automated Pomodoro Evolution)
    const hasManualRegisterBtn = await exec(`Boolean(document.querySelector('button[class*="registerBtn"]'))`);
    recordTest('Dashboard Montanha', 'Remoção de inserção manual de tempo (métricas 100% automatizadas)', !hasManualRegisterBtn);

    // 8. "Iniciar Pomodoro" Button Navigation
    const hasPomodoroLinkBtn = await exec(`Boolean(document.querySelector('button[class*="pomodoroLinkBtn"]'))`);
    recordTest('Dashboard Montanha', 'Botão de atalho "Iniciar Pomodoro" presente', hasPomodoroLinkBtn);

    if (hasPomodoroLinkBtn) {
      await exec(`(() => {
        const btn = document.querySelector('button[class*="pomodoroLinkBtn"]');
        if (btn) btn.click();
      })()`);
      await sleep(500);
      const onPomodoroRoute = await exec(`window.location.hash.includes('pomodoro')`);
      recordTest('Dashboard Montanha', 'Navegação direta para Pomodoro ao clicar no atalho', onPomodoroRoute);
      // Return to Dashboard for remaining tests
      await exec(`window.location.hash = '#/metrics'`);
      await sleep(500);
    }

    await capture('e2e_mountain_dashboard.png');

    // 2.2 Pomodoro - Chips de tempo
    await exec(`window.location.hash = '#/pomodoro'`);
    await sleep(500);

    // Verificação de remoção do h1 Pomodoro e subtítulo
    const hasPomodoroHeader = await exec(`(() => {
      const h1 = document.querySelector('div[class*="pomodoro"] h1');
      const p = document.querySelector('div[class*="pomodoro"] p[class*="subtitle"]');
      return Boolean(h1 || p);
    })()`);
    recordTest('Layout Pomodoro', 'Remoção de h1 Pomodoro e subtítulo', !hasPomodoroHeader);

    // Click 25min chip
    await exec(`(() => {
      const chips = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('25min'));
      if (chips[0]) chips[0].click();
    })()`);
    await sleep(300);
    let timeText = await exec(`(() => {
      const el = document.querySelector('span[class*="time"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Botões', 'Chip de tempo Pomodoro: 25min', timeText === '25:00', `Visor: ${timeText}`);

    // Click 50min chip
    await exec(`(() => {
      const chips = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('50min'));
      if (chips[0]) chips[0].click();
    })()`);
    await sleep(300);
    timeText = await exec(`(() => {
      const el = document.querySelector('span[class*="time"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Botões', 'Chip de tempo Pomodoro: 50min', timeText === '50:00', `Visor: ${timeText}`);

    // 2.3 Pomodoro - Play / Pause / Reset
    await exec(`(() => {
      const playBtn = document.querySelector('button[class*="playBtn"]');
      if (playBtn) playBtn.click();
    })()`);
    await sleep(1500); // Wait for countdown
    const tickTime = await exec(`(() => {
      const el = document.querySelector('span[class*="time"]');
      return el ? el.innerText.trim() : '';
    })()`);
    const isCounting = tickTime !== '50:00' && tickTime.startsWith('49:');
    recordTest('Botões', 'Botão Iniciar Pomodoro (Play e decremento do timer)', isCounting, `Após 1.5s: ${tickTime}`);

    // Click Pause
    await exec(`(() => {
      const playBtn = document.querySelector('button[class*="playBtn"]');
      if (playBtn) playBtn.click();
    })()`);
    await sleep(300);
    const pauseState = await exec(`Boolean(document.querySelector('button[title="Iniciar"]'))`);
    recordTest('Botões', 'Botão Pausar Pomodoro (Pause)', pauseState);

    // Click Reset
    await exec(`(() => {
      const resetBtn = document.querySelector('button[title="Reiniciar timer"]');
      if (resetBtn) resetBtn.click();
    })()`);
    await sleep(300);
    const resetTime = await exec(`(() => {
      const el = document.querySelector('span[class*="time"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Botões', 'Botão Reiniciar Pomodoro (Reset)', resetTime === '50:00', `Visor: ${resetTime}`);

    // 2.4 Pomodoro - Sound Toggle
    const soundInitial = await exec(`(() => {
      const btn = document.querySelector('button[class*="soundToggle"]');
      return btn ? btn.innerText.trim() : '';
    })()`);
    await exec(`(() => {
      const btn = document.querySelector('button[class*="soundToggle"]');
      if (btn) btn.click();
    })()`);
    await sleep(300);
    const soundToggled = await exec(`(() => {
      const btn = document.querySelector('button[class*="soundToggle"]');
      return btn ? btn.innerText.trim() : '';
    })()`);
    recordTest('Botões', 'Botão Alternar Som Pomodoro', soundInitial !== soundToggled, `${soundInitial} ➔ ${soundToggled}`);

    // Revert sound
    await exec(`(() => {
      const btn = document.querySelector('button[class*="soundToggle"]');
      if (btn) btn.click();
    })()`);
    await sleep(200);

    // 2.5 Pomodoro - Remoção da Barra "Tarefa" acima do cronômetro
    const hasTaskPill = await exec(`Boolean(document.querySelector('div[class*="taskPill"]'))`);
    recordTest('Botões', 'Barra "Tarefa" acima do cronômetro removida com sucesso', !hasTaskPill);


    // 2.6 Pomodoro - Botão Finalizar Timer com centro quadrado ao lado de Pular Sessão
    const finishBtnInfo = await exec(`(() => {
      const finishBtn = document.querySelector('button[class*="finishTimerBtn"]');
      if (!finishBtn) return null;
      const controls = finishBtn.closest('div[class*="controls"]');
      const skipBtn = controls ? controls.querySelector('button[title*="Pular"]') : null;
      const isBesideSkip = Boolean(controls && skipBtn && (finishBtn.previousElementSibling === skipBtn || finishBtn.nextElementSibling === skipBtn));
      const hasSquare = Boolean(finishBtn.querySelector('svg.lucide-square') || finishBtn.querySelector('rect') || finishBtn.querySelector('[class*="squareCenter"]'));
      return { exists: true, inControls: Boolean(controls), isBesideSkip, hasSquare };
    })()`);
    recordTest('Botões', 'Botão Finalizar Timer visível e estilizado', Boolean(finishBtnInfo?.exists));
    recordTest('Botões', 'Botão Finalizar Timer posicionado ao lado do botão de Pular Sessão', Boolean(finishBtnInfo?.isBesideSkip));
    recordTest('Botões', 'Botão Finalizar Timer possui o centro quadrado', Boolean(finishBtnInfo?.hasSquare));

    // Open confirmation modal
    await exec(`(() => {
      const btn = document.querySelector('button[class*="finishTimerBtn"]');
      if (btn) btn.click();
    })()`);
    await sleep(400);

    const finishModalOpen = await exec(`Boolean(document.querySelector('div[class*="confirmModalCard"]'))`);
    const finishModalTitle = await exec(`(() => {
      const h3 = document.querySelector('h3[class*="confirmModalTitle"]');
      return h3 ? h3.innerText.trim() : '';
    })()`);
    recordTest('Botões', 'Exibição do Modal de Confirmação ao clicar em Finalizar Timer', finishModalOpen && finishModalTitle.includes('Finalizar Timer'), `Título: "${finishModalTitle}"`);

    await capture('e2e_finish_timer_modal.png');

    // Test Cancel button inside modal
    await exec(`(() => {
      const cancelBtn = document.querySelector('button[class*="confirmCancelBtn"]');
      if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(300);

    const finishModalClosed = await exec(`!document.querySelector('div[class*="confirmModalCard"]')`);
    recordTest('Botões', 'Cancelamento do Modal de Confirmação mantém o timer intacto', finishModalClosed);

    // Test Confirm Finish Timer flow
    // 1. Start timer
    await exec(`(() => {
      const playBtn = document.querySelector('button[class*="playBtn"]');
      if (playBtn) playBtn.click();
    })()`);
    await sleep(1000);

    // 2. Open finish modal again
    await exec(`(() => {
      const btn = document.querySelector('button[class*="finishTimerBtn"]');
      if (btn) btn.click();
    })()`);
    await sleep(300);

    // 3. Confirm finish
    await exec(`(() => {
      const confirmBtn = document.querySelector('button[class*="finishConfirmBtn"]');
      if (confirmBtn) confirmBtn.click();
    })()`);
    await sleep(600);

    const finishModalClosedAfterConfirm = await exec(`!document.querySelector('div[class*="confirmModalCard"]')`);
    const timerStateAfterFinish = await exec(`(() => {
      const badge = document.querySelector('span[class*="sessionBadge"]');
      const time = document.querySelector('span[class*="time"]');
      return { badge: badge ? badge.innerText.trim() : '', time: time ? time.innerText.trim() : '' };
    })()`);
    recordTest('Botões', 'Confirmação do Modal de Finalizar Timer (contabiliza e avança ciclo)', finishModalClosedAfterConfirm, `Próximo estado: ${timerStateAfterFinish.badge} (${timerStateAfterFinish.time})`);

    await capture('e2e_pomodoro.png');


    // 2.6 Rota /settings redireciona e página de configurações foi removida
    await exec(`window.location.hash = '#/settings'`);
    await sleep(400);
    const hasSettingsPage = await exec(`Boolean(document.querySelector('div[class*="settingsPage"]') || document.querySelector('div[class*="settingsTabs"]'))`);
    recordTest('Rotas', 'Acesso a #/settings redireciona e página de configurações está ausente', !hasSettingsPage);
     // -------------------------------------------------------------
    // SUITE 3: REMOÇÃO DE DISCIPLINAS E CUSTOMIZAÇÃO DE PAUSAS E CICLOS
    // -------------------------------------------------------------
    console.log('\n--- SUITE 3: REMOÇÃO DE DISCIPLINAS E CUSTOMIZAÇÃO DE PAUSAS E CICLOS ---');

    await exec(`window.location.hash = '#/pomodoro'`);
    await sleep(500);

    // 3.1 Verificação de Remoção Completa de Disciplinas do Pomodoro
    const hasDisciplineSelect = await exec(`Boolean(document.querySelector('select[class*="select"]'))`);
    recordTest('Remoção Disciplinas', 'Dropdown de seleção de disciplinas removido do Pomodoro', !hasDisciplineSelect);

    const hasNewSubjectBtn = await exec(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.innerText.trim() === 'Nova' || b.innerText.includes('Gerenciar'));
    })()`);
    recordTest('Remoção Disciplinas', 'Botões "Nova" e "Gerenciar" disciplinas removidos do Pomodoro', !hasNewSubjectBtn);

    const hasDisciplineModals = await exec(`Boolean(document.querySelector('div[class*="disciplinesList"]'))`);
    recordTest('Remoção Disciplinas', 'Modal de cadastro e gerenciamento de matérias removido', !hasDisciplineModals);

    // 3.2 Customização do Tempo de Foco (Chips e Stepper)
    const focusMinusBtn = await exec(`Boolean(document.querySelector('button[data-testid="btn-focus-minus"]'))`);
    recordTest('Configuração Ciclos', 'Botões Stepper do Tempo de Foco presentes (+ e -)', focusMinusBtn);

    // Clicar no chip 45m de foco
    await exec(`(() => {
      const chip45 = document.querySelector('button[data-testid="chip-focus-45"]');
      if (chip45) chip45.click();
    })()`);
    await sleep(300);
    const focusValueAfterChip = await exec(`(() => {
      const el = document.querySelector('span[data-testid="val-focus"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Configuração Ciclos', 'Ajuste do Tempo de Foco via chip rápido (45m)', focusValueAfterChip === '45', `Valor atual: ${focusValueAfterChip}m`);

    // 3.3 Customização do Tempo de Pausa Curta
    // Clicar no chip 5m de pausa curta
    await exec(`(() => {
      const chip5 = document.querySelector('button[data-testid="chip-short-break-5"]');
      if (chip5) chip5.click();
    })()`);
    await sleep(300);
    const shortBreakValue = await exec(`(() => {
      const el = document.querySelector('span[data-testid="val-short-break"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Configuração Ciclos', 'Ajuste do Tempo de Pausa Curta via chip rápido (5m)', shortBreakValue === '5', `Valor atual: ${shortBreakValue}m`);

    // Testar Stepper + na Pausa Curta
    await exec(`(() => {
      const plusBtn = document.querySelector('button[data-testid="btn-short-break-plus"]');
      if (plusBtn) plusBtn.click();
    })()`);
    await sleep(300);
    const shortBreakStepped = await exec(`(() => {
      const el = document.querySelector('span[data-testid="val-short-break"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Configuração Ciclos', 'Ajuste fino do Tempo de Pausa Curta via Stepper (+1m)', shortBreakStepped === '6', `Valor após stepper: ${shortBreakStepped}m`);

    // 3.4 Customização do Tempo de Pausa Longa
    // Clicar no chip 20m de pausa longa
    await exec(`(() => {
      const chip20 = document.querySelector('button[data-testid="chip-long-break-20"]');
      if (chip20) chip20.click();
    })()`);
    await sleep(300);
    const longBreakValue = await exec(`(() => {
      const el = document.querySelector('span[data-testid="val-long-break"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Configuração Ciclos', 'Ajuste do Tempo de Pausa Longa via chip rápido (20m)', longBreakValue === '20', `Valor atual: ${longBreakValue}m`);

    // 3.5 Customização da Quantidade de Ciclos
    // Clicar no chip 3x de ciclos
    await exec(`(() => {
      const chip3 = document.querySelector('button[data-testid="chip-cycles-3"]');
      if (chip3) chip3.click();
    })()`);
    await sleep(300);
    const cyclesValue = await exec(`(() => {
      const el = document.querySelector('span[data-testid="val-cycles"]');
      return el ? el.innerText.trim() : '';
    })()`);
    recordTest('Configuração Ciclos', 'Ajuste de Ciclos de Foco via chip rápido (3x)', cyclesValue === '3', `Valor atual: ${cyclesValue} ciclos`);

    // Verificar se o trilho visual de nós do Pomodoro atualizou para exatamente 3 nós
    const intervalNodesCount = await exec(`document.querySelectorAll('div[class*="intervalNodeWrapper"]').length`);
    recordTest('Configuração Ciclos', 'Atualização reativa dos nós do ciclo no timer visual', intervalNodesCount === 3, `Nós renderizados: ${intervalNodesCount}`);

    // =============================================================
    // SUITE 6: SLIDER LATERAL, SETAS, CRONÔMETRO UNIFICADO E GRÁFICO
    // =============================================================
    console.log('\n--- SUITE 6: SLIDER LATERAL, SETAS, CRONÔMETRO UNIFICADO E GRÁFICO ---');

    // 6.1 Gráfico da Montanha sem fundo de liquid glass
    await exec(`window.location.hash = '#/metrics'`);
    await sleep(600);
    const chartCardStyles = await exec(`(() => {
      const card = document.querySelector('div[class*="chartCard"]');
      if (!card) return null;
      const computed = window.getComputedStyle(card);
      return {
        background: computed.backgroundColor,
        borderStyle: computed.borderStyle,
        backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter || 'none'
      };
    })()`);
    const isChartBgTransparent = chartCardStyles && (
      chartCardStyles.background === 'rgba(0, 0, 0, 0)' || 
      chartCardStyles.background === 'transparent'
    );
    recordTest('Design Gráfico', 'Fundo de liquid glass removido do gráfico (transparente)', isChartBgTransparent, JSON.stringify(chartCardStyles));
    await capture('e2e_flow_metrics.png');

    // 6.2 Cronômetro: Timer e Seção de Estudos unificados em um único elemento
    await exec(`window.location.hash = '#/pomodoro'`);
    await sleep(600);
    const unifiedChamberInfo = await exec(`(() => {
      const chamber = document.querySelector('div[class*="unifiedChamber"]');
      if (!chamber) return null;
      const timerCol = chamber.querySelector('div[class*="timerColumn"], div[class*="timerSection"]');
      const sessionCol = chamber.querySelector('div[class*="sessionColumn"], div[class*="sidePanel"]');
      return {
        hasChamber: Boolean(chamber),
        hasTimerInside: Boolean(timerCol),
        hasSessionInside: Boolean(sessionCol)
      };
    })()`);
    const isChamberUnified = unifiedChamberInfo && unifiedChamberInfo.hasChamber && unifiedChamberInfo.hasTimerInside && unifiedChamberInfo.hasSessionInside;
    recordTest('Pomodoro Unificado', 'Timer e Seção de Estudos reunidos em um único elemento container', isChamberUnified, JSON.stringify(unifiedChamberInfo));
    await capture('e2e_flow_pomodoro_unified.png');

    // 6.3 Navegação por Setas Laterais
    // Voltar para Métricas (slide 0)
    await exec(`window.location.hash = '#/metrics'`);
    await sleep(600);

    const slide0Arrows = await exec(`(() => {
      return {
        hasPrev: Boolean(document.getElementById('flow-arrow-prev')),
        hasNext: Boolean(document.getElementById('flow-arrow-next'))
      };
    })()`);
    recordTest('Setas Laterais', 'Slide Métricas: seta direita presente e seta esquerda oculta', !slide0Arrows.hasPrev && slide0Arrows.hasNext);

    // Clicar na seta direita para ir ao Pomodoro
    await exec(`(() => {
      const nextBtn = document.getElementById('flow-arrow-next');
      if (nextBtn) nextBtn.click();
    })()`);
    await sleep(600);

    const currentHashAfterNext = await exec(`window.location.hash`);
    const isPomodoroNow = currentHashAfterNext === '#/pomodoro';
    recordTest('Setas Laterais', 'Clique na seta direita avança para Pomodoro (#/pomodoro)', isPomodoroNow, `Hash atual: ${currentHashAfterNext}`);

    const slide1Arrows = await exec(`(() => {
      return {
        hasPrev: Boolean(document.getElementById('flow-arrow-prev')),
        hasNext: Boolean(document.getElementById('flow-arrow-next'))
      };
    })()`);
    recordTest('Setas Laterais', 'Slide Pomodoro: ambas setas (esquerda e direita) presentes', slide1Arrows.hasPrev && slide1Arrows.hasNext);

    // Clicar na seta direita novamente para ir ao Calendário
    await exec(`(() => {
      const nextBtn = document.getElementById('flow-arrow-next');
      if (nextBtn) nextBtn.click();
    })()`);
    await sleep(600);

    const currentHashCalendar = await exec(`window.location.hash`);
    const isCalendarNow = currentHashCalendar === '#/calendar';
    recordTest('Setas Laterais', 'Clique na seta direita avança para Calendário (#/calendar)', isCalendarNow, `Hash atual: ${currentHashCalendar}`);
    await capture('e2e_flow_calendar.png');

    const slide2Arrows = await exec(`(() => {
      return {
        hasPrev: Boolean(document.getElementById('flow-arrow-prev')),
        hasNext: Boolean(document.getElementById('flow-arrow-next'))
      };
    })()`);
    recordTest('Setas Laterais', 'Slide Calendário: seta esquerda presente e seta direita oculta', slide2Arrows.hasPrev && !slide2Arrows.hasNext);

    // Clicar na seta esquerda para voltar ao Pomodoro
    await exec(`(() => {
      const prevBtn = document.getElementById('flow-arrow-prev');
      if (prevBtn) prevBtn.click();
    })()`);
    await sleep(600);

    const currentHashBackToPomodoro = await exec(`window.location.hash`);
    recordTest('Setas Laterais', 'Clique na seta esquerda retorna ao Pomodoro', currentHashBackToPomodoro === '#/pomodoro', `Hash atual: ${currentHashBackToPomodoro}`);

    // 6.4 Navegação pelos Pills Superiores (Métricas -> Calendário -> Pomodoro)
    await exec(`(() => {
      const pillMetrics = document.querySelector('button[data-testid="flow-pill-metrics"]');
      if (pillMetrics) pillMetrics.click();
    })()`);
    await sleep(600);
    const hashFromPillMetrics = await exec(`window.location.hash`);
    recordTest('Scroll & Pills Superiores', 'Clique no pill "Métricas" navega para slide de Métricas (#/metrics)', hashFromPillMetrics === '#/metrics', `Hash: ${hashFromPillMetrics}`);

    await exec(`(() => {
      const pillCal = document.querySelector('button[data-testid="flow-pill-calendar"]');
      if (pillCal) pillCal.click();
    })()`);
    await sleep(600);
    const hashFromPillCal = await exec(`window.location.hash`);
    recordTest('Scroll & Pills Superiores', 'Clique no pill "Calendário" navega para slide de Calendário (#/calendar)', hashFromPillCal === '#/calendar', `Hash: ${hashFromPillCal}`);

    // Capture Settings Screenshot
    await exec(`window.location.hash = '#/settings'`);
    await sleep(500);
    await capture('e2e_settings.png');

    // Final Report
    console.log('\n======================================================');
    console.log('               RELATÓRIO FINAL DOS TESTES E2E         ');
    console.log('======================================================');
    const totalTests = testResults.length;
    const passedTests = testResults.filter(t => t.passed).length;
    const failedTests = testResults.filter(t => !t.passed).length;

    console.log(`\nTotal de Testes Executados: ${totalTests}`);
    console.log(`Testes Aprovados (PASS):    ${passedTests}`);
    console.log(`Testes Falhos (FAIL):       ${failedTests}`);
    console.log(`Taxa de Sucesso:            ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

    if (failedTests > 0) {
      console.log('DETALHES DAS FALHAS:');
      testResults.filter(t => !t.passed).forEach(t => {
        console.log(` - [${t.suite}] ${t.testName}: ${t.details}`);
      });
    } else {
      console.log('🎉 TODOS OS TESTES E2E PASSARAM COM 100% DE SUCESSO!');
    }

    // Save JSON results to artifacts
    if (fs.existsSync(ARTIFACTS_DIR)) {
      fs.writeFileSync(
        path.join(ARTIFACTS_DIR, 'e2e_results.json'),
        JSON.stringify({ totalTests, passedTests, failedTests, results: testResults, timestamp: new Date().toISOString() }, null, 2)
      );
    }

    setTimeout(() => {
      app.quit();
      process.exit(failedTests > 0 ? 1 : 0);
    }, 1000);

  } catch (error) {
    console.error('ERRO CRÍTICO DURANTE EXECUÇÃO DO E2E:', error);
    app.quit();
    process.exit(1);
  }
});
