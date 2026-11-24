(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { quiz: [], adminRows: [], chart: null, chartHistory: [], lastSubmission: null, gameLevel: 'foundations', calendarDate: new Date(), profileId: 'guest', gameData: {}, dailyOffset: 0 };
  let googleClientId = '';
  const banks = {
    foundations: [
      { id: 'q1', question: 'What is a prompt?', options: ['A clear instruction or question given to an AI tool', 'A computer screen', 'A password', 'A type of battery'] },
      { id: 'q2', question: 'Which statement about AI output is safest?', options: ['It is always correct', 'It should be checked because it can make mistakes', 'It cannot use words', 'It replaces every teacher'] },
      { id: 'q3', question: 'What does HTML mainly describe?', options: ['The structure and meaning of webpage content', 'The internet connection speed', 'A computer mouse', 'Only the color of text'] },
      { id: 'q4', question: 'What is CSS commonly used for?', options: ['Styling a webpage', 'Storing passwords', 'Sending email', 'Charging a laptop'] },
      { id: 'q5', question: 'What does a web browser do?', options: ['Displays and runs webpages', 'Builds computer hardware', 'Prints every website', 'Creates electricity'] },
      { id: 'q6', question: 'Which is a useful way to improve an AI answer?', options: ['Give a specific prompt and review the result', 'Hide the question', 'Assume the first answer is perfect', 'Use no context'] },
      { id: 'q7', question: 'What is JavaScript often used to add?', options: ['Interactive behavior to webpages', 'More paper to a book', 'A physical keyboard', 'A stronger Wi-Fi signal'] },
      { id: 'q8', question: 'What should you do before sharing private information with an AI tool?', options: ['Check the rules and avoid sharing sensitive details', 'Share everything', 'Post it publicly first', 'Use a friend’s password'] }
    ],
    advanced: [
      { id: 'q1', question: 'Why should generated code be reviewed before use?', options: ['It may contain bugs, security issues, or unsuitable assumptions', 'Generated code is always encrypted', 'Review slows all computers', 'Code cannot be tested'] },
      { id: 'q2', question: 'What is an effective way to compare two AI tools?', options: ['Use the same task and criteria, then verify claims', 'Choose the tool with the shortest name', 'Trust whichever answers first', 'Compare only their colors'] },
      { id: 'q3', question: 'What is the main role of semantic HTML?', options: ['Communicate document structure and meaning', 'Encrypt database rows', 'Replace all CSS', 'Run server processes'] },
      { id: 'q4', question: 'Why validate data on the server even when the browser validates it?', options: ['Clients can bypass browser checks', 'The server cannot receive text', 'CSS requires it', 'It makes passwords public'] },
      { id: 'q5', question: 'What does a parameterized SQL query help prevent?', options: ['SQL injection through user input', 'Slow typing', 'All network outages', 'CSS conflicts'] },
      { id: 'q6', question: 'What is a useful purpose of an automated test?', options: ['Check expected behavior repeatedly after changes', 'Prove software has no possible bugs', 'Replace code review in every case', 'Make a site accessible automatically'] },
      { id: 'q7', question: 'Which design choice most directly improves keyboard accessibility?', options: ['Visible focus styles and logical tab order', 'Removing all labels', 'Using color alone for meaning', 'Disabling keyboard input'] },
      { id: 'q8', question: 'When an AI answer includes a factual claim, what is a sound next step?', options: ['Check it against reliable sources or a reproducible test', 'Repeat it without checking', 'Assume confidence means correctness', 'Remove all context'] }
    ]
  };
  const copy = {
    foundations: {
      description: 'Foundations uses clear prompts and guided reflection. Choose this track if you are learning the core ideas.',
      labels: ['What does each AI tool you tried do?', 'How is an AI tool different from another source of information?', 'What progress have you made in web development?', 'How could AI help with a task in daily life?', 'Describe a real-world problem a website could help solve.', 'What was your biggest challenge?'],
      hints: ['Describe one useful task for each tool.', 'Explain what you noticed when comparing them.', 'Name a skill you practiced and what changed.', 'Think of a practical task and how you would check the result.', 'Who would use it, and what would the website help them do?', 'A small detail is useful too.'],
      quiz: 'Choose the best answer for each question. You will see explanations after you submit.'
    },
    advanced: {
      description: 'Advanced uses deeper analysis and independent practice. Reflect on tradeoffs, evidence, and how you validate your work.',
      labels: ['How did each AI tool contribute to your workflow, and where did it fall short?', 'Compare an AI tool with another information source. How did you evaluate reliability?', 'What web development skill did you apply, and what technical decision shaped the result?', 'Describe a daily-life use for AI, including a risk or limitation you would manage.', 'Analyze a real-world problem a website could address. Who benefits, and what data or access needs care?', 'What was your biggest technical or conceptual challenge?'],
      hints: ['Compare roles, strengths, and a limitation you noticed.', 'Mention a check or source you used to assess its answer.', 'Explain the outcome and one decision behind your approach.', 'Include a way to verify results or keep a person in control.', 'Consider users, constraints, privacy, and a measurable benefit.', 'Explain what made it difficult and what you tried next.'],
      quiz: 'Choose the strongest answer for each question. Explanations will appear after server-side grading.'
    }
  };

  const gameBanks = {
    foundations: {
      prompt: { question: 'Which prompt gives the clearest directions?', options: ['Tell me about animals.', 'Write a concise project brief about sustainable packaging for a cross-functional team. Include the goal and three clear requirements.', 'Do something interesting.', 'Make it good.'], answer: 1, success: 'Great prompts say what you need and who it is for.' },
      tag: { question: 'Build a simple webpage in the right order.', pieces: ['A heading that says “My Project”', 'A paragraph explaining the project', 'A page structure that holds both'], answer: [2, 0, 1], success: 'Nice build. A page structure holds its content, like a heading and paragraph.' },
      bug: { question: 'An AI suggests a surprising fact for your homework. What is the best next move?', options: ['Copy it right away.', 'Check it with a trusted source before using it.', 'Add more exciting words.', 'Assume it is correct because it sounds sure.'], answer: 1, success: 'Good detective work. AI can make mistakes, so check important facts.' },
      color: { question: 'Which CSS line changes the heading text to purple?', options: ['color: #7c3aed;', 'background-color: #7c3aed;', 'font-color: #7c3aed;', 'color = "#7c3aed";'], answer: 0, success: 'You got it. The CSS color property changes text color.' }
    },
    advanced: {
      prompt: { question: 'Which prompt gives the most useful constraints?', options: ['Explain databases.', 'Compare SQLite and a hosted database for a small school project. Give two tradeoffs and cite verifiable documentation.', 'Write the best answer.', 'Make something technical.'], answer: 1, success: 'Strong prompts define the task, audience, scope, and evidence standard.' },
      tag: { question: 'Order these interface pieces for a clear semantic page.', pieces: ['A labelled form for project details', 'A main region for the page content', 'A heading that names the page'], answer: [1, 2, 0], success: 'Correct structure. Put content in the main region, give it a heading, then organize the form.' },
      bug: { question: 'A code assistant generated a database query using string concatenation. What should you do?', options: ['Ship it because it compiled.', 'Replace user input with a parameterized query and test it.', 'Hide the form.', 'Rename the database.'], answer: 1, success: 'Exactly. Parameterized queries keep user data separate from SQL commands.' },
      color: { question: 'Which CSS pair gives dark text strong contrast on a pale yellow card?', options: ['color: #242424; background-color: #fff3c4;', 'color: #f7e8b1; background-color: #fff3c4;', 'font-color: #242424; background: #fff3c4;', 'color = #242424; background-color: #fff3c4;'], answer: 0, success: 'Good choice. Dark text on a pale background is easier to read. Always check contrast for the final colors.' }
    }
  };
  const difficultyCopy = {
    foundations: { name: 'Beginner mode', description: 'Start with friendly steps and clear hints. You can change this any time.' },
    intermediate: { name: 'Intermediate mode', description: 'Connect ideas and solve a few trickier steps with less guidance.' },
    advanced: { name: 'Challenge mode', description: 'Tackle deeper decisions, tradeoffs, and more complex code ideas.' }
  };
  const intermediateBank = {
    prompt: { question: 'Which prompt gives an AI enough context and a clear result to produce?', options: ['Help with science.', 'Create a 5-step study plan for a 7th grader preparing for a planets quiz. Keep each step under 10 minutes.', 'Write anything about planets.', 'Make a study plan.'], answer: 1, success: 'Good prompt design includes the learner, the goal, and useful limits.' },
    tag: { question: 'Put these semantic page pieces in a sensible order.', pieces: ['A labelled email field and submit button', 'A main region containing the page content', 'A heading that explains the form’s purpose'], answer: [1, 2, 0], success: 'A clear page gives its main content a heading before presenting the form.' },
    bug: { question: 'A teammate says their page works, but keyboard users cannot reach the submit button. What should you check first?', options: ['The button’s background color only.', 'Whether the button is a real button in the tab order and has a visible focus style.', 'Whether the page has more animations.', 'Whether the button text is longer.'], answer: 1, success: 'Keyboard users need controls in the tab order and a visible focus indicator.' },
    color: { question: 'A card uses a pale background. Which text color is the strongest readable choice?', options: ['A very pale yellow close to the background.', 'A dark color with strong contrast, verified with a contrast checker.', 'The same color as the background.', 'A color selected only because it looks bright.'], answer: 1, success: 'Contrast matters more than brightness. Check the actual color pair against accessibility guidance.' }
  };

  const creatorQuest = [
    {
      title: 'Give your idea a strong structure', theme: 'HTML · the meaning of a page',
      goal: 'Plan a tiny website and arrange its content so people and browsers can understand it.',
      learn: [
        'A website starts with a purpose. Pick one person you want to help and one thing they should be able to do. A portfolio page might help a prospective client understand what you offer and how to contact you.',
        'HTML gives content meaning. A heading names a section, a paragraph explains it, a list groups steps, and a button performs an action. These pieces are like labeled blocks in a kit: the labels tell the browser and assistive technology how each piece should work.',
        'A useful outline has one main heading, a few sections, and a clear next step. Put the most important information first. Use headings in order so someone can scan the page without reading every word.'
      ],
      activity: ['Write a one-sentence purpose: “My page helps ___ do ___.”', 'Sketch a title, two sections, and one action button on paper.', 'Write the heading and paragraph text before choosing colors or decorations.'],
      stretch: 'Add a navigation list with links to the two sections. Give every link words that explain where it goes.',
      question: 'Which element is the best choice for the page’s main heading?', options: ['<h1>Neighborhood Garden</h1>', '<span style="font-size:32px">Neighborhood Garden</span>', '<div>Neighborhood Garden</div>'], answer: 0,
      explain: 'An h1 tells browsers and screen readers that this is the page’s main heading.'
    },
    {
      title: 'Paint with readable colors', theme: 'CSS · color, spacing, and layout',
      goal: 'Use CSS rules to make your page clear, welcoming, and comfortable to read.',
      learn: [
        'CSS changes how HTML looks. A rule has a selector and declarations: `.card { background-color: white; }`. The selector chooses a piece of the page; each declaration names a property and a value.',
        'Build a small design system instead of picking every color separately. Choose one page background, one surface color, one text color, and one accent. Reuse spacing steps such as 8, 16, and 24 pixels so the page feels connected.',
        'Color is information, but it should never be the only information. Pair a red warning color with a word like “Check.” For readable text, use strong contrast between text and background. Large bright text can still be hard to read if its colors are too similar.'
      ],
      activity: ['Choose four colors and label what each one does.', 'Style your title, body text, and one card using CSS classes.', 'Compare the text and background at normal size. If it feels faint, darken the text or lighten the background.'],
      stretch: 'Add a visible keyboard focus style with `:focus-visible` so the active button is easy to find.',
      question: 'What is the safest way to communicate that a form needs attention?', options: ['Turn the label red and add “Required” text beside it.', 'Make the label red, with no other clue.', 'Make the page flash red.'], answer: 0,
      explain: 'Color plus clear text makes the meaning understandable to more people.'
    },
    {
      title: 'Make your page respond', theme: 'JavaScript · actions and state',
      goal: 'Connect a button to a useful action and give the page a small memory.',
      learn: [
        'JavaScript lets a page react. A click handler listens for an action and runs a function: `button.addEventListener("click", handleClick)`. Keep the function name clear so another person can tell what the button does.',
        'State is the information your page needs to remember right now. A checklist might store which steps are finished. When state changes, update the page so its words and controls show the new result.',
        'Make cause and effect obvious. After someone saves a note, show “Saved.” If an action takes time, show “Saving…” and prevent accidental double clicks. If something goes wrong, explain the next step in plain language.'
      ],
      activity: ['Add a button labeled “Show a garden tip.”', 'Write one tip in a variable, then show it in a message area when the button is clicked.', 'Click it with a mouse and keyboard. Make sure the message appears both times.'],
      stretch: 'Add a second button that cycles through three tips. Keep the current tip number in a variable.',
      question: 'What should a click handler do after a user saves a note?', options: ['Show a clear saved message and update the page.', 'Do nothing so the page stays quiet.', 'Hide every button.'], answer: 0,
      explain: 'Helpful feedback confirms the action and tells the user what happened.'
    },
    {
      title: 'Design for every visitor', theme: 'Accessibility · keyboard and small screens',
      goal: 'Make your project work for people using different devices and ways of interacting.',
      learn: [
        'Accessible pages give controls names, support the keyboard, and use meaningful structure. A real `<button>` can be reached and activated with a keyboard. A clickable `<div>` usually cannot, so choose elements based on their job.',
        'Every input needs a label. Helpful error messages say what went wrong and how to fix it. Keep focus visible so keyboard users know where they are. Do not move focus unexpectedly while someone is reading.',
        'Responsive design adapts to the space available. Start with a single column that works on a phone, then add columns when there is room. Use flexible widths, readable line lengths, and buttons large enough to tap.'
      ],
      activity: ['Tab through your page without using a mouse.', 'Check that each button and input has a clear name.', 'Shrink the browser width. Make sure text stays readable and no control is cut off.'],
      stretch: 'Add a “Skip to main content” link and test it using only the keyboard.',
      question: 'What is the best first check for a page that must work without a mouse?', options: ['Use Tab and Enter to reach and activate every control.', 'Check whether the pointer changes shape.', 'Make every button a picture.'], answer: 0,
      explain: 'Keyboard-only use quickly reveals missing focus, inaccessible controls, and confusing order.'
    },
    {
      title: 'Use AI with care', theme: 'AI literacy · prompts, checks, and privacy',
      goal: 'Ask an AI for useful help, check its work, and keep personal information safe.',
      learn: [
        'A strong prompt explains the goal, audience, context, and shape of the answer. “Give me three concise headline options for a service page aimed at first-time clients” is easier to answer than “Write something good.” Add limits when they matter.',
        'AI can sound confident and still be wrong. Treat generated text and code as a first draft. Check factual claims with reliable sources. Run code in a safe place, read what it does, and ask a qualified reviewer when the stakes are high.',
        'Do not paste passwords, addresses, private messages, school records, or other people’s personal details into an AI tool. Follow the rules for the tool you are using. Keep your own voice in the final project and explain what AI helped with.'
      ],
      activity: ['Write a prompt that asks for a concise, sourced explanation of a local issue for a community briefing.', 'Underline the audience, task, and format in your prompt.', 'Check the answer in a trusted source and rewrite it in your own words.'],
      stretch: 'Ask an AI to critique your page for clarity, then decide which suggestion is useful and explain why.',
      question: 'An AI gives you a surprising fact for your page. What should you do?', options: ['Verify it with a reliable source before sharing it.', 'Share it because the answer sounds certain.', 'Add more exciting words and publish it.'], answer: 0,
      explain: 'Verification is part of using AI responsibly; confidence is not proof.'
    },
    {
      title: 'Test, improve, and share', theme: 'Iteration · quality and publishing',
      goal: 'Find small problems, make a final improvement, and prepare a project for others.',
      learn: [
        'A first version is a starting point. Test the page the way a visitor will: read the headings, click each control, try an empty form, resize the window, and check keyboard access. Write down what happened instead of guessing.',
        'Fix one issue at a time. Reproduce it, change the smallest part that solves it, and test again. Ask a colleague to try the page without instructions; notice where they pause. Their questions show where the design can be clearer.',
        'Before sharing, remove private details and check that images and text are yours to use. A public link lets other people visit the page. A source-code repository lets them inspect how it was built. Review privacy, permissions, and required disclosures before publishing work data.'
      ],
      activity: ['Make a three-step test checklist: phone size, keyboard, and every button.', 'Ask someone to try one task and note where they hesitate.', 'Choose one improvement, make it, and repeat the test.'],
      stretch: 'Write a short README with the project purpose, how to run it, and what you learned.',
      question: 'What is a strong final check before sharing your site?', options: ['Test the main task on a small screen and with a keyboard, then remove private details.', 'Publish first and check later.', 'Ask only whether the colors look cool.'], answer: 0,
      explain: 'A quick test and privacy check catch common problems before visitors find them.'
    }
  ];

  const dailyAiLessons = [
    { title: 'AI is a tool, not a person', focus: 'Notice what AI can do and where human judgment matters.', learn: 'Artificial intelligence is a broad name for computer systems that do tasks people connect with abilities like recognizing patterns, using language, or making predictions. A system can produce a friendly answer without having feelings or life experience. Ask what a tool is designed to do, what information it uses, and when a person should check its work.', try: 'Choose one app you used today. Guess whether AI helps with its search, recommendations, photos, or voice features. Then look for a clue in the app settings or help page.', question: 'A chatbot writes “I feel excited.” What is the safest interpretation?', options: ['It is using a phrase; that does not prove it has feelings.', 'It must be happy because it said so.', 'It knows everything about being human.'], answer: 0, explain: 'Language can sound human even when a system is generating patterns in text.' },
    { title: 'How examples teach a model', focus: 'Explore training examples, labels, and practice data.', learn: 'Many AI systems learn patterns from examples. If a model sees pictures labeled “cat” and “dog,” it adjusts its internal settings so it can guess labels for new pictures. The examples are called training data. If examples are confusing or leave out important cases, the model may make unreliable guesses.', try: 'Invent a tiny classifier for fruit. Write three examples for each label, then add an unusual fruit and decide whether your labels still work.', question: 'What is training data?', options: ['Examples used to help a model learn patterns.', 'A list of passwords for an AI.', 'A guarantee that an answer is correct.'], answer: 0, explain: 'Training data provides examples; it does not guarantee perfect results.' },
    { title: 'Patterns are not the same as understanding', focus: 'Learn why a fluent answer can still miss the point.', learn: 'A language model learns relationships among pieces of text and predicts a likely next piece. That can make its writing useful and natural. It can also produce a polished answer that is incomplete, mixed up, or unsupported. A smooth explanation is a reason to inspect the evidence, not a reason to skip checking.', try: 'Ask a friend to write a two-sentence explanation of a familiar game. Compare it with an AI explanation and mark one detail that needs a source.', question: 'Why check a confident AI answer?', options: ['The system can generate plausible text without verifying every claim.', 'Confidence means the answer is always true.', 'Only long answers can contain mistakes.'], answer: 0, explain: 'Fluent language and factual accuracy are different things.' },
    { title: 'Build a useful prompt', focus: 'Give a clear task, audience, and format.', learn: 'A prompt is an instruction or question sent to an AI tool. Useful prompts include a goal, relevant context, who the answer is for, and the shape of the response. You can improve the answer by adding one specific constraint at a time, then checking whether it followed them.', try: 'Rewrite “Tell me about space” as a concise overview of Mars for a colleague new to the topic, with sources to verify key claims.', question: 'Which prompt gives the clearest task?', options: ['Make it interesting.', 'Summarize Mars in three clear bullet points for a reader new to astronomy, and include sources I can verify.', 'Write something about planets.'], answer: 1, explain: 'The second prompt names the topic, audience, amount, purpose, and verification need.' },
    { title: 'Data gaps change the result', focus: 'See how missing examples affect predictions.', learn: 'A model can only learn from the examples available to it. If a dataset represents some people, places, or situations much more than others, performance can differ across cases. A small dataset is especially likely to miss unusual but important examples. Ask who and what is missing before trusting a result.', try: 'Imagine teaching a map app about “busy roads” using only weekday mornings. Name one time or place your examples forgot.', question: 'What can happen when training examples leave out important cases?', options: ['The model may work less well for cases it rarely saw.', 'The model automatically fills every gap fairly.', 'Nothing changes because data never affects AI.'], answer: 0, explain: 'Coverage gaps can create uneven or unreliable results.' },
    { title: 'Categories are human choices', focus: 'Question labels and categories used by AI.', learn: 'People decide what labels mean and what counts as a useful answer. A category that seems simple may hide many different cases. For example, “good photo” could mean bright, in focus, meaningful, or something else. When labels are unclear, two people may tag the same example differently, and a model learns that inconsistency.', try: 'Pick a category like “healthy snack.” List two different meanings people might have, then write a clearer label.', question: 'Why should a team define its labels?', options: ['Clear labels help people make more consistent examples.', 'Labels do not affect what a model learns.', 'The computer decides what every category means.'], answer: 0, explain: 'Labels carry human decisions into the data and should be made explicit.' },
    { title: 'Check a surprising claim', focus: 'Use a simple verification routine.', learn: 'Generative AI can make up sources or details that sound believable. For facts that matter, find an independent, trustworthy source and open it yourself. Check the author, date, evidence, and whether another reliable source agrees. For professional work, follow organizational policy and disclose AI assistance where required.', try: 'Take one fact from an AI answer and write a three-step check: find the original source, compare a second source, and note what is still uncertain.', question: 'What is a strong way to verify an AI claim?', options: ['Open reliable sources and compare the evidence.', 'Ask the same chatbot to repeat itself.', 'Trust it if the sentence sounds professional.'], answer: 0, explain: 'Independent evidence is stronger than repeating the same unverified output.' },
    { title: 'Images can be synthetic', focus: 'Practice media literacy with generated pictures.', learn: 'Image tools can create new pictures from instructions and can also edit existing images. A realistic-looking picture is not proof that the pictured event happened. Look for the original source, context, date, and corroboration. Respect people’s images and get permission before using or sharing them.', try: 'Imagine seeing a surprising picture in a group chat. List three clues you would look for before sharing it.', question: 'A realistic image appears to show a breaking event. What should you do?', options: ['Check trusted reporting and the image’s source before sharing.', 'Assume it is real because it looks detailed.', 'Add a caption that makes the story more dramatic.'], answer: 0, explain: 'Realistic detail can be generated; source and context matter.' },
    { title: 'Recommendations shape what you see', focus: 'Notice how ranking systems influence a feed.', learn: 'Recommendation systems estimate what a person may want to watch, read, or buy. They may use signals like past clicks or viewing time. A recommendation is a prediction optimized for a goal chosen by the service; it is not a neutral list of everything important. You can seek other sources and change settings when available.', try: 'Compare the first three videos or songs suggested by two different profiles. What might the system be using as a clue?', question: 'What does a recommendation usually represent?', options: ['A system’s estimate based on signals and a chosen goal.', 'A complete, unbiased list of the best choices.', 'A guarantee you will enjoy it.'], answer: 0, explain: 'Recommendations reflect a model’s prediction and design choices.' },
    { title: 'AI can work with more than words', focus: 'Understand inputs like images, sound, and motion.', learn: 'Some AI systems process images, audio, video, or sensor readings, then produce labels, transcripts, or suggestions. They can confuse similar sounds, miss context in a photo, or perform differently in noisy conditions. Before using a result, consider what the system could actually observe and what it could not.', try: 'Pick a voice assistant or photo search. Name one thing it can detect and one detail it might not know from the input alone.', question: 'A photo classifier labels a beach picture. What might it miss?', options: ['Context such as why the photo was taken or whether the scene is safe.', 'The fact that it received an image.', 'Any possibility of uncertainty.'], answer: 0, explain: 'A system sees patterns in input, but may not know the full human context.' },
    { title: 'Keep private information private', focus: 'Choose safer ways to use AI tools.', learn: 'Anything typed or uploaded to a service may be processed under that service’s rules. Do not share passwords, home addresses, private messages, school records, or another person’s details. Check your organization’s data policy and the provider’s terms. When possible, use made-up examples instead of real personal data.', try: 'Rewrite a question that contains a real person’s name and private details using a fictional name and only the information needed.', question: 'What is a safer prompt for asking about a family schedule?', options: ['Use a made-up example with no names, addresses, or private details.', 'Paste everyone’s full schedule and home address.', 'Upload a friend’s private messages.'], answer: 0, explain: 'Removing personal details reduces unnecessary exposure.' },
    { title: 'A human should stay in the loop', focus: 'Decide when a person must review an AI suggestion.', learn: 'AI can help draft, sort, summarize, or suggest. People still need to check important choices, especially when health, safety, school opportunities, money, or someone’s reputation could be affected. Decide who is responsible, what evidence is required, and how to correct a mistake before relying on an automated result.', try: 'Choose one low-stakes job AI could help with and one high-stakes decision that should always get careful human review.', question: 'When should a person carefully review an AI suggestion?', options: ['Before it affects an important decision about someone.', 'Never; a computer is always more objective.', 'Only when the screen looks unusual.'], answer: 0, explain: 'Human review and a way to correct errors matter when consequences are significant.' },
    { title: 'AI can help creativity without replacing you', focus: 'Use suggestions while keeping your own voice.', learn: 'AI tools can brainstorm ideas, offer examples, or help you try a new style. Your choices still shape the result: what to ask, what to keep, what to change, and what to reject. Be honest about assistance when your school or project asks, and check whether images or text can be reused.', try: 'Use an AI-free brainstorm first. Then ask for three more ideas and combine one small suggestion with your own plan.', question: 'Who is responsible for the final project?', options: ['The person who reviews, edits, and chooses what to share.', 'The AI tool alone.', 'No one, because ideas do not matter.'], answer: 0, explain: 'People remain responsible for the choices they publish.' },
    { title: 'Design a helpful AI idea', focus: 'Start from a real need and think about impact.', learn: 'Good AI projects start with a real problem, not just a model. Ask who benefits, who could be left out, what data is needed, and what a non-AI solution might do better. Build a small prototype, test it with people, and give users a clear way to question or correct the result.', try: 'Sketch an AI helper for a community problem. Write who it helps, what it needs to know, and one way to keep a human in control.', question: 'What is a good first question for a new AI idea?', options: ['What real need are we solving, and who might be affected?', 'How can we collect the most personal data?', 'How can we hide how the system works?'], answer: 0, explain: 'Starting with people and impact helps keep a tool useful and responsible.' },
    { title: 'Review your AI learning', focus: 'Connect the ideas from the last two weeks.', learn: 'You have explored patterns, data, prompts, generated media, recommendations, privacy, and human review. These ideas connect: the input and labels shape a model; the model produces an estimate; a product decides how to use that estimate; a person decides whether the result is useful and safe.', try: 'Teach one concept to someone else in two sentences. Ask them to give an example, then correct one misconception together.', question: 'What is the best summary of responsible AI use?', options: ['Understand limits, protect people, verify important claims, and keep humans accountable.', 'Trust every result if it saves time.', 'Use AI for everything without telling anyone.'], answer: 0, explain: 'Responsible use combines understanding, checking, privacy, and accountability.' }
  ];

  const aiReadingShelf = [
    { title: 'AI and Me: Five Big Ideas', source: 'AI4K12 Initiative', minutes: '10–20 min', summary: 'This introductory course explains AI through five connected ideas: computers perceive information; represent the world; learn from data; interact with people; and affect society. It encourages learners to look inside AI systems and think about both technical limits and social impact.', takeaway: 'AI is not magic: ask what it senses, what it learned, and who its choices affect.', url: 'https://ai4k12.org/online-course-ai-and-me/' },
    { title: 'AI for Oceans', source: 'Code.org', minutes: '45 min', summary: 'In this hands-on lesson, learners train a classifier to separate ocean trash from sea life. By changing examples and labels, they see how training data influences a model and how a system can misclassify new cases.', takeaway: 'Models learn from examples, so missing or unbalanced examples can change their results.', url: 'https://studio.code.org/courses/oceans/units/1' },
    { title: 'Teachable Machine', source: 'Google', minutes: '10–15 min', summary: 'This browser activity lets learners create a simple image, sound, or pose classifier without writing code. Learners can add examples, train the model, and try new inputs to see what it recognizes and where it struggles.', takeaway: 'A model’s guesses depend on the examples it practiced with.', url: 'https://teachablemachine.withgoogle.com/' },
    { title: 'Responsible AI for Computational Action', source: 'MIT RAISE', minutes: 'Project based', summary: 'MIT’s project-based curriculum helps learners explore AI by building things that matter to them. It blends creative computing with questions about responsibility, society, and how a tool affects the people who use it.', takeaway: 'Start with a community need and check who benefits or might be harmed.', url: 'https://raise.mit.edu/research/research-projects/raica/' },
    { title: 'Elements of AI: Introduction to AI', source: 'University of Helsinki & MinnaLearn', minutes: 'Self paced', summary: 'This free course explains what AI can and cannot do using practical exercises and plain-language concepts. It is designed for beginners and does not require advanced math or programming.', takeaway: 'A strong AI foundation includes limits and real-world effects, not only exciting examples.', url: 'https://www.elementsofai.com/' },
    { title: 'AI Competency Framework for Students', source: 'UNESCO', minutes: 'Educator reference', summary: 'UNESCO organizes student AI learning around a human-centered mindset, AI ethics, AI techniques, and system design. Its progression moves from understanding to applying and creating, with attention to critical judgment and responsible participation.', takeaway: 'Learning AI includes values and design choices as well as technical skills.', url: 'https://www.unesco.org/en/articles/ai-competency-framework-students' },
    { title: 'Unlocking Generative AI Safely and Responsibly', source: 'Microsoft Learn', minutes: 'Classroom toolkit', summary: 'This educator toolkit pairs generative AI activities with safety, responsibility, and critical thinking. It gives students a guided way to explore new tools while reflecting on their impact and limitations.', takeaway: 'Explore new tools with clear policies, critical thinking, and review.', url: 'https://learn.microsoft.com/en-us/training/educator-center/instructor-materials/classroom-toolkit-unlock-generative-ai-safely-responsibly' }
  ];

  const gameStoreKey = () => `student-arcade:${state.profileId}`;
  function loadGameData() {
    try { state.gameData = JSON.parse(localStorage.getItem(gameStoreKey()) || '{"xp":0,"cleared":[],"days":[]}'); }
    catch { state.gameData = { xp: 0, cleared: [], days: [] }; }
    state.gameData.cleared ||= [];
    state.gameData.days ||= [];
    state.gameData.xp ||= 0;
    state.gameData.courseCompleted ||= [];
    state.gameData.courseNotes ||= {};
    state.gameData.dailyCompleted ||= {};
  }
  function saveGameData() { localStorage.setItem(gameStoreKey(), JSON.stringify(state.gameData)); updateArcadeScore(); }
  function studentIdFor(profileId) {
    const key = `student-arcade-id:${profileId}`;
    const saved = localStorage.getItem(key);
    if (saved) return saved;
    const digits = [...crypto.getRandomValues(new Uint8Array(3))].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase();
    const id = `CIC-${digits}`;
    localStorage.setItem(key, id);
    return id;
  }
  function recordMission(key) {
    const already = state.gameData.cleared.includes(key);
    if (!already) { state.gameData.cleared.push(key); state.gameData.xp += 20; }
    saveGameData();
    const area = $(`#${key}-game`);
    area.innerHTML = `<div class="game-feedback correct-feedback">${already ? 'Mission already cleared. ' : '+20 points! '}${escapeHtml(gameBanks[state.gameLevel][key].success)}</div>`;
    renderGames();
  }
  function renderGames() {
    const bank = state.gameLevel === 'intermediate' ? intermediateBank : gameBanks[state.gameLevel];
    ['prompt', 'bug', 'color'].forEach(key => {
      const target = $(`#${key}-game`);
      const missionKey = `${state.gameLevel}-${key}`;
      if (state.gameData.cleared.includes(missionKey)) { target.innerHTML = `<div class="game-feedback correct-feedback">Mission cleared · ${escapeHtml(bank[key].success)}</div>`; return; }
      target.innerHTML = `<p class="game-question">${escapeHtml(bank[key].question)}</p><div class="game-options">${bank[key].options.map((option, index) => { const swatch = key === 'color' ? option.match(/#[\da-f]{6}/i)?.[0] : null; return `<button class="game-answer${key === 'color' ? ' color-answer' : ''}" data-game="${key}" data-answer="${index}"${swatch ? ` style="--swatch:${swatch}"` : ''}>${escapeHtml(option)}</button>`; }).join('')}</div><p class="game-feedback" aria-live="polite"></p>`;
    });
    const tag = $('#tag-game');
    const tagKey = `${state.gameLevel}-tag`;
    if (state.gameData.cleared.includes(tagKey)) tag.innerHTML = `<div class="game-feedback correct-feedback">Mission cleared · ${escapeHtml(bank.tag.success)}</div>`;
    else tag.innerHTML = `<p class="game-question">${escapeHtml(bank.tag.question)}</p><div class="tag-sort" id="tag-sort">${bank.tag.pieces.map((piece, index) => `<button class="tag-piece" type="button" draggable="true" data-piece="${index}"><span class="drag-label">${index + 1}</span>${escapeHtml(piece)}</button>`).join('')}</div><div class="game-actions"><button class="button primary" type="button" data-check-order>Check my order</button><button class="button" type="button" data-shuffle-order>Shuffle</button></div><p class="game-feedback" aria-live="polite"></p>`;
    $$('.game-answer', document).forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.game;
      const mission = bank[key];
      const feedback = button.closest('.game-play-area').querySelector('.game-feedback');
      if (Number(button.dataset.answer) === mission.answer) recordMission(`${state.gameLevel}-${key}`);
      else { feedback.className = 'game-feedback try-feedback'; feedback.textContent = state.gameLevel === 'foundations' ? 'Not quite. Think about what would make the directions clear.' : 'Not quite. Compare the choices against the goal and its constraints.'; button.classList.add('answer-wrong'); }
    }));
    const sorter = $('#tag-sort');
    if (sorter) {
      sorter.querySelectorAll('.tag-piece').forEach(piece => {
        piece.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', piece.dataset.piece); piece.classList.add('dragging'); });
        piece.addEventListener('dragend', () => piece.classList.remove('dragging'));
        piece.addEventListener('dragover', event => event.preventDefault());
        piece.addEventListener('drop', event => { event.preventDefault(); const dragged = sorter.querySelector(`[data-piece="${event.dataTransfer.getData('text/plain')}"]`); if (dragged && dragged !== piece) sorter.insertBefore(dragged, piece); updatePieceNumbers(sorter); });
        piece.addEventListener('click', () => { const focused = sorter.querySelector('.selected-piece'); if (!focused) { piece.classList.add('selected-piece'); return; } if (focused !== piece) sorter.insertBefore(focused, piece); focused.classList.remove('selected-piece'); updatePieceNumbers(sorter); });
      });
      $('[data-check-order]', tag).addEventListener('click', () => {
        const actual = [...sorter.querySelectorAll('.tag-piece')].map(piece => Number(piece.dataset.piece));
        if (JSON.stringify(actual) === JSON.stringify(bank.tag.answer)) recordMission(tagKey);
        else { const feedback = tag.querySelector('.game-feedback'); feedback.className = 'game-feedback try-feedback'; feedback.textContent = 'Try again. Reorder the pieces, then check once more.'; }
      });
      $('[data-shuffle-order]', tag).addEventListener('click', () => { [...sorter.children].reverse().forEach(piece => sorter.append(piece)); updatePieceNumbers(sorter); });
    }
  }
  function updatePieceNumbers(sorter) { [...sorter.querySelectorAll('.tag-piece')].forEach((piece, index) => { piece.querySelector('.drag-label').textContent = String(index + 1); }); }
  function updateArcadeScore() {
    $('#arcade-xp').textContent = String(state.gameData.xp);
    const clears = state.gameData.cleared.filter(key => key.startsWith(`${state.gameLevel}-`)).length;
    $('#missions-complete').textContent = `${clears} of 4 cleared`;
    $('#arcade-progress').style.width = `${Math.min(100, clears / 4 * 100)}%`;
    $('#arcade-next').textContent = clears === 4 ? 'All missions cleared. Great work!' : `${4 - clears} mission${4 - clears === 1 ? '' : 's'} left to clear in this mode.`;
    const streak = calculateStreak(state.gameData.days);
    $('#streak-days').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
  }
  function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  function calculateStreak(days) {
    const set = new Set(days);
    const cursor = new Date();
    if (!set.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (set.has(dateKey(cursor)) && count < 366) { count++; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }
  function localDayNumber(date) { return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000); }
  function dailyDateAtOffset(offset) { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset); return date; }
  function renderDailyAi() {
    const date = dailyDateAtOffset(state.dailyOffset);
    const key = dateKey(date);
    const dayNumber = ((localDayNumber(date) % dailyAiLessons.length) + dailyAiLessons.length) % dailyAiLessons.length;
    const lesson = dailyAiLessons[dayNumber];
    const isToday = state.dailyOffset === 0;
    const completed = Boolean(state.gameData.dailyCompleted?.[key]);
    const label = isToday ? 'Today' : state.dailyOffset === -1 ? 'Yesterday' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    $('#daily-date-label').textContent = label;
    $('#daily-next').disabled = state.dailyOffset >= 0;
    $('#daily-lesson').innerHTML = `<article class="daily-lesson"><div class="daily-lesson-meta"><span>DAY ${String(dayNumber + 1).padStart(2, '0')} · ${dailyAiLessons.length}-DAY LEARNING CYCLE</span><span>${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span></div><h3>${escapeHtml(lesson.title)}</h3><p class="daily-focus">${escapeHtml(lesson.focus)}</p><p>${escapeHtml(lesson.learn)}</p><div class="daily-try"><strong>Try this · 2 minutes</strong><p>${escapeHtml(lesson.try)}</p></div><div class="daily-check"><strong>Quick check</strong><p>${escapeHtml(lesson.question)}</p><div class="daily-answers">${lesson.options.map((option, index) => `<button class="daily-answer" type="button" data-daily-answer="${index}">${escapeHtml(option)}</button>`).join('')}</div><p id="daily-feedback" class="daily-feedback" role="status" aria-live="polite"></p></div><button id="daily-complete" class="button primary daily-complete" type="button" disabled>${completed ? 'Today’s lesson saved ✓' : isToday ? 'Complete today’s lesson · earn 15 XP' : 'Return to today to save practice'}</button></article>`;
    $$('#daily-lesson [data-daily-answer]').forEach(button => button.addEventListener('click', () => {
      const correct = Number(button.dataset.dailyAnswer) === lesson.answer;
      $$('#daily-lesson [data-daily-answer]').forEach(answer => answer.classList.toggle('is-selected', answer === button));
      const feedback = $('#daily-feedback');
      feedback.textContent = correct ? `Nice thinking! ${lesson.explain}` : 'Not quite. Reread the daily idea and try again.';
      feedback.className = `daily-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
      $('#daily-complete').disabled = !correct || !isToday || completed;
    }));
    $('#daily-complete').addEventListener('click', () => {
      if (!isToday || completed || $('#daily-complete').disabled) return;
      state.gameData.dailyCompleted ||= {};
      state.gameData.dailyCompleted[key] = true;
      if (!state.gameData.days.includes(key)) state.gameData.days.push(key);
      state.gameData.xp += 15;
      saveGameData();
      renderCalendar();
      renderDailyAi();
    }, { once: true });
  }
  function renderReadingShelf() {
    const today = new Date();
    const articleIndex = ((localDayNumber(today) % aiReadingShelf.length) + aiReadingShelf.length) % aiReadingShelf.length;
    const article = aiReadingShelf[articleIndex];
    $('#reading-day-label').textContent = `Reading ${articleIndex + 1} of ${aiReadingShelf.length}`;
    $('#article-of-day').innerHTML = `<article class="article-feature"><div><p class="eyebrow">${escapeHtml(article.source)} · ${escapeHtml(article.minutes)}</p><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.summary)}</p><p class="article-takeaway"><strong>Remember:</strong> ${escapeHtml(article.takeaway)}</p><a class="button" href="${escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer">Open the original resource ↗</a></div></article>`;
    $('#reading-list').innerHTML = aiReadingShelf.map((item, index) => `<article class="reading-card"><p class="eyebrow">${escapeHtml(item.source)} · ${escapeHtml(item.minutes)}</p><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><p class="article-takeaway"><strong>Remember:</strong> ${escapeHtml(item.takeaway)}</p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Read resource ${index + 1} ↗</a></article>`).join('');
  }
  function renderCalendar() {
    const date = state.calendarDate;
    const year = date.getFullYear();
    const month = date.getMonth();
    $('#calendar-month').textContent = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const done = new Set(state.gameData.days);
    const today = dateKey(new Date());
    const cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => `<span class="calendar-weekday">${day}</span>`);
    for (let blank = 0; blank < firstDay; blank++) cells.push('<span class="calendar-empty"></span>');
    for (let day = 1; day <= daysInMonth; day++) {
      const key = dateKey(new Date(year, month, day));
      cells.push(`<span class="calendar-day${done.has(key) ? ' practiced' : ''}${key === today ? ' today' : ''}" aria-label="${day}${done.has(key) ? ', practice day' : ''}">${day}</span>`);
    }
    $('#practice-calendar').innerHTML = cells.join('');
  }
  function setGameProfile(id) {
    const normalized = String(id || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 40) || 'guest';
    state.profileId = normalized;
    loadGameData();
    $('#calendar-student-id').value = normalized === 'guest' ? '' : normalized;
    renderGames(); updateArcadeScore(); renderCalendar(); renderCoursePath(); renderDailyAi(); renderReadingShelf();
  }

  function renderCoursePath() {
    const completed = new Set(state.gameData.courseCompleted || []);
    const finished = completed.size;
    $('#course-progress-count').textContent = `${finished} of ${creatorQuest.length} lessons complete`;
    $('#course-progress-fill').style.width = `${finished / creatorQuest.length * 100}%`;
    $('#course-progress-track').setAttribute('aria-valuenow', String(finished));
    $('#course-grid').innerHTML = creatorQuest.map((lesson, index) => {
      const done = completed.has(index);
      const locked = index > 0 && !completed.has(index - 1) && !done;
      const action = locked ? 'Locked' : done ? 'Review lesson' : 'Start lesson';
      return `<article class="course-card${done ? ' is-complete' : ''}${locked ? ' is-locked' : ''}"><div class="course-card-top"><span class="course-number">${String(index + 1).padStart(2, '0')}</span><span class="course-time">${done ? '✓ Complete' : '10 min'}</span></div><p class="eyebrow">${escapeHtml(lesson.theme)}</p><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.goal)}</p><button class="button${done ? '' : ' primary'}" type="button" data-course-open="${index}" ${locked ? 'disabled' : ''}>${action}</button></article>`;
    }).join('');
  }

  function openCourseLesson(index) {
    const lesson = creatorQuest[index];
    if (!lesson) return;
    const completed = new Set(state.gameData.courseCompleted || []);
    if (index > 0 && !completed.has(index - 1) && !completed.has(index)) return;
    const note = state.gameData.courseNotes?.[index] || '';
    $('#course-lesson-meta').textContent = `LESSON ${String(index + 1).padStart(2, '0')} OF 06 · ABOUT 10 MINUTES`;
    $('#course-lesson-title').textContent = lesson.title;
    $('#course-lesson-body').innerHTML = `<p class="course-goal">${escapeHtml(lesson.goal)}</p><section class="lesson-reading"><h3>Learn it</h3>${lesson.learn.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section><section class="lesson-activity"><div><p class="eyebrow">YOUR 5-MINUTE BUILD</p><h3>Try it now</h3><ol>${lesson.activity.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p><strong>Want a challenge?</strong> ${escapeHtml(lesson.stretch)}</p></div></section><section class="lesson-check"><p class="eyebrow">CHECKPOINT</p><h3>${escapeHtml(lesson.question)}</h3><div class="lesson-answers">${lesson.options.map((option, optionIndex) => `<button type="button" class="lesson-answer" data-course-answer="${optionIndex}">${escapeHtml(option)}</button>`).join('')}</div><p id="course-answer-feedback" class="course-answer-feedback" role="status" aria-live="polite"></p></section><label class="field lesson-reflection">What did you make or learn? <span class="muted">(optional)</span><textarea id="course-reflection" rows="3" maxlength="400" placeholder="Write one thing you want to remember…">${escapeHtml(note)}</textarea></label><div class="lesson-footer"><span id="course-xp-note" class="muted">Pass the checkpoint to save this lesson and earn 50 XP.</span><button id="course-finish" class="button primary" type="button" disabled>Save checkpoint</button></div>`;
    $('#course-lesson-body').dataset.courseIndex = String(index);
    $('#course-dialog').showModal();
    $$('#course-lesson-body [data-course-answer]').forEach(button => button.addEventListener('click', () => {
      const chosen = Number(button.dataset.courseAnswer);
      const feedback = $('#course-answer-feedback');
      const passed = chosen === lesson.answer;
      $$('#course-lesson-body [data-course-answer]').forEach(answer => answer.classList.toggle('is-selected', answer === button));
      feedback.textContent = passed ? `Correct! ${lesson.explain}` : 'Not quite. Try another answer; use the lesson above as a clue.';
      feedback.className = `course-answer-feedback ${passed ? 'is-correct' : 'is-incorrect'}`;
      $('#course-finish').disabled = !passed;
    }));
    $('#course-finish').addEventListener('click', () => {
      const currentIndex = Number($('#course-lesson-body').dataset.courseIndex);
      const finishedLessons = new Set(state.gameData.courseCompleted || []);
      state.gameData.courseNotes ||= {};
      state.gameData.courseNotes[currentIndex] = $('#course-reflection').value.trim();
      if (!finishedLessons.has(currentIndex)) {
        finishedLessons.add(currentIndex);
        state.gameData.courseCompleted = [...finishedLessons].sort((a, b) => a - b);
        state.gameData.xp += 50;
      }
      saveGameData();
      renderCoursePath();
      $('#course-dialog').close();
    }, { once: true });
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }
  function renderQuiz(level) {
    state.quiz = banks[level];
    $('#quiz-container').innerHTML = state.quiz.map((question, index) => `<fieldset class="quiz-question"><legend>${index + 1}. ${escapeHtml(question.question)}</legend>${question.options.map((option, optionIndex) => `<label class="quiz-option"><input type="radio" name="${question.id}" value="${optionIndex}" required><span>${escapeHtml(option)}</span></label>`).join('')}</fieldset>`).join('');
  }
  function adaptLevel(level) {
    const content = copy[level];
    $('#level-description').textContent = content.description;
    ['q1-label', 'q2-label', 'q3-label', 'q4-label', 'q5-label', 'q7-label'].forEach((id, index) => { $(`#${id}`).textContent = content.labels[index]; });
    ['q1', 'q2', 'q3', 'q4', 'q5', 'q7'].forEach((id, index) => { $(`[data-hint="${id}"]`).textContent = content.hints[index]; });
    $('#quiz-intro').textContent = content.quiz;
    renderQuiz(level);
    updateProgress();
  }
  function updateCounters() {
    $$('.counter').forEach(node => {
      const field = $(`[name="${node.dataset.counter}"]`);
      const count = field.value.trim().length;
      node.textContent = `${count} characters`;
      node.style.color = count < Number(field.minLength || 0) ? 'var(--muted)' : 'var(--success)';
    });
  }
  function updateProgress() {
    const form = $('#survey-form');
    const controls = [...form.querySelectorAll('input[required], textarea[required]')];
    const groups = new Map();
    for (const control of controls) {
      const key = control.name;
      if (!groups.has(key)) groups.set(key, control.type === 'radio' ? false : control.type === 'checkbox' ? false : false);
      if (control.type === 'radio' || control.type === 'checkbox') {
        if (control.checked) groups.set(key, true);
      } else if (control.value.trim().length >= (control.minLength > 0 ? control.minLength : 1)) groups.set(key, true);
    }
    const checkGroups = ['ai_tools_used', 'web_dev_skills_used'];
    for (const group of checkGroups) groups.set(group, $$(`input[name="${group}"]:checked`, form).length > 0);
    const completed = [...groups.values()].filter(Boolean).length;
    const percent = Math.round(completed / groups.size * 100);
    $('#completion-percent').textContent = String(percent);
    $('#form-progress').style.width = `${percent}%`;
    $('#top-progress').style.width = `${percent}%`;
  }
  function setView(viewName) {
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `${viewName}-view`));
    $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === viewName));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (viewName === 'survey') updateProgress();
  }
  function formPayload(form) {
    const data = new FormData(form);
    const answers = {};
    for (let index = 1; index <= 8; index++) answers[`q${index}`] = Number(data.get(`q${index}`));
    return {
      student_id: data.get('student_id'), student_name: data.get('student_name'), survey_level: data.get('survey_level'), module_or_week: data.get('module_or_week'),
      ai_tools_used: data.getAll('ai_tools_used'), q1_what_each_ai_does: data.get('q1_what_each_ai_does'), q2_ai_comparison: data.get('q2_ai_comparison'),
      web_dev_skills_used: data.getAll('web_dev_skills_used'), q3_web_dev_progress: data.get('q3_web_dev_progress'), q4_daily_life_help: data.get('q4_daily_life_help'),
      q5_real_world_examples: data.get('q5_real_world_examples'), q6_confidence_rating: Number(data.get('q6_confidence_rating')), q7_biggest_challenge: data.get('q7_biggest_challenge'), quiz_answers: answers
    };
  }
  async function api(url, options = {}) {
    const credential = sessionStorage.getItem('student-google-token');
    const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(credential ? { Authorization: `Bearer ${credential}` } : {}), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({ success: false, message: 'The server returned an unreadable response.' }));
    if (!response.ok) {
      const error = new Error(data.message || Object.values(data.errors || {})[0] || `Request failed (${response.status}).`);
      error.data = data;
      throw error;
    }
    return data;
  }
  function enterAfterGoogle(profile) {
    const studentId = studentIdFor(profile.sub);
    state.profileId = studentId;
    $('#calendar-student-id').value = studentId;
    const surveyId = $('#survey-form [name="student_id"]');
    if (surveyId) surveyId.value = studentId;
    const lookupId = $('#student-lookup [name="student_id"]');
    if (lookupId) lookupId.value = studentId;
    loadGameData(); renderGames(); updateArcadeScore(); renderCalendar(); renderCoursePath(); renderDailyAi(); renderReadingShelf();
    document.body.classList.remove('signed-out');
    setView('play');
    const saved = localStorage.getItem(`student-arcade-difficulty:${state.profileId}`);
    if (saved && difficultyCopy[saved]) {
      state.gameLevel = saved;
      $$('.mode-button').forEach(option => option.classList.toggle('selected', option.dataset.gameLevel === saved));
      $('#game-level-name').textContent = difficultyCopy[saved].name;
      $('#difficulty-description').textContent = difficultyCopy[saved].description;
    } else $('#difficulty-dialog').showModal();
  }
  async function acceptGoogleCredential(credential) {
    const message = $('#signin-message');
    message.textContent = 'Verifying your Google account…';
    try {
      const result = await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      sessionStorage.setItem('student-google-token', credential);
      enterAfterGoogle(result.profile);
    } catch (error) { message.textContent = error.message; }
  }
  async function startSignIn() {
    const config = await fetch('/api/config', { cache: 'no-store' }).then(response => response.json()).catch(() => ({}));
    googleClientId = config.google_client_id || '';
    const previousToken = sessionStorage.getItem('student-google-token');
    if (previousToken) {
      try {
        const result = await api('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential: previousToken }) });
        enterAfterGoogle(result.profile);
        return;
      } catch { sessionStorage.removeItem('student-google-token'); }
    }
    document.body.classList.add('signed-out');
    setView('welcome');
    if (!googleClientId) { $('#google-signin-fallback').hidden = false; $('#signin-message').textContent = 'Google sign-in needs this site’s Google OAuth client ID before accounts can connect.'; return; }
    $('#google-signin-fallback').hidden = true;
    const renderButton = () => {
      if (!window.google?.accounts?.id) { window.setTimeout(renderButton, 200); return; }
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: response => acceptGoogleCredential(response.credential) });
      window.google.accounts.id.renderButton($('#google-signin-button'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 300 });
      $('#signin-message').textContent = 'Choose a Google account to continue.';
    };
    renderButton();
  }
;
  function showError(target, message) { target.innerHTML = `<div class="error-state">${escapeHtml(message)}</div>`; }
  function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
  function exportCsv(rows) {
    const columns = ['id', 'student_id', 'student_name', 'survey_level', 'module_or_week', 'quiz_score', 'quiz_total', 'xp_earned', 'q6_confidence_rating', 'submitted_at', 'ai_tools_used', 'web_dev_skills_used', 'milestones'];
    const lines = [columns.map(csvCell).join(','), ...rows.map(row => columns.map(column => csvCell(Array.isArray(row[column]) ? row[column].join('; ') : row[column])).join(','))];
    const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'student-progress-submissions.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
  function drawChart(history) {
    if (state.chart) state.chart.destroy();
    if (!window.Chart) return;
    state.chartHistory = history;
    const canvas = $('#progress-chart');
    const css = getComputedStyle(document.body);
    state.chart = new Chart(canvas, { type: 'line', data: { labels: history.map(item => item.module_or_week), datasets: [
      { label: 'Quiz score (%)', data: history.map(item => item.quiz_total ? item.quiz_score / item.quiz_total * 100 : 0), borderColor: css.getPropertyValue('--accent').trim(), backgroundColor: css.getPropertyValue('--accent').trim(), tension: .28, yAxisID: 'y' },
      { label: 'Confidence (1–5)', data: history.map(item => item.q6_confidence_rating), borderColor: css.getPropertyValue('--success').trim(), backgroundColor: css.getPropertyValue('--success').trim(), tension: .28, yAxisID: 'y1' }
    ] }, options: { maintainAspectRatio: false, responsive: true, plugins: { legend: { labels: { color: css.getPropertyValue('--text').trim(), usePointStyle: true, pointStyle: 'line' } } }, scales: { x: { ticks: { color: css.getPropertyValue('--muted').trim() }, grid: { color: css.getPropertyValue('--line').trim() } }, y: { min: 0, max: 100, ticks: { color: css.getPropertyValue('--muted').trim() }, grid: { color: css.getPropertyValue('--line').trim() } }, y1: { min: 1, max: 5, position: 'right', ticks: { stepSize: 1, color: css.getPropertyValue('--muted').trim() }, grid: { drawOnChartArea: false } } } } });
  }
  function renderStudent(data) {
    const target = $('#student-result');
    const history = data.history;
    const currentBase = data.total_xp >= 750 ? 750 : data.total_xp >= 450 ? 450 : data.total_xp >= 200 ? 200 : 0;
    const next = data.next_tier_xp;
    const percent = next ? Math.min(100, (data.total_xp - currentBase) / (next - currentBase) * 100) : 100;
    target.innerHTML = `<div class="success-banner"><h2>${escapeHtml(data.student_name)} · ${escapeHtml(data.skill_tier)}</h2><p>${data.total_xp} total XP${next ? ` · ${next - data.total_xp} XP to the next tier` : ' · Highest tier reached'}</p><div class="tier-progress"><span style="width:${percent}%"></span></div></div><div class="metric-grid"><div class="metric"><strong>${data.total_submissions}</strong><span>Submissions</span></div><div class="metric"><strong>${data.total_xp}</strong><span>Total XP</span></div><div class="metric"><strong>${data.average_quiz_percentage}%</strong><span>Average quiz</span></div><div class="metric"><strong>${data.latest_confidence}/5</strong><span>Latest confidence</span></div></div><div class="chart-panel"><h3>Quiz accuracy and confidence</h3><canvas id="progress-chart" aria-label="Chart of quiz accuracy and confidence over time"></canvas></div><h3 class="section-head">Milestones earned</h3><div class="milestone-list">${data.all_unlocked_milestones.map(item => `<span class="milestone">${escapeHtml(item)}</span>`).join('')}</div><h3 class="section-head" style="margin-top:26px">Reflection history</h3><div class="history-list">${history.map((item, index) => `<article class="history-card"><div><h3>${escapeHtml(item.module_or_week)}</h3><p>${escapeHtml(new Date(item.submitted_at).toLocaleDateString())} · ${item.quiz_score}/${item.quiz_total} quiz · ${item.xp_earned} XP</p></div><button class="button" type="button" data-history-index="${index}">Review</button></article>`).join('')}</div>`;
    drawChart(history);
    $$('[data-history-index]', target).forEach(button => button.addEventListener('click', () => showSubmission(history[Number(button.dataset.historyIndex)])));
  }
  function showSubmission(record) {
    $('#modal-title').textContent = `${record.student_name} · ${record.module_or_week}`;
    const details = [
      ['AI tools used', (record.ai_tools_used || []).join(', ')], ['Web development skills', (record.web_dev_skills_used || []).join(', ')],
      ['What each AI tool does', record.q1_what_each_ai_does], ['AI comparison', record.q2_ai_comparison], ['Web development progress', record.q3_web_dev_progress], ['Daily life application', record.q4_daily_life_help], ['Real-world website idea', record.q5_real_world_examples], ['Biggest challenge', record.q7_biggest_challenge]
    ];
    const quiz = record.quiz_details || record.quiz_details_json && JSON.parse(record.quiz_details_json) || [];
    $('#modal-content').innerHTML = `<div class="detail-content">${details.map(([label, value]) => `<section><h3>${escapeHtml(label)}</h3><p>${escapeHtml(value || 'No response')}</p></section>`).join('')}<section><h3>Confidence</h3><p>${escapeHtml(record.q6_confidence_rating)}/5</p></section><section><h3>Quiz results</h3>${quiz.length ? quiz.map(item => `<div class="quiz-review"><strong>${item.isCorrect ? 'Correct' : 'Review'} · ${escapeHtml(item.question)}</strong><p>Your answer: ${escapeHtml(item.userAnswer)}. Correct answer: ${escapeHtml(item.correctAnswer)}. ${escapeHtml(item.explanation)}</p></div>`).join('') : '<p>Quiz review was not saved for this record.</p>'}</section></div>`;
    $('#detail-modal').showModal();
  }
  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = $('#form-message');
    message.textContent = '';
    if (!form.checkValidity()) {
      const nativeInvalid = form.querySelector(':invalid');
      if (nativeInvalid) {
        const fieldName = nativeInvalid.name;
        const questionLabel = nativeInvalid.closest('.field')?.querySelector('span')?.textContent || fieldName;
        message.textContent = nativeInvalid.validity.tooShort ? `${questionLabel}: add a little more detail before submitting.` : `${questionLabel || 'This field'} needs your attention.`;
        message.style.color = 'var(--danger)';
        nativeInvalid.focus();
      }
      return;
    }
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    button.textContent = 'Submitting…';
    try {
      const result = await api('/api/submit', { method: 'POST', body: JSON.stringify(formPayload(form)) });
      state.lastSubmission = result;
      const banner = document.createElement('div');
      banner.className = 'success-banner';
      banner.innerHTML = `<h2>Reflection saved</h2><p>You earned ${result.xp_earned} XP and scored ${result.quiz_score}/8. Milestones: ${result.milestones.map(escapeHtml).join(', ')}.</p>`;
      $('#survey-view').prepend(banner);
      message.textContent = result.question_breakdown.map(item => `${item.id.toUpperCase()}: ${item.isCorrect ? 'Correct.' : `Review: ${item.correctAnswer}.`} ${item.explanation}`).join(' ');
      message.style.color = 'var(--success)';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const errors = error.data && error.data.errors;
      message.textContent = errors ? Object.entries(errors).map(([field, detail]) => `${field}: ${detail}`).join(' ') : error.message;
      message.style.color = 'var(--danger)';
    } finally {
      button.disabled = false;
      button.textContent = 'Submit reflection';
    }
  }
  async function handleStudentLookup(event) {
    event.preventDefault();
    const id = new FormData(event.currentTarget).get('student_id').trim();
    const target = $('#student-result');
    target.innerHTML = '<div class="empty-state">Loading progress…</div>';
    try { renderStudent(await api(`/api/student/${encodeURIComponent(id)}`)); } catch (error) { showError(target, error.message); }
  }
  async function handleAdmin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const token = data.get('token');
    const params = new URLSearchParams();
    for (const key of ['survey_level', 'module_or_week', 'student_id', 'from', 'to']) if (String(data.get(key) || '').trim()) params.set(key, String(data.get(key)).trim());
    const target = $('#admin-result');
    target.innerHTML = '<div class="empty-state">Loading cohort data…</div>';
    $('#export-csv').disabled = true;
    try {
      const result = await api(`/api/admin/dashboard${params.size ? `?${params}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      state.adminRows = result.submissions;
      target.innerHTML = `<div class="metric-grid"><div class="metric"><strong>${result.aggregate.total_submissions || 0}</strong><span>Submissions</span></div><div class="metric"><strong>${result.aggregate.unique_students || 0}</strong><span>Students</span></div><div class="metric"><strong>${Math.round(result.aggregate.average_quiz_percentage || 0)}%</strong><span>Average quiz</span></div><div class="metric"><strong>${Number(result.aggregate.total_xp || 0)}</strong><span>Total XP</span></div></div><h3 class="section-head">By learning level</h3><div class="table-wrap"><table><thead><tr><th>Level</th><th>Submissions</th><th>Students</th><th>Quiz average</th><th>Confidence</th></tr></thead><tbody>${result.by_level.map(row => `<tr><td>${escapeHtml(row.survey_level)}</td><td>${row.submissions}</td><td>${row.students}</td><td>${Number(row.average_quiz_percentage || 0).toFixed(1)}%</td><td>${Number(row.average_confidence || 0).toFixed(1)}/5</td></tr>`).join('') || '<tr><td colspan="5">No results for these filters.</td></tr>'}</tbody></table></div><h3 class="section-head" style="margin-top:24px">By module or week</h3><div class="table-wrap"><table><thead><tr><th>Module or week</th><th>Submissions</th><th>Average XP</th><th>Quiz average</th></tr></thead><tbody>${result.by_module.map(row => `<tr><td>${escapeHtml(row.module_or_week)}</td><td>${row.submissions}</td><td>${Number(row.average_xp || 0).toFixed(0)}</td><td>${Number(row.average_quiz_percentage || 0).toFixed(1)}%</td></tr>`).join('') || '<tr><td colspan="4">No results for these filters.</td></tr>'}</tbody></table></div><h3 class="section-head" style="margin-top:24px">Submissions</h3><div class="table-wrap"><table><thead><tr><th>Student</th><th>Level</th><th>Module</th><th>Quiz</th><th>XP</th><th>Date</th><th></th></tr></thead><tbody>${result.submissions.map((row, index) => `<tr><td>${escapeHtml(row.student_name)} (${escapeHtml(row.student_id)})</td><td>${escapeHtml(row.survey_level)}</td><td>${escapeHtml(row.module_or_week)}</td><td>${row.quiz_score}/${row.quiz_total}</td><td>${row.xp_earned}</td><td>${escapeHtml(new Date(row.submitted_at).toLocaleDateString())}</td><td><button type="button" data-admin-index="${index}">Inspect</button></td></tr>`).join('') || '<tr><td colspan="7">No matching submissions.</td></tr>'}</tbody></table></div>`;
      $('#export-csv').disabled = !state.adminRows.length;
      $$('[data-admin-index]', target).forEach(button => button.addEventListener('click', () => showSubmission(state.adminRows[Number(button.dataset.adminIndex)])));
    } catch (error) { showError(target, error.message); }
  }

  $$('.nav-link').forEach(button => button.addEventListener('click', () => setView(button.dataset.view)));
  $('[data-focus-color]').addEventListener('click', () => { setView('play'); $('#color-game').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  $$('[data-go-survey]').forEach(button => button.addEventListener('click', () => setView('survey')));
  $$('[data-game-level]').forEach(button => button.addEventListener('click', () => {
    state.gameLevel = button.dataset.gameLevel;
    $$('.mode-button').forEach(option => option.classList.toggle('selected', option === button));
    $('#game-level-name').textContent = difficultyCopy[state.gameLevel].name;
    $('#difficulty-description').textContent = difficultyCopy[state.gameLevel].description;
    localStorage.setItem(`student-arcade-difficulty:${state.profileId}`, state.gameLevel);
    renderGames(); updateArcadeScore();
  }));
  $$('[data-first-difficulty]').forEach(button => button.addEventListener('click', () => {
    state.gameLevel = button.dataset.firstDifficulty;
    localStorage.setItem(`student-arcade-difficulty:${state.profileId}`, state.gameLevel);
    $$('.mode-button').forEach(option => option.classList.toggle('selected', option.dataset.gameLevel === state.gameLevel));
    $('#game-level-name').textContent = difficultyCopy[state.gameLevel].name;
    $('#difficulty-description').textContent = difficultyCopy[state.gameLevel].description;
    renderGames(); updateArcadeScore();
    $('#difficulty-dialog').close();
  }));
  $('#calendar-student-id').addEventListener('change', event => setGameProfile(event.currentTarget.value));
  $('#course-grid').addEventListener('click', event => {
    const button = event.target.closest('[data-course-open]');
    if (button && !button.disabled) openCourseLesson(Number(button.dataset.courseOpen));
  });
  $('#course-close').addEventListener('click', () => $('#course-dialog').close());
  $('#daily-prev').addEventListener('click', () => { state.dailyOffset -= 1; renderDailyAi(); });
  $('#daily-next').addEventListener('click', () => { if (state.dailyOffset < 0) { state.dailyOffset += 1; renderDailyAi(); } });
  $('#calendar-save').addEventListener('click', () => {
    if (state.profileId === 'guest') { $('#calendar-message').textContent = 'Enter your student ID first, then save your practice day.'; $('#calendar-student-id').focus(); return; }
    const today = dateKey(new Date());
    if (!state.gameData.days.includes(today)) state.gameData.days.push(today);
    saveGameData(); renderCalendar();
    $('#calendar-message').textContent = 'Practice day saved. Keep up the good work.';
  });
  $('#calendar-prev').addEventListener('click', () => { state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1); renderCalendar(); });
  $('#calendar-next').addEventListener('click', () => { state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1); renderCalendar(); });
  $$('#survey-form input[name="survey_level"]').forEach(input => input.addEventListener('change', () => adaptLevel(input.value)));
  $('#survey-form').addEventListener('input', () => { updateCounters(); updateProgress(); });
  $('#survey-form').addEventListener('change', updateProgress);
  $('#survey-form').addEventListener('submit', handleSubmit);
  $('#student-lookup').addEventListener('submit', handleStudentLookup);
  $('#admin-form').addEventListener('submit', handleAdmin);
  $('#export-csv').addEventListener('click', () => exportCsv(state.adminRows));
  $('#theme-toggle').addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('student-survey-theme', isDark ? 'dark' : 'light');
    $('#theme-toggle').textContent = isDark ? 'Light theme' : 'Dark theme';
    $('#theme-toggle').setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    if (state.chartHistory.length) drawChart(state.chartHistory);
  });
  $('#modal-close').addEventListener('click', () => $('#detail-modal').close());
  $('#detail-modal').addEventListener('click', event => { if (event.target === $('#detail-modal')) $('#detail-modal').close(); });
  const savedTheme = localStorage.getItem('student-survey-theme');
  if (savedTheme === 'dark') { document.body.classList.add('dark'); $('#theme-toggle').textContent = 'Light theme'; $('#theme-toggle').setAttribute('aria-label', 'Switch to light theme'); }
  adaptLevel('foundations');
  document.body.classList.add('signed-out');
  setGameProfile('');
  startSignIn();
  renderGames();
  renderCalendar();
  updateCounters();
  updateProgress();
})();
