const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const parseArray = value => { try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; } };

export async function onRequestGet(context) {
  if (!await requireGoogleIdentity(context.request, context.env)) return json({ success: false, message: 'Sign in with Google to access the educator portal.' }, 401);
  const secret = context.env.ADMIN_SECRET;
  if (!secret || context.request.headers.get('Authorization') !== `Bearer ${secret}`) return json({ success: false, message: 'Unauthorized access.' }, 401);
  const url = new URL(context.request.url);
  const allowed = { survey_level: ['foundations', 'advanced'], module_or_week: null, student_id: null, from: null, to: null };
  const where = [];
  const values = [];
  for (const [field, choices] of Object.entries(allowed)) {
    const value = (url.searchParams.get(field) || '').trim();
    if (!value) continue;
    if (choices && !choices.includes(value)) return json({ success: false, message: `Invalid ${field} filter.` }, 400);
    if (field === 'from' || field === 'to') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return json({ success: false, message: `Invalid ${field} date. Use YYYY-MM-DD.` }, 400);
      where.push(`date(submitted_at) ${field === 'from' ? '>=' : '<='} date(?)`);
    } else {
      where.push(`${field} = ?`);
    }
    values.push(field === 'student_id' ? value.toUpperCase() : value);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  try {
    const rowsResult = await context.env.DB.prepare(`SELECT id, student_id, student_name, survey_level, module_or_week, ai_tools_used, web_dev_skills_used, q6_confidence_rating, quiz_score, quiz_total, xp_earned, milestones_json, submitted_at FROM survey_responses ${clause} ORDER BY submitted_at DESC`).bind(...values).all();
    const aggregate = await context.env.DB.prepare(`SELECT COUNT(*) AS total_submissions, COUNT(DISTINCT student_id) AS unique_students, SUM(xp_earned) AS total_xp, AVG(100.0 * quiz_score / NULLIF(quiz_total, 0)) AS average_quiz_percentage, AVG(q6_confidence_rating) AS average_confidence FROM survey_responses ${clause}`).bind(...values).first();
    const levels = await context.env.DB.prepare(`SELECT survey_level, COUNT(*) AS submissions, COUNT(DISTINCT student_id) AS students, AVG(100.0 * quiz_score / NULLIF(quiz_total, 0)) AS average_quiz_percentage, AVG(q6_confidence_rating) AS average_confidence FROM survey_responses ${clause} GROUP BY survey_level`).bind(...values).all();
    const modules = await context.env.DB.prepare(`SELECT module_or_week, COUNT(*) AS submissions, AVG(xp_earned) AS average_xp, AVG(100.0 * quiz_score / NULLIF(quiz_total, 0)) AS average_quiz_percentage FROM survey_responses ${clause} GROUP BY module_or_week ORDER BY module_or_week`).bind(...values).all();
    return json({ success: true, filters: { survey_level: url.searchParams.get('survey_level') || null, module_or_week: url.searchParams.get('module_or_week') || null, student_id: url.searchParams.get('student_id') || null, from: url.searchParams.get('from') || null, to: url.searchParams.get('to') || null }, aggregate, by_level: levels.results || [], by_module: modules.results || [], submissions: (rowsResult.results || []).map(row => ({ ...row, ai_tools_used: parseArray(row.ai_tools_used), web_dev_skills_used: parseArray(row.web_dev_skills_used), milestones: parseArray(row.milestones_json) })) });
  } catch {
    return json({ success: false, message: 'Unable to load dashboard analytics.' }, 500);
  }
}
import { requireGoogleIdentity } from '../../_shared/google-auth.js';
