const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const parse = value => { try { return JSON.parse(value); } catch { return []; } };

export async function onRequestGet(context) {
  if (!await requireGoogleIdentity(context.request, context.env)) return json({ success: false, message: 'Sign in with Google to view student progress.' }, 401);
  const id = String(context.params.id || '').trim().toUpperCase();
  if (!id || !/^[A-Z0-9-]+$/.test(id)) return json({ success: false, message: 'A valid Student ID is required.' }, 400);
  try {
    const { results = [] } = await context.env.DB.prepare('SELECT * FROM survey_responses WHERE student_id = ? ORDER BY submitted_at ASC').bind(id).all();
    if (!results.length) return json({ success: false, message: 'No survey submissions found for this Student ID.' }, 404);
    const latest = results[results.length - 1];
    const totalXp = results.reduce((sum, row) => sum + Number(row.xp_earned || 0), 0);
    const tiers = [{ min: 0, name: 'Tier 1: Foundations', next: 200 }, { min: 200, name: 'Tier 2: Practitioner', next: 450 }, { min: 450, name: 'Tier 3: Builder', next: 750 }, { min: 750, name: 'Tier 4: Architect', next: null }];
    const tier = [...tiers].reverse().find(item => totalXp >= item.min);
    const averageQuiz = results.reduce((sum, row) => sum + (Number(row.quiz_total) ? Number(row.quiz_score) / Number(row.quiz_total) * 100 : 0), 0) / results.length;
    const milestones = [...new Set(results.flatMap(row => parse(row.milestones_json)))];
    const history = results.map(row => ({ ...row, ai_tools_used: parse(row.ai_tools_used), web_dev_skills_used: parse(row.web_dev_skills_used), milestones: parse(row.milestones_json), quiz_details: parse(row.quiz_details_json) }));
    return json({ success: true, student_name: latest.student_name, total_submissions: results.length, total_xp: totalXp, skill_tier: tier.name, next_tier_xp: tier.next, average_quiz_percentage: Math.round(averageQuiz * 10) / 10, latest_confidence: latest.q6_confidence_rating, all_unlocked_milestones: milestones, history });
  } catch {
    return json({ success: false, message: 'Unable to load student analytics.' }, 500);
  }
}
import { requireGoogleIdentity } from '../../_shared/google-auth.js';
