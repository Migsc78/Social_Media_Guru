import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db = null;
let dbPath = null;

/**
 * Initialize the SQLite database and run schema migrations.
 */
export async function initDatabase(path) {
  dbPath = path;
  const dir = dirname(path);
  mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  if (existsSync(path)) {
    const buffer = readFileSync(path);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  db.run(schema);
  saveDb();

  console.log('[DB] Database initialized at', path);
  return db;
}

function saveDb() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

/**
 * Get the database instance.
 */
export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// Helper: run a query and return all results as objects
function queryAll(sql, params = []) {
  const stmt = getDb().prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: run a query and return the first result as object
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

// Helper: run a statement (INSERT/UPDATE/DELETE)
function execute(sql, params = []) {
  getDb().run(sql, params);
  saveDb();
}

// ─── Domain CRUD ───────────────────────────────────────────

export function createDomain({ id, url, name, primaryGoal, audienceDescription, brandVoiceTone, brandVoiceFormality, brandVoiceExamples, brandVoiceDoNots, socialAccounts }) {
  execute(
    `INSERT INTO domains (id, url, name, primary_goal, audience_description, brand_voice_tone, brand_voice_formality, brand_voice_examples, brand_voice_donots, social_accounts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, url, name, primaryGoal || 'drive_traffic', audienceDescription || null,
      brandVoiceTone || 'professional', brandVoiceFormality || 'medium',
      JSON.stringify(brandVoiceExamples || []), JSON.stringify(brandVoiceDoNots || []),
      JSON.stringify(socialAccounts || {})]
  );
  return getDomain(id);
}

export function getDomain(id) {
  const row = queryOne('SELECT * FROM domains WHERE id = ?', [id]);
  if (!row) return null;
  return parseDomainRow(row);
}

export function getAllDomains() {
  const rows = queryAll('SELECT * FROM domains ORDER BY created_at DESC');
  return rows.map(parseDomainRow);
}

export function updateDomain(id, updates) {
  const fields = [];
  const values = [];
  const allowedFields = {
    url: 'url', name: 'name', primaryGoal: 'primary_goal',
    audienceDescription: 'audience_description',
    brandVoiceTone: 'brand_voice_tone', brandVoiceFormality: 'brand_voice_formality',
    brandVoiceExamples: 'brand_voice_examples', brandVoiceDoNots: 'brand_voice_donots',
    socialAccounts: 'social_accounts'
  };
  for (const [key, col] of Object.entries(allowedFields)) {
    if (updates[key] !== undefined) {
      fields.push(`${col} = ?`);
      const val = (key === 'brandVoiceExamples' || key === 'brandVoiceDoNots' || key === 'socialAccounts')
        ? JSON.stringify(updates[key]) : updates[key];
      values.push(val);
    }
  }
  if (fields.length === 0) return getDomain(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  execute(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`, values);
  return getDomain(id);
}

export function deleteDomain(id) {
  execute('DELETE FROM domains WHERE id = ?', [id]);
}

function parseDomainRow(row) {
  return {
    ...row,
    brand_voice_examples: safeJsonParse(row.brand_voice_examples, []),
    brand_voice_donots: safeJsonParse(row.brand_voice_donots, []),
    social_accounts: safeJsonParse(row.social_accounts, {})
  };
}

// ─── Crawled Pages ─────────────────────────────────────────

export function storeCrawledPages(domainId, pages) {
  execute('DELETE FROM crawled_pages WHERE domain_id = ?', [domainId]);
  for (const page of pages) {
    execute(
      `INSERT INTO crawled_pages (id, domain_id, url, title, headings, body_text, internal_links, page_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [page.id, domainId, page.url, page.title || '',
      JSON.stringify(page.headings || []), page.bodyText || '',
      JSON.stringify(page.internalLinks || []), page.pageType || 'other']
    );
  }
  saveDb();
}

export function getCrawledPages(domainId) {
  const rows = queryAll('SELECT * FROM crawled_pages WHERE domain_id = ? ORDER BY crawled_at', [domainId]);
  return rows.map(r => ({
    ...r,
    headings: safeJsonParse(r.headings, []),
    internal_links: safeJsonParse(r.internal_links, [])
  }));
}

// ─── Agent Data (Generic Store/Retrieve) ───────────────────

export function storeAgentData(table, domainId, data) {
  const id = data.id || crypto.randomUUID();
  const colMap = {
    domain_profiles: 'profile_data',
    competitor_sets: 'competitor_data',
    positioning_summaries: 'positioning_data',
    content_strategies: 'strategy_data',
    campaign_calendars: 'calendar_data'
  };
  const dataCol = colMap[table];
  if (!dataCol) throw new Error(`Unknown agent data table: ${table}`);

  if (table === 'campaign_calendars') {
    execute(
      `INSERT INTO campaign_calendars (id, domain_id, start_date, end_date, calendar_data)
       VALUES (?, ?, ?, ?, ?)`,
      [id, domainId, data.startDate || '', data.endDate || '', JSON.stringify(data)]
    );
    return { id, ...data };
  }

  // Upsert for single-record-per-domain tables
  const existing = queryOne(`SELECT id FROM ${table} WHERE domain_id = ?`, [domainId]);
  if (existing) {
    execute(
      `UPDATE ${table} SET ${dataCol} = ?, updated_at = datetime('now') WHERE domain_id = ?`,
      [JSON.stringify(data), domainId]
    );
    return { id: existing.id, ...data };
  } else {
    execute(
      `INSERT INTO ${table} (id, domain_id, ${dataCol}) VALUES (?, ?, ?)`,
      [id, domainId, JSON.stringify(data)]
    );
    return { id, ...data };
  }
}

export function getAgentData(table, domainId) {
  const colMap = {
    domain_profiles: 'profile_data',
    competitor_sets: 'competitor_data',
    positioning_summaries: 'positioning_data',
    content_strategies: 'strategy_data',
    campaign_calendars: 'calendar_data'
  };
  const dataCol = colMap[table];
  if (!dataCol) throw new Error(`Unknown agent data table: ${table}`);

  if (table === 'campaign_calendars') {
    const row = queryOne(`SELECT * FROM campaign_calendars WHERE domain_id = ? ORDER BY created_at DESC LIMIT 1`, [domainId]);
    return row ? safeJsonParse(row[dataCol], null) : null;
  }

  const row = queryOne(`SELECT * FROM ${table} WHERE domain_id = ?`, [domainId]);
  return row ? safeJsonParse(row[dataCol], null) : null;
}

// ─── Post Drafts ───────────────────────────────────────────

export function storePostDrafts(domainId, calendarId, drafts) {
  for (const d of drafts) {
    execute(
      `INSERT INTO post_drafts (id, domain_id, calendar_id, calendar_post_id, platform, scheduled_date, scheduled_time,
        status, text_content, variant, thread, hashtags, cta, media_suggestions, target_url, pillar_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [d.id || crypto.randomUUID(), domainId, calendarId, d.calendarPostId || null,
      d.platform, d.scheduledDate || null, d.scheduledTime || null,
      d.status || 'draft', d.text || '', d.variant || 'A',
      JSON.stringify(d.thread || []), JSON.stringify(d.hashtags || []),
      d.cta || '', JSON.stringify(d.mediaSuggestions || []),
      d.targetUrl || '', d.pillarId || '', d.notes || '']
    );
  }
  saveDb();
}

export function getPostDrafts(domainId, filters = {}) {
  let query = 'SELECT * FROM post_drafts WHERE domain_id = ?';
  const params = [domainId];
  if (filters.platform) { query += ' AND platform = ?'; params.push(filters.platform); }
  if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
  if (filters.calendarId) { query += ' AND calendar_id = ?'; params.push(filters.calendarId); }
  query += ' ORDER BY scheduled_date, scheduled_time';
  const rows = queryAll(query, params);
  return rows.map(parsePostDraftRow);
}

export function getPostDraft(id) {
  const row = queryOne('SELECT * FROM post_drafts WHERE id = ?', [id]);
  return row ? parsePostDraftRow(row) : null;
}

export function updatePostDraft(id, updates) {
  const fields = [];
  const values = [];
  const allowed = ['text_content', 'scheduled_date', 'scheduled_time', 'platform', 'status',
    'target_url', 'cta', 'notes', 'feedback', 'error_message', 'published_at'];
  for (const col of allowed) {
    const camelKey = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (updates[camelKey] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(updates[camelKey]);
    } else if (updates[col] !== undefined) {
      fields.push(`${col} = ?`);
      values.push(updates[col]);
    }
  }
  if (updates.hashtags !== undefined) { fields.push('hashtags = ?'); values.push(JSON.stringify(updates.hashtags)); }
  if (updates.thread !== undefined) { fields.push('thread = ?'); values.push(JSON.stringify(updates.thread)); }
  if (updates.mediaSuggestions !== undefined) { fields.push('media_suggestions = ?'); values.push(JSON.stringify(updates.mediaSuggestions)); }

  if (fields.length === 0) return getPostDraft(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  execute(`UPDATE post_drafts SET ${fields.join(', ')} WHERE id = ?`, values);
  return getPostDraft(id);
}

export function bulkUpdatePostStatus(ids, status) {
  for (const id of ids) {
    execute(`UPDATE post_drafts SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
  }
  saveDb();
}

function parsePostDraftRow(row) {
  return {
    ...row,
    thread: safeJsonParse(row.thread, []),
    hashtags: safeJsonParse(row.hashtags, []),
    media_suggestions: safeJsonParse(row.media_suggestions, [])
  };
}

// ─── Social Connections ────────────────────────────────────

export function storeSocialConnection(conn) {
  execute(
    `INSERT OR REPLACE INTO social_connections (id, domain_id, platform, account_name, access_token, refresh_token, token_expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [conn.id, conn.domainId, conn.platform, conn.accountName || '',
    conn.accessToken || '', conn.refreshToken || '', conn.tokenExpiresAt || '']
  );
}

export function getSocialConnections(domainId) {
  return queryAll('SELECT * FROM social_connections WHERE domain_id = ?', [domainId]);
}

// ─── Settings (Key-Value Store) ────────────────────────────

export function getSetting(key) {
  const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  execute(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, value]
  );
}

export function getAllSettings() {
  const rows = queryAll('SELECT key, value FROM settings');
  const result = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function deleteSetting(key) {
  execute('DELETE FROM settings WHERE key = ?', [key]);
}

// ─── Personas ──────────────────────────────────────────────

export function storePersonas(domainId, personas) {
  // Clear existing AI-generated personas for this domain
  execute('DELETE FROM personas WHERE domain_id = ? AND is_ai_generated = 1', [domainId]);

  const stored = [];
  for (const p of personas) {
    const id = p.id || crypto.randomUUID();
    execute(
      `INSERT INTO personas (id, domain_id, name, avatar_emoji, demographics, psychographics,
        pain_points, motivations, buying_triggers, objections, preferred_platforms,
        content_preferences, online_behavior, keywords, is_primary, is_ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, domainId, p.name, p.avatarEmoji || '👤',
        JSON.stringify(p.demographics || {}), JSON.stringify(p.psychographics || {}),
        JSON.stringify(p.painPoints || []), JSON.stringify(p.motivations || []),
        JSON.stringify(p.buyingTriggers || []), JSON.stringify(p.objections || []),
        JSON.stringify(p.preferredPlatforms || []), JSON.stringify(p.contentPreferences || {}),
        JSON.stringify(p.onlineBehavior || {}), JSON.stringify(p.keywords || []),
        p.isPrimary ? 1 : 0]
    );
    stored.push({ id, ...p });
  }
  saveDb();
  return stored;
}

export function getPersonas(domainId) {
  const rows = queryAll('SELECT * FROM personas WHERE domain_id = ? ORDER BY is_primary DESC, created_at', [domainId]);
  return rows.map(parsePersonaRow);
}

export function updatePersona(id, updates) {
  const fields = [];
  const values = [];
  const jsonFields = {
    demographics: 'demographics', psychographics: 'psychographics',
    painPoints: 'pain_points', motivations: 'motivations',
    buyingTriggers: 'buying_triggers', objections: 'objections',
    preferredPlatforms: 'preferred_platforms', contentPreferences: 'content_preferences',
    onlineBehavior: 'online_behavior', keywords: 'keywords'
  };
  const simpleFields = { name: 'name', avatarEmoji: 'avatar_emoji' };

  for (const [key, col] of Object.entries(simpleFields)) {
    if (updates[key] !== undefined) { fields.push(`${col} = ?`); values.push(updates[key]); }
  }
  for (const [key, col] of Object.entries(jsonFields)) {
    if (updates[key] !== undefined) { fields.push(`${col} = ?`); values.push(JSON.stringify(updates[key])); }
  }
  if (updates.isPrimary !== undefined) { fields.push('is_primary = ?'); values.push(updates.isPrimary ? 1 : 0); }

  if (fields.length === 0) return getPersonaById(id);
  fields.push("is_ai_generated = 0"); // Mark as user-edited
  fields.push("updated_at = datetime('now')");
  values.push(id);
  execute(`UPDATE personas SET ${fields.join(', ')} WHERE id = ?`, values);
  return getPersonaById(id);
}

function getPersonaById(id) {
  const row = queryOne('SELECT * FROM personas WHERE id = ?', [id]);
  return row ? parsePersonaRow(row) : null;
}

export function deletePersona(id) {
  execute('DELETE FROM personas WHERE id = ?', [id]);
}

function parsePersonaRow(row) {
  return {
    id: row.id,
    domain_id: row.domain_id,
    name: row.name,
    avatar_emoji: row.avatar_emoji,
    demographics: safeJsonParse(row.demographics, {}),
    psychographics: safeJsonParse(row.psychographics, {}),
    pain_points: safeJsonParse(row.pain_points, []),
    motivations: safeJsonParse(row.motivations, []),
    buying_triggers: safeJsonParse(row.buying_triggers, []),
    objections: safeJsonParse(row.objections, []),
    preferred_platforms: safeJsonParse(row.preferred_platforms, []),
    content_preferences: safeJsonParse(row.content_preferences, {}),
    online_behavior: safeJsonParse(row.online_behavior, {}),
    keywords: safeJsonParse(row.keywords, []),
    is_primary: !!row.is_primary,
    is_ai_generated: !!row.is_ai_generated,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function safeJsonParse(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}
