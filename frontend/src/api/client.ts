/**
 * SmartWard AI — Unified API Barrel Facade
 * Re-exports modular domain APIs so all existing imports remain 100% compatible.
 */
import { api } from './modules/http';

export * from './modules/rag.api';
export * from './modules/dossier.api';
export * from './modules/formPrecheck.api';
export * from './modules/incident.api';
export * from './modules/proceduresAndVault.api';

export { api };
export default api;
