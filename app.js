const initialClasses = [
  { id: 1, name: "7º ano B", subject: "Língua Portuguesa", lessons: 4, schedule: ["Seg 08:20", "Ter 09:10 · faixa", "Qui 10:15"] },
  { id: 2, name: "8º ano A", subject: "Língua Portuguesa", lessons: 4, schedule: ["Seg 10:15", "Qua 08:20 · faixa", "Sex 09:10"] },
  { id: 3, name: "9º ano C", subject: "Língua Portuguesa", lessons: 3, schedule: ["Ter 10:15", "Qui 08:20", "Sex 11:05"] }
];

const LOCAL_STORAGE_KEY = "carijo-professor-data-v1";

let skillCatalog = [
  { code: "EF67LP04", area: "leitura", text: "Distinguir fatos de opiniões em textos argumentativos e reconhecer os efeitos produzidos por essa escolha." },
  { code: "EF67LP20", area: "leitura", text: "Realizar pesquisa a partir de recortes e questões definidos, usando fontes confiáveis e registrando as informações." },
  { code: "EF69LP13", area: "oralidade", text: "Engajar-se em discussões de interesse coletivo, respeitando turnos de fala e sustentando pontos de vista." },
  { code: "EF69LP15", area: "oralidade", text: "Apresentar argumentos e contra-argumentos coerentes em situações de discussão sobre temas controversos." },
  { code: "EF67LP30", area: "escrita", text: "Criar narrativas ficcionais com enredo, personagens, tempo, espaço e recursos expressivos adequados." },
  { code: "EF69LP08", area: "escrita", text: "Revisar e editar textos considerando contexto, suporte, normas de escrita e adequação ao gênero." }
];

const ACADEMIC_BASE = [
  "VYGOTSKY, L. S. A formação social da mente. São Paulo: Martins Fontes, 2007.",
  "ZABALA, A. A prática educativa: como ensinar. Porto Alegre: Artmed, 1998.",
  "FREIRE, P. Pedagogia da autonomia: saberes necessários à prática educativa. São Paulo: Paz e Terra, 1996."
];

const RMEF_CURRICULAR_FOUNDATION = "Fundamente o planejamento na Proposta Curricular da RMEF (2016): formação humana integral e emancipatória; articulação entre conhecimentos cotidianos e conhecimentos das ciências, artes, filosofia e ética; integração entre áreas; contextualização no território; valorização das diferenças; e autonomia pedagógica da unidade educativa para definir temas e vínculos intersetoriais. Use a Matriz de Referência Curricular RMEF 2026 como referência obrigatória: ela organiza habilidades essenciais por componente, ano e trimestre e prevê recomposição das aprendizagens quando necessária. Trabalhe com as habilidades oficiais selecionadas no Carijó, mantendo seu código e sentido, e com as complementações explicitamente acrescentadas pelo professor, identificando-as como tais; não invente códigos, objetos de conhecimento, atribuições institucionais ou citações. As propostas devem ser viáveis, inclusivas, investigativas, articuladas à cultura e às experiências dos estudantes, e prever acompanhamento formativo. Quando houver tecnologias ou mídias digitais, trate-as criticamente: cidadania digital, equidade de acesso, direitos digitais, autoria e uso ético, sem reduzir educação digital ao treino técnico. Quando a base disponível não for suficiente, escreva claramente 'validar na matriz oficial'.";
const RMEF_OFFICIAL_SOURCES = [
  "FLORIANÓPOLIS. Secretaria Municipal de Educação. Proposta Curricular da Rede Municipal de Ensino de Florianópolis. 2016.",
  "FLORIANÓPOLIS. Secretaria Municipal de Educação. Matriz de Referência Curricular — Anos Iniciais. 2026. Portal Educacional da RMEF.",
  "FLORIANÓPOLIS. Secretaria Municipal de Educação. Matriz de Referência Curricular — Anos Finais. 2026. Portal Educacional da RMEF.",
  "FLORIANÓPOLIS. Secretaria Municipal de Educação. Referencial Curricular de Educação Digital e Midiática. 2026."
];

function skillKey(skill) {
  return skill.id || skill.code || skill.codes?.join("-") || skill.text;
}

function skillCodeLabel(skill) {
  const codes = skill.codes || (skill.code ? [skill.code] : []);
  return codes.length ? `BNCC: ${codes.join(", ")}` : "Sem código BNCC";
}

function normalizeSubjectForMatrix(subject = "") {
  const value = subject.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("portuguesa") || value.includes("redacao")) return "Língua Portuguesa";
  if (value.includes("ingles") || value.includes("espanhola") || value.includes("estrangeira")) return "Língua Estrangeira";
  if (value.includes("educacao fisica")) return "Educação Física";
  if (value.includes("ciencia")) return "Ciências";
  if (value.includes("matematica")) return "Matemática";
  if (value.includes("geografia")) return "Geografia";
  if (value.includes("historia")) return "História";
  if (value.includes("arte")) return "Artes";
  if (value.includes("religioso")) return "Ensino Religioso";
  if (value.includes("digital") || value.includes("midia")) return "Educação Digital e Midiática";
  return subject;
}

function gradeFromClass(item) {
  const match = item?.name?.match(/\b([1-9])\s*[º°]?\s*ano\b/i);
  return match ? Number(match[1]) : null;
}

let previousTrimesters = new Set();
let generatedContext = null;
let supervisorReport = null;

function skillsForSelectedClass(includePrevious = true) {
  const item = getSelectedClass();
  if (!item) return skillCatalog;
  const grade = gradeFromClass(item);
  const subject = normalizeSubjectForMatrix(item.subject);
  const trimester = Number($("#recorteQuarter")?.value || 1);
  return skillCatalog.filter(skill => skill.area === "manual" || (skill.grade === grade && skill.subject === subject && (!skill.trimester || skill.trimester === trimester || (includePrevious && skill.trimester < trimester && previousTrimesters.has(skill.trimester)))));
}

function mandatoryQuarterSkills() {
  return state.planType === "quarter" ? skillsForSelectedClass(false).filter(skill => skill.area === "oficial") : [];
}

function renderPreviousTrimesters() {
  const current = Number($("#recorteQuarter").value);
  previousTrimesters = new Set([...previousTrimesters].filter(value => value < current));
  $("#previousTrimesters").innerHTML = current === 1 ? "Não há trimestres anteriores neste ano." : Array.from({length: current - 1}, (_, i) => `<label><input type="checkbox" value="${i + 1}" ${previousTrimesters.has(i + 1) ? "checked" : ""}> Carregar habilidades do ${i + 1}º trimestre</label>`).join("");
  $$("#previousTrimesters input").forEach(input => input.addEventListener("change", () => {
    input.checked ? previousTrimesters.add(Number(input.value)) : previousTrimesters.delete(Number(input.value));
    const available = new Set(skillsForSelectedClass().map(skillKey));
    state.skills = new Set([...state.skills].filter(key => available.has(key)));
    renderSkills();
  }));
}

const SUBJECT_PROFILES = {
  "Língua Portuguesa": {
    focus: "leitura crítica, produção de sentidos e autoria em práticas reais de linguagem",
    contents: "estratégias de leitura, análise de pontos de vista, pesquisa de fontes, argumentação e revisão autoral",
    actions: ["mapear repertórios de leitura", "analisar escolhas linguísticas", "comparar fontes e pontos de vista", "planejar uma produção autoral", "revisar com critérios compartilhados", "socializar e refletir sobre o percurso"],
    sources: ["GERALDI, J. W. Portos de passagem. São Paulo: Martins Fontes, 1997.", "ROJO, R.; MOURA, E. (org.). Multiletramentos na escola. São Paulo: Parábola, 2012.", "COSSON, R. Letramento literário: teoria e prática. São Paulo: Contexto, 2014."]
  },
  "Matemática": {
    focus: "raciocínio matemático, resolução de problemas e comunicação de estratégias",
    contents: "problematização, representação de ideias, argumentação matemática e validação de procedimentos",
    actions: ["apresentar uma situação-problema significativa", "levantar estratégias e hipóteses", "representar procedimentos de modos diversos", "comparar soluções e justificar escolhas", "sistematizar conceitos", "aplicar o conhecimento em novo contexto"],
    sources: ["NATIONAL RESEARCH COUNCIL. Adding it up: helping children learn mathematics. Washington, DC: National Academies Press, 2001. DOI: 10.17226/9822.", "SKOVSMOSE, O. Educação matemática crítica: a questão da democracia. Campinas: Papirus, 2001."]
  },
  "Ciências": {
    focus: "investigação de fenômenos, construção de explicações e argumentação baseada em evidências",
    contents: "perguntas investigáveis, hipóteses, observação, análise de evidências e comunicação científica",
    actions: ["problematizar um fenômeno do cotidiano", "formular hipóteses", "planejar observações ou investigação", "registrar e interpretar evidências", "construir explicações coletivas", "comunicar conclusões e limites"],
    sources: ["NATIONAL RESEARCH COUNCIL. A framework for K-12 science education. Washington, DC: National Academies Press, 2012. DOI: 10.17226/13165.", "CARVALHO, A. M. P. (org.). Ensino de ciências por investigação. São Paulo: Cengage Learning, 2013."]
  },
  "Educação Física": {
    focus: "apropriação crítica da cultura corporal, participação segura e reflexão sobre as práticas corporais",
    contents: "práticas corporais, regras, táticas, cooperação, cuidado de si e leitura crítica da cultura do movimento",
    actions: ["mapear vivências e combinados de segurança", "experimentar práticas corporais com desafios graduados", "observar gestos, regras e estratégias", "criar variações inclusivas da prática", "analisar cooperação e participação", "sistematizar aprendizagens corporais e conceituais"],
    sources: ["BRACHT, V. A constituição das teorias pedagógicas da educação física. Cadernos CEDES, Campinas, v. 19, n. 48, 1999.", "GONZÁLEZ, F. J.; FENSTERSEIFER, P. E. Entre o 'não mais' e o 'ainda não': pensando saídas do não-lugar da EF escolar I. Cadernos de Formação RBCE, v. 1, n. 1, 2009."]
  },
  "História": {
    focus: "pensamento histórico, análise de fontes e compreensão de temporalidades e perspectivas",
    contents: "fontes históricas, evidências, narrativas, permanências, mudanças e multiperspectividade",
    actions: ["levantar ideias prévias sobre o tema", "interrogar fontes e seus contextos", "comparar narrativas e perspectivas", "organizar evidências", "elaborar interpretação histórica", "comunicar conclusões com argumentos"],
    sources: ["SCHMIDT, M. A.; CAINELLI, M. Ensinar História. São Paulo: Scipione, 2004.", "RÜSEN, J. História viva: teoria da história III. Brasília: UnB, 2007."]
  },
  "Geografia": {
    focus: "raciocínio geográfico, leitura do território e relação entre escalas, sociedade e natureza",
    contents: "lugar, paisagem, território, redes, escalas de análise e problemáticas socioambientais",
    actions: ["situar o problema no território vivido", "ler mapas, imagens ou dados", "identificar relações entre escalas", "comparar paisagens e processos", "formular explicações geográficas", "propor leitura crítica ou intervenção"],
    sources: ["CAVALCANTI, L. S. Geografia, escola e construção de conhecimentos. Campinas: Papirus, 1998.", "CALLAI, H. C. Aprendendo a ler o mundo: a geografia nos anos iniciais do ensino fundamental. Cadernos CEDES, v. 25, n. 66, 2005."]
  },
  "Artes": {
    focus: "criação, fruição, contextualização e reflexão crítica sobre produções artísticas",
    contents: "processos de criação, repertórios artísticos, materialidades, leitura de obras e compartilhamento de produções",
    actions: ["sensibilizar o olhar e o repertório", "apreciar produções em contexto", "experimentar materialidades e procedimentos", "criar individual ou coletivamente", "compartilhar processos", "refletir e documentar escolhas"],
    sources: ["BARBOSA, A. M. A imagem no ensino da arte. São Paulo: Perspectiva, 2010.", "DEWEY, J. Arte como experiência. São Paulo: Martins Fontes, 2010."]
  },
  "Língua Inglesa": {
    focus: "uso significativo da língua adicional, interculturalidade e ampliação de repertórios comunicativos",
    contents: "compreensão e produção de textos multimodais, interação, repertório linguístico e circulação cultural",
    actions: ["ativar repertórios e propósitos comunicativos", "compreender textos multimodais", "notar usos linguísticos em contexto", "interagir em tarefas significativas", "produzir e revisar textos", "compartilhar e refletir sobre escolhas interculturais"],
    sources: ["RAJAGOPALAN, K. Por uma linguística crítica: linguagem, identidade e a questão ética. São Paulo: Parábola, 2003.", "MENEZES DE SOUZA, L. M. T. Para uma redefinição de letramento crítico. In: MACIEL, R. F.; ARAÚJO, V. A. (org.). Formação de professores de línguas. Campinas: Pontes, 2010."]
  },
  "Língua Espanhola": {
    focus: "uso significativo da língua espanhola, interculturalidade latino-americana e repertórios comunicativos plurais",
    contents: "compreensão e produção de textos multimodais, interação, variação linguística e circulação cultural latino-americana",
    actions: ["ativar repertórios culturais e linguísticos", "compreender textos multimodais", "comparar usos da língua em contexto", "interagir em tarefas significativas", "produzir e revisar textos", "compartilhar descobertas interculturais"],
    sources: ["RAJAGOPALAN, K. Por uma linguística crítica: linguagem, identidade e a questão ética. São Paulo: Parábola, 2003.", "PARAQUETT, M. O papel que cumprimos os professores de espanhol como língua estrangeira no Brasil. Cadernos de Letras da UFF, n. 38, 2009."]
  },
  "Educação Digital e Midiática": {
    focus: "cidadania digital, autoria crítica, leitura de mídias e uso ético e criativo das tecnologias",
    contents: "cultura digital, confiabilidade da informação, direitos digitais, algoritmos, autoria, segurança e produção midiática",
    actions: ["mapear práticas digitais do cotidiano", "investigar fontes e rastros de informação", "analisar interesses e linguagens midiáticas", "criar conteúdo com autoria e atribuição", "discutir direitos, riscos e responsabilidades", "avaliar criticamente processos e escolhas"],
    sources: ["BUCKINGHAM, D. Cultura digital, educação midiática e o lugar da escolarização. Educação & Realidade, v. 35, n. 3, 2010.", "FLORIANÓPOLIS. Secretaria Municipal de Educação. Referencial Curricular de Educação Digital e Midiática. 2026."]
  },
  "Ensino Religioso": {
    focus: "compreensão crítica da diversidade religiosa e não religiosa, convivência democrática e direitos humanos",
    contents: "tradições, filosofias de vida, identidades, alteridades, laicidade, direitos humanos e cultura de paz",
    actions: ["levantar percepções sem exposição pessoal", "analisar manifestações em contexto", "comparar perspectivas com respeito", "problematizar intolerâncias e estereótipos", "produzir sínteses plurais", "pactuar atitudes de convivência democrática"],
    sources: ["BRASIL. Ministério da Educação. Base Nacional Comum Curricular. 2018.", "FLORIANÓPOLIS. Secretaria Municipal de Educação. Matriz de Referência Curricular — Anos Finais. 2026."]
  },
  "Informática": {
    focus: "uso crítico, seguro e autoral de recursos computacionais em situações significativas",
    contents: "resolução de problemas, organização da informação, segurança, autoria, pensamento computacional e cultura digital",
    actions: ["identificar uma necessidade real", "decompor o problema", "experimentar ferramentas e estratégias", "registrar decisões", "produzir solução autoral", "testar, revisar e discutir impactos"],
    sources: ["PAPERT, S. A máquina das crianças: repensando a escola na era da informática. Porto Alegre: Artmed, 2008.", "FLORIANÓPOLIS. Secretaria Municipal de Educação. Referencial Curricular de Educação Digital e Midiática. 2026."]
  },
  "Projeto de Vida, Saúde e Educação Socioemocional": {
    focus: "autoconhecimento, participação coletiva, cuidado, direitos e construção crítica de projetos pessoais e comuns",
    contents: "identidade, convivência, saúde integral, participação, tomada de decisão e projetos coletivos",
    actions: ["acolher experiências sem exposição compulsória", "problematizar situações reais", "analisar redes de apoio e direitos", "construir estratégias coletivas", "registrar decisões e compromissos", "avaliar processos sem psicologização"],
    sources: ["FREIRE, P. Pedagogia da autonomia: saberes necessários à prática educativa. São Paulo: Paz e Terra, 1996.", "ZABALA, A. A prática educativa: como ensinar. Porto Alegre: Artmed, 1998."]
  }
};

const GENERIC_PROFILE = {
  focus: "apropriação conceitual, investigação, participação colaborativa e comunicação das aprendizagens",
  contents: "conceitos do componente, investigação de questões relevantes, análise de evidências e produção de sínteses",
  actions: ["mobilizar conhecimentos prévios", "problematizar uma questão relevante", "investigar fontes e evidências", "organizar descobertas", "produzir uma síntese autoral", "socializar e avaliar o percurso"],
  sources: ["AUSUBEL, D. P. Aquisição e retenção de conhecimentos: uma perspectiva cognitiva. Lisboa: Plátano, 2003."]
};

const state = {
  classes: [],
  skills: new Set(["EF67LP04", "EF67LP20", "EF69LP13"]),
  activitySkills: new Set(),
  planType: "fortnight",
  fileName: "grade_horarios_2026.pdf",
  confidence: 100,
  extractionMessage: "Grade de exemplo carregada."
};

function saveLocalData() {
  try {
    const payload = {
      version: 1,
      savedAt: new Date().toISOString(),
      ownerId: currentUser?.id || null,
      classes: state.classes,
      skills: [...state.skills],
      planType: state.planType
    };
    const previous = localStorage.getItem(LOCAL_STORAGE_KEY);
    const previousPayload = previous ? JSON.parse(previous) : null;
    if (!authReady && previousPayload?.ownerId) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    updateStorageStatus(payload);
    if (currentUser && !cloudSyncInProgress) void syncCloudData();
  } catch (error) {
    console.warn("Não foi possível salvar os dados localmente.", error);
  }
}

function restoreLocalData() {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return false;
    const payload = JSON.parse(stored);
    if (!Array.isArray(payload.classes)) return false;
    if (payload.ownerId && (!currentUser || payload.ownerId !== currentUser.id)) return false;
    state.classes = payload.classes.map(item => ({ ...item, schedule: Array.isArray(item.schedule) ? item.schedule : [] }));
    if (Array.isArray(payload.skills)) state.skills = new Set(payload.skills);
    if (["quarter", "fortnight"].includes(payload.planType)) state.planType = payload.planType;
    updateStorageStatus(payload);
    return true;
  } catch (error) {
    console.warn("Não foi possível recuperar os dados salvos.", error);
    return false;
  }
}

function updateStorageStatus(payload) {
  const status = $("#storageStatus");
  if (!status) return;
  const count = state.classes.length;
  if (!payload?.savedAt) {
    status.textContent = "Nenhuma turma salva neste dispositivo.";
    return;
  }
  const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(payload.savedAt));
  status.textContent = `${count} ${count === 1 ? "turma salva" : "turmas salvas"} neste dispositivo · última alteração em ${date}.`;
}

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const SUPABASE_URL = "https://zfztuvkrejskelaomoan.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SmsYP1egkB6bS9y8lCrlfw_C21uKqgu";
const supabaseClient = window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let currentUser = null;
let cloudSyncInProgress = false;
let authReady = false;
let historyPlans = [];
let currentPlanId = null;
let currentActivityText = "";
let lastFocusedElement = null;
let usageState = null;
let generationInProgress = false;
let resolveGenerationConfirmation = null;
const DAYS = [
  { name: "Seg", pattern: /\b(seg(?:unda)?(?:-feira)?)\b/i },
  { name: "Ter", pattern: /\b(ter(?:ça)?(?:-feira)?)\b/i },
  { name: "Qua", pattern: /\b(qua(?:rta)?(?:-feira)?)\b/i },
  { name: "Qui", pattern: /\b(qui(?:nta)?(?:-feira)?)\b/i },
  { name: "Sex", pattern: /\b(sex(?:ta)?(?:-feira)?)\b/i }
];
const SUBJECT_OPTIONS = [
  "Língua Portuguesa",
  "Língua Portuguesa — Alfabetização",
  "Redação — Produção de gêneros textuais",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Artes",
  "Educação Física",
  "Língua Inglesa",
  "Língua Espanhola",
  "Ensino Religioso",
  "Educação Digital e Midiática",
  "Informática",
  "Projeto de Vida, Saúde e Educação Socioemocional"
];
const SUBJECTS = [...SUBJECT_OPTIONS, "Inglês", "Espanhol"];

function escapeAttr(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function canonicalDay(value) {
  const text = normalize(value);
  if (/\bseg(?:unda)?(?:-feira)?\b/.test(text)) return "Seg";
  if (/\bter(?:ca)?(?:-feira)?\b/.test(text)) return "Ter";
  if (/\bqua(?:rta)?(?:-feira)?\b/.test(text)) return "Qua";
  if (/\bqui(?:nta)?(?:-feira)?\b/.test(text)) return "Qui";
  if (/\bsex(?:ta)?(?:-feira)?\b/.test(text)) return "Sex";
  return "";
}

function findTimes(value) {
  return [...String(value).matchAll(/\b([0-2]?\d)\s*[:h]\s*([0-5]\d)\b/gi)].map(match => `${match[1].padStart(2, "0")}:${match[2]}`);
}

function findClassName(value) {
  const text = String(value).replace(/\s+/g, " ");
  const year = text.match(/\b([1-9])\s*(?:º|°|o)?\s*(?:ano)?\s*[-–]?\s*([A-Z0-9])\b/i);
  if (year) return `${year[1]}º ano ${year[2].toUpperCase()}`;
  const compact = text.match(/^\s*([1-9])([1-9])(?:\s+(?=[A-Za-zÀ-ÿ])|\s*$)/);
  if (compact) return `${compact[1]}º ano ${compact[2]}`;
  const turma = text.match(/\bturma\s*[:\-]?\s*([A-Z0-9][A-Z0-9 -]{0,12})/i);
  return turma ? `Turma ${turma[1].trim().toUpperCase()}` : "";
}

function findTimeRanges(value) {
  return [...String(value).matchAll(/\b([0-2]?\d\s*[:h]\s*[0-5]\d)\s*[-–—]\s*([0-2]?\d\s*[:h]\s*[0-5]\d)\b/gi)]
    .map(match => `${match[1].replace(/\s*h\s*/i, ":").replace(/\s/g, "")}–${match[2].replace(/\s*h\s*/i, ":").replace(/\s/g, "")}`);
}

function findSubject(value) {
  const text = normalize(value);
  const found = SUBJECTS.find(subject => text.includes(normalize(subject)));
  if (found) return found === "Inglês" ? "Língua Inglesa" : found === "Espanhol" ? "Língua Espanhola" : found;
  if (/portugu[eê]s|linguagens?/i.test(value)) return "Língua Portuguesa";
  if (/educa[cç][aã]o\s*f[ií]sica/i.test(value)) return "Educação Física";
  return "";
}

function parseCsvLine(line, delimiter) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { cells.push(current.trim()); current = ""; }
    else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseDelimited(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
  const sample = lines.slice(0, 5).join("\n");
  const delimiters = [";", "\t", ","];
  const delimiter = delimiters.sort((a, b) => sample.split(b).length - sample.split(a).length)[0];
  return lines.map(line => parseCsvLine(line, delimiter));
}

function addExtracted(map, name, subject, schedule = [], explicitLessons = 0) {
  if (!name) return;
  const cleanSubject = subject || "Disciplina não identificada";
  const key = `${normalize(name)}|${normalize(cleanSubject)}`;
  if (!map.has(key)) map.set(key, { name, subject: cleanSubject, schedule: new Set(), explicitLessons: 0 });
  const item = map.get(key);
  schedule.filter(Boolean).forEach(slot => item.schedule.add(slot));
  item.explicitLessons = Math.max(item.explicitLessons, Number(explicitLessons) || 0);
}

function parseRows(rowGroups) {
  const map = new Map();
  let matchedFields = 0;
  rowGroups.forEach(rows => {
    if (!rows?.length) return;
    const headerIndex = rows.slice(0, 12).reduce((best, row, index) => {
      const score = row.reduce((sum, cell) => sum + (/turma|s[eé]rie|ano|disciplina|componente|hor[aá]rio|aulas?|segunda|ter[cç]a|quarta|quinta|sexta/i.test(String(cell)) ? 1 : 0), 0);
      return score > best.score ? { index, score } : best;
    }, { index: 0, score: -1 }).index;
    const headers = rows[headerIndex].map(normalize);
    const findCol = patterns => headers.findIndex(header => patterns.some(pattern => header.includes(pattern)));
    const classCol = findCol(["turma", "serie", "ano"]);
    const subjectCol = findCol(["disciplina", "componente", "materia"]);
    const dayCol = findCol(["dia da semana", "dia"]);
    const timeCol = findCol(["horario", "hora"]);
    const lessonsCol = findCol(["quantidade", "aulas", "carga horaria"]);
    const scheduleCol = findCol(["horarios", "grade"]);
    const dayCols = headers.map((header, index) => ({ index, day: canonicalDay(header) })).filter(entry => entry.day);

    rows.slice(headerIndex + 1).forEach(row => {
      if (!row.some(cell => String(cell).trim())) return;
      let className = classCol >= 0 ? findClassName(row[classCol]) || String(row[classCol] || "").trim() : "";
      let subject = subjectCol >= 0 ? findSubject(row[subjectCol]) || String(row[subjectCol] || "").trim() : "";
      const joined = row.join(" ");
      className ||= findClassName(joined);
      subject ||= findSubject(joined);

      if (classCol < 0 && dayCols.length) {
        const rowTime = findTimeRanges(row[0])[0] || findTimes(row[0])[0] || "Horário a definir";
        dayCols.forEach(({ index, day }) => {
          const cell = String(row[index] || "").trim();
          const cellClass = findClassName(cell);
          const cellTime = findTimeRanges(cell)[0] || findTimes(cell)[0] || rowTime;
          if (cellClass) addExtracted(map, cellClass, findSubject(cell), [`${day} ${cellTime}`]);
        });
        matchedFields += 1;
      } else if (className && dayCols.length) {
        dayCols.forEach(({ index, day }) => {
          const cell = String(row[index] || "").trim();
          if (!cell || /livre|janela|planejamento|intervalo/i.test(cell)) return;
          const times = findTimes(cell);
          const slots = times.length ? times.map(time => `${day} ${time}`) : [`${day} ${cell}`];
          addExtracted(map, className, subject, slots, lessonsCol >= 0 ? row[lessonsCol] : 0);
        });
        matchedFields += 2;
      } else if (className) {
        const day = dayCol >= 0 ? canonicalDay(row[dayCol]) : canonicalDay(joined);
        const times = timeCol >= 0 ? findTimes(row[timeCol]) : findTimes(joined);
        let slots = day && times.length ? times.map(time => `${day} ${time}`) : [];
        if (!slots.length && scheduleCol >= 0) slots = String(row[scheduleCol] || "").split(/[;|]/).map(value => value.trim()).filter(Boolean);
        addExtracted(map, className, subject, slots, lessonsCol >= 0 ? row[lessonsCol] : 0);
        matchedFields += 1;
      }
    });
  });
  return { map, matchedFields };
}

function parseLooseText(text, existingMap = new Map()) {
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  lines.forEach((line, index) => {
    const context = [lines[index - 1], line, lines[index + 1]].filter(Boolean).join(" ");
    const className = findClassName(line) || findClassName(context);
    if (!className) return;
    const subject = findSubject(line) || findSubject(context);
    const day = canonicalDay(line) || canonicalDay(context);
    const times = findTimes(line).length ? findTimes(line) : findTimes(context).slice(0, 2);
    const slots = day && times.length ? times.map(time => `${day} ${time}`) : [];
    addExtracted(existingMap, className, subject, slots);
  });
  return existingMap;
}

function finalizeExtraction(map) {
  return [...map.values()].map((item, index) => {
    const rawSchedule = [...item.schedule];
    const schedule = [];
    const used = new Set();
    rawSchedule.forEach((slot, slotIndex) => {
      if (used.has(slotIndex)) return;
      const match = slot.match(/^(Seg|Ter|Qua|Qui|Sex)\s+(\d{2}):(\d{2})/i);
      if (!match) { schedule.push(slot); return; }
      const minutes = Number(match[2]) * 60 + Number(match[3]);
      const partnerIndex = rawSchedule.findIndex((other, otherIndex) => {
        if (otherIndex === slotIndex || used.has(otherIndex)) return false;
        const otherMatch = other.match(/^(Seg|Ter|Qua|Qui|Sex)\s+(\d{2}):(\d{2})/i);
        if (!otherMatch || otherMatch[1].toLowerCase() !== match[1].toLowerCase()) return false;
        const difference = Math.abs((Number(otherMatch[2]) * 60 + Number(otherMatch[3])) - minutes);
        return difference >= 35 && difference <= 75;
      });
      if (partnerIndex >= 0) {
        const firstTime = slot.replace(new RegExp(`^${match[1]}\\s*`, "i"), "").trim();
        const partnerTime = rawSchedule[partnerIndex].replace(new RegExp(`^${match[1]}\\s*`, "i"), "").trim();
        schedule.push(`${match[1]} ${firstTime} + ${partnerTime} · faixa`);
        used.add(partnerIndex);
      } else schedule.push(slot);
    });
    return { id: index + 1, name: item.name, subject: item.subject, lessons: item.explicitLessons || rawSchedule.length || 1, schedule };
  });
}

async function extractPdf(file, onProgress) {
  if (!window.pdfjsLib) throw new Error("O leitor de PDF não pôde ser carregado. Verifique a conexão e tente novamente.");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await window.pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  const rowGroups = [];
  let fullText = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress(20 + Math.round((pageNumber / pdf.numPages) * 45), `Lendo a página ${pageNumber} de ${pdf.numPages}…`);
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = new Map();
    content.items.forEach(item => {
      const y = Math.round(item.transform[5] / 4) * 4;
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push({ x: item.transform[4], text: item.str });
    });
    const rows = [...lines.entries()].sort((a, b) => b[0] - a[0]).map(([, items]) => items.sort((a, b) => a.x - b.x).map(item => item.text.trim()).filter(Boolean));
    rowGroups.push(rows);
    fullText += `${rows.map(row => row.join(" ")).join("\n")}\n`;
  }
  if (fullText.replace(/\s/g, "").length < 40) return extractPdfWithOcr(pdf, onProgress);
  const parsed = parseRows(rowGroups);
  parseLooseText(fullText, parsed.map);
  return { classes: finalizeExtraction(parsed.map), source: "texto do PDF", quality: parsed.matchedFields };
}

async function extractPdfWithOcr(pdf, onProgress) {
  if (!window.Tesseract) throw new Error("Este PDF é uma imagem e o OCR não pôde ser carregado. Verifique a conexão e tente novamente.");
  let text = "";
  const spatialMap = new Map();
  const pages = Math.min(pdf.numPages, 5);
  for (let pageNumber = 1; pageNumber <= pages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    const result = await runOcr(canvas, progress => onProgress(30 + Math.round(progress * 55), `Aplicando OCR na página ${pageNumber}…`));
    text += `${result.data.text}\n`;
    mergeExtractionMaps(spatialMap, parseSpatialOcrGrid(result.data.blocks));
  }
  const map = parseLooseText(text, spatialMap);
  return { classes: finalizeExtraction(map), source: "OCR do PDF", quality: map.size };
}

async function extractImage(file, onProgress) {
  if (!window.Tesseract) throw new Error("O leitor de imagem não pôde ser carregado. Verifique a conexão e tente novamente.");
  onProgress(16, "Melhorando a nitidez da imagem…");
  const preparedImage = await prepareImageForOcr(file);
  const result = await runOcr(preparedImage, progress => onProgress(20 + Math.round(progress * 65), "Reconhecendo turmas e horários na imagem…"));
  const map = parseLooseText(result.data.text, parseSpatialOcrGrid(result.data.blocks));
  return { classes: finalizeExtraction(map), source: "OCR da imagem", quality: map.size };
}

async function prepareImageForOcr(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(2, Math.min(3.5, 1400 / bitmap.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < imageData.data.length; index += 4) {
    const gray = imageData.data[index] * .299 + imageData.data[index + 1] * .587 + imageData.data[index + 2] * .114;
    const adjusted = gray < 165 ? 0 : gray > 215 ? 255 : Math.round((gray - 165) * 5.1);
    imageData.data[index] = adjusted;
    imageData.data[index + 1] = adjusted;
    imageData.data[index + 2] = adjusted;
  }
  context.putImageData(imageData, 0, 0);
  bitmap.close();
  return canvas;
}

async function runOcr(image, onProgress) {
  const worker = await window.Tesseract.createWorker("por", 1, { logger: message => {
    if (message.status === "recognizing text") onProgress(message.progress || 0);
  }});
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: window.Tesseract.PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1"
    });
    return await worker.recognize(image, {}, { text: true, blocks: true });
  } finally {
    await worker.terminate();
  }
}

function flattenOcrWords(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.flatMap(block => block.paragraphs || [])
    .flatMap(paragraph => paragraph.lines || [])
    .flatMap(line => line.words || [])
    .map(word => ({ text: word.text || "", bbox: word.bbox }))
    .filter(word => word.text.trim() && word.bbox);
}

function parseSpatialOcrGrid(blocks) {
  const map = new Map();
  const words = flattenOcrWords(blocks);
  const headers = words.map(word => ({ ...word, day: canonicalDay(word.text) }))
    .filter(word => word.day && normalize(word.text).length <= 7)
    .sort((a, b) => a.bbox.x0 - b.bbox.x0);
  if (headers.length < 3) return map;
  const headerBottom = Math.max(...headers.map(header => header.bbox.y1));
  const centers = headers.map(header => (header.bbox.x0 + header.bbox.x1) / 2);
  const boundaries = centers.map((center, index) => ({
    left: index === 0 ? center - (centers[index + 1] - center) / 2 : (centers[index - 1] + center) / 2,
    right: index === centers.length - 1 ? center + (center - centers[index - 1]) / 2 : (center + centers[index + 1]) / 2
  }));
  const codes = words.filter(word => /^\s*[1-9][1-9]\s*$/.test(word.text) && word.bbox.y0 > headerBottom);
  codes.forEach(code => {
    const centerX = (code.bbox.x0 + code.bbox.x1) / 2;
    const columnIndex = centers.reduce((best, center, index) => Math.abs(center - centerX) < Math.abs(centers[best] - centerX) ? index : best, 0);
    const bounds = boundaries[columnIndex];
    const nearby = words.filter(word => {
      const wordCenter = (word.bbox.x0 + word.bbox.x1) / 2;
      return wordCenter >= bounds.left && wordCenter <= bounds.right && word.bbox.y0 >= code.bbox.y0 - 4 && word.bbox.y0 <= code.bbox.y0 + 58;
    }).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
    const cellText = nearby.map(word => word.text).join(" ");
    const className = findClassName(code.text);
    const subject = findSubject(cellText);
    const time = findTimeRanges(cellText)[0] || findTimes(cellText)[0] || "Horário a definir";
    addExtracted(map, className, subject, [`${headers[columnIndex].day} ${time}`]);
  });
  return map;
}

function mergeExtractionMaps(target, source) {
  source.forEach(item => addExtracted(target, item.name, item.subject, [...item.schedule], item.explicitLessons));
  return target;
}

async function extractSpreadsheet(file, onProgress) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (["csv", "tsv", "txt"].includes(extension)) {
    const rows = parseDelimited(await file.text());
    const parsed = parseRows([rows]);
    return { classes: finalizeExtraction(parsed.map), source: "arquivo de texto estruturado", quality: parsed.matchedFields };
  }
  if (!window.XLSX) throw new Error("O leitor de planilhas não pôde ser carregado. Verifique a conexão e tente novamente.");
  onProgress(35, "Abrindo as abas da planilha…");
  const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const rowGroups = workbook.SheetNames.map(name => window.XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" }));
  const parsed = parseRows(rowGroups);
  return { classes: finalizeExtraction(parsed.map), source: `${workbook.SheetNames.length} aba(s) da planilha`, quality: parsed.matchedFields };
}

function showScreen(id) {
  $$(".screen").forEach(screen => screen.classList.toggle("active", screen.id === id));
  const map = { upload: 0, processing: 0, review: 0, choose: 1, planForm: 2, activityBuilder: 2, result: 2 };
  const activeStep = map[id] ?? 0;
  $$(".step").forEach((step, index) => {
    step.classList.toggle("active", index === activeStep);
    step.classList.toggle("complete", index < activeStep);
    $(".step-state", step).textContent = index < activeStep ? "✓" : index === activeStep ? "●" : "○";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function subjectOptionsHtml(selectedSubject) {
  const known = SUBJECT_OPTIONS.includes(selectedSubject);
  return `${SUBJECT_OPTIONS.map(subject => `<option value="${escapeAttr(subject)}" ${subject === selectedSubject ? "selected" : ""}>${subject}</option>`).join("")}<option value="__other" ${known ? "" : "selected"}>Outra…</option>`;
}

function renderManualStart() {
  const list = $("#manualClassList");
  if (!list) return;
  saveLocalData();
  $("#manualClassCount").textContent = state.classes.length ? `${state.classes.length} ${state.classes.length === 1 ? "turma adicionada" : "turmas adicionadas"}` : "Nenhuma turma adicionada";
  const total = state.classes.reduce((sum, item) => sum + Number(item.lessons), 0);
  $("#manualLessonTotal").textContent = `${total} ${total === 1 ? "aula" : "aulas"} por semana`;
  $("#manualContinue").disabled = !state.classes.length;
  if (!state.classes.length) {
    list.innerHTML = `<div class="manual-empty"><span>◎</span><p>As turmas adicionadas aparecerão aqui.</p></div>`;
    return;
  }
  list.innerHTML = state.classes.map((item, index) => {
    const grade = Number(String(item.name).match(/[1-9]/)?.[0]) || 1;
    const known = SUBJECT_OPTIONS.includes(item.subject);
    return `<article class="manual-class-row" data-id="${item.id}">
      <span class="manual-class-number">${index + 1}</span>
      <label>DISCIPLINA<select data-manual="subject">${subjectOptionsHtml(item.subject)}</select><input class="manual-row-other ${known ? "hidden" : ""}" data-manual="otherSubject" value="${known ? "" : escapeAttr(item.subject)}" placeholder="Digite a disciplina" /></label>
      <label>ANO<select data-manual="grade">${Array.from({ length: 9 }, (_, gradeIndex) => `<option value="${gradeIndex + 1}" ${gradeIndex + 1 === grade ? "selected" : ""}>${gradeIndex + 1}º ano</option>`).join("")}</select></label>
      <label>AULAS/SEMANA<input data-manual="lessons" type="number" min="1" max="30" value="${item.lessons}" /></label>
      <button class="manual-delete" aria-label="Remover turma">×</button>
    </article>`;
  }).join("");

  $$("[data-manual]", list).forEach(field => field.addEventListener("change", event => {
    const row = event.target.closest(".manual-class-row");
    const item = state.classes.find(entry => entry.id === Number(row.dataset.id));
    const type = event.target.dataset.manual;
    let focusOther = false;
    if (type === "subject") {
      const other = $("[data-manual='otherSubject']", row);
      const isOther = event.target.value === "__other";
      other.classList.toggle("hidden", !isOther);
      item.subject = isOther ? other.value.trim() : event.target.value;
      focusOther = isOther;
    } else if (type === "otherSubject") item.subject = event.target.value.trim();
    else if (type === "grade") item.name = `${event.target.value}º ano`;
    else if (type === "lessons") item.lessons = Math.max(1, Number(event.target.value) || 1);
    renderManualStart();
    if (focusOther) setTimeout(() => $(`.manual-class-row[data-id='${item.id}'] [data-manual='otherSubject']`)?.focus(), 0);
  }));
  $$(".manual-delete", list).forEach(button => button.addEventListener("click", event => {
    const id = Number(event.target.closest(".manual-class-row").dataset.id);
    state.classes = state.classes.filter(item => item.id !== id);
    renderManualStart();
  }));
}

function addManualClass() {
  const preset = $("#manualSubject").value;
  const subject = preset === "__other" ? $("#manualOtherSubject").value.trim() : preset;
  if (!subject) { toast("Digite o nome da disciplina"); $("#manualOtherSubject").focus(); return; }
  const grade = Number($("#manualGrade").value);
  const lessons = Math.max(1, Number($("#manualWeeklyLessons").value) || 1);
  const existing = state.classes.find(item => item.name === `${grade}º ano` && item.subject === subject);
  if (existing) {
    existing.lessons = lessons;
    toast("A carga semanal dessa turma foi atualizada");
  } else {
    const id = Math.max(0, ...state.classes.map(item => item.id)) + 1;
    state.classes.push({ id, name: `${grade}º ano`, subject, lessons, schedule: [], notes: "" });
  }
  renderManualStart();
}

function classParts(item) {
  const match = String(item.name).match(/([1-9])º\s*ano\s*([A-Z0-9]+)/i);
  return match ? { grade: Number(match[1]), group: match[2].toUpperCase() } : { grade: Number(item.grade) || 1, group: item.group || "A" };
}

function dayDistribution(item, day) {
  const slots = item.schedule.filter(slot => new RegExp(`^${day}\\b`, "i").test(slot));
  const count = slots.reduce((sum, slot) => sum + (/faixa|dupla|2\s*aulas/i.test(slot) ? 2 : 1), 0);
  const times = slots.map(slot => slot
    .replace(new RegExp(`^${day}\\s*`, "i"), "")
    .replace(/\s*·\s*(?:faixa|dupla|2\s*aulas).*$/i, "")
    .replace(/\s*\+\s*/g, "; ")
    .trim()).filter(value => value && !/hor[aá]rio a definir/i.test(value));
  return { count, times: times.join("; ") };
}

function renderWeekDistribution(item) {
  return ["Seg", "Ter", "Qua", "Qui", "Sex"].map(day => {
    const distribution = dayDistribution(item, day);
    return `<div class="distribution-row" data-day="${day}">
      <strong>${day}</strong>
      <label><span>AULAS</span><select class="day-count" aria-label="Quantidade de aulas na ${day}">${[0, 1, 2, 3, 4].map(value => `<option value="${value}" ${value === distribution.count ? "selected" : ""}>${value}</option>`).join("")}</select></label>
      <label class="time-entry"><span>HORÁRIO(S)</span><input class="day-times" value="${escapeAttr(distribution.times)}" placeholder="Ex.: 07:30–08:15; 08:15–09:00" /></label>
    </div>`;
  }).join("");
}

function syncDistribution(card, item) {
  const schedule = [];
  let weeklyLessons = 0;
  $$(".distribution-row", card).forEach(row => {
    const day = row.dataset.day;
    const count = Number($(".day-count", row).value);
    const times = $(".day-times", row).value.split(/[;|]/).map(value => value.trim()).filter(Boolean);
    weeklyLessons += count;
    if (!count) return;
    if (count === 2) {
      const first = times[0] || "Horário a definir";
      const second = times[1];
      schedule.push(`${day} ${second ? `${first} + ${second} · faixa` : `${first} · 2 aulas`}`);
    } else {
      for (let index = 0; index < count; index += 1) schedule.push(`${day} ${times[index] || times[0] || "Horário a definir"}`);
    }
  });
  item.schedule = schedule;
  item.lessons = weeklyLessons || Math.max(1, Number($("[data-field='lessons']", card).value) || 1);
  $("[data-field='lessons']", card).value = item.lessons;
  updateCounts();
}

function renderSchedule() {
  const list = $("#scheduleList");
  saveLocalData();
  list.innerHTML = state.classes.map((item, index) => {
    const parts = classParts(item);
    const knownSubject = SUBJECT_OPTIONS.includes(item.subject);
    return `<article class="class-card" data-id="${item.id}">
      <div class="class-color">${index + 1}</div>
      <label class="editable-field grade-field"><small>ANO</small><select data-field="grade" aria-label="Ano escolar">${Array.from({ length: 9 }, (_, gradeIndex) => `<option value="${gradeIndex + 1}" ${gradeIndex + 1 === parts.grade ? "selected" : ""}>${gradeIndex + 1}º ano</option>`).join("")}</select></label>
      <label class="editable-field group-field"><small>TURMA</small><input data-field="group" value="${escapeAttr(parts.group)}" aria-label="Identificação da turma" /></label>
      <label class="editable-field subject-field"><small>DISCIPLINA</small><select data-field="subjectPreset" aria-label="Disciplina">${SUBJECT_OPTIONS.map(subject => `<option value="${escapeAttr(subject)}" ${subject === item.subject ? "selected" : ""}>${subject}</option>`).join("")}<option value="__other" ${knownSubject ? "" : "selected"}>Outra…</option></select><input class="other-subject ${knownSubject ? "hidden" : ""}" data-field="subjectOther" value="${knownSubject ? "" : escapeAttr(item.subject === "Disciplina não identificada" ? "" : item.subject)}" placeholder="Digite a disciplina" aria-label="Outra disciplina" /></label>
      <label class="editable-field lessons-field"><small>AULAS/SEMANA</small><input data-field="lessons" type="number" min="1" max="30" value="${Number(item.lessons) || 1}" aria-label="Aulas por semana" /></label>
      <button class="delete-class" aria-label="Excluir ${item.name}" title="Excluir turma">×</button>
      <div class="week-editor"><div class="week-editor-title"><small>DISTRIBUIÇÃO DAS AULAS NA SEMANA</small><span>Informe a quantidade e os horários em cada dia</span></div>${renderWeekDistribution(item)}</div>
    </article>`;
  }).join("");

  $$(".class-card [data-field]", list).forEach(input => input.addEventListener("change", event => {
    const card = event.target.closest(".class-card");
    const item = state.classes.find(entry => entry.id === Number(card.dataset.id));
    const field = event.target.dataset.field;
    if (field === "grade" || field === "group") {
      const grade = $("[data-field='grade']", card).value;
      const group = $("[data-field='group']", card).value.trim() || "A";
      item.name = `${grade}º ano ${group.toUpperCase()}`;
    } else if (field === "subjectPreset") {
      const otherInput = $("[data-field='subjectOther']", card);
      const isOther = event.target.value === "__other";
      otherInput.classList.toggle("hidden", !isOther);
      item.subject = isOther ? (otherInput.value.trim() || "Outra disciplina") : event.target.value;
      if (isOther) otherInput.focus();
    } else if (field === "subjectOther") {
      item.subject = event.target.value.trim() || "Outra disciplina";
    } else if (field === "lessons") item.lessons = Math.max(1, Number(event.target.value) || 1);
    else item[field] = event.target.value;
    updateCounts();
    saveLocalData();
  }));
  $$(".day-count, .day-times", list).forEach(input => input.addEventListener("change", event => {
    const card = event.target.closest(".class-card");
    const item = state.classes.find(entry => entry.id === Number(card.dataset.id));
    syncDistribution(card, item);
    saveLocalData();
  }));
  $$(".delete-class", list).forEach(button => button.addEventListener("click", event => {
    const id = Number(event.target.closest(".class-card").dataset.id);
    state.classes = state.classes.filter(item => item.id !== id);
    renderSchedule();
  }));
  updateCounts();
  updateExtractionNotice();
}

function updateExtractionNotice() {
  const value = Math.max(20, Math.min(99, Math.round(state.confidence || 0)));
  $("#confidenceValue").textContent = `${value}%`;
  $("#confidenceTitle").textContent = value >= 75 ? "Dados extraídos com boa confiança" : value >= 50 ? "Alguns campos precisam de atenção" : "Leitura parcial do arquivo";
  $("#confidenceText").textContent = state.extractionMessage || "Revise todos os campos antes de continuar.";
  $("#confidenceIcon").textContent = value >= 75 ? "✓" : "!";
  $("#extractionNotice").classList.toggle("low-confidence", value < 60);
}

function updateCounts() {
  $("#countClasses").textContent = state.classes.length;
  $("#countLessons").textContent = state.classes.reduce((sum, item) => sum + Number(item.lessons), 0);
  $("#countSubjects").textContent = new Set(state.classes.map(item => item.subject)).size;
  const heading = $("#review h1");
  if (heading) heading.innerHTML = `Encontramos <em>${state.classes.length} ${state.classes.length === 1 ? "turma" : "turmas"}.</em>`;
}

function setProcessingProgress(pct, label) {
  $("#progressValue").textContent = `${pct}%`;
  $("#progressBar").style.width = `${pct}%`;
  $("#processingLabel").textContent = label;
  if (pct >= 45) { $("#scan2").textContent = "✓ Horários identificados"; $("#scan2").classList.add("done"); }
  if (pct >= 80) { $("#scan3").textContent = "✓ Turmas agrupadas"; $("#scan3").classList.add("done"); }
}

async function processFile(file) {
  $("#uploadError").textContent = "";
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { $("#uploadError").textContent = "O arquivo ultrapassa 10 MB. Escolha uma versão menor."; return; }
  state.fileName = file.name;
  $("#reviewFileName").textContent = state.fileName;
  showScreen("processing");
  $("#scan2").textContent = "○ Identificando horários";
  $("#scan3").textContent = "○ Agrupando turmas";
  $("#scan2").classList.remove("done");
  $("#scan3").classList.remove("done");
  setProcessingProgress(12, "Abrindo o arquivo…");
  try {
    const extension = file.name.split(".").pop().toLowerCase();
    let result;
    if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(extension)) result = await extractImage(file, setProcessingProgress);
    else if (file.type === "application/pdf" || extension === "pdf") result = await extractPdf(file, setProcessingProgress);
    else if (["csv", "tsv", "txt", "xlsx", "xls"].includes(extension)) result = await extractSpreadsheet(file, setProcessingProgress);
    else throw new Error("Formato não reconhecido. Use PDF, imagem, CSV ou planilha Excel.");

    if (!result.classes.length) throw new Error("Não foi possível reconhecer turmas no arquivo. Tente uma imagem mais nítida ou uma planilha com cabeçalhos como Turma, Disciplina, Dia e Horário.");
    state.classes = result.classes;
    const complete = state.classes.filter(item => item.name && item.subject !== "Disciplina não identificada" && item.schedule.length).length;
    state.confidence = 42 + (complete / state.classes.length) * 48 + Math.min(8, result.quality || 0);
    state.extractionMessage = `Leitura feita a partir de ${result.source}. Edite qualquer campo que não corresponda à sua grade.`;
    setProcessingProgress(100, "Tudo organizado!");
    setTimeout(() => { renderSchedule(); showScreen("review"); }, 350);
  } catch (error) {
    console.error(error);
    showScreen("upload");
    $("#uploadError").textContent = error.message || "Não foi possível ler este arquivo.";
  }
}

function processExample() {
  state.fileName = "grade_exemplo_2026.pdf";
  state.classes = JSON.parse(JSON.stringify(initialClasses));
  state.confidence = 100;
  state.extractionMessage = "Grade de exemplo carregada para demonstração.";
  $("#reviewFileName").textContent = state.fileName;
  renderSchedule();
  showScreen("review");
}

function renderClassOptions() {
  const previous = $("#classSelect").value || $("#recorteClass").value || String(state.classes[0]?.id || "");
  const options = state.classes.map(item => `<option value="${item.id}">${escapeAttr(item.name)} · ${escapeAttr(item.subject)}</option>`).join("");
  $("#classSelect").innerHTML = options;
  $("#recorteClass").innerHTML = options;
  $("#classSelect").value = previous;
  $("#recorteClass").value = previous;
  updateSelectedClassLabel();
  updatePlannerSummary();
}

function updateSelectedClassLabel() {
  const item = getSelectedClass();
  const label = $("#selectedClassLabel");
  if (label) label.textContent = item ? `${item.name} · ${item.subject}` : "Nenhuma turma selecionada";
}

async function loadOfficialSkillCatalog() {
  try {
    const response = await fetch("data/rmef-2026-habilidades.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Arquivo curricular indisponível");
    const data = await response.json();
    if (!Array.isArray(data.skills) || !data.skills.length) throw new Error("Base curricular vazia");
    const manualSkills = skillCatalog.filter(skill => skill.area === "manual");
    skillCatalog = [...data.skills, ...manualSkills];
    const activeKeys = new Set(skillCatalog.map(skillKey));
    state.skills = new Set([...state.skills].filter(key => activeKeys.has(key)));
    renderSkills();
  } catch (error) {
    console.warn("Não foi possível carregar a matriz curricular local.", error);
  }
}

function renderSkills(filter = "all") {
  mandatoryQuarterSkills().forEach(skill => state.skills.add(skillKey(skill)));
  const available = skillsForSelectedClass();
  const items = available.filter(skill => filter === "all" || skill.area === filter);
  const item = getSelectedClass();
  const officialCount = available.filter(skill => skill.area === "oficial").length;
  $("#skillsHeading").textContent = item ? `Habilidades do recorte: ${item.name}` : "Habilidades do planejamento";
  $("#skillsDescription").textContent = officialCount
    ? `${officialCount} habilidade(s) da Matriz de Referência Curricular RMEF 2026 para ${item.subject}. Selecione as que realmente orientarão o período.`
    : "Ainda não há recorte oficial carregado para esta turma. Você pode adicionar uma habilidade manualmente e validar na matriz da SME.";
  $("#skillList").innerHTML = items.length ? items.map(skill => `
    <div class="skill-item ${state.skills.has(skillKey(skill)) ? "selected" : ""}" data-code="${skillKey(skill)}" role="checkbox" aria-checked="${state.skills.has(skillKey(skill))}" tabindex="0">
      <span class="skill-check">✓</span>
      <p>${escapeHtml(skill.text)}<strong class="skill-code-end">${escapeHtml(skillCodeLabel(skill))}</strong>${skill.page ? `<small>Matriz RMEF 2026, p. ${Number(skill.page)}</small>` : ""}${skill.trimester && skill.trimester < Number($("#recorteQuarter").value) ? `<small>Retomada do ${skill.trimester}º trimestre · opcional</small>` : state.planType === "quarter" && skill.area === "oficial" ? "<small>Incluída obrigatoriamente no trimestre</small>" : ""}</p>
    </div>`).join("")
    : `<p class="empty-state">Nenhuma habilidade encontrada para este ano e componente na base local. Use a inclusão manual e valide o registro na matriz oficial.</p>`;
  $$(".skill-item").forEach(item => {
    const toggle = () => {
      if (mandatoryQuarterSkills().some(skill => skillKey(skill) === item.dataset.code)) { toast("Todas as habilidades do trimestre fazem parte deste planejamento."); return; }
      state.skills.has(item.dataset.code) ? state.skills.delete(item.dataset.code) : state.skills.add(item.dataset.code);
      renderSkills($(".chip.active").dataset.filter);
    };
    item.addEventListener("click", toggle);
    item.addEventListener("keydown", event => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); toggle(); } });
  });
  $("#skillCount").textContent = `${state.skills.size} ${state.skills.size === 1 ? "selecionada" : "selecionadas"}`;
  saveLocalData();
}

function configurePlanner(type) {
  previousTrimesters = new Set();
  state.planType = type;
  const quarter = type === "quarter";
  $("#quarterSelect").value = `${$("#recorteQuarter")?.value || 1}º trimestre`;
  const availableSkills = skillsForSelectedClass();
  const suggested = quarter ? availableSkills.filter(skill => skill.area === "oficial" || state.skills.has(skillKey(skill))) : availableSkills.slice(0, 3);
  state.skills = new Set(suggested.map(skillKey));
  $("#planLabel").textContent = quarter ? "PLANEJAMENTO TRIMESTRAL" : "PLANEJAMENTO QUINZENAL";
  $("#planTitle").innerHTML = quarter ? "Vamos condensar<br><em>o trimestre inteiro.</em>" : "Vamos formalizar as<br><em>próximas duas semanas.</em>";
  $("#planDescription").textContent = quarter ? "Confira o recorte e selecione as habilidades. O trimestre será escrito como um percurso articulado, sem divisão obrigatória em semanas ou eixos: o calendário não ganhou poderes de adivinhação." : "Defina os encontros, as habilidades e os recursos disponíveis. O texto será organizado aula a aula; conhecer quem aprende continua sendo trabalho humano.";
  $("#quarterField").classList.toggle("hidden", !quarter);
  $("#dateStartField").classList.toggle("hidden", quarter);
  $("#dateEndField").classList.toggle("hidden", quarter);
  $("#calculationBox").classList.toggle("hidden", quarter);
  $("#meetingFormatBox").classList.toggle("hidden", quarter);
  $("#summaryType").textContent = quarter ? "Trimestral" : "Quinzenal";
  $("#skillsHeading").textContent = quarter ? "Conteúdos e habilidades do trimestre" : "Habilidades do período";
  $("#skillsDescription").textContent = quarter ? "Todo o recorte curricular disponível foi incluído. Revise antes que a promessa de abrangência vire apenas uma lista." : "Escolha o que será devidamente mencionado no período.";
  $(".summary-help").textContent = quarter ? "O documento terá uma narrativa pedagógica contínua e contemplará todas as habilidades oficiais selecionadas." : "O documento será criado aula a aula, respeitando aulas-faixa e a fé nas escolhas pedagógicas marcadas acima.";
  $("#generatePlan").firstChild.textContent = quarter ? "Gerar documento trimestral convincente " : "Gerar documento tranquilizador ";
  renderClassOptions();
  renderSubjectProfileSummary();
  $("#recurringNotes").value = getSelectedClass()?.notes || "";
  renderReferenceChoices();
  if (!quarter && getSelectedClass()) resetMeetingFormat(getSelectedClass().lessons * 2);
  updatePlannerSummary();
  renderSkills();
  renderPreviousTrimesters();
  showScreen("planForm");
}

function renderActivityClassOptions() {
  const select = $("#activityClassSelect");
  if (!select) return;
  select.innerHTML = state.classes.map(item => `<option value="${item.id}">${escapeAttr(item.name)} · ${escapeAttr(item.subject)}</option>`).join("");
  syncActivityGrade();
  renderActivityProfileSummary();
}

function syncActivityGrade() {
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  const grade = Number(String(item?.name || "").match(/[1-9]/)?.[0]);
  if (grade) $("#activityGrade").value = String(grade);
}

function openActivityBuilder() {
  if (!state.classes.length) { toast("Adicione pelo menos uma turma para continuar"); showScreen("upload"); return; }
  currentPlanId = null;
  currentActivityText = "";
  renderActivityClassOptions();
  $("#activityQuarter").value = String($("#recorteQuarter")?.value || 1);
  renderActivitySkills();
  $("#activityOutput").classList.add("hidden");
  showScreen("activityBuilder");
}

function skillsForActivity() {
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  if (!item) return [];
  const grade = gradeFromClass(item);
  const subject = normalizeSubjectForMatrix(item.subject);
  const trimester = Number($("#activityQuarter").value || 1);
  return skillCatalog.filter(skill => !skill.grade || (skill.grade === grade && skill.subject === subject && (!skill.trimester || skill.trimester === trimester)));
}

function renderActivitySkills() {
  const container = $("#activitySkillList");
  if (!container) return;
  const available = skillsForActivity();
  const availableKeys = new Set(available.map(skillKey));
  state.activitySkills = new Set([...state.activitySkills].filter(key => availableKeys.has(key)));
  if (!state.activitySkills.size) available.slice(0, 3).forEach(skill => state.activitySkills.add(skillKey(skill)));
  container.innerHTML = available.length ? available.map(skill => {
    const key = skillKey(skill);
    const selected = state.activitySkills.has(key);
    return `<button type="button" class="activity-skill ${selected ? "selected" : ""}" data-skill="${escapeAttr(key)}" aria-pressed="${selected}"><span>✓</span><div><b>${escapeHtml(skillCodeLabel(skill))}</b><small>${escapeHtml(skill.text)}</small></div></button>`;
  }).join("") : `<p class="activity-skills-empty">Não há habilidade oficial carregada para este recorte. Informe o objetivo manualmente e valide na matriz.</p>`;
  $$(".activity-skill", container).forEach(button => button.addEventListener("click", () => {
    const key = button.dataset.skill;
    if (state.activitySkills.has(key)) state.activitySkills.delete(key); else state.activitySkills.add(key);
    button.classList.toggle("selected");
    button.setAttribute("aria-pressed", String(button.classList.contains("selected")));
  }));
}

function activityPrompt() {
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  const profile = getSubjectProfile(item.subject);
  const type = $("#activityType").value;
  const typeLabel = $("#activityType").selectedOptions[0].textContent;
  const duration = Math.max(15, Number($("#activityDuration").value) || 45);
  const format = $("#activityFormat").value;
  const questions = $("#activityQuestions").value;
  const grade = $("#activityGrade").value;
  const level = $("#activityLevel").value;
  const theme = $("#activityTheme").value.trim() || `uma questão significativa de ${item.subject}`;
  const customGoal = $("#activityGoal").value.trim();
  const resource = $("#activityResource").value;
  const selected = skillsForActivity().filter(skill => state.activitySkills.has(skillKey(skill)));
  const quantity = questions === "auto" ? "defina uma quantidade viável para a duração" : questions === "na" ? "sem quantidade fixa de questões" : `${questions} questões ou itens`;
  return `Crie um instrumento completo do tipo ${typeLabel}, no formato ${format}, para ${level}, ${grade}º ano, turma ${item.name}, componente ${item.subject}, duração de ${duration} minutos. ${subjectProfilePrompt(item.subject)} Tema: ${theme}. Objetivo informado: ${customGoal || profile.focus}. Recurso principal: ${resource}. Quantidade: ${quantity}. Habilidades oficiais selecionadas: ${selected.map(skill => `${skillCodeLabel(skill)}: ${skill.text}`).join(" | ") || "nenhuma; não invente códigos e indique que a seleção deve ser validada"}. Produza: 1) cabeçalho editável sem dados pessoais; 2) orientações claras ao estudante; 3) instrumento completo com enunciados e todos os itens; 4) gabarito ou respostas esperadas; 5) critérios de correção; 6) rubrica com níveis; 7) adaptações de acessibilidade coerentes; 8) orientações de aplicação ao professor. Em avaliação diagnóstica, não atribua nota. Use linguagem adequada ao ano, não invente características da turma e não inclua dados de estudantes.`;
}

function generatedTextToHtml(value) {
  const lines = String(value || "").trim().split(/\r?\n/);
  const output = [];
  let paragraph = [];
  let list = [];
  const inline = text => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/[\*#]+/g, "");
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`); paragraph = []; };
  const flushList = () => { if (list.length) output.push(`<ul>${list.map(item => `<li>${inline(item)}</li>`).join("")}</ul>`); list = []; };
  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { flushParagraph(); flushList(); return; }
    const heading = line.match(/^#{1,6}\s+(.+)/) || line.match(/^([A-ZÁÉÍÓÚÇ][^:]{2,70}):$/);
    if (heading) { flushParagraph(); flushList(); output.push(`<h3>${inline(heading[1].replace(/^\d+[.)]\s*/, ""))}</h3>`); return; }
    const item = line.match(/^(?:[-•*]|\d+[.)])\s*(.+)/);
    if (item) { flushParagraph(); list.push(item[1]); return; }
    flushList(); paragraph.push(line);
  });
  flushParagraph(); flushList();
  return output.join("");
}

async function buildActivityProposal() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para gerar o instrumento"); openAuthModal(); return; }
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  if (!item) return;
  if (!await confirmGeneration()) return;
  const button = $("#generateActivity");
  button.disabled = true;
  button.textContent = "Gerando instrumento…";
  $("#activityOutputTitle").textContent = `${$("#activityType").selectedOptions[0].textContent} · ${$("#activityFormat").value}`;
  $("#activityAIText").innerHTML = `<p>Preparando a atividade e os critérios de avaliação. Não é necessário clicar novamente: o servidor já recebeu serviço suficiente.</p>`;
  $("#activityOutput").classList.remove("hidden");
  try {
    const { data, error } = await supabaseClient.functions.invoke("generate-plan", { body: { prompt: activityPrompt(), requestType: "activity" } });
    if (error) {
      let reason = error.message;
      if (typeof error.context?.json === "function") {
        const payload = await error.context.json().catch(() => null);
        if (payload?.usage) updateUsageUI(payload.usage);
        reason = payload?.error || reason;
      }
      throw new Error(reason);
    }
    currentActivityText = data.plan;
    $("#activityAIText").innerHTML = generatedTextToHtml(data.plan);
    notifyGenerationUsage(data.usage);
    $("#activityOutput").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    $("#activityAIText").textContent = `A geração não foi concluída.\n\n${error.message || "Falha desconhecida"}`;
  } finally {
    generationInProgress = false;
    button.disabled = false;
    button.innerHTML = `Gerar nova versão <span>✦</span>`;
  }
}

function getSelectedClass() {
  return state.classes.find(item => item.id === Number($("#classSelect").value)) || state.classes[0];
}

function formatDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}

function initializePlanningDates() {
  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + 13);
  const localDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (!$("#dateStart").value) $("#dateStart").value = localDate(start);
  if (!$("#dateEnd").value) $("#dateEnd").value = localDate(end);
}

function updatePlannerSummary() {
  const item = getSelectedClass();
  if (!item) return;
  $("#summaryClass").textContent = `${item.name} · ${item.subject}`;
  if (state.planType === "quarter") {
    $("#summaryPeriod").textContent = $("#quarterSelect").value;
    $("#summaryLessons").textContent = `≈ ${item.lessons * 12} aulas`;
  } else {
    const format = getMeetingFormat();
    const total = format.total || Number($("#manualLessons").value || item.lessons * 2);
    const start = new Date(`${$("#dateStart").value}T12:00:00`);
    const end = new Date(`${$("#dateEnd").value}T12:00:00`);
    const weeks = Math.max(1, Math.ceil(((end - start) / 86400000 + 1) / 7));
    const encounters = item.schedule.length ? item.schedule.length * weeks : total;
    $("#lessonCount").textContent = `${total} aulas`;
    $("#summaryLessons").textContent = `${total} aulas`;
    $("#summaryPeriod").textContent = `${formatDate($("#dateStart").value)} — ${formatDate($("#dateEnd").value)}`;
    $("#bandMessage").textContent = format.bandMeetings ? `${describeBands(format)} + ${format.simple} simples de ${format.duration} min` : `${format.simple} aulas simples de ${format.duration} min`;
  }
}

function selectedSkills() {
  mandatoryQuarterSkills().forEach(skill => state.skills.add(skillKey(skill)));
  return skillsForSelectedClass().filter(skill => state.skills.has(skillKey(skill)));
}

function selectedBiases() {
  const choices = $$("#biasChoices .choice.selected").map(button => button.dataset.value);
  const other = $("#otherBias").value.trim();
  if (other) choices.push(other);
  return choices;
}

function selectedResources() {
  return $$("#resourceChoices .resource-choice.selected").map(button => button.dataset.resource);
}

function selectedReferences() {
  const references = $$("#referenceChoices .reference-choice.selected").map(button => button.dataset.reference);
  const manual = $("#manualReference")?.value?.trim();
  if (manual) references.push(manual);
  return [...new Set(references)];
}

function renderReferenceChoices() {
  const item = getSelectedClass();
  const container = $("#referenceChoices");
  if (!item || !container) return;
  const references = [...new Set([...getSubjectProfile(item.subject).sources, ...ACADEMIC_BASE, ...RMEF_OFFICIAL_SOURCES])];
  container.innerHTML = references.map((reference, index) => `<button type="button" class="reference-choice ${index < getSubjectProfile(item.subject).sources.length + 1 ? "selected" : ""}" data-reference="${escapeAttr(reference)}" aria-pressed="${index < getSubjectProfile(item.subject).sources.length + 1}"><span>✓</span>${escapeHtml(reference)}</button>`).join("");
  $$(".reference-choice", container).forEach(button => button.addEventListener("click", () => {
    button.classList.toggle("selected");
    button.setAttribute("aria-pressed", String(button.classList.contains("selected")));
  }));
}

function getSubjectProfile(subject) {
  const value = String(subject || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (value.includes("portugues") || value.includes("redacao")) return SUBJECT_PROFILES["Língua Portuguesa"];
  if (value.includes("ingles") || value.includes("lingua adicional")) return SUBJECT_PROFILES["Língua Inglesa"];
  if (value.includes("matematic")) return SUBJECT_PROFILES["Matemática"];
  if (value.includes("ciencia")) return SUBJECT_PROFILES["Ciências"];
  if (value.includes("educacao fisica") || value === "fisica") return SUBJECT_PROFILES["Educação Física"];
  if (value.includes("historia")) return SUBJECT_PROFILES["História"];
  if (value.includes("geografia")) return SUBJECT_PROFILES["Geografia"];
  if (value.includes("arte")) return SUBJECT_PROFILES["Artes"];
  if (value.includes("espanhol")) return SUBJECT_PROFILES["Língua Espanhola"];
  if (value.includes("digital") || value.includes("midia")) return SUBJECT_PROFILES["Educação Digital e Midiática"];
  if (value.includes("religios")) return SUBJECT_PROFILES["Ensino Religioso"];
  if (value.includes("informatic") || value.includes("computacao")) return SUBJECT_PROFILES["Informática"];
  if (value.includes("projeto de vida") || value.includes("socioemocional")) return SUBJECT_PROFILES["Projeto de Vida, Saúde e Educação Socioemocional"];
  return GENERIC_PROFILE;
}

function subjectProfilePrompt(subject) {
  const profile = getSubjectProfile(subject);
  const actions = profile.actions.map((action, index) => `${index + 1}. ${action}`).join("; ");
  const sources = profile.sources.join(" | ");
  return `PERFIL DISCIPLINAR OBRIGATÓRIO — ${subject}. Foco epistemológico e formativo: ${profile.focus}. Conteúdos e conceitos estruturantes: ${profile.contents}. Progressão de ações próprias do componente: ${actions}. Referências específicas sugeridas: ${sources}. Não substitua este componente por uma aula genérica de competências socioemocionais, leitura ou projeto: as atividades, perguntas, procedimentos, evidências e critérios precisam revelar o modo de pensar e fazer de ${subject}.`;
}

function renderSubjectProfileSummary() {
  const item = getSelectedClass();
  if (!item) return;
  const profile = getSubjectProfile(item.subject);
  [["#subjectProfileTitle", item.subject], ["#subjectProfileFocus", `Foco: ${profile.focus}.`], ["#subjectProfileContents", `Estruturantes: ${profile.contents}.`]].forEach(([selector, text]) => { if ($(selector)) $(selector).textContent = text; });
}

function renderActivityProfileSummary() {
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect")?.value)) || state.classes[0];
  if (!item) return;
  const profile = getSubjectProfile(item.subject);
  [["#activityProfileTitle", item.subject], ["#activityProfileFocus", `Foco: ${profile.focus}.`], ["#activityProfileContents", `Estruturantes: ${profile.contents}.`]].forEach(([selector, text]) => { if ($(selector)) $(selector).textContent = text; });
}

function timeDistribution(minutes) {
  const opening = Math.max(5, Math.round(minutes * .2 / 5) * 5);
  const closure = Math.max(5, Math.round(minutes * .15 / 5) * 5);
  return { opening, development: Math.max(10, minutes - opening - closure), closure };
}

function createActivityDescription(profile, action, minutes, theme, evidence) {
  const times = timeDistribution(minutes);
  return `Objetivo: ${profile.focus}. Abertura (${times.opening} min): retomar conhecimentos prévios e apresentar a questão de trabalho relacionada a ${escapeAttr(theme)}. Desenvolvimento (${times.development} min): ${action}, com registro individual ou coletivo e mediação docente. Fechamento (${times.closure} min): socializar descobertas, retomar critérios e registrar o próximo passo. Evidência: ${escapeAttr(evidence)}.`;
}

function getMeetingFormat() {
  const simple = Math.max(0, Number($("#simpleLessons").value) || 0);
  const duration = Math.max(20, Number($("#lessonDuration").value) || 45);
  const bands = [
    { count: Math.max(0, Number($("#bandMeetings").value) || 0), size: Number($("#bandLength").value) || 2 },
    { count: Math.max(0, Number($("#bandMeetings2").value) || 0), size: Number($("#bandLength2").value) || 2 }
  ].filter(band => band.count);
  const bandMeetings = bands.reduce((sum, band) => sum + band.count, 0);
  const total = simple + bands.reduce((sum, band) => sum + band.count * band.size, 0);
  return { simple, duration, bands, bandMeetings, total };
}

function describeBands(format) {
  return format.bands.map(band => `${band.count} ${band.count === 1 ? "aula-faixa" : "aulas-faixa"} de ${band.size} aulas (${band.size * format.duration} min)`).join(" + ");
}

function resetMeetingFormat(total) {
  $("#simpleLessons").value = Math.max(1, Number(total) || 1);
  $("#bandMeetings").value = 0;
  $("#bandLength").value = "2";
  $("#bandMeetings2").value = 0;
  $("#bandLength2").value = "3";
  updateMeetingFormat(false);
}

function updateMeetingFormat(syncFromFields = true) {
  let format = getMeetingFormat();
  if (!format.total) {
    $("#simpleLessons").value = 1;
    format = getMeetingFormat();
  }
  if (syncFromFields) $("#manualLessons").value = format.total;
  const parts = [];
  if (format.simple) parts.push(`${format.simple} ${format.simple === 1 ? "aula simples" : "aulas simples"} de ${format.duration} min`);
  if (format.bandMeetings) parts.push(describeBands(format));
  $("#meetingFormatHelp").textContent = `${parts.join(" + ")}. Total: ${format.total} aulas.`;
  updatePlannerSummary();
}

function getMeetingBlocks() {
  const format = getMeetingFormat();
  const blocks = [];
  let lessonNumber = 1;
  format.bands.forEach(band => {
    for (let index = 0; index < band.count; index += 1) {
      const lastLesson = lessonNumber + band.size - 1;
      blocks.push({ size: band.size, label: `AULAS ${lessonNumber}–${lastLesson}` });
      lessonNumber = lastLesson + 1;
    }
  });
  for (let index = 0; index < format.simple; index += 1) {
    blocks.push({ size: 1, label: `AULA ${lessonNumber}` });
    lessonNumber += 1;
  }
  return blocks;
}

function buildPromptBase() {
  const item = getSelectedClass();
  const isQuarter = state.planType === "quarter";
  const period = isQuarter ? $("#quarterSelect").value : `${$("#dateStart").value} a ${$("#dateEnd").value}`;
  const format = getMeetingFormat();
  const lessons = isQuarter ? `${item.lessons * 12} aulas ao longo de 12 semanas, em um percurso formativo articulado` : `${format.total} aulas organizadas em ${format.simple} aula(s) simples de ${format.duration} minutos${format.bandMeetings ? ` e ${describeBands(format)}` : ""}`;
  const recurringNotes = $("#recurringNotes").value.trim() || "nenhuma observação recorrente informada";
  const references = selectedReferences();
  const structureInstruction = isQuarter
    ? "Escreva o trimestre como um texto pedagógico fluido e articulado. Conecte objetivos, conteúdos, habilidades, propostas de aprendizagem e evidências de acompanhamento em uma progressão coerente, usando subtítulos ou parágrafos quando ajudarem a leitura. Não imponha três eixos, não organize por semanas e não transforme o documento em uma lista fragmentada."
    : `Apresente todas as atividades por encontro, sem pular nenhuma aula. Não invente, estime nem atribua datas ou dias da semana às aulas: identifique somente como Aula 1, Aula 2, Aula-faixa 1 etc., na ordem da sequência. Cada faixa deve ser tratada como bloco contínuo, conforme a organização: ${describeBands(format) || "sem aulas-faixa"}. Para cada aula, use no máximo 110 palavras e informe objetivo, desenvolvimento em etapas, fechamento, recursos, evidência de aprendizagem e adaptação. Seja conciso para concluir integralmente a sequência.`;
  return `Atue como especialista em planejamento pedagógico da Rede Municipal de Ensino de Florianópolis. ${RMEF_CURRICULAR_FOUNDATION} ${subjectProfilePrompt(item.subject)} Crie um planejamento ${isQuarter ? "trimestral" : "quinzenal"} para ${item.name}, componente ${item.subject}, período ${period}, com ${lessons}. Habilidades selecionadas: ${selectedSkills().map(skill => `${skillCodeLabel(skill)}: ${skill.text}`).join(" | ")}. Vieses: ${selectedBiases().join("; ") || "abordagem dialógica"}. Perfil geral da turma: ${$("#classProfile").value}. Observações recorrentes, sem dados pessoais: ${recurringNotes}. Avaliação: ${$("#assessment").value}. Recursos: ${selectedResources().join("; ") || "não informados"}. Acessibilidade: ${$("#accessibility").value}. Contexto do período: ${$("#teacherNotes").value || "não informado"}. O documento deve apresentar Objetivos, Conteúdos, Metodologia, Recursos didáticos, Avaliação e Referências. Use somente estas referências fornecidas e não acrescente obras: ${references.join(" | ") || "Matriz RMEF 2026 e BNCC 2018"}. ${structureInstruction} Para o planejamento quinzenal, priorize completar todas as aulas antes de expandir explicações; mantenha a resposta inteira em até 2.800 palavras. Não invente autores, obras, citações, características da turma ou dados de estudantes.`;
}

function buildPrompt() {
  const skills = selectedSkills();
  const quarter = state.planType === "quarter";
  if (quarter && !mandatoryQuarterSkills().length) throw new Error("Carregue o recorte oficial da matriz antes de gerar o trimestre completo.");
  return buildPromptBase().replace("aproximadamente ", "") + `\nREGRAS COMPLEMENTARES: ${quarter ? "Considere exatamente 12 semanas para o cálculo da carga, independentemente do calendário real. Inclua TODAS as habilidades do trimestre e as adicionais escolhidas. Desenvolva uma narrativa contínua e coerente; eixos ou subtítulos são opcionais e só devem aparecer se melhorarem a compreensão, nunca como exigência de formato." : "Respeite o número e a duração dos encontros."} As habilidades manuais são complementações do professor, não são automaticamente oficiais e não devem receber códigos BNCC inventados. Identifique as retomadas de trimestres anteriores como recomposição. Lista obrigatória completa: ${skills.map(skill => `${skill.text} (${skillCodeLabel(skill)})`).join(" | ")}. Use os títulos de seção exatamente: Objetivos; Conteúdos; Metodologia; Recursos Didáticos; Avaliação; Referências. Dentro de Metodologia inclua a narrativa do percurso ou a sequência de encontros. Cada seção deve aparecer uma vez, com título Markdown de nível 2. As referências válidas são exclusivamente as selecionadas pelo professor, mesmo quando o perfil disciplinar menciona outras obras.`;
}

function buildPlan() {
  const item = getSelectedClass();
  const isQuarter = state.planType === "quarter";
  const format = getMeetingFormat();
  const total = isQuarter ? 12 : format.total;
  const biases = selectedBiases();
  const profile = getSubjectProfile(item.subject);
  const theme = $("#teacherNotes").value.trim() || "textos que circulam no cotidiano e no território dos estudantes";
  $("#docType").textContent = `${isQuarter ? "PLANEJAMENTO TRIMESTRAL" : "PLANEJAMENTO QUINZENAL"} · 2026`;
  $("#docTitle").textContent = biases.includes("Cultura local e território") ? `${item.subject}: saberes, práticas e território` : `${item.subject}: investigação e aprendizagem significativa`;
  $("#docMeta").textContent = isQuarter ? `${item.name} · ${item.subject} · ${$("#quarterSelect").value}` : `${item.name} · ${item.subject} · ${formatDate($("#dateStart").value)} a ${formatDate($("#dateEnd").value)}`;
  $("#docIntention").textContent = `Promover ${profile.focus.toLowerCase()} a partir de ${theme}, com abordagem ${biases.join(" e ").toLowerCase() || "dialógica"}.`;
  $("#docHours").textContent = isQuarter ? `≈ ${item.lessons * 12} aulas · ${item.lessons} por semana` : `${total} aulas · ${format.simple} simples de ${format.duration} min${format.bandMeetings ? ` + ${describeBands(format)}` : ""}`;
  $("#docSkills").innerHTML = selectedSkills().map(skill => `<div class="doc-skill"><strong>${escapeHtml(skillCodeLabel(skill))}</strong>${escapeHtml(skill.text)}</div>`).join("") || `<div class="doc-skill">Nenhuma habilidade selecionada. Volte e escolha ao menos uma habilidade da matriz.</div>`;
  $("#sequenceTitle").textContent = isQuarter ? "Percurso do trimestre" : "Sequência de encontros";
  $("#docAssessment").textContent = `${$("#assessment").value}: observação dos processos, registros de percurso, produções e devolutivas que indiquem avanços nas habilidades selecionadas.`;
  $("#docAccessibility").textContent = `${$("#accessibility").value}, com instruções em etapas, apoio entre pares e possibilidades variadas de expressão da aprendizagem.`;
  const skillCodes = selectedSkills().map(skill => skillCodeLabel(skill)).join(", ") || "habilidades a definir";
  $("#docObjectives").textContent = `Desenvolver as habilidades ${skillCodes}; ${profile.focus.toLowerCase()}; mobilizar conhecimentos prévios, investigar, registrar evidências e acompanhar o próprio percurso de aprendizagem.`;
  $("#docContents").textContent = `${profile.contents}. O recorte será situado em ${theme}.`;
  $("#docMethodology").textContent = `Sequência didática com abordagem ${biases.join(" e ").toLowerCase() || "dialógica"}. As aulas articulam problematização, investigação orientada, colaboração, prática situada, socialização e devolutivas formativas, respeitando ${format.duration} minutos por aula.`;
  $("#docResources").textContent = `${selectedResources().join("; ") || "Recursos a definir"}. Complementar com fichas de registro e instrumentos de autoavaliação em formatos acessíveis.`;
  $("#docEvaluation").textContent = `${$("#assessment").value}, considerando participação, registros, uso de procedimentos próprios de ${item.subject}, produções e avanços nas habilidades. Prever devolutiva durante o processo e autoavaliação ao final.`;
  $("#docReferences").textContent = [...profile.sources, ...ACADEMIC_BASE, ...RMEF_OFFICIAL_SOURCES, "BRASIL. Ministério da Educação. Base Nacional Comum Curricular. 2018."].join("\n");

  const blocks = isQuarter ? [] : getMeetingBlocks();
  const count = isQuarter ? 3 : blocks.length;
  const schedule = item.schedule.length ? item.schedule : ["Horário a definir"];
  $("#lessonTimeline").innerHTML = Array.from({ length: count }, (_, index) => {
    const block = blocks[index] || { size: 1, label: "AULA" };
    const slot = schedule[index % schedule.length].replace(" · faixa", "");
    const isBand = !isQuarter && block.size > 1;
    const action = profile.actions[index % profile.actions.length];
    const minutes = isQuarter ? item.lessons * 4 * format.duration : block.size * format.duration;
    const skill = selectedSkills()[index % Math.max(selectedSkills().length, 1)];
    const evidence = skill?.code || "registro do processo e participação qualificada";
    return `<article class="lesson">
      <div class="lesson-marker"><span>${index + 1}</span><small>${isQuarter ? `EIXO ${index + 1}` : block.label}</small></div>
      <div class="lesson-content"><span class="lesson-kicker">${isQuarter ? `EIXO TEMÁTICO · ≈ ${item.lessons * 4} AULAS` : isBand ? `AULA-FAIXA · ${block.size} AULAS · ${minutes} MIN` : `AULA SIMPLES · ${format.duration} MIN`}</span><h4>${escapeHtml(action)}</h4><p>${isQuarter ? `Foco do eixo: ${escapeHtml(profile.focus)}. Desenvolver o recorte ${escapeHtml(theme)} por meio de ${escapeHtml(action)}, articulando investigação, produção, partilha e retomadas conforme as necessidades que emergirem. Evidência de acompanhamento: ${escapeHtml(evidence)}.` : createActivityDescription(profile, action, minutes, theme, evidence)}${isBand ? ` Organização da faixa: retomada, aprofundamento e síntese ao longo das ${block.size} aulas consecutivas.` : ""}</p><div class="lesson-tags"><span>${escapeHtml(evidence)}</span><span>${escapeHtml(selectedResources()[index % Math.max(selectedResources().length, 1)] || "Recurso a definir")}</span><span>${escapeHtml(isQuarter ? `${item.lessons * 4} aulas estimadas` : slot)}</span></div></div>
    </article>`;
  }).join("");
  showScreen("result");
}

function renderGeneratedPlan(plan, metadata = {}) {
  // Na segunda geração, o documento anterior já foi substituído pelo texto da IA.
  // Por isso os elementos originais (#docType, #docTitle e #docMeta) podem não existir.
  const item = getSelectedClass();
  const isQuarter = state.planType === "quarter";
  const type = metadata.type || $("#docType")?.textContent || `PLANEJAMENTO ${isQuarter ? "TRIMESTRAL" : "QUINZENAL"} · 2026`;
  const title = metadata.title || $("#docTitle")?.textContent || `${item?.subject || "Planejamento"}: percurso de aprendizagem`;
  const meta = metadata.meta || $("#docMeta")?.textContent || (isQuarter
    ? `${item?.name || "Turma"} · ${item?.subject || "Componente curricular"} · ${$("#quarterSelect")?.value || "Trimestre"}`
    : `${item?.name || "Turma"} · ${item?.subject || "Componente curricular"}`);
  const planKind = state.planType === "quarter" ? "TRIMESTRAL" : "QUINZENAL";
  const sectionPattern = /^(?:#{1,6}\s*)?(?:\d+[.)]\s*)?(objetivos?|conteúdos?|metodologia|recursos(?: didáticos)?|avaliação|referências|sequência(?: de encontros)?|aulas?(?:[- ]faixa)?|encontros?)(?:\s*:)?$/i;
  const lines = String(plan).trim().split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  const formatInline = value => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/[\*#]+/g, "");
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${formatInline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push(`<ul>${list.map(item => `<li>${formatInline(item)}</li>`).join("")}</ul>`);
    list = [];
  };
  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); return; }
    const markdownHeading = line.match(/^#{1,6}\s+(.+)/);
    if (markdownHeading) {
      flushParagraph(); flushList();
      blocks.push(`<h3>${formatInline(markdownHeading[1].replace(/^\d+[.)]\s*/, "").replace(/:$/, ""))}</h3>`);
      return;
    }
    const cleanHeading = line.replace(/^#{1,6}\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/:$/, "");
    if (sectionPattern.test(line)) {
      flushParagraph(); flushList();
      blocks.push(`<h3>${formatInline(cleanHeading)}</h3>`);
      return;
    }
    const listItem = line.match(/^(?:[-•*]|\d+[.)])\s*(.+)/);
    if (listItem) { flushParagraph(); list.push(listItem[1]); return; }
    flushList();
    paragraph.push(line);
  });
  flushParagraph(); flushList();
  $("#planDocument").innerHTML = `
    <div class="doc-cover">
      <div><small>${escapeHtml(type)}</small><h2>${escapeHtml(title)}</h2><p>${escapeHtml(meta)}</p></div>
    </div>
    <div class="doc-section generated-plan-copy">
      <div class="generated-plan-intro"><small>PLANEJAMENTO ${planKind}</small><span>Revise, ajuste e assine aquilo que a máquina não viveu.</span></div>
      <div class="generated-plan-body">${blocks.join("")}</div>
    </div>`;
  $("#planDocument").classList.remove("hidden");
}

function sanitizeDocumentHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const allowed = new Set(["DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER", "H1", "H2", "H3", "H4", "P", "UL", "OL", "LI", "STRONG", "B", "EM", "I", "SMALL", "SPAN", "BR", "HR", "CODE", "BLOCKQUOTE"]);
  [...template.content.querySelectorAll("*")].forEach(element => {
    if (!allowed.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }
    [...element.attributes].forEach(attribute => {
      if (attribute.name !== "class") element.removeAttribute(attribute.name);
    });
  });
  return template.innerHTML;
}

function setEditable(target, toolbar, button, enabled) {
  target.contentEditable = String(enabled);
  target.classList.toggle("editing", enabled);
  toolbar.classList.toggle("hidden", !enabled);
  button.textContent = enabled ? "Concluir edição" : "Editar documento";
  if (enabled) target.focus();
}

function togglePlanEditor() {
  const documentElement = $("#planDocument");
  const enabled = documentElement.contentEditable !== "true";
  setEditable(documentElement, $("#planEditorToolbar"), $("#editPlan"), enabled);
}

function toggleActivityEditor() {
  const documentElement = $("#activityAIText");
  const enabled = documentElement.contentEditable !== "true";
  setEditable(documentElement, $("#activityEditorToolbar"), $("#editActivity"), enabled);
  $("#editActivity").textContent = enabled ? "Concluir edição" : "Editar";
}

function configureEditorToolbar(toolbar, target) {
  $$("button[data-command]", toolbar).forEach(button => button.addEventListener("click", () => {
    target.focus();
    document.execCommand(button.dataset.command, false, button.dataset.value || null);
  }));
  target.addEventListener("paste", event => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData?.getData("text/plain") || "");
  });
}

function fileSafe(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function planPdfName() {
  const item = getSelectedClass();
  const period = state.planType === "quarter" ? $("#quarterSelect").value : `${$("#dateStart").value}-a-${$("#dateEnd").value}`;
  return ["carijo", state.planType === "quarter" ? "planejamento-trimestral" : "planejamento-quinzenal", item?.name, item?.subject, period].map(fileSafe).filter(Boolean).join("-");
}

function printPlan() {
  const previousTitle = document.title;
  document.title = planPdfName();
  const restoreTitle = () => { document.title = previousTitle; };
  window.addEventListener("afterprint", restoreTitle, { once: true });
  window.focus();
  window.print();
  window.setTimeout(restoreTitle, 3000);
}

function printActivity() {
  const previousTitle = document.title;
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  document.title = ["carijo", "atividade-avaliacao", item?.name, item?.subject].map(fileSafe).filter(Boolean).join("-");
  document.body.classList.add("printing-activity");
  const restore = () => { document.body.classList.remove("printing-activity"); document.title = previousTitle; };
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
  window.setTimeout(restore, 3000);
}

async function saveActivityToHistory() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para salvar a atividade"); openAuthModal(); return; }
  const item = state.classes.find(entry => entry.id === Number($("#activityClassSelect").value)) || state.classes[0];
  const title = $("#activityOutputTitle").textContent.trim() || "Atividade ou avaliação";
  const text = $("#activityAIText").innerText.trim();
  if (!text) { toast("Gere a atividade antes de salvar"); return; }
  const payload = {
    user_id: currentUser.id,
    class_id: item?.id || null,
    class_name: item?.name || "Turma",
    subject: item?.subject || "Componente curricular",
    plan_type: "activity",
    title,
    period_label: `${$("#activityQuarter").value}º trimestre`,
    plan_data: { aiText: currentActivityText || text, documentText: text, planType: "activity", savedAt: new Date().toISOString() },
    document_html: sanitizeDocumentHtml($("#activityAIText").innerHTML),
  };
  const query = currentPlanId
    ? supabaseClient.from("teacher_plans").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", currentPlanId).select("id").single()
    : supabaseClient.from("teacher_plans").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) { toast("Não foi possível salvar a atividade"); return; }
  currentPlanId = data?.id || currentPlanId;
  toast("Atividade salva no histórico");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function currentPlanSnapshot() {
  const item = getSelectedClass();
  const aiText = $("#aiPlanText")?.innerText?.trim() || "";
  return {
    generationContext: generatedContext,
    supervisorReport,
    documentText: $("#planDocument")?.innerText?.trim() || "",
    aiText: aiText || $("#planDocument")?.innerText?.trim() || "",
    className: item?.name || "Turma não identificada",
    subject: item?.subject || "Componente não identificado",
    planType: state.planType,
    period: state.planType === "quarter" ? $("#quarterSelect").value : `${$("#dateStart").value} a ${$("#dateEnd").value}`,
    prompt: generatedContext?.prompt || "",
    savedAt: new Date().toISOString(),
    editorVersion: 1
  };
}

async function savePlanToHistory() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para guardar planejamentos no histórico"); openAuthModal(); return; }
  const snapshot = currentPlanSnapshot();
  const item = getSelectedClass();
  const button = $("#savePlan");
  button.disabled = true;
  button.textContent = "Salvando…";
  try {
    const payload = {
      user_id: currentUser.id,
      class_id: item?.id || null,
      class_name: snapshot.className,
      subject: snapshot.subject,
      plan_type: snapshot.planType,
      title: $(".doc-cover h2", $("#planDocument"))?.textContent?.trim() || `Planejamento ${snapshot.planType === "quarter" ? "trimestral" : "quinzenal"}`,
      period_label: snapshot.period,
      plan_data: snapshot,
      document_html: sanitizeDocumentHtml($("#planDocument")?.innerHTML || "")
    };
    const query = currentPlanId
      ? supabaseClient.from("teacher_plans").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", currentPlanId).select("id").single()
      : supabaseClient.from("teacher_plans").insert(payload).select("id").single();
    const { data, error } = await query;
    if (error) throw error;
    currentPlanId = data?.id || currentPlanId;
    toast(currentPlanId ? "Planejamento salvo no histórico" : "Planejamento salvo");
  } catch (error) {
    console.warn("Não foi possível salvar o planejamento.", error);
    toast("Não foi possível salvar. Verifique a configuração do histórico.");
  } finally {
    button.disabled = false;
    button.textContent = "Salvar no histórico";
  }
}

function renderHistory(items = historyPlans) {
  const list = $("#historyList");
  if (!list) return;
  if (!items.length) {
    list.innerHTML = `<div class="history-empty">Nenhum planejamento salvo ainda. A máquina ainda não tem memória.</div>`;
    return;
  }
  list.innerHTML = items.map(plan => {
    const content = plan.plan_data || {};
    const created = plan.created_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(plan.created_at)) : "Data não registrada";
    return `<article class="history-item"><div><small>${escapeHtml(plan.plan_type === "quarter" ? "TRIMESTRAL" : "QUINZENAL")} · ${escapeHtml(created)}</small><strong>${escapeHtml(plan.class_name)} · ${escapeHtml(plan.subject)}</strong><p>${escapeHtml(plan.period_label)}</p></div><button class="secondary-button history-copy" data-history-id="${escapeAttr(plan.id)}">Copiar</button></article>`;
  }).join("");
  $$(".history-copy", list).forEach(button => button.addEventListener("click", async () => {
    const plan = historyPlans.find(entry => entry.id === button.dataset.historyId);
    const text = plan?.plan_data?.documentText || plan?.plan_data?.aiText;
    if (!text) { toast("Este item não possui conteúdo para copiar"); return; }
    await navigator.clipboard.writeText(text);
    toast("Planejamento copiado");
  }));
}

function historyTypeLabel(type) {
  if (type === "quarter") return "TRIMESTRAL";
  if (type === "activity") return "ATIVIDADE / AVALIAÇÃO";
  return "QUINZENAL";
}

function filteredHistory() {
  const query = normalize($("#historyPageSearch")?.value || "");
  const type = $("#historyTypeFilter")?.value || "all";
  return historyPlans.filter(plan => {
    const matchesType = type === "all" || plan.plan_type === type;
    const searchable = normalize(`${plan.title} ${plan.class_name} ${plan.subject} ${plan.period_label}`);
    return matchesType && (!query || searchable.includes(query));
  });
}

function renderHistoryPage() {
  const list = $("#historyPageList");
  if (!list) return;
  const items = filteredHistory();
  $("#historyTotal").textContent = String(historyPlans.length);
  if (!items.length) {
    list.innerHTML = `<div class="history-page-empty"><span>◇</span><h2>Nenhum documento encontrado</h2><p>Experimente outro termo ou selecione todos os tipos. Documentos novos aparecem aqui depois de você clicar em salvar — a memória da máquina também precisa de instruções.</p></div>`;
    return;
  }
  list.innerHTML = items.map(plan => {
    const created = plan.created_at ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(plan.created_at)) : "data não registrada";
    return `<article class="history-card" data-history-id="${escapeAttr(plan.id)}"><div class="history-card-type">${escapeHtml(historyTypeLabel(plan.plan_type))}</div><div class="history-card-copy"><small>${escapeHtml(created)} · ${escapeHtml(plan.period_label)}</small><h2>${escapeHtml(plan.title || `${plan.subject} · ${plan.class_name}`)}</h2><p>${escapeHtml(plan.class_name)} · ${escapeHtml(plan.subject)}</p></div><div class="history-card-actions"><button class="primary-button history-open">Abrir</button><button class="secondary-button history-duplicate">Duplicar</button><button class="secondary-button history-copy-page">Copiar</button><button class="text-button danger-button history-delete">Excluir</button></div></article>`;
  }).join("");
  $$(".history-card", list).forEach(card => {
    const plan = historyPlans.find(entry => entry.id === card.dataset.historyId);
    $(".history-open", card).addEventListener("click", () => openSavedDocument(plan));
    $(".history-copy-page", card).addEventListener("click", async () => { await navigator.clipboard.writeText(plan?.plan_data?.documentText || plan?.plan_data?.aiText || ""); toast("Documento copiado"); });
    $(".history-duplicate", card).addEventListener("click", () => duplicateSavedDocument(plan));
    $(".history-delete", card).addEventListener("click", () => deleteSavedDocument(plan));
  });
}

function selectClassFromHistory(plan) {
  const item = state.classes.find(entry => entry.id === Number(plan.class_id)) || state.classes.find(entry => entry.name === plan.class_name && entry.subject === plan.subject);
  if (item) {
    $("#classSelect").value = String(item.id);
    $("#recorteClass").value = String(item.id);
  }
}

function openSavedDocument(plan) {
  if (!plan) return;
  currentPlanId = plan.id;
  selectClassFromHistory(plan);
  if (plan.plan_type === "activity") {
    renderActivityClassOptions();
    const item = state.classes.find(entry => entry.name === plan.class_name && entry.subject === plan.subject);
    if (item) $("#activityClassSelect").value = String(item.id);
    $("#activityOutputTitle").textContent = plan.title || "Atividade ou avaliação";
    currentActivityText = plan.plan_data?.documentText || plan.plan_data?.aiText || "";
    $("#activityAIText").innerHTML = plan.document_html ? sanitizeDocumentHtml(plan.document_html) : generatedTextToHtml(currentActivityText);
    $("#activityOutput").classList.remove("hidden");
    showScreen("activityBuilder");
    $("#activityOutput").scrollIntoView({ block: "start" });
    return;
  }
  state.planType = plan.plan_type === "quarter" ? "quarter" : "fortnight";
  generatedContext = plan.plan_data?.generationContext || { planType: state.planType, className: plan.class_name, period: plan.period_label };
  supervisorReport = plan.plan_data?.supervisorReport || null;
  renderSupervisorReport();
  const text = plan.plan_data?.documentText || plan.plan_data?.aiText || "";
  if (plan.document_html) {
    $("#planDocument").innerHTML = sanitizeDocumentHtml(plan.document_html);
    $("#planDocument").classList.remove("hidden");
  } else {
    renderGeneratedPlan(text, { title: plan.title, meta: `${plan.class_name} · ${plan.subject} · ${plan.period_label}`, type: `${historyTypeLabel(plan.plan_type)} · 2026` });
  }
  showScreen("result");
}

async function duplicateSavedDocument(plan) {
  if (!plan || !currentUser) return;
  const { id, created_at, updated_at, ...copy } = plan;
  const { error } = await supabaseClient.from("teacher_plans").insert({ ...copy, user_id: currentUser.id, title: `${plan.title} — cópia` });
  if (error) { toast("Não foi possível duplicar"); return; }
  toast("Documento duplicado");
  await loadHistoryPage();
}

async function deleteSavedDocument(plan) {
  if (!plan || !window.confirm(`Excluir “${plan.title}”? Esta ação não pode ser desfeita.`)) return;
  const { error } = await supabaseClient.from("teacher_plans").delete().eq("id", plan.id);
  if (error) { toast("Não foi possível excluir"); return; }
  historyPlans = historyPlans.filter(entry => entry.id !== plan.id);
  if (currentPlanId === plan.id) currentPlanId = null;
  renderHistoryPage();
  toast("Documento excluído");
}

async function loadHistoryPage() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para acessar o histórico"); openAuthModal(); return; }
  $("#historyPageList").innerHTML = `<div class="history-page-empty"><p>Consultando a memória burocrática…</p></div>`;
  const { data, error } = await supabaseClient.from("teacher_plans").select("id,user_id,class_id,class_name,subject,plan_type,title,period_label,plan_data,document_html,created_at,updated_at").order("updated_at", { ascending: false }).limit(200);
  if (error) { $("#historyPageList").innerHTML = `<div class="history-page-empty"><p>Não foi possível carregar o histórico.</p></div>`; return; }
  historyPlans = data || [];
  renderHistoryPage();
  await loadUsageStatus();
}

async function openHistory() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para acessar o histórico"); openAuthModal(); return; }
  closeDataModal();
  showScreen("historyPage");
  await loadHistoryPage();
}

function closeHistory() {
  hideModalElement($("#historyModal"));
}

async function generatePlanWithAI(initialGeneration = false) {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para gerar com IA"); openAuthModal(); return; }
  if (!await confirmGeneration()) return;
  const button = initialGeneration ? $("#generatePlan") : $("#generateWithAI");
  try {
  const generationPrompt = buildPrompt();
  const item = getSelectedClass();
  const context = { planType: state.planType, className: item.name, subject: item.subject, quarter: Number($("#recorteQuarter").value), start: $("#dateStart").value, end: $("#dateEnd").value, lessons: state.planType === "quarter" ? item.lessons * 12 : getMeetingFormat().total, skills: selectedSkills().map(skill => `${skill.text} (${skillCodeLabel(skill)})`) };
  if (initialGeneration === true) showScreen("result");
  button.disabled = true;
  button.textContent = "Gerando…";
  $("#planDocument").classList.add("hidden");
  $("#supervisorPanel").classList.add("hidden");
  $("#aiPlanOutput h3").textContent = "Gerando e revisando o planejamento…";
  $("#aiPlanText").textContent = "O redator prepara o documento e o supervisor analisa sua coerência. Aguarde a conclusão das duas etapas.";
  $("#copyAIPlan").textContent = "Aguarde";
  $("#aiPlanOutput").classList.remove("hidden");
    const { data, error } = await supabaseClient.functions.invoke("generate-plan", { body: { prompt: generationPrompt, requestType: "plan", supervise: true } });
    if (error) {
      let reason = error.message;
      if (typeof error.context?.json === "function") {
        const payload = await error.context.json().catch(() => null);
        if (payload?.usage) updateUsageUI(payload.usage);
        reason = payload?.error || reason;
      } else if (typeof error.context?.error === "string") {
        reason = error.context.error;
      }
      throw new Error(reason);
    }
    if (!data?.plan) throw new Error("Resposta vazia");
    $("#aiPlanText").textContent = data.plan;
    generatedContext = context;
    generatedContext.prompt = generationPrompt;
    supervisorReport = data.supervision || { status: "unavailable", text: "A função publicada ainda não enviou o parecer pedagógico." };
    renderGeneratedPlan(data.plan, { type: `PLANEJAMENTO ${context.planType === "quarter" ? "TRIMESTRAL" : "QUINZENAL"} · 2026`, title: `${context.subject} · planejamento ${context.planType === "quarter" ? "trimestral" : "quinzenal"}`, meta: `${context.className} · ${context.lessons} aulas · ${context.planType === "quarter" ? `${context.quarter}º trimestre · 12 semanas` : `${context.start} a ${context.end}`}` });
    renderSupervisorReport();
    $("#aiPlanOutput").classList.add("hidden");
    currentPlanId = null;
    notifyGenerationUsage(data.usage);
  } catch (error) {
    console.warn("Não foi possível gerar com IA.", error);
    const reason = error.message || "não foi possível concluir a geração";
    $("#aiPlanOutput h3").textContent = "Detalhes da falha";
    $("#aiPlanText").textContent = `A geração não foi concluída.\n\nMensagem recebida:\n${reason}\n\nEsta mensagem não contém a chave da IA.`;
    $("#copyAIPlan").textContent = "Copiar detalhes";
    $("#aiPlanOutput").classList.remove("hidden");
    $("#planDocument").classList.toggle("hidden", !generatedContext);
    renderSupervisorReport();
    toast("Os detalhes da falha estão disponíveis na tela");
  } finally {
    generationInProgress = false;
    button.disabled = false;
    button.innerHTML = initialGeneration ? `Gerar planejamento final <span>✦</span>` : `Gerar nova versão <span>✦</span>`;
  }
}

async function generateFinalDocument() {
  if (!supabaseClient || !currentUser) { toast("Entre na conta para gerar o planejamento final"); openAuthModal(); return; }
  await generatePlanWithAI(true);
}

async function confirmGeneration() {
  if (generationInProgress) { toast("Já existe um pedido em andamento. Aguarde a conclusão."); return false; }
  generationInProgress = true;
  try {
    await loadUsageStatus();
    if (usageState && usageState.remaining === 0) {
      toast("Sua cota mensal terminou. Você ainda pode editar, copiar e imprimir documentos salvos.");
      generationInProgress = false;
      return false;
    }
    $("#generationConfirmationUsage").textContent = usageState
      ? `Você tem ${usageState.remaining} de ${usageState.limit} gerações disponíveis neste mês. Este pedido utiliza uma geração, se concluído.`
      : "Não foi possível consultar sua cota agora. O servidor verificará o limite antes de iniciar o pedido.";
    const accepted = await new Promise(resolve => {
      resolveGenerationConfirmation = resolve;
      showModalElement($("#generationConfirmationModal"));
    });
    if (!accepted) generationInProgress = false;
    return accepted;
  } catch {
    generationInProgress = false;
    toast("Não foi possível preparar a geração. Tente novamente.");
    return false;
  }
}

function finishGenerationConfirmation(accepted = false) {
  hideModalElement($("#generationConfirmationModal"));
  resolveGenerationConfirmation?.(accepted === true);
  resolveGenerationConfirmation = null;
}

function authRedirectUrl() {
  return location.protocol.startsWith("http") ? `${location.origin}${location.pathname}` : undefined;
}

function setAuthFeedback(message = "", isError = false) {
  const feedback = $("#authFeedback");
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function updateAuthInterface() {
  const name = $("#authUserName");
  const status = $("#authUserState");
  const button = $("#authButton");
  const avatar = $(".avatar");
  if (!currentUser) {
    name.textContent = "Modo local";
    status.textContent = "Dados neste dispositivo";
    button.textContent = "Entrar";
    avatar.textContent = "C";
    return;
  }
  const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || "Professora";
  name.textContent = displayName;
  status.textContent = "Turmas sincronizadas";
  button.textContent = "Dados";
  avatar.textContent = displayName.slice(0, 2).toUpperCase();
}

async function syncCloudData() {
  if (!supabaseClient || !currentUser || cloudSyncInProgress) return;
  cloudSyncInProgress = true;
  try {
    const userId = currentUser.id;
    const classes = state.classes.map(item => ({
      user_id: userId,
      local_id: Number(item.id),
      class_name: item.name,
      subject: item.subject,
      lessons: Math.max(1, Number(item.lessons) || 1),
      schedule: Array.isArray(item.schedule) ? item.schedule : [],
      recurring_notes: String(item.notes || "").slice(0, 4000),
      updated_at: new Date().toISOString()
    }));
    const profile = { id: userId, display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split("@")[0] || null, updated_at: new Date().toISOString() };
    const profileResult = await supabaseClient.from("teacher_profiles").upsert(profile, { onConflict: "id" });
    if (profileResult.error) throw profileResult.error;
    const settingsResult = await supabaseClient.from("teacher_settings").upsert({ user_id: userId, skills: [...state.skills], plan_type: state.planType, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (settingsResult.error) throw settingsResult.error;
    if (classes.length) {
      const classesResult = await supabaseClient.from("teacher_classes").upsert(classes, { onConflict: "user_id,local_id" });
      if (classesResult.error) throw classesResult.error;
      const ids = classes.map(item => item.local_id).join(",");
      const cleanup = await supabaseClient.from("teacher_classes").delete().eq("user_id", userId).not("local_id", "in", `(${ids})`);
      if (cleanup.error) throw cleanup.error;
    } else {
      const cleanup = await supabaseClient.from("teacher_classes").delete().eq("user_id", userId);
      if (cleanup.error) throw cleanup.error;
    }
    updateAuthInterface();
  } catch (error) {
    console.warn("Não foi possível sincronizar os dados.", error);
    const status = $("#authUserState");
    if (status) status.textContent = "Alterações salvas localmente";
  } finally {
    cloudSyncInProgress = false;
  }
}

async function loadCloudData() {
  if (!supabaseClient || !currentUser) return;
  cloudSyncInProgress = true;
  try {
    restoreLocalData();
    const [classesResult, settingsResult] = await Promise.all([
      supabaseClient.from("teacher_classes").select("local_id,class_name,subject,lessons,schedule,recurring_notes").order("local_id"),
      supabaseClient.from("teacher_settings").select("skills,plan_type").maybeSingle()
    ]);
    if (classesResult.error) throw classesResult.error;
    if (settingsResult.error) throw settingsResult.error;
    if (classesResult.data?.length) {
      state.classes = classesResult.data.map(item => ({ id: item.local_id, name: item.class_name, subject: item.subject, lessons: item.lessons, schedule: Array.isArray(item.schedule) ? item.schedule : [], notes: item.recurring_notes || "" }));
    }
    if (settingsResult.data?.skills) state.skills = new Set(settingsResult.data.skills);
    if (["quarter", "fortnight"].includes(settingsResult.data?.plan_type)) state.planType = settingsResult.data.plan_type;
    renderManualStart();
    renderSchedule();
    renderSkills();
  } catch (error) {
    console.warn("Não foi possível carregar os dados da nuvem.", error);
    const status = $("#authUserState");
    if (status) status.textContent = "Conectada, com dados locais";
  } finally {
    cloudSyncInProgress = false;
  }
  saveLocalData();
}

async function handleAuthSession(session) {
  const nextUser = session?.user || null;
  const changedUser = nextUser?.id !== currentUser?.id;
  currentUser = nextUser;
  updateAuthInterface();
  if (currentUser && changedUser) {
    await loadCloudData();
    await loadUsageStatus();
  } else if (!currentUser) {
    usageState = null;
    if ($("#usagePillText")) $("#usagePillText").textContent = "entre para consultar";
  }
}

async function initializeAuth() {
  if (!supabaseClient) { console.warn("Cliente Supabase não carregado."); return; }
  supabaseClient.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {
      void handleAuthSession(session).catch(() => toast("Não foi possível sincronizar a conta agora."));
      if (event === "PASSWORD_RECOVERY") {
        passwordRecovery = true;
        openAuthModal();
        setAuthFeedback("Link validado. Digite sua nova senha e clique em salvar.");
      }
    }, 0);
  });
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    await handleAuthSession(session);
  } catch { toast("O acesso não pôde ser restaurado. Entre novamente na sua conta."); }
  finally { authReady = true; }
}

function openAuthModal() {
  if (!supabaseClient) { toast("Não foi possível carregar o serviço de autenticação"); return; }
  setAuthFeedback();
  $("#authModalTitle").textContent = passwordRecovery ? "Defina sua nova senha" : "Seu espaço no Carijó";
  $("#authEmail").closest("label").classList.toggle("hidden", passwordRecovery);
  $(".auth-email-actions").classList.toggle("hidden", passwordRecovery);
  $("#resetPassword").classList.toggle("hidden", passwordRecovery);
  $("#updatePassword").classList.toggle("hidden", !passwordRecovery);
  $("#authPassword").autocomplete = passwordRecovery ? "new-password" : "current-password";
  showModalElement($("#authModal"));
}

function closeAuthModal() {
  $("#authPassword").value = "";
  hideModalElement($("#authModal"));
}

function authEmail() {
  const email = $("#authEmail").value.trim();
  if (!email || !$("#authEmail").checkValidity()) { setAuthFeedback("Informe um e-mail válido.", true); return null; }
  return email;
}

async function signInWithEmail() {
  const email = authEmail();
  const password = $("#authPassword").value;
  if (!email || !password) { setAuthFeedback("Informe e-mail e senha.", true); return; }
  await runAuthAction(async () => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    closeAuthModal();
    toast("Você entrou. Suas turmas estão sendo carregadas.");
  });
}

async function signUpWithEmail() {
  const email = authEmail();
  const password = $("#authPassword").value;
  if (!email || !password) { setAuthFeedback("Informe um e-mail válido e uma senha.", true); return; }
  const options = {};
  if (authRedirectUrl()) options.emailRedirectTo = authRedirectUrl();
  await runAuthAction(async () => {
    const { data, error } = await supabaseClient.auth.signUp({ email, password, options });
    if (error) throw error;
    $("#authPassword").value = "";
    if (data.session) { closeAuthModal(); toast("Conta conectada."); }
    else setAuthFeedback("Confira sua caixa de entrada e o spam para confirmar o cadastro. Se já tem conta, entre ou recupere sua senha.");
  });
}

let passwordRecovery = false;
let authActionPending = false;

async function runAuthAction(action) {
  if (authActionPending) return;
  authActionPending = true;
  const buttons = $$("#signInEmail, #signUpEmail, #resetPassword, #updatePassword");
  buttons.forEach(button => { button.disabled = true; });
  setAuthFeedback("Aguarde…");
  try { await action(); }
  catch (error) {
    const messages = {
      invalid_credentials: "E-mail ou senha incorretos. Confira os dados ou recupere sua senha.",
      email_not_confirmed: "Confirme o e-mail antes de entrar. Confira também o spam.",
      over_email_send_rate_limit: "O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente.",
      email_address_not_authorized: "O envio de e-mails ainda precisa ser configurado pelo responsável pelo Carijó.",
      weak_password: "O serviço de autenticação recusou a senha. O responsável pelo Carijó precisa conferir as regras de senha no Supabase.",
      signup_disabled: "Novos cadastros estão desativados. Fale com o responsável pelo Carijó.",
      otp_expired: "O link expirou ou já foi utilizado. Solicite um novo link.",
    };
    setAuthFeedback(messages[error?.code] || "Não foi possível concluir o acesso. Verifique sua conexão e tente novamente. Se persistir, informe o responsável pelo Carijó.", true);
  } finally {
    authActionPending = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}

async function resetPassword() {
  const email = authEmail();
  if (!email) return;
  await runAuthAction(async () => {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: authRedirectUrl() });
    if (error) throw error;
    setAuthFeedback("Se houver uma conta para este e-mail, você receberá um link para definir a senha. Confira também o spam.");
  });
}

async function updatePassword() {
  if (!passwordRecovery) return;
  const password = $("#authPassword").value;
  if (!password) { setAuthFeedback("Digite sua nova senha.", true); return; }
  await runAuthAction(async () => {
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;
    passwordRecovery = false;
    closeAuthModal();
    toast("Senha atualizada. Você já pode usar e-mail e senha nos próximos acessos.");
  });
}

async function signOut() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.auth.signOut();
  if (error) toast(error.message); else { closeDataModal(); toast("Você saiu da conta"); }
}

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 2200);
}

function showModalElement(modal) {
  if (!modal) return;
  lastFocusedElement = document.activeElement;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  setTimeout(() => $("button, input, select, textarea, [tabindex]:not([tabindex='-1'])", modal)?.focus(), 0);
}

function hideModalElement(modal) {
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
}

function openPrivacyModal() { showModalElement($("#privacyModal")); }
function closePrivacyModal() { hideModalElement($("#privacyModal")); }

function updateUsageUI(usage) {
  if (!usage) return;
  usageState = {
    used: Number(usage.used) || 0,
    limit: Math.max(0, Number(usage.limit ?? usage.usage_limit ?? 8)),
    remaining: Math.max(0, Number(usage.remaining) || 0),
    resetsAt: usage.resetsAt || usage.resets_at || null,
    estimatedCostUsd: usage.estimatedCostUsd ?? null,
  };
  const short = `${usageState.remaining}/${usageState.limit} gerações`;
  if ($("#usagePillText")) $("#usagePillText").textContent = short;
  if ($("#homeUsageStatus")) $("#homeUsageStatus").textContent = `Restam ${usageState.remaining} de ${usageState.limit} gerações neste mês. A natureza agradece sem confirmar presença.`;
  if ($("#historyUsageSummary")) $("#historyUsageSummary").textContent = `Cota mensal: ${short}`;
}

async function loadUsageStatus() {
  if (!supabaseClient || !currentUser) {
    if ($("#usagePillText")) $("#usagePillText").textContent = "entre para consultar";
    return;
  }
  const period = `${new Date().toISOString().slice(0, 7)}-01`;
  const [usageResult, limitResult] = await Promise.all([
    supabaseClient.from("generation_monthly_usage").select("used,usage_limit").eq("period_start", period).maybeSingle(),
    supabaseClient.from("teacher_usage_limits").select("monthly_limit").maybeSingle(),
  ]);
  if (usageResult.error || limitResult.error) {
    usageState = null;
    $("#usagePillText").textContent = "cota indisponível";
    $("#homeUsageStatus").textContent = "A cota não pôde ser consultada. O servidor verifica o limite antes de gerar.";
    return;
  }
  const limit = Number(limitResult.data?.monthly_limit ?? usageResult.data?.usage_limit ?? 8);
  const used = Number(usageResult.data?.used || 0);
  updateUsageUI({ used, limit, remaining: Math.max(0, limit - used) });
}

function notifyGenerationUsage(usage) {
  updateUsageUI(usage);
  const cost = Number(usage?.estimatedCostUsd);
  const costText = Number.isFinite(cost) && cost > 0 ? ` · custo estimado US$ ${cost.toFixed(4)}` : "";
  const content = `<strong>Mais um voo computacional concluído.</strong><span>Restam ${usageState?.remaining ?? "?"} de ${usageState?.limit ?? "?"} gerações neste mês${escapeHtml(costText)}. Dinheiro e natureza foram devidamente convertidos em burocracia.</span>`;
  [$("#generationUsageNotice"), $("#activityUsageNotice")].filter(Boolean).forEach(notice => {
    notice.innerHTML = content;
    notice.classList.remove("hidden");
  });
  toast(`Geração concluída · restam ${usageState?.remaining ?? "?"}${costText}`);
}

function openIronyModal() {
  showModalElement($("#ironyModal"));
}

function openBrandModal(event) {
  event?.preventDefault();
  showModalElement($("#brandModal"));
}

function closeBrandModal() {
  hideModalElement($("#brandModal"));
}

function closeIronyModal() {
  hideModalElement($("#ironyModal"));
}

function openPrompt() {
  $("#promptText").value = buildPrompt();
  showModalElement($("#promptModal"));
}

function closePrompt() {
  hideModalElement($("#promptModal"));
}

function openDataModal() {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  updateStorageStatus(stored ? JSON.parse(stored) : null);
  showModalElement($("#dataModal"));
}

function closeDataModal() {
  hideModalElement($("#dataModal"));
}

function exportLocalData() {
  saveLocalData();
  const blob = new Blob([localStorage.getItem(LOCAL_STORAGE_KEY)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `carijo-turmas-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  toast("Backup baixado");
}

async function importLocalData(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error("O backup ultrapassa o limite de 2 MB.");
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload.classes)) throw new Error("Este arquivo não contém turmas válidas.");
    if (payload.classes.length > 100) throw new Error("O backup contém turmas demais.");
    if (payload.ownerId && currentUser && payload.ownerId !== currentUser.id) throw new Error("Este backup pertence a outra conta.");
    state.classes = payload.classes.map((item, index) => {
      const name = String(item?.name || "").trim().slice(0, 80);
      const subject = String(item?.subject || "").trim().slice(0, 120);
      if (!name || !subject) throw new Error(`A turma ${index + 1} está incompleta.`);
      const schedule = Array.isArray(item.schedule) ? item.schedule.slice(0, 30).map(value => String(value).slice(0, 100)) : [];
      return { id: Number.isFinite(Number(item.id)) ? Number(item.id) : index + 1, name, subject, lessons: Math.max(1, Math.min(30, Number(item.lessons) || 1)), schedule, notes: String(item.notes || "").slice(0, 4000) };
    });
    if (Array.isArray(payload.skills)) state.skills = new Set(payload.skills.slice(0, 300).map(value => String(value).slice(0, 200)));
    if (["quarter", "fortnight"].includes(payload.planType)) state.planType = payload.planType;
    saveLocalData();
    renderManualStart();
    renderSchedule();
    renderSkills();
    toast("Backup importado com sucesso");
    closeDataModal();
  } catch (error) {
    toast(error.message || "Não foi possível importar este arquivo");
  } finally {
    event.target.value = "";
  }
}

function clearLocalData() {
  if (!window.confirm("Apagar as turmas salvas neste dispositivo? Esta ação não pode ser desfeita sem um backup.")) return;
  state.classes = [];
  state.skills = new Set(["EF67LP04", "EF67LP20", "EF69LP13"]);
  renderManualStart();
  renderSchedule();
  renderSkills();
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  updateStorageStatus(null);
  toast("Dados removidos deste dispositivo");
}

async function deleteCloudAccount() {
  if (!supabaseClient || !currentUser) return;
  const confirmation = window.prompt("Esta ação exclui sua conta, turmas, planejamentos e registros de uso da nuvem. Digite EXCLUIR para confirmar:");
  if (confirmation !== "EXCLUIR") { toast("Exclusão cancelada"); return; }
  const button = $("#deleteCloudData");
  button.disabled = true;
  button.textContent = "Excluindo…";
  try {
    const { error } = await supabaseClient.functions.invoke("delete-account", { body: { confirmation: "EXCLUIR" } });
    if (error) throw error;
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    state.classes = [];
    currentUser = null;
    closeDataModal();
    updateAuthInterface();
    renderManualStart();
    showScreen("upload");
    toast("Conta e dados da nuvem excluídos");
  } catch (error) {
    toast(error.message || "Não foi possível excluir a conta");
  } finally {
    button.disabled = false;
    button.textContent = "Excluir conta e dados da nuvem";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initializePlanningDates();
  restoreLocalData();
  renderClassOptions();
  renderSkills();
  loadOfficialSkillCatalog();
  $("#manualSubject").innerHTML = subjectOptionsHtml("Língua Portuguesa");
  renderManualStart();
  $$("[data-go]").forEach(button => button.addEventListener("click", () => {
    if ((button.dataset.go === "choose" || button.dataset.go === "planForm") && !state.classes.length) { toast("Adicione pelo menos uma turma para continuar"); showScreen("upload"); return; }
    showScreen(button.dataset.go);
  }));
  $("#manualSubject").addEventListener("change", event => {
    const isOther = event.target.value === "__other";
    $("#manualOtherSubjectField").classList.toggle("hidden", !isOther);
    if (isOther) $("#manualOtherSubject").focus();
  });
  $("#manualAddClass").addEventListener("click", addManualClass);
  $("#manualContinue").addEventListener("click", () => {
    if (state.classes.some(item => !item.subject.trim())) { toast("Preencha o nome da outra disciplina"); return; }
    if (state.classes.length) { renderClassOptions(); showScreen("choose"); }
  });
  $("#confirmSchedule").addEventListener("click", () => { renderClassOptions(); showScreen("choose"); });
  $("#addClass").addEventListener("click", () => {
    const id = Math.max(0, ...state.classes.map(item => item.id)) + 1;
    state.classes.push({ id, name: "Nova turma", subject: "Língua Portuguesa", lessons: 2, schedule: ["Seg 08:20", "Qua 08:20"], notes: "" });
    renderSchedule();
  });
  $$("[data-plan]").forEach(button => button.addEventListener("click", () => configurePlanner(button.dataset.plan)));
  $$("[data-activity]").forEach(button => button.addEventListener("click", openActivityBuilder));
  $$(".chip").forEach(button => button.addEventListener("click", () => {
    $$(".chip").forEach(chip => chip.classList.remove("active"));
    button.classList.add("active");
    renderSkills(button.dataset.filter);
  }));
  $("#addSkill").addEventListener("click", () => {
    const text = window.prompt("Digite o código e a descrição da habilidade:");
    if (!text) return;
    const code = `MANUAL-${skillCatalog.length + 1}`;
    skillCatalog.push({ id: code, area: "manual", text: text.trim().slice(0, 1000) });
    state.skills.add(code);
    $(".chip.active").classList.remove("active");
    $(".chip[data-filter='all']").classList.add("active");
    renderSkills();
  });
  $$("#biasChoices .choice").forEach(button => {
    button.setAttribute("aria-pressed", String(button.classList.contains("selected")));
    button.addEventListener("click", () => { button.classList.toggle("selected"); button.setAttribute("aria-pressed", String(button.classList.contains("selected"))); });
  });
  $$("#resourceChoices .resource-choice").forEach(button => {
    button.setAttribute("aria-pressed", String(button.classList.contains("selected")));
    button.addEventListener("click", () => { button.classList.toggle("selected"); button.setAttribute("aria-pressed", String(button.classList.contains("selected"))); });
  });
  $("#classSelect").addEventListener("change", () => {
    $("#recorteClass").value = $("#classSelect").value;
    state.skills = new Set();
    if (state.planType === "fortnight" && getSelectedClass()) resetMeetingFormat(getSelectedClass().lessons * 2);
    updateSelectedClassLabel();
    renderSkills();
    renderSubjectProfileSummary();
    $("#recurringNotes").value = getSelectedClass()?.notes || "";
    renderReferenceChoices();
    updatePlannerSummary();
  });
  $("#quarterSelect").addEventListener("change", () => {
    $("#recorteQuarter").value = String(parseInt($("#quarterSelect").value, 10));
    previousTrimesters.clear();
    renderPreviousTrimesters();
    state.skills = new Set();
    renderSkills();
    updatePlannerSummary();
  });
  ["#dateStart", "#dateEnd"].forEach(id => $(id).addEventListener("change", updatePlannerSummary));
  $("#recorteQuarter").addEventListener("change", () => {
    previousTrimesters.clear();
    renderPreviousTrimesters();
    $("#quarterSelect").value = `${$("#recorteQuarter").value}º trimestre`;
    state.skills = new Set();
    renderSkills();
    updatePlannerSummary();
  });
  $("#recorteClass").addEventListener("change", () => {
    previousTrimesters.clear();
    renderPreviousTrimesters();
    $("#classSelect").value = $("#recorteClass").value;
    state.skills = new Set();
    updateSelectedClassLabel();
    renderSkills();
    renderSubjectProfileSummary();
    $("#recurringNotes").value = getSelectedClass()?.notes || "";
    renderReferenceChoices();
    updatePlannerSummary();
  });
  $("#manualLessons").addEventListener("change", () => resetMeetingFormat($("#manualLessons").value));
  $("#recurringNotes").addEventListener("change", event => {
    const item = getSelectedClass();
    if (!item) return;
    item.notes = event.target.value.trim().slice(0, 4000);
    saveLocalData();
    toast("Observações recorrentes salvas com a turma");
  });
  ["#lessonDuration", "#simpleLessons", "#bandMeetings", "#bandLength", "#bandMeetings2", "#bandLength2"].forEach(id => $(id).addEventListener("change", () => updateMeetingFormat(true)));
  $("#previewPrompt").addEventListener("click", openPrompt);
  $$('[data-close-modal]').forEach(button => button.addEventListener("click", closePrompt));
  $("#ironyButton").addEventListener("click", openIronyModal);
  $$('[data-close-irony]').forEach(button => button.addEventListener("click", closeIronyModal));
  $("#brandButton").addEventListener("click", openBrandModal);
  $$('[data-close-brand]').forEach(button => button.addEventListener("click", closeBrandModal));
  $("#authButton").addEventListener("click", () => currentUser ? openDataModal() : openAuthModal());
  $$('[data-close-data]').forEach(button => button.addEventListener("click", closeDataModal));
  $("#exportData").addEventListener("click", exportLocalData);
  $("#openHistory").addEventListener("click", openHistory);
  $("#historyNavButton").addEventListener("click", openHistory);
  $("#historyPageSearch").addEventListener("input", renderHistoryPage);
  $("#historyTypeFilter").addEventListener("change", renderHistoryPage);
  $("#refreshHistory").addEventListener("click", loadHistoryPage);
  $$('[data-close-history]').forEach(button => button.addEventListener("click", closeHistory));
  $("#historySearch").addEventListener("input", event => {
    const query = normalize(event.target.value);
    renderHistory(historyPlans.filter(plan => normalize(`${plan.class_name} ${plan.subject} ${plan.period_label}`).includes(query)));
  });
  $("#importData").addEventListener("change", importLocalData);
  $("#clearData").addEventListener("click", clearLocalData);
  $("#deleteCloudData").addEventListener("click", deleteCloudAccount);
  $("#privacyButton").addEventListener("click", openPrivacyModal);
  $("#privacyAuthButton").addEventListener("click", () => { closeAuthModal(); openPrivacyModal(); });
  $$('[data-close-privacy]').forEach(button => button.addEventListener("click", closePrivacyModal));
  $("#signOutButton").addEventListener("click", signOut);
  $$('[data-close-auth]').forEach(button => button.addEventListener("click", closeAuthModal));
  $("#signInEmail").addEventListener("click", signInWithEmail);
  $("#signUpEmail").addEventListener("click", signUpWithEmail);
  $("#resetPassword").addEventListener("click", resetPassword);
  $("#updatePassword").addEventListener("click", updatePassword);
  $("#authPassword").addEventListener("keydown", event => {
    if (event.key === "Enter") { event.preventDefault(); void (passwordRecovery ? updatePassword() : signInWithEmail()); }
  });
  $("#copyPrompt").addEventListener("click", async () => { await navigator.clipboard.writeText($("#promptText").value); toast("Prompt copiado"); });
  $("#generatePlan").addEventListener("click", generateFinalDocument);
  $("#generateWithAI").addEventListener("click", () => generatePlanWithAI(false));
  $("#confirmGenerationButton").addEventListener("click", () => finishGenerationConfirmation(true));
  $$('[data-close-generation]').forEach(button => button.addEventListener("click", () => finishGenerationConfirmation(false)));
  $("#savePlan").addEventListener("click", savePlanToHistory);
  $("#editPlan").addEventListener("click", togglePlanEditor);
  configureEditorToolbar($("#planEditorToolbar"), $("#planDocument"));
  $("#printPlan").addEventListener("click", printPlan);
  $("#copyPlan").addEventListener("click", async () => { await navigator.clipboard.writeText($("#planDocument").innerText); toast("Planejamento copiado"); });
  $("#copyAIPlan").addEventListener("click", async () => { await navigator.clipboard.writeText($("#aiPlanText").innerText); toast("Versão IA copiada"); });
  $("#activityClassSelect").addEventListener("change", () => { syncActivityGrade(); renderActivityProfileSummary(); state.activitySkills = new Set(); renderActivitySkills(); });
  $("#activityQuarter").addEventListener("change", () => { state.activitySkills = new Set(); renderActivitySkills(); });
  $("#generateActivity").addEventListener("click", buildActivityProposal);
  $("#copyActivity").addEventListener("click", async () => { await navigator.clipboard.writeText($("#activityAIText").innerText); toast("Instrumento copiado"); });
  $("#editActivity").addEventListener("click", toggleActivityEditor);
  $("#saveActivity").addEventListener("click", saveActivityToHistory);
  $("#printActivity").addEventListener("click", printActivity);
  configureEditorToolbar($("#activityEditorToolbar"), $("#activityAIText"));
  $("#usagePill").addEventListener("click", () => usageState ? toast(`Restam ${usageState.remaining} de ${usageState.limit} gerações neste mês`) : (currentUser ? loadUsageStatus() : openAuthModal()));
  $(".mobile-menu").addEventListener("click", event => { const open = $(".sidebar").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
  $$(".sidebar button").forEach(button => button.addEventListener("click", () => { $(".sidebar").classList.remove("open"); $(".mobile-menu").setAttribute("aria-expanded", "false"); }));
  document.addEventListener("keydown", event => {
    const modal = $(".modal.open");
    if (!modal) return;
    if (event.key === "Escape") { event.preventDefault(); $(".modal-close", modal)?.click(); return; }
    if (event.key !== "Tab") return;
    const focusable = $$("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", modal).filter(element => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  void initializeAuth();
});
