const BANKS = {
  foundations: [
    { id: 'q1', question: 'What is a prompt?', options: ['A clear instruction or question given to an AI tool', 'A computer screen', 'A password', 'A type of battery'], answer: 0, explanation: 'A prompt tells an AI what you want it to do. Clear details often lead to a more useful response.' },
    { id: 'q2', question: 'Which statement about AI output is safest?', options: ['It is always correct', 'It should be checked because it can make mistakes', 'It cannot use words', 'It replaces every teacher'], answer: 1, explanation: 'AI can produce inaccurate or incomplete information. Check important claims against trusted sources.' },
    { id: 'q3', question: 'What does HTML mainly describe?', options: ['The structure and meaning of webpage content', 'The internet connection speed', 'A computer mouse', 'Only the color of text'], answer: 0, explanation: 'HTML uses elements to give webpage content structure, such as headings, paragraphs, and links.' },
    { id: 'q4', question: 'What is CSS commonly used for?', options: ['Styling a webpage', 'Storing passwords', 'Sending email', 'Charging a laptop'], answer: 0, explanation: 'CSS controls presentation such as color, spacing, layout, and typography.' },
    { id: 'q5', question: 'What does a web browser do?', options: ['Displays and runs webpages', 'Builds computer hardware', 'Prints every website', 'Creates electricity'], answer: 0, explanation: 'A browser requests web resources and displays the resulting page to the user.' },
    { id: 'q6', question: 'Which is a useful way to improve an AI answer?', options: ['Give a specific prompt and review the result', 'Hide the question', 'Assume the first answer is perfect', 'Use no context'], answer: 0, explanation: 'Specific context helps the tool respond to your goal, and review helps catch errors.' },
    { id: 'q7', question: 'What is JavaScript often used to add?', options: ['Interactive behavior to webpages', 'More paper to a book', 'A physical keyboard', 'A stronger Wi-Fi signal'], answer: 0, explanation: 'JavaScript can respond to actions and update content in a webpage.' },
    { id: 'q8', question: 'What should you do before sharing private information with an AI tool?', options: ['Check the rules and avoid sharing sensitive details', 'Share everything', 'Post it publicly first', 'Use a friend’s password'], answer: 0, explanation: 'Protect personal information and follow the tool and school rules before entering data.' }
  ],
  advanced: [
    { id: 'q1', question: 'Why should generated code be reviewed before use?', options: ['It may contain bugs, security issues, or unsuitable assumptions', 'Generated code is always encrypted', 'Review slows all computers', 'Code cannot be tested'], answer: 0, explanation: 'Models can produce plausible but incorrect code. Review and tests help verify behavior, security, and fit.' },
    { id: 'q2', question: 'What is an effective way to compare two AI tools?', options: ['Use the same task and criteria, then verify claims', 'Choose the tool with the shortest name', 'Trust whichever answers first', 'Compare only their colors'], answer: 0, explanation: 'A consistent task and explicit criteria make comparison more meaningful. Independently verify factual claims.' },
    { id: 'q3', question: 'What is the main role of semantic HTML?', options: ['Communicate document structure and meaning', 'Encrypt database rows', 'Replace all CSS', 'Run server processes'], answer: 0, explanation: 'Semantic elements describe the purpose of content and support accessibility and maintainability.' },
    { id: 'q4', question: 'Why validate data on the server even when the browser validates it?', options: ['Clients can bypass browser checks', 'The server cannot receive text', 'CSS requires it', 'It makes passwords public'], answer: 0, explanation: 'Client checks improve usability but are under user control. Server validation is necessary for trustworthy data handling.' },
    { id: 'q5', question: 'What does a parameterized SQL query help prevent?', options: ['SQL injection through user input', 'Slow typing', 'All network outages', 'CSS conflicts'], answer: 0, explanation: 'Binding values separately from SQL syntax helps prevent input from being interpreted as executable SQL.' },
    { id: 'q6', question: 'What is a useful purpose of an automated test?', options: ['Check expected behavior repeatedly after changes', 'Prove software has no possible bugs', 'Replace code review in every case', 'Make a site accessible automatically'], answer: 0, explanation: 'Tests catch regressions for defined cases, but they do not prove the absence of all defects.' },
    { id: 'q7', question: 'Which design choice most directly improves keyboard accessibility?', options: ['Visible focus styles and logical tab order', 'Removing all labels', 'Using color alone for meaning', 'Disabling keyboard input'], answer: 0, explanation: 'A visible focus indicator and predictable order help keyboard users understand and move through controls.' },
    { id: 'q8', question: 'When an AI answer includes a factual claim, what is a sound next step?', options: ['Check it against reliable sources or a reproducible test', 'Repeat it without checking', 'Assume confidence means correctness', 'Remove all context'], answer: 0, explanation: 'Fluent wording is not proof. Verify facts against trustworthy sources or test the claim directly.' }
  ]
};

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const trim = value => typeof value === 'string' ? value.trim() : '';
const textFields = ['q1_what_each_ai_does', 'q2_ai_comparison', 'q3_web_dev_progress', 'q4_daily_life_help', 'q5_real_world_examples', 'q7_biggest_challenge'];

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function onRequestPost(context) {
  if (!await requireGoogleIdentity(context.request, context.env)) return json({ success: false, message: 'Sign in with Google to submit your reflection.' }, 401);
  let body;
  try { body = await context.request.json(); } catch { return json({ success: false, errors: { body: 'Request body must be valid JSON.' } }, 400); }
  const errors = {};
  const studentId = trim(body.student_id);
  if (!studentId || !/^[a-z0-9-]+$/i.test(studentId)) errors.student_id = 'Enter a non-empty ID using letters, numbers, and hyphens only.';
  if (trim(body.student_name).length < 2) errors.student_name = 'Enter a name with at least 2 characters.';
  if (!['foundations', 'advanced'].includes(body.survey_level)) errors.survey_level = 'Choose foundations or advanced.';
  if (!trim(body.module_or_week)) errors.module_or_week = 'Enter a module or week.';
  for (const field of ['ai_tools_used', 'web_dev_skills_used']) if (!Array.isArray(body[field]) || body[field].length < 1 || body[field].some(item => typeof item !== 'string' || !item.trim())) errors[field] = 'Select at least one valid option.';
  for (const field of textFields) {
    const value = trim(body[field]);
    const min = field === 'q5_real_world_examples' ? 25 : field === 'q7_biggest_challenge' ? 5 : 20;
    if (value.length < min) errors[field] = `Enter at least ${min} characters.`;
  }
  if (!Number.isInteger(body.q6_confidence_rating) || body.q6_confidence_rating < 1 || body.q6_confidence_rating > 5) errors.q6_confidence_rating = 'Choose a confidence rating from 1 to 5.';
  const bank = BANKS[body.survey_level];
  if (!body.quiz_answers || typeof body.quiz_answers !== 'object' || Array.isArray(body.quiz_answers)) errors.quiz_answers = 'Answer all 8 questions.';
  else for (let i = 1; i <= 8; i++) if (!Number.isInteger(body.quiz_answers[`q${i}`]) || body.quiz_answers[`q${i}`] < 0 || body.quiz_answers[`q${i}`] > 3) errors.quiz_answers = 'Answer all 8 questions using a listed option.';
  if (Object.keys(errors).length) return json({ success: false, errors }, 400);

  const questionBreakdown = bank.map(question => {
    const selected = body.quiz_answers[question.id];
    return { id: question.id, question: question.question, userAnswer: question.options[selected], correctAnswer: question.options[question.answer], isCorrect: selected === question.answer, explanation: question.explanation };
  });
  const quizScore = questionBreakdown.filter(item => item.isCorrect).length;
  const q5 = trim(body.q5_real_world_examples);
  const reflectionLength = ['q1_what_each_ai_does', 'q2_ai_comparison', 'q3_web_dev_progress', 'q4_daily_life_help'].reduce((sum, key) => sum + trim(body[key]).length, 0);
  const xp = 50 + quizScore * 20 + (q5.length >= 120 ? 30 : 0) + (reflectionLength > 400 ? 20 : 0);
  const milestones = ['Survey Completed'];
  if (quizScore >= 7) milestones.push('Quiz Mastery');
  if (quizScore === 8) milestones.push('Perfect Score');
  if (q5.length >= 120) milestones.push('Detailed Practitioner');
  if (body.ai_tools_used.length >= 3) milestones.push('Multi-Tool Explorer');
  if (body.web_dev_skills_used.length >= 3) milestones.push('Full-Stack Builder');

  try {
    const result = await context.env.DB.prepare(`INSERT INTO survey_responses (student_id, student_name, survey_level, module_or_week, ai_tools_used, q1_what_each_ai_does, q2_ai_comparison, web_dev_skills_used, q3_web_dev_progress, q4_daily_life_help, q5_real_world_examples, q6_confidence_rating, q7_biggest_challenge, quiz_score, quiz_total, xp_earned, milestones_json, quiz_details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(studentId.toUpperCase(), trim(body.student_name), body.survey_level, trim(body.module_or_week), JSON.stringify(body.ai_tools_used.map(item => item.trim())), trim(body.q1_what_each_ai_does), trim(body.q2_ai_comparison), JSON.stringify(body.web_dev_skills_used.map(item => item.trim())), trim(body.q3_web_dev_progress), trim(body.q4_daily_life_help), q5, body.q6_confidence_rating, trim(body.q7_biggest_challenge), quizScore, 8, xp, JSON.stringify(milestones), JSON.stringify(questionBreakdown)).run();
    return json({ success: true, submission_id: result.meta.last_row_id, quiz_score: quizScore, quiz_total: 8, xp_earned: xp, milestones, question_breakdown: questionBreakdown }, 201);
  } catch (error) {
    return json({ success: false, message: 'Unable to save this submission.', detail: context.env.ENVIRONMENT === 'development' ? String(error.message || error) : undefined }, 500);
  }
}
import { requireGoogleIdentity } from '../_shared/google-auth.js';
