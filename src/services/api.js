const axios = require('axios');
const configSvc = require('./configuration');
const logger = require('../utils/logger');

const TIMEOUT_MS = 8000;

/**
 * Send a request to a Minecraft AFK slot API.
 * @param {string} slotUrl   - Base URL of the slot (e.g. https://slot1.example.com)
 * @param {string} endpoint  - Path without leading slash (e.g. "start")
 * @param {Object} [params]  - Extra query params (e.g. { value: "play.example.com" })
 * @returns {Promise<{ ok: boolean, data?: any, error?: string }>}
 */
async function callSlot(slotUrl, endpoint, params = {}) {
  const apiKey = configSvc.getGlobalApiKey();

  if (!apiKey) {
    logger.warn('[API] Global API key not configured');
    return { ok: false, error: 'Global API key not configured. Ask the bot owner to run /setkey.' };
  }

  const url = `${slotUrl.replace(/\/$/, '')}/${endpoint}`;
  const queryParams = { key: apiKey, ...params };

  logger.info(`[API] ${endpoint.toUpperCase()} → ${url} (params: ${JSON.stringify({ ...params })})`);

  try {
    const response = await axios.get(url, {
      params: queryParams,
      timeout: TIMEOUT_MS,
    });
    logger.info(`[API] Response ${response.status} from ${url}`);
    return { ok: true, data: response.data };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.message || err.message;
    logger.error(`[API] Request failed: ${endpoint} → ${url} | ${status || 'no-response'} | ${message}`);

    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return { ok: false, error: 'Request timed out. The Minecraft service may be offline.' };
    }
    if (!err.response) {
      return { ok: false, error: 'Could not connect to the Minecraft service.' };
    }
    if (status === 401 || status === 403) {
      return { ok: false, error: 'API authentication failed. Contact the bot owner.' };
    }
    if (status === 404) {
      return { ok: false, error: 'Endpoint not found on the Minecraft service.' };
    }
    if (status === 429) {
      return { ok: false, error: 'Rate limited by the Minecraft service. Try again later.' };
    }
    return { ok: false, error: `Minecraft service error (${status || 'unknown'}). Try again later.` };
  }
}

async function healthCheck(slotUrl) {
  return callSlot(slotUrl, 'health');
}

module.exports = { callSlot, healthCheck };
