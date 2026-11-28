(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const state = { quiz: [], adminRows: [], chart: null, chartHistory: [], lastSubmission: null, gameLevel: 'foundations', calendarDate: new Date(), profileId: 'guest', gameData: {}, dailyOffset: 0, account: null, avatarColor: '#6c4ccf', avatarIcon: '', isPremium: false, checkoutEnabled: false };
  let googleClientId = '';
  let supabaseClient = null;
  let authMode = 'signin';
  let privatePreviewAvailable = false;
  let veritasState = {};
  let veritasBusy = false;
  let homeworkPhotoUrl = '';
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
    prompt: { question: 'Which prompt gives an AI enough context and a clear result to produce?', options: ['Help with science.', 'Create a 5-step study plan for a learner preparing for a planets quiz. Keep each step under 10 minutes.', 'Write anything about planets.', 'Make a study plan.'], answer: 1, success: 'Good prompt design includes the learner, the goal, and useful limits.' },
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
      activity: ['Write a prompt that asks for a concise, sourced explanation of a local issue for a school science project.', 'Underline the audience, task, and format in your prompt.', 'Check the answer in a trusted source and rewrite it in your own words.'],
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
    ,{
      title: 'Write your first Python program', theme: 'Python · output and variables',
      goal: 'Use Python to store information and create a clear result.',
      learn: [
        'Python is a programming language used for websites, data, automation, and AI. A program is a set of instructions that a computer follows in order.',
        'Use print() to show a result: print("Hello, learner!"). Text goes inside quotation marks. A variable gives a value a reusable name: topic = "AI". Then print(topic) displays that value.',
        'Choose names that explain what they hold. Variables can store text, whole numbers, and other kinds of information. Use comments beginning with # to leave notes for people reading your code.'
      ],
      activity: ['Write print("My first Python program") and predict what appears.', 'Create a variable named favorite_topic and assign it a short text value.', 'Print a sentence that includes your variable. Change the value and run the program again.'],
      stretch: 'Create two variables, combine them into a sentence, and print the result.',
      question: 'What does print("Hello") do in Python?', options: ['Shows the text Hello as output.', 'Creates a website heading automatically.', 'Deletes the program.'], answer: 0,
      explain: 'print() displays a value so you can see the program’s output.'
    },
    {
      title: 'Make decisions with Python', theme: 'Python · conditions and comparisons',
      goal: 'Use if and else to make a program respond to different information.',
      learn: [
        'Programs can choose between actions. An if statement checks whether a condition is true. Python uses indentation to show which instructions belong inside that choice.',
        'For example: score = 8, then if score >= 5: print("Ready") else: print("Keep practicing"). The colon starts a block, and the indented lines are the actions for each outcome.',
        'Comparisons include == for equal, > for greater than, and < for less than. A single equals sign assigns a value; two equals signs compare values.'
      ],
      activity: ['Set a variable called minutes to a number.', 'Write an if/else that prints “Short session” when minutes is below 10 and “Longer session” otherwise.', 'Try values on both sides of 10 and explain why the output changes.'],
      stretch: 'Add an elif case for exactly 10 minutes.',
      question: 'Which symbol checks whether two values are equal?', options: ['==', '=', '=>'], answer: 0,
      explain: 'Python uses == to compare two values. A single = assigns a value to a variable.'
    },
    {
      title: 'Repeat work with lists and loops', theme: 'Python · collections and iteration',
      goal: 'Store several items in a list and use a loop to process them.',
      learn: [
        'A list holds several values in order: topics = ["AI", "Python", "design"]. Lists help programs work with collections without creating a new variable for every item.',
        'A for loop repeats instructions for each item: for topic in topics: print(topic). The indented body runs once per list item. This is called iteration.',
        'Lists use zero-based positions, so topics[0] is the first item. Use len(topics) to find how many items it contains. Check that a list has an item before asking for a position.'
      ],
      activity: ['Create a list with three safe learning topics.', 'Use a for loop to print a sentence for each topic.', 'Add a fourth topic and run the program again without changing the loop.'],
      stretch: 'Count the items with len() and print the count after the loop.',
      question: 'How many times does a for loop over a list of three items normally run?', options: ['Once for each item: three times.', 'Always exactly ten times.', 'It never runs unless the list is renamed.'], answer: 0,
      explain: 'A for loop visits each item in the list, so three items produce three iterations.'
    }
  ];

  const dailyAiLessons = [
    { title: 'AI is a tool, not a person', focus: 'Notice what AI can do and where human judgment matters.', learn: 'Artificial intelligence is a broad name for computer systems that do tasks people connect with abilities like recognizing patterns, using language, or making predictions. A system can produce a friendly answer without having feelings or life experience. Ask what a tool is designed to do, what information it uses, and when a person should check its work.', try: 'Choose one app you used today. Guess whether AI helps with its search, recommendations, photos, or voice features. Then look for a clue in the app settings or help page.', question: 'A chatbot writes “I feel excited.” What is the safest interpretation?', options: ['It is using a phrase; that does not prove it has feelings.', 'It must be happy because it said so.', 'It knows everything about being human.'], answer: 0, explain: 'Language can sound human even when a system is generating patterns in text.' },
    { title: 'How examples teach a model', focus: 'Explore training examples, labels, and practice data.', learn: 'Many AI systems learn patterns from examples. If a model sees pictures labeled “cat” and “dog,” it adjusts its internal settings so it can guess labels for new pictures. The examples are called training data. If examples are confusing or leave out important cases, the model may make unreliable guesses.', try: 'Invent a tiny classifier for fruit. Write three examples for each label, then add an unusual fruit and decide whether your labels still work.', question: 'What is training data?', options: ['Examples used to help a model learn patterns.', 'A list of passwords for an AI.', 'A guarantee that an answer is correct.'], answer: 0, explain: 'Training data provides examples; it does not guarantee perfect results.' },
    { title: 'Patterns are not the same as understanding', focus: 'Learn why a fluent answer can still miss the point.', learn: 'A language model learns relationships among pieces of text and predicts a likely next piece. That can make its writing useful and natural. It can also produce a polished answer that is incomplete, mixed up, or unsupported. A smooth explanation is a reason to inspect the evidence, not a reason to skip checking.', try: 'Ask a friend to write a two-sentence explanation of a familiar game. Compare it with an AI explanation and mark one detail that needs a source.', question: 'Why check a confident AI answer?', options: ['The system can generate plausible text without verifying every claim.', 'Confidence means the answer is always true.', 'Only long answers can contain mistakes.'], answer: 0, explain: 'Fluent language and factual accuracy are different things.' },
    { title: 'Build a useful prompt', focus: 'Give a clear task, audience, and format.', learn: 'A prompt is an instruction or question sent to an AI tool. Useful prompts include a goal, relevant context, who the answer is for, and the shape of the response. You can improve the answer by adding one specific constraint at a time, then checking whether it followed them.', try: 'Rewrite “Tell me about space” as a concise overview of Mars for a learner new to the topic, with sources to verify key claims.', question: 'Which prompt gives the clearest task?', options: ['Make it interesting.', 'Summarize Mars in three clear bullet points for a reader new to astronomy, and include sources I can verify.', 'Write something about planets.'], answer: 1, explain: 'The second prompt names the topic, audience, amount, purpose, and verification need.' },
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

  const partyQuestions = [
    { topic: 'AI basics', question: 'An AI gives a confident answer with a surprising fact. What should you do?', options: ['Check it with a reliable source', 'Assume it is right', 'Share it before checking', 'Ask it to sound more confident'], answer: 0, why: 'AI can make mistakes even when an answer sounds certain.' },
    { topic: 'Web building', question: 'Which tool usually changes a webpage’s colors and layout?', options: ['HTML', 'CSS', 'Wi-Fi', 'A file name'], answer: 1, why: 'CSS controls the look and layout of a webpage.' },
    { topic: 'Stay safe', question: 'Which detail should you keep private in a public AI chat?', options: ['A favorite book genre', 'A made-up character name', 'Your home address', 'A pretend planet name'], answer: 2, why: 'Keep addresses and other personal details private.' },
    { topic: 'Prompt power', question: 'Which prompt gives an AI the clearest task?', options: ['Do something cool', 'Explain photosynthesis in 3 short steps for a beginner', 'Write more', 'Tell me everything'], answer: 1, why: 'A clear goal, audience, and limit help guide the answer.' },
    { topic: 'HTML', question: 'What does HTML mainly describe?', options: ['The structure of a webpage', 'The computer’s battery', 'A Wi-Fi password', 'A screen’s brightness'], answer: 0, why: 'HTML marks up content such as headings, paragraphs, and links.' },
    { topic: 'Debugging', question: 'Your code has a bug. What is a smart first step?', options: ['Delete the whole project', 'Read the error and reproduce the problem', 'Change random lines', 'Blame the browser'], answer: 1, why: 'A repeatable problem and its error message give useful clues.' },
    { topic: 'JavaScript', question: 'What can JavaScript add to a webpage?', options: ['Interactive behavior', 'More sunlight', 'A stronger keyboard', 'A faster chair'], answer: 0, why: 'JavaScript can respond to clicks and update page content.' },
    { topic: 'Python', question: 'What does print("Hello!") do in Python?', options: ['Shows Hello! as output', 'Deletes a file', 'Starts a video', 'Changes the keyboard'], answer: 0, why: 'The print function displays a value as output.' },
    { topic: 'Good design', question: 'A button is green and another is red. What else helps people tell them apart?', options: ['Give each a clear text label', 'Make both smaller', 'Hide one label', 'Use color alone'], answer: 0, why: 'Text labels make meaning clear without relying on color alone.' },
    { topic: 'AI and data', question: 'Why can the examples used to train an AI matter?', options: ['They can shape what the AI learns and misses', 'They choose the screen size', 'They charge the device', 'They always make the AI fair'], answer: 0, why: 'Training examples influence an AI’s patterns and limitations.' },
    { topic: 'Web access', question: 'What is helpful text for an image called?', options: ['Alt text', 'Wi-Fi text', 'Pixel text', 'Secret text'], answer: 0, why: 'Alt text describes an image for people who use screen readers.' },
    { topic: 'Critical thinking', question: 'An AI suggests code for your project. What comes next?', options: ['Run and review it safely', 'Publish it without looking', 'Assume it has no bugs', 'Share your password with it'], answer: 0, why: 'Reviewing and testing helps catch mistakes before you use code.' }
  ];
  let partyMode = 'solo';
  let partySession = null;
  let partyTimerId = null;
  let onlineParty = null;
  let onlinePollId = null;
  let onlinePollBusy = false;
  let onlineMessageCursor = 0;
  let onlineGameClock = null;
  let onlineRoomSignature = '';
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
    state.gameData.rewards ||= [];
    state.gameData.coins ||= 0;
  }
  function saveGameData() { localStorage.setItem(gameStoreKey(), JSON.stringify(state.gameData)); updateArcadeScore(); renderRewards(); }
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
    if (!already) {
      state.gameData.cleared.push(key); state.gameData.xp += 20; state.gameData.coins += 10;
      state.gameData.rewards.push(`mission-${key}`);
    }
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
    renderAvatarOptions();
    $('#arcade-coins').textContent = String(state.gameData.coins || 0);
    $('#arcade-badge-count').textContent = String(state.gameData.rewards?.length || 0);
    const clears = state.gameData.cleared.filter(key => key.startsWith(`${state.gameLevel}-`)).length;
    $('#missions-complete').textContent = `${clears} of 4 cleared`;
    $('#arcade-progress').style.width = `${Math.min(100, clears / 4 * 100)}%`;
    $('#arcade-next').textContent = clears === 4 ? 'All missions cleared. Great work!' : `${4 - clears} mission${4 - clears === 1 ? '' : 's'} left to clear in this mode.`;
    const streak = calculateStreak(state.gameData.days);
    $('#streak-days').textContent = `${streak} ${streak === 1 ? 'day' : 'days'}`;
    renderRewards();
  }
  function renderRewards() {
    const labels = { 'mission-foundations-color': ['Color Coder', '🎨'], 'mission-foundations-prompt': ['Prompt Pilot', '🛩️'], 'mission-foundations-tag': ['Tag Builder', '🧱'], 'mission-foundations-bug': ['Bug Detective', '🔎'], 'code-party-board': ['Code Party Champion', '🏆'], 'team-ai-detective': ['AI Detective', '🕵️'], 'team-color-rush': ['Color Rush', '🌈'], 'team-bug-bash': ['Bug Bash', '🐞'] };
    const earned = [...new Set(state.gameData.rewards || [])];
    $('#arcade-rewards').innerHTML = earned.length ? earned.map(key => { const normalized = key.replace('mission-intermediate-', 'mission-foundations-').replace('mission-advanced-', 'mission-foundations-'); const [name, icon] = labels[normalized] || ['Learning Star', '⭐']; return `<span class="reward-chip" title="${escapeHtml(name)}"><span aria-hidden="true">${icon}</span>${escapeHtml(name)}</span>`; }).join('') : '<span class="reward-empty">Play a mini-game to earn your first badge.</span>';
  }
  function renderPartyNames() {
    const count = Number($('#party-player-count').value || 2);
    $('#party-player-names').innerHTML = Array.from({ length: count }, (_, index) => `<label class="field">Player ${index + 1} nickname<input data-party-name="${index}" maxlength="12" value="Player ${index + 1}" autocomplete="off"></label>`).join('');
  }
  function getPartyPlayers() {
    const count = partyMode === 'solo' ? 1 : Number($('#party-player-count').value || 2);
    return Array.from({ length: count }, (_, index) => {
      const value = partyMode === 'solo' ? 'You' : $(`[data-party-name="${index}"]`)?.value.trim();
      return { name: (value || `Player ${index + 1}`).slice(0, 12), points: 0, streak: 0, position: 0 };
    });
  }
  function renderPartyBoard() {
    if (!partySession) return;
    const coords = [[1,1],[2,1],[3,1],[4,1],[5,1],[5,2],[5,3],[5,4],[5,5],[4,5],[3,5],[2,5],[1,5],[1,4],[1,3],[1,2]];
    const tileMarkup = coords.map(([column,row], index) => {
      const kind = index % 4 === 0 ? 'star' : index % 4 === 2 ? 'coin' : 'trail';
      const icon = kind === 'star' ? '★' : kind === 'coin' ? '+80' : `${index + 1}`;
      const tokens = partySession.players.map((player, playerIndex) => player.position === index ? `<span class="party-token token-${playerIndex}" title="${escapeHtml(player.name)}">${escapeHtml(player.name.slice(0,1).toUpperCase())}</span>` : '').join('');
      return `<div class="party-tile tile-${kind}${index === 0 ? ' tile-start' : ''}" data-space="${index}" style="grid-column:${column};grid-row:${row}" aria-label="Space ${index + 1}${kind === 'star' ? ', star bonus' : kind === 'coin' ? ', coin bonus' : ''}"><span class="party-tile-icon">${icon}</span>${tokens}</div>`;
    }).join('');
    $('#party-board').innerHTML = `${tileMarkup}<div class="party-board-center"><strong>CODE PARTY</strong><span>Round ${Math.min(partySession.turn + 1, partySession.totalTurns)} / ${partySession.totalTurns}</span><span>Roll · learn · score</span></div>`;
  }
  function renderPartyScoreboard() {
    if (!partySession) return;
    const active = partySession.players[partySession.turn % partySession.players.length];
    $('#party-scoreboard').innerHTML = [...partySession.players].sort((a,b) => b.points - a.points).map((player,index) => `<div class="party-player-score${player === active ? ' is-current' : ''}"><span class="party-rank">${index + 1}</span><span class="party-player-dot token-${partySession.players.indexOf(player)}">${escapeHtml(player.name.slice(0,1).toUpperCase())}</span><strong>${escapeHtml(player.name)}</strong><b>${player.points}</b></div>`).join('');
  }
  function renderPartyTurn() {
    if (!partySession) return;
    clearInterval(partyTimerId);
    const player = partySession.players[partySession.turn % partySession.players.length];
    const question = partySession.questions[partySession.turn % partySession.questions.length];
    partySession.remaining = 20;
    partySession.answered = false;
    $('#party-turn-label').textContent = partySession.mode === 'party' ? `${player.name} · your turn` : `Question ${partySession.turn + 1} of ${partySession.totalTurns}`;
    $('#party-timer-value').textContent = '20';
    $('#party-timer-fill').style.width = '100%';
    $('#party-question-topic').textContent = question.topic;
    $('#party-question-text').textContent = question.question;
    $('#party-question-options').innerHTML = question.options.map((option,index) => `<button class="party-option option-${index}" type="button" data-party-answer="${index}"><span>${String.fromCharCode(65+index)}</span>${escapeHtml(option)}</button>`).join('');
    $('#party-answer-feedback').textContent = partySession.mode === 'party' ? `Pass the device to ${player.name}, then choose an answer.` : 'Choose quickly for a bigger streak bonus.';
    $('#party-roll').hidden = true;
    $('#party-next').hidden = true;
    renderPartyBoard();
    renderPartyScoreboard();
    partyTimerId = setInterval(() => {
      if (!partySession || partySession.answered) return;
      partySession.remaining -= 1;
      $('#party-timer-value').textContent = String(Math.max(0,partySession.remaining));
      $('#party-timer-fill').style.width = `${Math.max(0,partySession.remaining) / 20 * 100}%`;
      if (partySession.remaining <= 0) answerParty(null);
    }, 1000);
  }
  function answerParty(answer) {
    if (!partySession || partySession.answered) return;
    partySession.answered = true;
    clearInterval(partyTimerId);
    const player = partySession.players[partySession.turn % partySession.players.length];
    const question = partySession.questions[partySession.turn % partySession.questions.length];
    const correct = answer !== null && Number(answer) === question.answer;
    $$('.party-option', $('#party-question-options')).forEach((button,index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add('is-correct');
      else if (answer !== null && index === Number(answer)) button.classList.add('is-wrong');
    });
    if (correct) {
      player.streak += 1;
      const earned = 100 + player.streak * 25 + partySession.remaining * 5;
      player.points += earned;
      $('#party-answer-feedback').textContent = `Correct! +${earned} points. ${question.why}`;
      $('#party-answer-feedback').className = 'party-feedback is-correct';
    } else {
      player.streak = 0;
      const correctText = question.options[question.answer];
      $('#party-answer-feedback').textContent = `${answer === null ? 'Time’s up!' : 'Not quite.'} The answer is “${correctText}.” ${question.why}`;
      $('#party-answer-feedback').className = 'party-feedback is-incorrect';
    }
    renderPartyScoreboard();
    $('#party-roll').hidden = false;
  }
  function rollPartyDie() {
    if (!partySession) return;
    const player = partySession.players[partySession.turn % partySession.players.length];
    const roll = 1 + Math.floor(Math.random() * 6);
    player.position = (player.position + roll) % 16;
    const landed = player.position;
    let bonus = 0;
    let note = `You rolled ${roll} and moved ${roll} spaces.`;
    if (landed % 4 === 0) { bonus = 250; note += ' Star space! +250 points.'; }
    else if (landed % 4 === 2) { bonus = 80; note += ' Coin space! +80 points.'; }
    player.points += bonus;
    renderPartyBoard();
    renderPartyScoreboard();
    $('#party-answer-feedback').textContent = note;
    $('#party-answer-feedback').className = 'party-feedback is-correct';
    $('#party-roll').hidden = true;
    if (partySession.turn + 1 >= partySession.totalTurns) finishParty();
    else $('#party-next').hidden = false;
  }
  function finishParty() {
    clearInterval(partyTimerId);
    const ranked = [...partySession.players].sort((a,b) => b.points - a.points);
    const winner = ranked[0];
    const storageKey = `code-party-best:${state.profileId}`;
    let records = [];
    try { records = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { records = []; }
    records.push({ name: winner.name, points: winner.points, date: new Date().toISOString() });
    records.sort((a,b) => b.points - a.points);
    localStorage.setItem(storageKey,JSON.stringify(records.slice(0,5)));
    state.gameData.xp += 25;
    state.gameData.coins = (state.gameData.coins || 0) + 15;
    state.gameData.rewards ||= [];
    if (!state.gameData.rewards.includes('code-party-board')) state.gameData.rewards.push('code-party-board');
    const today = dateKey(new Date());
    if (!state.gameData.days.includes(today)) state.gameData.days.push(today);
    saveGameData();
    $('#party-results').hidden = false;
    $('#party-results').innerHTML = `<div class="party-winner-mark" aria-hidden="true">🏆</div><p class="eyebrow">ROUND COMPLETE · +25 LEARNING XP · +15 COINS</p><h3>${partySession.players.length > 1 ? `${escapeHtml(winner.name)} wins!` : 'Sprint complete!'}</h3><p>Code Party Champion badge earned. Great work playing, learning, and checking your answers.</p><div class="party-final-scores">${ranked.map((player,index) => `<div><span>${index === 0 ? '★' : index + 1}</span><strong>${escapeHtml(player.name)}</strong><b>${player.points.toLocaleString()} points</b></div>`).join('')}</div>`;
    $('#party-question-card').hidden = true;
    $('#party-again').hidden = false;
    $('#party-next').hidden = true;
  }
  function startParty() {
    const players = getPartyPlayers();
    if (partyMode === 'party' && players.some(player => !player.name.trim())) return;
    partySession = { mode: partyMode, players, turn: 0, totalTurns: partyMode === 'solo' ? 8 : players.length * 3, questions: [...partyQuestions].sort(() => Math.random() - .5), remaining: 20, answered: false };
    $('#party-setup').hidden = true;
    $('#party-arena').hidden = false;
    $('#party-results').hidden = true;
    $('#party-question-card').hidden = false;
    $('#party-again').hidden = true;
    renderPartyTurn();
  }
  function leaveParty() {
    clearInterval(partyTimerId);
    partySession = null;
    $('#party-arena').hidden = true;
    $('#party-setup').hidden = false;
  }
  function onlineStatus(message, target = '#party-online-status') { $(target).textContent = message; }
  function saveOnlineParty() {
    if (onlineParty) sessionStorage.setItem('learncode-party-session', JSON.stringify({ code: onlineParty.code, token: onlineParty.token, id: onlineParty.id }));
    else sessionStorage.removeItem('learncode-party-session');
  }
  function onlineHeaders() { return onlineParty ? { 'X-Party-Session': onlineParty.token } : {}; }
  async function onlineRequest(path, body, method = 'POST') {
    return api(path, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }), headers: onlineHeaders() });
  }
  async function createOnlineRoom() {
    onlineStatus('Creating your private room…');
    try {
      const result = await api('/api/party/rooms', { method: 'POST', body: JSON.stringify({ nickname: $('#online-party-name').value.trim() }) });
      onlineParty = { code: result.state.code, token: result.token, id: result.state.me, host: true };
      onlineMessageCursor = 0; saveOnlineParty(); openOnlineRoom(result.state); onlineStatus('Room ready. Share the code with your friends.');
    } catch (error) { onlineStatus(error.message); }
  }
  async function joinOnlineRoom() {
    const code = $('#party-room-code').value.trim().toUpperCase();
    $('#party-room-code').value = code;
    onlineStatus('Joining the room…');
    try {
      const result = await api(`/api/party/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: JSON.stringify({ nickname: $('#online-party-name').value.trim() }) });
      onlineParty = { code: result.state.code, token: result.token, id: result.state.me, host: result.state.host === result.state.me };
      onlineMessageCursor = 0; saveOnlineParty(); openOnlineRoom(result.state); onlineStatus('You’re in. Say hi to the group.');
    } catch (error) { onlineStatus(error.message); }
  }
  function openOnlineRoom(initialState) {
    clearInterval(onlinePollId); clearInterval(onlineGameClock);
    $('#party-setup').hidden = true;
    $('#party-arena').hidden = true;
    $('#party-online-arena').hidden = false;
    $('#online-room-code').textContent = onlineParty.code;
    $('#online-chat-messages').replaceChildren();
    onlineRoomSignature = '';
    $('#online-game-stage').innerHTML = '<p class="online-waiting">Waiting for the host to start a game…</p>';
    $('#online-host-controls').hidden = !onlineParty.host;
    renderOnlineRoom(initialState);
    onlinePoll();
    onlinePollId = setInterval(onlinePoll, 1600);
  }
  function renderOnlineRoom(room) {
    if (!room || !onlineParty) return;
    $('#online-room-code').textContent = room.code;
    const host = room.host === room.me;
    onlineParty.host = host;
    $('#online-room-hint').textContent = host ? 'You’re hosting. Share the code, then start a game.' : 'You’re in the room. The host will start the next game.';
    $('#online-host-controls').hidden = !host || Boolean(room.game && room.game.phase !== 'complete');
    $('#online-player-count').textContent = String(room.players.length);
    $('#online-player-list').innerHTML = room.players.map((player, index) => `<div class="online-player"><span class="online-player-avatar online-avatar-${index % 4}">${escapeHtml(player.nickname.slice(0,1).toUpperCase())}</span><strong>${escapeHtml(player.nickname)}${player.id === room.me ? ' · you' : ''}</strong><span class="online-score">${Number(player.score).toLocaleString()} pts</span>${player.id === room.host ? '<span class="host-tag">HOST</span>' : ''}</div>`).join('') || '<p class="online-waiting">Waiting for players…</p>';
    const signature = JSON.stringify({ host: room.host, me: room.me, players: room.players, game: room.game });
    if (signature !== onlineRoomSignature) { onlineRoomSignature = signature; renderOnlineGame(room.game, room.players, room.me); }
  }
  function renderOnlineGame(game, players, me) {
    const stage = $('#online-game-stage');
    clearInterval(onlineGameClock);
    if (!game) { stage.innerHTML = '<p class="online-waiting">Waiting for the host to start a game… Choose AI Detective, Color Rush, or Bug Bash.</p>'; return; }
    const scoreboard = `<div class="online-scoreboard">${players.slice().sort((a,b) => b.score - a.score).map((player,index) => `<div class="online-score-line"><span>${index === 0 && Number(player.score) > 0 ? '★' : index + 1}</span><strong>${escapeHtml(player.nickname)}</strong><b>${Number(player.score).toLocaleString()}</b></div>`).join('')}</div>`;
    if (game.phase === 'complete') {
      const badgeNames = { 'ai-detective': 'AI Detective', 'color-rush': 'Color Rush', 'bug-bash': 'Bug Bash' };
      const winner = game.winner?.nickname || 'Your team';
      stage.innerHTML = `${scoreboard}<div class="online-complete"><span class="reward-medal">🏆</span><p class="eyebrow">GROUP GAME COMPLETE</p><h4>${escapeHtml(winner)} leads the board!</h4><p>Everyone earned the ${escapeHtml(badgeNames[game.mode] || 'Quiz Party')} badge. Play another round to collect more.</p>${onlineParty?.host ? '<button id="online-play-again" class="button primary" type="button">Play another game</button>' : '<p>Ask the host to start another game.</p>'}</div>`;
      $('#online-play-again')?.addEventListener('click', startOnlineGame);
      state.gameData.rewards ||= [];
      const badge = `team-${game.mode}`;
      if (!state.gameData.rewards.includes(badge)) {
        state.gameData.xp += 25;
        state.gameData.coins = (state.gameData.coins || 0) + 20;
        state.gameData.rewards.push(badge);
        saveGameData();
      }
      return;
    }
    if (!game.question) { stage.innerHTML = scoreboard; return; }
    const remaining = Math.max(0, Math.ceil((Number(game.deadline) - Date.now() / 1000)));
    const reveal = game.phase === 'reveal';
    const answers = game.playersAnswered || {};
    const answeredNames = players.filter(player => answers[player.id]).map(player => player.nickname);
    const response = reveal
      ? `<p class="online-feedback ${answers[me]?.correct ? 'is-correct' : ''}">${answers[me] ? (answers[me].correct ? `Nice answer · +${answers[me].points} points.` : 'Round complete. Try the next one.') : 'Time is up for this round.'} ${escapeHtml(game.question.why || '')}</p>`
      : `<p class="online-feedback">${game.hasAnswered ? 'Your answer is in. ' : 'Pick an answer before the timer ends. '}${game.answered}/${players.length} answered</p>`;
    stage.innerHTML = `${scoreboard}<div class="online-question"><div class="online-question-meta"><span class="party-topic">${escapeHtml(game.title)} · ROUND ${game.round}/${game.total}</span><span class="online-countdown" data-deadline="${Number(game.deadline)}">${remaining}s</span></div><h4>${escapeHtml(game.question.question)}</h4><div class="online-options">${game.question.options.map((option,index) => `<button type="button" class="online-option${reveal && index === game.question.answer ? ' correct' : ''}${reveal && answers[me]?.choice === index && !answers[me]?.correct ? ' incorrect' : ''}" data-online-choice="${index}" ${game.hasAnswered || reveal ? 'disabled' : ''}>${String.fromCharCode(65+index)} · ${escapeHtml(option)}</button>`).join('')}</div>${response}<p class="online-answered">${answeredNames.length ? `${answeredNames.map(escapeHtml).join(', ')} ${answeredNames.length === 1 ? 'has' : 'have'} answered.` : 'Be the first to answer!'}</p></div>`;
    $$('[data-online-choice]', stage).forEach(button => button.addEventListener('click', () => submitOnlineAnswer(Number(button.dataset.onlineChoice))));
    if (!reveal) onlineGameClock = setInterval(() => {
      const timer = $('[data-deadline]', stage);
      if (!timer) return;
      timer.textContent = `${Math.max(0, Math.ceil(Number(timer.dataset.deadline) - Date.now() / 1000))}s`;
    }, 300);
  }
  function appendOnlineMessages(messages = []) {
    const list = $('#online-chat-messages');
    messages.forEach(message => {
      const item = document.createElement('article');
      item.className = `online-chat-message${message.player_id === onlineParty?.id ? ' own-message' : ''}`;
      const meta = document.createElement('div'); meta.className = 'online-message-meta';
      const name = document.createElement('strong'); name.textContent = message.nickname;
      const time = document.createElement('time'); time.textContent = new Date(Number(message.created_at) * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const text = document.createElement('p'); text.textContent = message.body;
      meta.append(name, time); item.append(meta, text); list.append(item);
      onlineMessageCursor = Math.max(onlineMessageCursor, Number(message.id));
    });
    if (messages.length) list.scrollTop = list.scrollHeight;
  }
  async function onlinePoll() {
    if (!onlineParty || onlinePollBusy) return;
    onlinePollBusy = true;
    try {
      const result = await onlineRequest(`/api/party/rooms/${onlineParty.code}?since=${onlineMessageCursor}`, undefined, 'GET');
      renderOnlineRoom(result.state); appendOnlineMessages(result.state.messages);
      $('#online-chat-status').textContent = '';
    } catch (error) {
      onlineStatus(error.message, '#online-chat-status');
      if (error.data?.message?.includes('session expired')) closeOnlineRoom(false);
    } finally { onlinePollBusy = false; }
  }
  async function sendOnlineMessage(event) {
    event.preventDefault();
    const input = $('#online-chat-input'); const message = input.value.trim();
    if (!message || !onlineParty) return;
    $('#online-chat-status').textContent = 'Sending…';
    try { await onlineRequest(`/api/party/rooms/${onlineParty.code}/messages`, { message }); input.value = ''; $('#online-chat-status').textContent = ''; await onlinePoll(); }
    catch (error) { onlineStatus(error.message, '#online-chat-status'); }
  }
  async function startOnlineGame() {
    if (!onlineParty) return;
    $('#online-game-start').disabled = true;
    try {
      await onlineRequest(`/api/party/rooms/${onlineParty.code}/start`, { mode: $('#online-game-choice').value });
      await onlinePoll();
    } catch (error) { onlineStatus(error.message); }
    finally { $('#online-game-start').disabled = false; }
  }
  async function submitOnlineAnswer(choice) {
    if (!onlineParty) return;
    $$('[data-online-choice]').forEach(button => { button.disabled = true; });
    try { await onlineRequest(`/api/party/rooms/${onlineParty.code}/answer`, { choice }); await onlinePoll(); }
    catch (error) { onlineStatus(error.message, '#online-chat-status'); await onlinePoll(); }
  }
  async function closeOnlineRoom(sendLeave = true) {
    if (!onlineParty) return;
    clearInterval(onlinePollId); clearInterval(onlineGameClock);
    if (sendLeave) await onlineRequest(`/api/party/rooms/${onlineParty.code}/leave`, {}).catch(() => {});
    onlineParty = null; onlinePollId = null; saveOnlineParty();
    onlineRoomSignature = '';
    $('#party-online-arena').hidden = true; $('#party-setup').hidden = false;
    $('#party-online-status').textContent = 'You left the game room.';
  }
  async function restoreOnlineRoom() {
    try {
      const saved = JSON.parse(sessionStorage.getItem('learncode-party-session') || 'null');
      if (!saved?.code || !saved?.token || !saved?.id) return;
      onlineParty = saved; onlineMessageCursor = 0;
      const response = await onlineRequest(`/api/party/rooms/${onlineParty.code}?since=0`, undefined, 'GET');
      openOnlineRoom(response.state);
    } catch { sessionStorage.removeItem('learncode-party-session'); }
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
    const trialKey = `learner-started:${state.profileId}`;
    const startedAt = Number(localStorage.getItem(trialKey) || Date.now());
    if (!localStorage.getItem(trialKey)) localStorage.setItem(trialKey, String(startedAt));
    const trialDay = Math.floor((Date.now() - startedAt) / 86400000);
    if (trialDay >= 14 && !state.isPremium) {
      $('#daily-date-label').textContent = 'Free period complete';
      $('#daily-lesson').innerHTML = '<article class="daily-lesson"><h3>Your 14-day AI learning start is complete</h3><p>You can keep your completed practice. LeArNCoDiNg Plus unlocks continued AI concepts and the Python and web development paths.</p><button class="button primary" type="button" data-open-membership>Explore LeArNCoDiNg Plus</button></article>';
      $('[data-open-membership]', $('#daily-lesson')).addEventListener('click', () => $('#membership-card').scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
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
      const paidLock = index >= 2 && !state.isPremium;
      const sequenceLock = index > 0 && !completed.has(index - 1) && !done && !paidLock;
      const locked = paidLock || sequenceLock;
      const action = paidLock ? 'Unlock with Plus' : sequenceLock ? 'Finish previous lesson' : done ? 'Review lesson' : 'Start lesson';
      return `<article class="course-card${done ? ' is-complete' : ''}${locked ? ' is-locked' : ''}${paidLock ? ' is-premium-locked' : ''}"><div class="course-card-top"><span class="course-number">${String(index + 1).padStart(2, '0')}</span><span class="course-time">${done ? 'Complete' : paidLock ? 'Plus' : '10 min'}</span></div><p class="eyebrow">${escapeHtml(lesson.theme)}</p><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.goal)}</p><button class="button${done ? '' : ' primary'}" type="button" ${paidLock ? `data-course-premium="${index}"` : `data-course-open="${index}"`} ${sequenceLock ? 'disabled' : ''}>${action}</button></article>`;
    }).join('');
  }

  const questStoryBeats = [
    'The student maker lab has one afternoon to design a tiny learning tool. The team needs a clear plan before anyone starts building.',
    'The first page is hard to read from the lab tables. Give it a calm color system and make the important information easy to spot.',
    'The project needs useful controls. Make the page respond when a learner takes an action.',
    'A new student cannot use the mouse today. Check that the project still works with a keyboard and clear labels.',
    'The team added an AI helper. Decide what it should do, what it should not do, and how a learner can check its answer.',
    'Before showing the project, test it on a small screen, look for mistakes, and remove private information.',
    'The maker lab wants a Python welcome screen. Print a friendly message and save a learner’s chosen topic in a variable.',
    'The project should give different study advice for short and long sessions. Add a clear if/else decision.',
    'The lab has several study topics to show. Use a list and a loop so new topics are easy to add.'
  ];

  function openCourseLesson(index) {
    const lesson = creatorQuest[index];
    if (!lesson) return;
    const completed = new Set(state.gameData.courseCompleted || []);
    if ((index >= 2 && !state.isPremium) || (index > 0 && !completed.has(index - 1) && !completed.has(index))) return;
    const note = state.gameData.courseNotes?.[index] || '';
    $('#course-lesson-meta').textContent = `LESSON ${String(index + 1).padStart(2, '0')} OF ${String(creatorQuest.length).padStart(2, '0')} · ABOUT 10 MINUTES`;
    $('#course-lesson-title').textContent = lesson.title;
    $('#course-lesson-body').innerHTML = `<aside class="quest-story-beat"><span class="eyebrow">MISSION ${String(index + 1).padStart(2, '0')} · MAKER LAB STORY</span><p>${escapeHtml(questStoryBeats[index] || 'The maker lab has a new challenge. Use your skills, try an idea, and check your work.')}</p></aside><p class="course-goal">${escapeHtml(lesson.goal)}</p><section class="lesson-reading"><h3>Learn it</h3>${lesson.learn.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section><section class="lesson-activity"><div><p class="eyebrow">YOUR 5-MINUTE BUILD</p><h3>Try it now</h3><ol>${lesson.activity.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><p><strong>Want a challenge?</strong> ${escapeHtml(lesson.stretch)}</p></div></section><section class="lesson-check"><p class="eyebrow">CHECKPOINT</p><h3>${escapeHtml(lesson.question)}</h3><div class="lesson-answers">${lesson.options.map((option, optionIndex) => `<button type="button" class="lesson-answer" data-course-answer="${optionIndex}">${escapeHtml(option)}</button>`).join('')}</div><p id="course-answer-feedback" class="course-answer-feedback" role="status" aria-live="polite"></p></section><label class="field lesson-reflection">What did you make or learn? <span class="muted">(optional)</span><textarea id="course-reflection" rows="3" maxlength="400" placeholder="Write one thing you want to remember…">${escapeHtml(note)}</textarea></label><div class="lesson-footer"><span id="course-xp-note" class="muted">Pass the checkpoint to save this lesson and earn 50 XP.</span><button id="course-finish" class="button primary" type="button" disabled>Save checkpoint</button></div>`;
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
  function initialsFor(name) {
    return String(name || 'LeArNCoDiNg').trim().split(/\s+/).slice(0, 2).map(part => part[0] || '').join('').toUpperCase().slice(0, 2) || 'LC';
  }
  const avatarOptions = [
    { icon: '', xp: 0 }, { icon: '🐱', xp: 40 }, { icon: '🚀', xp: 100 },
    { icon: '🦊', xp: 200 }, { icon: '🐉', xp: 350 }, { icon: '🌈', xp: 500 }
  ];
  function renderAvatarOptions() {
    const xp = Number(state.gameData.xp || 0);
    $('#avatar-xp-total').textContent = `${xp} XP earned`;
    $$('[data-avatar-icon]').forEach(button => {
      const required = Number(button.dataset.avatarXp || 0);
      const unlocked = xp >= required;
      button.disabled = !unlocked;
      button.classList.toggle('locked', !unlocked);
      button.setAttribute('aria-pressed', String((button.dataset.avatarIcon || '') === state.avatarIcon));
      const lock = button.querySelector('[data-avatar-lock]');
      if (lock) lock.textContent = unlocked ? 'Unlocked' : `${required} XP to unlock`;
    });
  }
  function renderAvatar(initials, color, icon = state.avatarIcon) {
    const safeInitials = String(initials || 'LC').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 2) || 'LC';
    const safeColor = /^#[0-9a-f]{6}$/i.test(color || '') ? color : '#6c4ccf';
    const safeIcon = avatarOptions.some(option => option.icon === icon && Number(state.gameData.xp || 0) >= option.xp) ? icon : '';
    state.avatarColor = safeColor;
    state.avatarIcon = safeIcon;
    for (const avatar of [$('#profile-avatar'), $('#profile-preview')]) {
      avatar.textContent = safeIcon || safeInitials;
      avatar.style.setProperty('--avatar-color', safeColor);
    }
    renderAvatarOptions();
    $('#profile-initials').value = safeInitials;
    $$('[data-avatar-color]').forEach(button => {
      const selected = button.dataset.avatarColor.toLowerCase() === safeColor.toLowerCase();
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function renderProfile(profile) {
    state.account = profile;
    const defaultInitials = initialsFor(profile.name);
    const displayName = String(profile.name || profile.email || 'Your account').trim();
    $('#profile-label').textContent = displayName.split(/\s+/)[0];
    $('#profile-email').textContent = profile.email || 'Signed in with Google';
    const key = `learncode-avatar:${state.profileId}`;
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { saved = {}; }
    renderAvatar(saved.initials || defaultInitials, saved.color || '#6c4ccf', saved.icon || '');
    $('#profile-button').hidden = false;
  }
  function openVeritasEmbed() {
    $('#cobit-panel').hidden = true;
    $('#cobit-toggle').setAttribute('aria-expanded', 'false');
    $('#veritas-embed').hidden = false;
    $('#veritas-embed-toggle').setAttribute('aria-expanded', 'true');
  }
  function closeVeritasEmbed() {
    $('#veritas-embed').hidden = true;
    $('#veritas-embed-toggle').setAttribute('aria-expanded', 'false');
    $('#veritas-embed-toggle').focus();
  }
  function openCobit() {
    $('#veritas-embed').hidden = true;
    $('#veritas-embed-toggle').setAttribute('aria-expanded', 'false');
    $('#cobit-panel').hidden = false;
    $('#cobit-toggle').setAttribute('aria-expanded', 'true');
    $('#cobit-input').focus();
  }
  function closeCobit() {
    $('#cobit-panel').hidden = true;
    $('#cobit-toggle').setAttribute('aria-expanded', 'false');
    $('#cobit-toggle').focus();
  }
  function appendVeritasMessage(message, sender) {
    const item = document.createElement('p');
    item.className = `veritas-message ${sender}-message`;
    item.textContent = sender === 'coach'
      ? message.replace(/([.!?])\s+(?=[A-Z“])/g, '$1\n\n')
      : message;
    $('#cobit-messages').append(item);
    $('#cobit-messages').scrollTop = $('#cobit-messages').scrollHeight;
  }
  async function sendVeritasMessage(event) {
    event.preventDefault();
    const input = $('#cobit-input');
    const message = input.value.trim();
    if (!message || veritasBusy) return;
    veritasBusy = true;
    $('#cobit-send').disabled = true;
    input.disabled = true;
    $('#cobit-status').textContent = 'Veritas is thinking…';
    appendVeritasMessage(message, 'user');
    try {
      const response = await fetch('/api/veritas/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, state: veritasState })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.message || 'The coach service could not answer right now.');
      veritasState = result.state && typeof result.state === 'object' ? result.state : {};
      appendVeritasMessage(String(result.reply || 'I don’t have a reply yet. Try asking another way.'), 'coach');
      input.value = '';
      $('#cobit-status').textContent = '';
    } catch (error) {
      $('#cobit-status').textContent = `${error.message || 'Could not reach Veritas.'} Your message is still here; try again when you’re ready.`;
    } finally {
      veritasBusy = false;
      $('#cobit-send').disabled = false;
      input.disabled = false;
      input.focus();
    }
  }
  let tesseractLoading = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!tesseractLoading) {
      tesseractLoading = (async () => {
        for (const src of ['https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js', 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js']) {
          try {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              const timer = setTimeout(() => { script.remove(); reject(new Error('Photo reader timed out.')); }, 12000);
              script.src = src;
              script.onload = () => { clearTimeout(timer); resolve(); };
              script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('Photo reader could not load.')); };
              document.head.append(script);
            });
            if (window.Tesseract) return window.Tesseract;
          } catch { /* Try the next supported CDN. */ }
        }
        throw new Error('Photo reading needs an internet connection. You can type the question instead.');
      })().catch(error => { tesseractLoading = null; throw error; });
    }
    return tesseractLoading;
  }
  async function readHomeworkPhoto(file) {
    const status = $('#veritas-photo-status');
    if (!file) return;
    if (!file.type.startsWith('image/')) { status.textContent = 'Choose an image file such as JPG or PNG.'; return; }
    if (file.size > 6 * 1024 * 1024) { status.textContent = 'Please choose a photo smaller than 6 MB.'; return; }
    if (homeworkPhotoUrl) URL.revokeObjectURL(homeworkPhotoUrl);
    homeworkPhotoUrl = URL.createObjectURL(file);
    const preview = $('#veritas-photo-preview');
    preview.src = homeworkPhotoUrl;
    preview.hidden = false;
    const button = $('#veritas-photo-button');
    button.disabled = true;
    status.textContent = 'Preparing the photo reader…';
    try {
      const tesseract = await loadTesseract();
      status.textContent = 'Reading clear printed text…';
      const result = await tesseract.recognize(file, 'eng');
      const recognized = String(result.data.text || '').replace(/\s+/g, ' ').trim();
      if (!recognized) throw new Error('I could not read text in that photo. Try a brighter, closer picture or type the question.');
      $('#cobit-input').value = `Help me understand this homework: ${recognized}`.slice(0, 500);
      $('#cobit-input').focus();
      status.textContent = 'Text added to your message. Check it for mistakes, then press Send. The photo stays on this device.';
    } catch (error) {
      status.textContent = error.message || 'I could not read that photo. Try another picture or type the question.';
    } finally {
      button.disabled = false;
    }
  }
  function renderMembership(message = '') {
    const card = $('#membership-card');
    const button = $('#membership-cta');
    const manage = $('#membership-manage');
    card.classList.toggle('is-active', state.isPremium);
    button.hidden = state.isPremium;
    manage.hidden = !state.isPremium || !state.checkoutEnabled;
    if (state.isPremium) {
      $('#membership-status').textContent = message || 'LeArNCoDiNg Plus is active on your account.';
      button.textContent = 'Plus membership active';
      button.disabled = true;
      $('#membership-note').textContent = 'Your full creator quest and advanced learning paths are unlocked.';
    } else if (state.checkoutEnabled) {
      $('#membership-status').textContent = message || 'Unlock the full creator quest and advanced learning paths.';
      button.textContent = 'Continue to secure checkout';
      button.disabled = false;
      $('#membership-note').textContent = 'Price and billing terms are shown by the payment provider before you confirm.';
    } else {
      $('#membership-status').textContent = message || 'Your free lessons, daily AI idea, articles, and mini-games are available now. Plus is not available to buy yet.';
      button.textContent = 'Plus is not available yet';
      button.disabled = true;
      $('#membership-note').textContent = 'No payment can be made right now. Ask a parent or guardian to review any future paid plan.';
    }
  }
  async function refreshMembership() {
    let returnMessage = '';
    const params = new URLSearchParams(window.location.search);
    const checkoutSession = params.get('membership_session');
    if (checkoutSession) {
      try {
        const result = await api('/api/billing/confirm', { method: 'POST', body: JSON.stringify({ session_id: checkoutSession }) });
        state.isPremium = Boolean(result.premium);
        returnMessage = result.premium ? 'Payment confirmed. Your Plus lessons are unlocked.' : 'We could not confirm membership yet. You can refresh in a moment.';
      } catch (error) { returnMessage = error.message; }
      params.delete('membership_session');
      const cleanUrl = `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleanUrl);
    }
    try {
      const status = await api('/api/billing/status');
      state.checkoutEnabled = Boolean(status.checkout_enabled);
      state.isPremium = Boolean(status.premium);
      renderMembership(returnMessage);
    } catch (error) {
      state.checkoutEnabled = false;
      renderMembership(returnMessage || error.message);
    }
    renderCoursePath();
  }
  async function startMembershipCheckout() {
    const button = $('#membership-cta');
    button.disabled = true;
    button.textContent = 'Opening secure checkout…';
    try {
      const result = await api('/api/billing/checkout', { method: 'POST', body: JSON.stringify({}) });
      if (!result.checkout_url || !new URL(result.checkout_url).hostname.endsWith('stripe.com')) throw new Error('The secure checkout link could not be verified.');
      window.location.assign(result.checkout_url);
    } catch (error) {
      renderMembership(error.message);
    }
  }
  async function openMembershipPortal() {
    const button = $('#membership-manage');
    button.disabled = true;
    button.textContent = 'Opening membership settings…';
    try {
      const result = await api('/api/billing/portal', { method: 'POST', body: JSON.stringify({}) });
      if (!result.portal_url || !result.portal_url.startsWith('https://billing.stripe.com/')) throw new Error('The secure membership settings page could not be verified.');
      window.location.assign(result.portal_url);
    } catch (error) {
      button.disabled = false;
      button.textContent = 'Manage or cancel membership';
      $('#membership-status').textContent = error.message;
    }
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
    const trialKey = `learner-started:${studentId}`;
    if (!localStorage.getItem(trialKey)) localStorage.setItem(trialKey, String(Date.now()));
    $('#calendar-student-id').value = studentId;
    const surveyId = $('#survey-form [name="student_id"]');
    if (surveyId) surveyId.value = studentId;
    const lookupId = $('#student-lookup [name="student_id"]');
    if (lookupId) lookupId.value = studentId;
    loadGameData();
    renderProfile(profile);
    renderGames(); updateArcadeScore(); renderCalendar(); renderCoursePath(); renderDailyAi(); renderReadingShelf();
    document.body.classList.remove('signed-out');
    setView('play');
    renderMembership();
    refreshMembership();
    restoreOnlineRoom();
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
    const supabaseReady = Boolean(config.supabase_url && config.supabase_anon_key && window.supabase?.createClient);
    if (supabaseReady) {
      try {
        supabaseClient = window.supabase.createClient(config.supabase_url, config.supabase_anon_key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        $('#email-auth-status').textContent = 'Sign in with your email or make an account to get started.';
        supabaseClient.auth.onAuthStateChange(event => {
          if (event === 'PASSWORD_RECOVERY') $('#password-update-dialog').showModal();
        });
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.access_token) {
          const result = await api('/api/auth/supabase', { method: 'POST', body: JSON.stringify({ access_token: session.access_token }) });
          sessionStorage.setItem('student-google-token', session.access_token);
          enterAfterGoogle(result.profile);
          return;
        }
      } catch (error) {
        sessionStorage.removeItem('student-google-token');
        $('#email-auth-status').textContent = error.message || 'Could not restore your account. Please sign in again.';
      }
    }
    privatePreviewAvailable = config.allow_private_preview === true;
    $('#private-preview-signin').hidden = !privatePreviewAvailable;
    const previousToken = sessionStorage.getItem('student-google-token');
    if (privatePreviewAvailable && previousToken === 'local-private-preview') {
      enterAfterGoogle({ sub: 'local-private-preview', email: 'private-preview@localhost', name: 'Private Preview Learner' });
      return;
    }
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
    let googleWaits = 0;
    const renderButton = () => {
      if (!window.google?.accounts?.id) {
        if (googleWaits++ >= 40) { $('#signin-message').textContent = 'Google sign-in could not load. Check your connection, then refresh this page.'; $('#google-signin-fallback').hidden = false; return; }
        window.setTimeout(renderButton, 200); return;
      }
      window.google.accounts.id.initialize({ client_id: googleClientId, callback: response => acceptGoogleCredential(response.credential) });
      window.google.accounts.id.renderButton($('#google-signin-button'), { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', width: 300 });
      $('#signin-message').textContent = 'Choose a Google account to continue.';
    };
    renderButton();
  }
  $('#email-login-form').addEventListener('submit', event => {
    event.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const status = $('#email-auth-status');
    if (!supabaseClient) { status.textContent = 'Email sign-in isn’t configured on this site yet. The site owner must add Supabase settings and redeploy.'; return; }
    status.textContent = authMode === 'signup' ? 'Creating your account…' : 'Signing in…';
    const task = authMode === 'signup'
      ? supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : supabaseClient.auth.signInWithPassword({ email, password });
    task.then(async ({ data, error }) => {
      if (error) throw error;
      if (authMode === 'signup' && !data.session) { status.textContent = 'Check your email for a confirmation link, then come back here to sign in.'; return; }
      const session = data.session;
      if (!session?.access_token) throw new Error('Sign-in did not return a session. Confirm your email, then try again.');
      const verified = await api('/api/auth/supabase', { method: 'POST', body: JSON.stringify({ access_token: session.access_token }) });
      sessionStorage.setItem('student-google-token', session.access_token);
      enterAfterGoogle(verified.profile);
    }).catch(error => { status.textContent = error.message || 'Could not sign in. Check your email and password and try again.'; });
  });
  $('#make-account-button').addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'signin' : 'signup';
    $('#welcome-auth-title').textContent = authMode === 'signup' ? 'Create your account' : 'Welcome back!';
    $('#email-login-form button[type="submit"]').textContent = authMode === 'signup' ? 'Create account' : 'Sign in';
    $('#make-account-button').textContent = authMode === 'signup' ? 'Sign in instead' : 'Make an account';
    $('#login-password').autocomplete = authMode === 'signup' ? 'new-password' : 'current-password';
    $('#email-auth-status').textContent = authMode === 'signup' ? 'Use an email you can open to confirm your account.' : 'Enter your email and password to continue.';
    $('#login-email').focus();
  });
  $('#forgot-password-link').addEventListener('click', event => {
    event.preventDefault();
    if (!supabaseClient) { $('#email-auth-status').textContent = 'Password reset is not configured on this deployment yet.'; return; }
    const email = $('#login-email').value.trim();
    if (!email) { $('#email-auth-status').textContent = 'Enter your email first, then choose “Forgot it?” again.'; $('#login-email').focus(); return; }
    $('#email-auth-status').textContent = 'Sending a reset link…';
    supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }).then(({ error }) => {
      $('#email-auth-status').textContent = error ? error.message : 'If an account uses that email, a password reset link will arrive shortly.';
    });
  });
  $('#password-update-cancel').addEventListener('click', () => { $('#password-update-dialog').close(); supabaseClient?.auth.signOut(); });
  $('#password-update-form').addEventListener('submit', async event => {
    event.preventDefault();
    const status = $('#password-update-status'); status.textContent = 'Updating your password…';
    const { data, error } = await supabaseClient.auth.updateUser({ password: $('#new-account-password').value });
    if (error) { status.textContent = error.message; return; }
    $('#password-update-dialog').close();
    $('#new-account-password').value = '';
    if (data.user) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.access_token) {
        try { const verified = await api('/api/auth/supabase', { method: 'POST', body: JSON.stringify({ access_token: session.access_token }) }); sessionStorage.setItem('student-google-token', session.access_token); enterAfterGoogle(verified.profile); return; }
        catch (authError) { $('#email-auth-status').textContent = authError.message; }
      }
    }
    $('#email-auth-status').textContent = 'Your password was updated. You can sign in now.';
  });
  $('#private-preview-signin').addEventListener('click', () => {
    if (!privatePreviewAvailable) return;
    sessionStorage.setItem('student-google-token', 'local-private-preview');
    enterAfterGoogle({ sub: 'local-private-preview', email: 'private-preview@localhost', name: 'Private Preview Learner' });
  });
  $('#home-link').addEventListener('click', event => {
    event.preventDefault();
    setView(document.body.classList.contains('signed-out') ? 'welcome' : 'play');
  });
  $('#profile-button').addEventListener('click', () => {
    $('#profile-save-message').textContent = '';
    $('#profile-dialog').showModal();
    $('#profile-initials').focus();
  });
  $('#profile-close').addEventListener('click', () => $('#profile-dialog').close());
  $('#profile-initials').addEventListener('input', event => {
    const value = event.currentTarget.value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 2);
    event.currentTarget.value = value;
    $('#profile-preview').textContent = value || 'LC';
  });
  $$('[data-avatar-color]').forEach(button => button.addEventListener('click', () => renderAvatar($('#profile-initials').value || initialsFor(state.account?.name), button.dataset.avatarColor, state.avatarIcon)));
  $$('[data-avatar-icon]').forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return;
    renderAvatar($('#profile-initials').value || initialsFor(state.account?.name), state.avatarColor, button.dataset.avatarIcon || '');
  }));
  $('#profile-save').addEventListener('click', () => {
    const initials = $('#profile-initials').value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 2) || initialsFor(state.account?.name);
    localStorage.setItem(`learncode-avatar:${state.profileId}`, JSON.stringify({ initials, color: state.avatarColor, icon: state.avatarIcon }));
    renderAvatar(initials, state.avatarColor, state.avatarIcon);
    $('#profile-save-message').textContent = 'Your icon is saved on this device.';
  });
  $('#profile-signout').addEventListener('click', () => {
    if (onlineParty) closeOnlineRoom();
    if (supabaseClient) supabaseClient.auth.signOut();
    sessionStorage.removeItem('student-google-token');
    if (window.google?.accounts?.id) window.google.accounts.id.disableAutoSelect();
    $('#profile-dialog').close();
    $('#profile-button').hidden = true;
    $('#cobit-panel').hidden = true;
    $('#cobit-toggle').setAttribute('aria-expanded', 'false');
    $('#veritas-embed').hidden = true;
    $('#veritas-embed-toggle').setAttribute('aria-expanded', 'false');
    state.account = null;
    document.body.classList.add('signed-out');
    setView('welcome');
    $('#email-auth-status').textContent = 'You’re signed out. Sign in with your email to continue.';
  });
  $('#start-daily-button').addEventListener('click', () => $('#daily-ai-title').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#start-game-button').addEventListener('click', () => $('#party-setup').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#start-veritas-button').addEventListener('click', openVeritasEmbed);
  $('#start-photo-button').addEventListener('click', () => { openCobit(); $('#veritas-photo-button').click(); });
  $('#veritas-embed-toggle').addEventListener('click', () => $('#veritas-embed').hidden ? openVeritasEmbed() : closeVeritasEmbed());
  $('#cobit-toggle').addEventListener('click', () => $('#cobit-panel').hidden ? openCobit() : closeCobit());
  $('#cobit-close').addEventListener('click', closeCobit);
  $('#cobit-form').addEventListener('submit', sendVeritasMessage);
  $('#veritas-photo-button').addEventListener('click', () => $('#veritas-photo-input').click());
  $('#veritas-photo-input').addEventListener('change', event => readHomeworkPhoto(event.currentTarget.files?.[0]));
  $('#cobit-panel').addEventListener('click', event => {
    const prompt = event.target.closest('[data-veritas-prompt]');
    if (!prompt || veritasBusy) return;
    $('#cobit-input').value = prompt.dataset.veritasPrompt;
    $('#cobit-form').requestSubmit();
  });
  $('#cobit-input').addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('#cobit-form').requestSubmit(); }
  });
  $('#membership-cta').addEventListener('click', startMembershipCheckout);
  $('#membership-manage').addEventListener('click', openMembershipPortal);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!$('#cobit-panel').hidden) closeCobit();
    else if (!$('#veritas-embed').hidden) closeVeritasEmbed();
  });
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

  const studyTasksKey = 'learncoding-study-tasks-v1';
  let studyTimer = null;
  function readStudyTasks() {
    try { const tasks = JSON.parse(localStorage.getItem(studyTasksKey) || '[]'); return Array.isArray(tasks) ? tasks : []; }
    catch { return []; }
  }
  function renderStudyTasks() {
    const tasks = readStudyTasks().sort((a, b) => Number(a.done) - Number(b.done) || a.due.localeCompare(b.due));
    $('#study-task-count').textContent = `${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`;
    $('#study-task-list').innerHTML = tasks.length ? tasks.map(task => {
      const dueDate = new Date(`${task.due}T12:00:00`);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const late = !task.done && dueDate < today;
      const dueLabel = dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `<article class="study-task${task.done ? ' is-done' : ''}${late ? ' is-late' : ''}"><label class="study-task-check"><input type="checkbox" data-study-done="${escapeHtml(task.id)}" ${task.done ? 'checked' : ''}><span class="sr-only">Mark ${escapeHtml(task.title)} complete</span></label><div class="study-task-copy"><span class="study-task-subject">${escapeHtml(task.subject)}</span><strong>${escapeHtml(task.title)}</strong><span class="study-task-due">${late ? 'Overdue · ' : 'Due '}${dueLabel}</span></div><button type="button" class="study-task-delete" data-study-delete="${escapeHtml(task.id)}" aria-label="Delete ${escapeHtml(task.title)}">×</button></article>`;
    }).join('') : '<p class="study-empty">Your list is clear. Add one assignment when you’re ready.</p>';
  }
  $('#study-task-due').min = new Date().toLocaleDateString('en-CA');
  $('#study-task-form').addEventListener('submit', event => {
    event.preventDefault();
    const tasks = readStudyTasks();
    tasks.push({ id: crypto.randomUUID(), subject: $('#study-subject').value, title: $('#study-task-title').value.trim(), due: $('#study-task-due').value, done: false });
    localStorage.setItem(studyTasksKey, JSON.stringify(tasks));
    event.currentTarget.reset(); $('#study-task-due').min = new Date().toLocaleDateString('en-CA');
    renderStudyTasks(); $('#study-task-title').focus();
  });
  $('#study-task-list').addEventListener('change', event => {
    const id = event.target.dataset.studyDone; if (!id) return;
    localStorage.setItem(studyTasksKey, JSON.stringify(readStudyTasks().map(task => task.id === id ? { ...task, done: event.target.checked } : task)));
    renderStudyTasks();
  });
  $('#study-task-list').addEventListener('click', event => {
    const id = event.target.closest('[data-study-delete]')?.dataset.studyDelete; if (!id) return;
    localStorage.setItem(studyTasksKey, JSON.stringify(readStudyTasks().filter(task => task.id !== id))); renderStudyTasks();
  });
  $$('[data-focus-minutes]').forEach(button => button.addEventListener('click', () => {
    clearInterval(studyTimer);
    let seconds = Number(button.dataset.focusMinutes) * 60;
    const status = $('#study-focus-status');
    const update = () => { const min = Math.floor(seconds / 60); const sec = String(seconds % 60).padStart(2, '0'); status.textContent = seconds ? `Focus time · ${min}:${sec} remaining` : 'Focus block complete. Take a short break!'; if (!seconds) clearInterval(studyTimer); seconds -= 1; };
    update(); studyTimer = setInterval(update, 1000);
  }));
  renderStudyTasks();
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
  $$('[data-party-mode]').forEach(button => button.addEventListener('click', () => {
    partyMode = button.dataset.partyMode;
    $$('[data-party-mode]').forEach(option => option.classList.toggle('selected', option === button));
    $('#party-player-settings').hidden = partyMode !== 'party';
    $('#party-online-settings').hidden = partyMode !== 'online';
    $('#party-start-row').hidden = partyMode === 'online';
    if (partyMode === 'party') renderPartyNames();
  }));
  $('#party-player-count').addEventListener('change', renderPartyNames);
  $('#party-start').addEventListener('click', startParty);
  $('#party-room-create').addEventListener('click', createOnlineRoom);
  $('#party-room-join').addEventListener('click', joinOnlineRoom);
  $('#party-room-code').addEventListener('input', event => { event.currentTarget.value = event.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
  $('#party-room-code').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); joinOnlineRoom(); } });
  $('#party-online-leave').addEventListener('click', () => closeOnlineRoom());
  $('#online-game-start').addEventListener('click', startOnlineGame);
  $('#online-chat-form').addEventListener('submit', sendOnlineMessage);
  $('#party-question-options').addEventListener('click', event => {
    const answer = event.target.closest('[data-party-answer]');
    if (answer) answerParty(Number(answer.dataset.partyAnswer));
  });
  $('#party-roll').addEventListener('click', rollPartyDie);
  $('#party-next').addEventListener('click', () => {
    if (!partySession) return;
    partySession.turn += 1;
    renderPartyTurn();
  });
  $('#party-again').addEventListener('click', startParty);
  $('#party-exit').addEventListener('click', leaveParty);
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
    const upgrade = event.target.closest('[data-course-premium]');
    if (upgrade) { $('#membership-card').scrollIntoView({ behavior: 'smooth', block: 'center' }); $('#membership-cta').focus({ preventScroll: true }); return; }
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

// Cross-subject Discovery Studio activities. All sample data is clearly marked as illustrative.
(() => {
  const conditionSelect = document.getElementById('plant-condition');
  const chart = document.getElementById('plant-growth-chart');
  const summary = document.getElementById('plant-growth-summary');
  const quiz = document.getElementById('subjects-quiz');
  if (!conditionSelect || !chart || !summary || !quiz) return;

  const plantSamples = {
    low: { label: 'lower-light sample', values: [1, 1.4, 1.8, 2.1, 2.5, 2.8, 3.1] },
    steady: { label: 'steady-light sample', values: [1, 2.1, 3.2, 4.4, 5.7, 7.1, 8.4] },
    bright: { label: 'brighter-light sample', values: [1, 2.4, 4.0, 5.8, 7.4, 9.1, 10.2] }
  };

  function renderPlantChart() {
    const sample = plantSamples[conditionSelect.value] || plantSamples.steady;
    const max = Math.max(...sample.values);
    chart.setAttribute('aria-label', `Illustrative seven-day plant growth practice data for the ${sample.label}. Heights range from ${sample.values[0]} to ${max} centimeters.`);
    chart.innerHTML = sample.values.map((value, index) => `
      <div class="plant-chart-day" aria-hidden="true">
        <div class="plant-bar-track"><span class="plant-bar" style="height:${Math.max(8, (value / max) * 100)}%"></span></div>
        <span class="plant-chart-value">${value.toFixed(1)} cm</span>
        <span class="plant-chart-label">Day ${index + 1}</span>
      </div>`).join('');
    summary.textContent = `In this practice dataset, the recorded height changes from ${sample.values[0].toFixed(1)} cm to ${max.toFixed(1)} cm over seven days. A pattern in sample data does not prove that light alone caused the change.`;
  }
  conditionSelect.addEventListener('change', renderPlantChart);
  renderPlantChart();

  const questions = [
    { subject: 'Biology', question: 'Which organ pumps blood through the body?', choices: ['Lungs', 'Heart', 'Stomach'], answer: 1, why: 'The heart is a muscle that pumps blood. The lungs help exchange oxygen and carbon dioxide.' },
    { subject: 'Math', question: 'Which decimal is equal to 3/4?', choices: ['0.34', '0.70', '0.75'], answer: 2, why: 'Three divided by four is 0.75. You can also think of 3/4 as 75 out of 100.' },
    { subject: 'Physics', question: 'A toy car travels 12 meters in 3 seconds. What is its average speed?', choices: ['4 meters per second', '9 meters per second', '36 meters per second'], answer: 0, why: 'Average speed is distance divided by time: 12 ÷ 3 = 4 meters per second.' },
    { subject: 'Earth science', question: 'What is the name for water vapor cooling into tiny liquid drops in clouds?', choices: ['Condensation', 'Evaporation', 'Erosion'], answer: 0, why: 'Condensation happens when water vapor cools and changes into liquid droplets.' },
    { subject: 'History', question: 'Which item is usually a primary source about a past event?', choices: ['A diary written by someone who was there', 'A modern encyclopedia entry', 'A recent movie about the event'], answer: 0, why: 'A diary made by a person who experienced the event is a firsthand source. Historians still compare sources and check context.' },
    { subject: 'English', question: 'In “The curious student built a robot,” which word is the verb?', choices: ['curious', 'student', 'built'], answer: 2, why: '“Built” tells what the student did, so it is the verb.' }
  ];
  let questionIndex = 0;
  let score = 0;
  let answered = false;

  function renderQuiz() {
    if (questionIndex >= questions.length) {
      quiz.innerHTML = `<div class="subject-quiz-result"><p class="eyebrow">QUEST COMPLETE</p><h4>You scored ${score} of ${questions.length}</h4><p>You explored six different subjects. Keep asking how ideas connect.</p><button class="button primary" type="button" data-restart-subject-quiz>Try the quest again</button></div>`;
      quiz.querySelector('[data-restart-subject-quiz]').addEventListener('click', () => {
        questionIndex = 0;
        score = 0;
        answered = false;
        renderQuiz();
      });
      return;
    }
    const item = questions[questionIndex];
    quiz.innerHTML = `
      <div class="subject-quiz-progress"><span>${item.subject}</span><span>Question ${questionIndex + 1} of ${questions.length}</span></div>
      <h4 class="subject-quiz-question">${item.question}</h4>
      <div class="subject-quiz-choices" role="group" aria-label="Answer choices">${item.choices.map((choice, index) => `<button class="subject-quiz-choice" type="button" data-subject-choice="${index}">${choice}</button>`).join('')}</div>
      <p class="subject-quiz-feedback" role="status" aria-live="polite"></p>
      <button class="button primary subject-quiz-next" type="button" hidden>${questionIndex === questions.length - 1 ? 'See my result' : 'Next subject'}</button>`;
    const feedback = quiz.querySelector('.subject-quiz-feedback');
    const next = quiz.querySelector('.subject-quiz-next');
    quiz.querySelectorAll('[data-subject-choice]').forEach(button => button.addEventListener('click', () => {
      if (answered) return;
      answered = true;
      const picked = Number(button.dataset.subjectChoice);
      const correct = picked === item.answer;
      if (correct) score += 1;
      quiz.querySelectorAll('[data-subject-choice]').forEach((choiceButton, index) => {
        choiceButton.disabled = true;
        if (index === item.answer) choiceButton.classList.add('is-correct');
        else if (index === picked) choiceButton.classList.add('is-incorrect');
      });
      feedback.className = `subject-quiz-feedback ${correct ? 'is-correct' : 'is-incorrect'}`;
      feedback.textContent = `${correct ? 'That’s right. ' : 'Good try. '}${item.why}`;
      next.hidden = false;
    }));
    next.addEventListener('click', () => {
      questionIndex += 1;
      answered = false;
      renderQuiz();
    });
  }
  renderQuiz();
})();
// Installable app support. The service worker caches only the public app shell;
// authentication, learner records, and multiplayer requests always stay online.
(() => {
  const installButton = document.getElementById('install-app-button');
  const offlineStatus = document.getElementById('offline-status');
  const installDialog = document.getElementById('install-help-dialog');
  const installCopy = document.getElementById('install-help-copy');
  if (!installButton) return;

  let pendingInstall = null;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) installButton.hidden = true;

  const updateConnection = () => {
    if (offlineStatus) offlineStatus.hidden = navigator.onLine;
  };
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  updateConnection();

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingInstall = event;
    installButton.hidden = false;
    installButton.textContent = 'Install app';
  });

  window.addEventListener('appinstalled', () => {
    pendingInstall = null;
    installButton.hidden = true;
  });

  installButton.addEventListener('click', async () => {
    if (pendingInstall) {
      pendingInstall.prompt();
      await pendingInstall.userChoice;
      pendingInstall = null;
      return;
    }

    const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (installCopy) installCopy.textContent = isAppleMobile
      ? 'In Safari, tap Share, then choose “Add to Home Screen.” This puts LearnCoding beside your other apps.'
      : 'Open your browser menu and choose “Install app” or “Add to Home screen.” In Chrome, look for the install icon in the address bar.';
    if (installDialog?.showModal) installDialog.showModal();
    else window.alert(installCopy?.textContent || 'Use your browser menu to install this app.');
  });

  document.getElementById('install-help-close')?.addEventListener('click', () => installDialog?.close());
  installDialog?.addEventListener('click', event => {
    if (event.target === installDialog) installDialog.close();
  });

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(error => {
        console.warn('LearnCoding offline app setup could not start:', error);
      });
    }, { once: true });
  }
})();
