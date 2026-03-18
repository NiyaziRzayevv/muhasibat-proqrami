// Offline mode - no remote server calls
// This stub exists for backward compatibility with pages that still import apiRequest
export async function apiRequest(path, opts = {}) {
  console.warn('[OFFLINE] apiRequest called but server is disabled:', path);
  return { success: false, error: 'Offline rejim - server bağlantısı ləğv edilib' };
}
