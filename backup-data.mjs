export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const types = new Set(['quarter', 'fortnight', 'activity']);
function requireValue(valid, message) { if (!valid) throw new Error(message); }
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).filter(key => value[key] !== undefined).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function classContent(item) { const {id, ...content} = item; return canonical(content); }
function documentKey(item) {
  const {id, user_id, backupSourceId, plan_data, ...content} = item;
  const {cloudId, cloudOwner, ...data} = plan_data || {};
  return canonical([backupSourceId ?? id ?? '', content, data]);
}
export function validateBackup(payload, sanitize = value => value) {
  requireValue(object(payload) && (payload.version === undefined || payload.version === 1), 'Formato ou versão de backup não reconhecido.');
  requireValue(Array.isArray(payload.classes), 'Este arquivo não contém uma lista de turmas válida.');
  requireValue(payload.ownerId == null || typeof payload.ownerId === 'string', 'Conta do backup inválida.');
  requireValue(payload.skills === undefined || (Array.isArray(payload.skills) && payload.skills.every(value => typeof value === 'string')), 'Lista de habilidades inválida.');
  requireValue(payload.planType === undefined || ['quarter','fortnight'].includes(payload.planType), 'Tipo de planejamento inválido.');
  requireValue(payload.documents === undefined || Array.isArray(payload.documents), 'A lista de documentos do backup é inválida.');
  const classIds = new Set();
  const classes = payload.classes.map((item, index) => {
    const label = `Turma ${index + 1}`;
    requireValue(object(item) && Number.isSafeInteger(Number(item.id)) && Number(item.id) > 0, `${label}: identificador inválido.`);
    const id = Number(item.id);
    requireValue(!classIds.has(id), `${label}: identificador de turma duplicado no arquivo.`);classIds.add(id);
    requireValue(typeof item.name === 'string' && item.name.trim() && typeof item.subject === 'string' && item.subject.trim(), `${label}: nome ou componente incompleto.`);
    requireValue(Number.isFinite(Number(item.lessons)) && Number(item.lessons) >= 1 && Number(item.lessons) <= 30, `${label}: carga horária inválida.`);
    requireValue(item.schedule === undefined || (Array.isArray(item.schedule) && item.schedule.every(value => typeof value === 'string')), `${label}: horários inválidos.`);
    requireValue(item.notes === undefined || typeof item.notes === 'string', `${label}: observações inválidas.`);
    return {...item, id, lessons:Number(item.lessons), schedule:item.schedule || [], notes:item.notes || ''};
  });
  const documents = (payload.documents || []).map((item, index) => {
    const label = `Documento ${index + 1}`;
    requireValue(object(item) && typeof item.document_html === 'string' && types.has(item.plan_type), `${label}: conteúdo ou tipo inválido. Nenhum item foi importado.`);
    for (const key of ['id','backupSourceId','title','class_name','subject','period_label']) requireValue(item[key] === undefined || typeof item[key] === 'string', `${label}: campo ${key} inválido.`);
    for (const key of ['created_at','updated_at']) requireValue(item[key] == null || (typeof item[key] === 'string' && Number.isFinite(Date.parse(item[key]))), `${label}: data inválida.`);
    requireValue(item.plan_data == null || object(item.plan_data), `${label}: dados do documento inválidos.`);
    const data = {...item.plan_data};
    for (const key of ['documentText','aiText']) requireValue(data[key] === undefined || typeof data[key] === 'string', `${label}: texto inválido.`);
    if (data.versions !== undefined) {
      requireValue(Array.isArray(data.versions), `${label}: lista de versões inválida.`);
      data.versions = data.versions.map((version, versionIndex) => {
        requireValue(object(version) && typeof version.html === 'string', `${label}, versão ${versionIndex + 1}: conteúdo inválido.`);
        return {...version, html:sanitize(version.html)};
      });
    }
    return {...item, document_html:sanitize(item.document_html), plan_data:data};
  });
  return {...payload, classes, documents};
}
export function prepareRestore(payload, {classes, documents, skills, planType, ownerId = null, uuid = () => crypto.randomUUID(), sanitize}) {
  const valid = validateBackup(payload, sanitize);
  requireValue(!valid.ownerId || !ownerId || valid.ownerId === ownerId, 'Este backup pertence a outra conta.');
  const nextClasses = classes.map(item => ({...item, schedule:item.schedule || [], notes:item.notes || ''}));
  const mapping = new Map(), contents = new Map(nextClasses.map(item => [classContent(item), item]));
  const classIds = new Set(nextClasses.map(item => Number(item.id)));
  let classesAdded = 0, nextClassId = nextClasses.reduce((largest, item) => Math.max(largest, Number(item.id) || 0), 0) + 1;
  for (const item of valid.classes) {
    const signature = classContent(item), same = contents.get(signature);
    if (same) { mapping.set(item.id, same.id); continue; }
    let id = item.id;
    if (classIds.has(id)) {
      id = nextClassId++;
      requireValue(Number.isSafeInteger(id), 'Não foi possível atribuir um identificador seguro à turma.');
    }
    const added = {...item, id};
    mapping.set(item.id, id);nextClasses.push(added);contents.set(signature, added);classIds.add(id);nextClassId = Math.max(nextClassId, id + 1);classesAdded++;
  }
  const keys = new Set(documents.map(documentKey)), ids = new Set(documents.map(item => item.id)), added = [];
  let duplicates = 0, conflicts = 0;
  for (const source of valid.documents) {
    const item = {...source, class_id:mapping.get(Number(source.class_id)) ?? source.class_id, user_id:null,
      plan_data:{...source.plan_data, cloudId:null, cloudOwner:null}};
    const key = documentKey(item);
    if (keys.has(key)) { duplicates++; continue; }
    let id = item.id;
    if (!id?.startsWith('local-') || ids.has(id)) { if (ids.has(id)) conflicts++; id = `local-${uuid()}`; }
    requireValue(!ids.has(id), 'Não foi possível criar uma identidade única para o documento.');
    added.push({...item, id, backupSourceId:item.backupSourceId ?? item.id ?? ''});ids.add(id);keys.add(key);
  }
  return {classes:nextClasses, documents:[...added, ...documents], skills:[...new Set([...skills, ...(valid.skills || [])])], planType:valid.planType || planType,
    counts:{received:valid.documents.length, added:added.length, duplicates, conflicts, total:documents.length + added.length, classesAdded, classesReceived:valid.classes.length}};
}
// Synchronous transaction: individual localStorage writes are atomic. If the
// second write fails (e.g. quota), restore the first before changing UI state.
export function commitRestore(storage, settingsKey, documentsKey, settings, documents) {
  const previousSettings = storage.getItem(settingsKey), previousDocuments = storage.getItem(documentsKey);
  const serializedSettings = JSON.stringify(settings), serializedDocuments = JSON.stringify(documents);
  const written = [];
  try {
    if (serializedDocuments !== previousDocuments) { storage.setItem(documentsKey, serializedDocuments); written.push([documentsKey, previousDocuments]); }
    if (serializedSettings !== previousSettings) { storage.setItem(settingsKey, serializedSettings); written.push([settingsKey, previousSettings]); }
  } catch (cause) {
    let rollbackFailed = false;
    for (const [key, value] of written.reverse()) {
      try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { rollbackFailed = true; }
    }
    const error = new Error(rollbackFailed ? 'A gravação e a recuperação do armazenamento falharam. Mantenha esta tela aberta e baixe a cópia de recuperação antes de tentar novamente.' : 'Não foi possível guardar o backup. A importação foi desfeita e os dados anteriores foram preservados. Libere espaço no navegador e tente novamente.');
    if (rollbackFailed) error.recovery = {settings:previousSettings, documents:previousDocuments};
    error.cause = cause;throw error;
  }
}
