import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const currentFile = fileURLToPath(import.meta.url);

if (!process.env.SMARTWARD_TSX_ACTIVE) {
  const rootDir = path.resolve(path.dirname(currentFile), '../..');
  const loaderPath = path.resolve(rootDir, 'frontend/node_modules/tsx/dist/loader.mjs');
  if (fs.existsSync(loaderPath)) {
    const res = spawnSync(process.execPath, ['--import', pathToFileURL(loaderPath).href, currentFile, ...process.argv.slice(2)], {
      stdio: 'inherit',
      env: { ...process.env, SMARTWARD_TSX_ACTIVE: '1' }
    });
    process.exit(res.status ?? 0);
  }
}

const {
  isGreetingQuery,
  isProcedureListQuery,
  isWardOfficeQuery,
  checkOutOfScopeQuery,
  classifySmallTalk
} = await import('../../frontend/src/services/intentClassifier.ts');
const { searchLegalKnowledge } = await import('../../frontend/src/services/legalKnowledgeBase.ts');

function predictSample(text) {
  const q = text.trim();
  
  // 1. Catalog
  if (isProcedureListQuery(q)) {
    return { intent: 'PROCEDURE_CATALOG', procedure_code: null, top_chunk_ids: [] };
  }
  
  // 2. Greeting / Small talk
  const st = classifySmallTalk(q);
  if (st.matched) {
    return { intent: 'GREETING', procedure_code: null, top_chunk_ids: [] };
  }
  
  // 3. Out of scope
  const oos = checkOutOfScopeQuery(q);
  if (oos.isOutOfScope) {
    return { intent: 'OUT_OF_SCOPE', procedure_code: null, top_chunk_ids: [] };
  }
  
  // 4. Commune info
  if (isWardOfficeQuery(q)) {
    return { intent: 'COMMUNE_INFO', procedure_code: null, top_chunk_ids: [] };
  }
  
  // 5. Procedure search
  const leg = searchLegalKnowledge(q, 3);
  if (leg.isInScope && leg.items.length > 0) {
    const topItem = leg.items[0];
    return {
      intent: 'PROCEDURE_INQUIRY',
      procedure_code: topItem.code,
      top_chunk_ids: leg.items.map(it => `${it.code}_CHK_001`)
    };
  }
  
  // 6. Ambiguous / Underspecified
  return { intent: 'AMBIGUOUS', procedure_code: null, top_chunk_ids: [] };
}

function evaluateSplit(splitName) {
  const data = JSON.parse(fs.readFileSync(`ml/data/${splitName}.json`, 'utf-8'));
  const results = [];
  
  for (const s of data) {
    const pred = predictSample(s.text);
    results.append ? results.push({
      id: s.id,
      text: s.text,
      true_intent: s.intent,
      pred_intent: pred.intent,
      true_proc: s.procedure_code,
      pred_proc: pred.procedure_code,
      correct_intent: s.intent === pred.intent,
      correct_proc: s.intent === 'PROCEDURE_INQUIRY' ? (s.procedure_code === pred.procedure_code) : null
    }) : results.push({
      id: s.id,
      text: s.text,
      true_intent: s.intent,
      pred_intent: pred.intent,
      true_proc: s.procedure_code,
      pred_proc: pred.procedure_code,
      correct_intent: s.intent === pred.intent,
      correct_proc: s.intent === 'PROCEDURE_INQUIRY' ? (s.procedure_code === pred.procedure_code) : null
    });
  }
  
  fs.writeFileSync(`ml/runs/col1_rule_${splitName}_predictions.json`, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`Evaluated ${results.length} samples for ${splitName}. Output saved to ml/runs/col1_rule_${splitName}_predictions.json`);
}

fs.mkdirSync('ml/runs', { recursive: true });
evaluateSplit('dev');
evaluateSplit('heldout');
