"""Veritas - a friendly terminal coach.

Run with:  python veritas.py
Commands:  help, lessons, quiz, challenge, joke, tip, stats, rename, bye
"""

import difflib
import random
import re

NAME = "Veritas"

# ---------------------------------------------------------------- lessons
LESSONS = {
    "variable": {
        "aliases": ["variable", "var", "assign"],
        "text": "A variable is a labeled box that stores a value. "
                "You make one with =, and you can change it later.",
        "example": 'age = 12\nname = "Sam"\nage = age + 1\nprint(name, age)',
    },
    "loop": {
        "aliases": ["loop", "repeat", "iterate", "while"],
        "text": "A loop repeats code. A for loop goes through a set of items; "
                "a while loop keeps going as long as a condition is True.",
        "example": 'for i in range(3):\n    print("Round", i)\n\n'
                   'count = 3\nwhile count > 0:\n    print(count)\n    count -= 1',
    },
    "function": {
        "aliases": ["function", "def", "method"],
        "text": "A function is a reusable block of code with a name. "
                "Inputs are called parameters, and return sends a result back.",
        "example": 'def greet(name):\n    return "Hello, " + name + "!"\n\nprint(greet("Ada"))',
    },
    "list": {
        "aliases": ["list", "array"],
        "text": "A list holds many values in order. Counting starts at 0, "
                "so the first item is at index 0.",
        "example": 'fruits = ["apple", "banana"]\nfruits.append("cherry")\n'
                   'print(fruits[0])\nprint(len(fruits))',
    },
    "if": {
        "aliases": ["if", "condition", "conditional", "else", "elif"],
        "text": "An if statement lets your program make decisions. "
                "Python runs the indented code only when the condition is True.",
        "example": 'score = 85\nif score >= 90:\n    print("A")\n'
                   'elif score >= 80:\n    print("B")\nelse:\n    print("Keep going!")',
    },
    "string": {
        "aliases": ["string", "text", "str"],
        "text": "A string is text inside quotes. You can join strings with +, "
                "change their case, and slice pieces out of them.",
        "example": 's = "Veritas"\nprint(s.upper())\nprint(s[0:3])\n'
                   'print(len(s))\nprint(f"I am {s}!")',
    },
    "dictionary": {
        "aliases": ["dictionary", "dict", "mapping"],
        "text": "A dictionary stores pairs: a key and its value, like a real "
                "dictionary maps a word to its meaning.",
        "example": 'pet = {"name": "Milo", "age": 3}\nprint(pet["name"])\n'
                   'pet["age"] = 4\nfor key, value in pet.items():\n    print(key, value)',
    },
    "error": {
        "aliases": ["error", "bug", "exception", "debug", "crash"],
        "text": "Errors are normal, even for experts. Read the LAST line of the "
                "message first: it names the problem. Then check the line number above it.",
        "example": 'try:\n    number = int("abc")\nexcept ValueError:\n'
                   '    print("That was not a number!")',
    },
    "fractions": {"aliases":["fraction","fractions","numerator","denominator"],"text":"A fraction names part of a whole. The bottom number tells how many equal parts make the whole; the top number tells how many parts we mean.","example":"3/4 means 3 of 4 equal parts.\n1/4 + 2/4 = 3/4\n\nThe denominators match, so add the numerators.","example_label":"Math example"},
    "percent": {"aliases":["percent","percentage","percentages"],"text":"Percent means “out of 100.” To find a percent of an amount, change the percent to a decimal and multiply.","example":"25% of 40\n25% = 0.25\n0.25 × 40 = 10","example_label":"Math example"},
    "equation": {"aliases":["equation","equations","solve","algebra"],"text":"An equation says two amounts are equal. Keep it balanced by doing the same operation to both sides.","example":"x + 3 = 8\nx + 3 − 3 = 8 − 3\nx = 5","example_label":"Math example"},
    "photosynthesis": {"aliases":["photosynthesis","chlorophyll","plant energy"],"text":"Photosynthesis is how plants use light energy to make sugar from water and carbon dioxide. Oxygen is released as part of the process.","example":"light + water + carbon dioxide → sugar + oxygen\n\nTry it: What is one thing a plant needs from its surroundings?","example_label":"Science example"},
    "cell": {"aliases":["cell","cells","organelles","biology"],"text":"A cell is the smallest living unit. Many cells contain parts that each do a job, like a nucleus that holds instructions and a membrane that controls what enters and leaves.","example":"Cell → tissue → organ → organ system\n\nExample: muscle cells form muscle tissue.","example_label":"Science example"},
    "water cycle": {"aliases":["water cycle","evaporation","condensation","precipitation"],"text":"The water cycle describes how water moves around Earth. Heat can turn liquid water into vapor; vapor cools into droplets, and water eventually falls back as precipitation.","example":"Sun warms water → evaporation → clouds form → precipitation","example_label":"Science example"},
    "force": {"aliases":["force","forces","gravity","motion"],"text":"A force is a push or pull. Forces can change an object's speed, direction, or shape. If forces are balanced, its motion does not change.","example":"A book resting on a table: gravity pulls down and the table pushes up. Those forces balance.","example_label":"Science example"},
    "speed": {"aliases":["speed","distance","velocity"],"text":"Speed tells how much distance is covered in a certain time. Divide distance by time, and include the units.","example":"Distance = 60 kilometers\nTime = 2 hours\nSpeed = 60 ÷ 2 = 30 km/h","example_label":"Math & science example"},
    "source": {"aliases":["primary source","secondary source","source","history","historical evidence"],"text":"A primary source comes from the time or event being studied, such as a letter or photograph. A secondary source explains or analyzes evidence later.","example":"A diary written during an expedition: primary source.\nA textbook chapter about it: secondary source.\n\nAsk who made it, when, and for what purpose.","example_label":"History example"},
    "thesis": {"aliases":["thesis","claim","argument","essay"],"text":"A thesis is the main point an essay will support. A clear thesis takes a position and gives the reader a reason or direction.","example":"Topic: school gardens\nThesis: “School gardens help students learn science because they can observe plant growth directly.”","example_label":"Writing example"},
    "grammar": {"aliases":["grammar","noun","verb","adjective","parts of speech"],"text":"Parts of speech describe the job a word does. A noun names something, a verb shows an action or state, and an adjective describes a noun.","example":"The curious student reads.\nstudent = noun · reads = verb · curious = adjective","example_label":"English example"},
    "html": {"aliases":["html","web page","webpage","markup"],"text":"HTML gives a web page its structure. Tags describe parts such as headings, paragraphs, links, and buttons.","example":"<h1>My garden</h1>\n<p>Three plants are growing.</p>","example_label":"HTML example"},
    "css": {"aliases":["css","style","styling","web design"],"text":"CSS controls how web page elements look, including color, spacing, and layout. A selector chooses which elements a rule changes.","example":"p {\n  color: darkgreen;\n  font-size: 18px;\n}","example_label":"CSS example"},
    "javascript": {"aliases":["javascript","js","web interaction"],"text":"JavaScript can make a web page respond to actions, such as clicking a button. A function holds steps the page can run.","example":"button.addEventListener('click', () => {\n  alert('Hello!');\n});","example_label":"JavaScript example"},
    "ai literacy": {"aliases":["ai literacy","artificial intelligence","machine learning","ai"],"text":"AI tools learn patterns from examples and use those patterns to produce results. Their answers can sound confident and still be wrong, so check important claims against reliable sources.","example":"Try: Ask an AI to explain a science idea, then check one key fact in a textbook or trusted science site.\n\nNever share passwords, private contact details, or other sensitive information.","example_label":"AI learning example"},
}

# ---------------------------------------------------------------- quiz
QUIZ = [
    ("Which symbol starts a comment in Python?", ["#"], "It looks like a hashtag."),
    ("Which function prints text to the screen?", ["print", "print()"], "It's four letters... five, actually!"),
    ("Which keyword starts a function definition?", ["def"], "Short for 'define'."),
    ("What does len([4, 5, 6]) return?", ["3"], "Count the items."),
    ("Is 3.14 an int, a float, or a str?", ["float"], "It has a decimal point."),
    ("Which loop keyword goes through each item in a list?", ["for"], "Starts with f."),
    ("What is the index of the FIRST item in a list?", ["0", "zero"], "Python starts counting early."),
    ("What does 'hello'.upper() give back? (type it in lowercase)", ["hello"], "All capitals."),
    ("Which keyword gives a result back from a function?", ["return"], "It 'returns' something."),
    ("What does 10 % 3 give? (the remainder)", ["1"], "10 = 3 * 3 + ?"),
]

# ---------------------------------------------------------------- challenges
CHALLENGES = [
    {
        "goal": "Print the numbers 1 to 5, one per line, using a for loop.",
        "hint": "range(1, 6) gives 1,2,3,4,5 because the end is NOT included.",
        "solution": "for i in range(1, 6):\n    print(i)",
    },
    {
        "goal": "Write a function double(n) that returns n times 2.",
        "hint": "Use def, one parameter, and the return keyword.",
        "solution": "def double(n):\n    return n * 2\n\nprint(double(21))",
    },
    {
        "goal": "Count the vowels in the word 'education'.",
        "hint": "Loop over each letter and check: if letter in 'aeiou'.",
        "solution": "count = 0\nfor letter in 'education':\n    if letter in 'aeiou':\n        count += 1\nprint(count)",
    },
    {
        "goal": "FizzBuzz: for 1 to 15 print Fizz if divisible by 3, Buzz if by 5, "
                "FizzBuzz if both, otherwise the number.",
        "hint": "Check the 'both' case FIRST. Use % to test divisibility.",
        "solution": "for n in range(1, 16):\n    if n % 15 == 0:\n        print('FizzBuzz')\n"
                    "    elif n % 3 == 0:\n        print('Fizz')\n    elif n % 5 == 0:\n"
                    "        print('Buzz')\n    else:\n        print(n)",
    },
    {
        "goal": "Given words = ['sun', 'moon', 'star'], print the longest word.",
        "hint": "Python's max() accepts key=len.",
        "solution": "words = ['sun', 'moon', 'star']\nprint(max(words, key=len))",
    },
]

JOKES = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "There are 10 kinds of people: those who know binary and those who don't.",
    "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
    "Why was the function sad? It didn't get any arguments.",
    "I would tell you a UDP joke, but you might not get it.",
]

TIPS = [
    "Run your code often. Small steps catch bugs early.",
    "Name variables clearly: 'score' beats 'x'.",
    "Stuck? Explain the problem out loud to a rubber duck. It really works.",
    "Read error messages from the bottom up.",
    "Type code yourself instead of copy-pasting. Your fingers learn too.",
    "Take a short break when frustrated. Fresh eyes spot bugs fast.",
]

HELP_TEXT = """Here is what I can do:
  lessons    - see every topic I can explain
  <topic>    - just type one, e.g. 'what is a loop?'
  quiz       - 5 quick questions with scoring
  challenge  - a small coding task with hints
  joke / tip - a bit of fun or advice
  stats      - see your progress
  rename     - change what I call you
  bye        - quit"""


# ---------------------------------------------------------------- helpers
def tokenize(text):
    return re.findall(r"[a-z']+", text.lower())


def find_lesson(tokens):
    """Match tokens to a lesson, forgiving plurals and small typos."""
    alias_map = {a: key for key, data in LESSONS.items() for a in data["aliases"]}
    phrase = " ".join(tokens)
    for alias, key in alias_map.items():
        if " " in alias and alias in phrase:
            return key
    for token in tokens:
        for alias, key in alias_map.items():
            if token == alias or (len(alias) >= 4 and token.startswith(alias)):
                return key
    for token in tokens:
        if len(token) >= 4:
            close = difflib.get_close_matches(token, list(alias_map), n=1, cutoff=0.8)
            if close:
                return alias_map[close[0]]
    return None


def show_lesson(key, state):
    data = LESSONS[key]
    state["lessons_seen"].add(key)
    say(data["text"])
    print("\n    # Example (Python)")
    for line in data["example"].split("\n"):
        print("    " + line)
    print()
    say("Try changing a value in that example and predict what happens first!")


def say(text):
    print(f"{NAME}: {text}")


def ask(prompt="You: "):
    try:
        return input(prompt).strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return "bye"


# ---------------------------------------------------------------- modes
def run_quiz(state, rounds=5):
    say(f"Quiz time! {rounds} questions. Type 'hint' for a clue or 'skip' to pass.")
    score = 0
    for number, (question, answers, hint) in enumerate(random.sample(QUIZ, rounds), 1):
        say(f"Q{number}: {question}")
        hint_used = False
        while True:
            reply = ask().lower()
            if reply == "hint":
                say("Hint: " + hint)
                hint_used = True
            elif reply == "skip":
                say(f"No worries! The answer was: {answers[0]}")
                break
            elif reply in [a.lower() for a in answers]:
                points = 1 if not hint_used else 0.5
                score += points
                state["quiz_correct"] += 1
                say("Correct! " + random.choice(["Nice!", "Great job!", "You got it!"]))
                break
            else:
                say("Not quite. Try again, or type 'hint' / 'skip'.")
    state["quizzes_taken"] += 1
    state["best_score"] = max(state["best_score"], score)
    say(f"Quiz done! You scored {score} out of {rounds}.")
    if score == rounds:
        say("Perfect score! You're ready for a challenge. Type 'challenge'.")
    elif score >= rounds / 2:
        say("Solid work! A little more practice and you'll ace it.")
    else:
        say("Good effort. Type 'lessons' to review, then try again!")


def run_challenge(state):
    task = random.choice(CHALLENGES)
    say("Challenge: " + task["goal"])
    say("Write it in your own editor. Type 'hint', 'solution', or 'done'.")
    while True:
        reply = ask().lower()
        if reply == "hint":
            say("Hint: " + task["hint"])
        elif reply == "solution":
            say("Here's one way to do it (Python):")
            for line in task["solution"].split("\n"):
                print("    " + line)
            break
        elif reply == "done":
            state["challenges_done"] += 1
            say("Awesome work! Doing it yourself is how coding sticks.")
            break
        else:
            say("Type 'hint', 'solution', or 'done'.")


def show_stats(state):
    seen = ", ".join(sorted(state["lessons_seen"])) or "none yet"
    say(f"Progress for {state['user']}:")
    print(f"    Lessons viewed : {len(state['lessons_seen'])}/{len(LESSONS)} ({seen})")
    print(f"    Quizzes taken  : {state['quizzes_taken']} (best score {state['best_score']})")
    print(f"    Challenges done: {state['challenges_done']}")


# ---------------------------------------------------------------- main
def main():
    state = {
        "user": "friend",
        "lessons_seen": set(),
        "quizzes_taken": 0,
        "quiz_correct": 0,
        "best_score": 0,
        "challenges_done": 0,
    }

    print("=" * 50)
    print(f"   {NAME.upper()} - your coding coach")
    print("=" * 50)
    say("Hi! I'm Veritas. What should I call you?")
    name = ask()
    if name and name.lower() != "bye":
        state["user"] = name.split()[0].title()
    say(f"Nice to meet you, {state['user']}! Type 'help' to see what I can do.")

    while True:
        text = ask(f"{state['user']}: ")
        tokens = tokenize(text)

        if not tokens:
            say("Say something and I'll help!")
        elif any(w in tokens for w in ("bye", "quit", "exit")):
            say(f"Keep coding, {state['user']}. You're doing great!")
            break
        elif "help" in tokens:
            print(HELP_TEXT)
        elif "lessons" in tokens or "topics" in tokens:
            say("I can explain: " + ", ".join(LESSONS) + ". Just type one!")
        elif "quiz" in tokens:
            run_quiz(state)
        elif "challenge" in tokens or "practice" in tokens:
            run_challenge(state)
        elif "joke" in tokens:
            say(random.choice(JOKES))
        elif "tip" in tokens or "advice" in tokens:
            say(random.choice(TIPS))
        elif "stats" in tokens or "progress" in tokens:
            show_stats(state)
        elif "rename" in tokens:
            say("What should I call you now?")
            new = ask()
            if new:
                state["user"] = new.split()[0].title()
                say(f"Got it, {state['user']}!")
        elif any(w in tokens for w in ("hello", "hi", "hey")):
            say(f"Hey {state['user']}! What do you want to learn today?")
        elif ("who" in tokens and "you" in tokens) or ("name" in tokens and "your" in tokens):
            say(f"I'm {NAME}, a small rule-based AI coach built in Python.")
        elif "thanks" in tokens or "thank" in tokens:
            say("Anytime! Want a quiz or challenge next?")
        else:
            key = find_lesson(tokens)
            if key:
                show_lesson(key, state)
            else:
                say("I don't know that one yet. Try 'lessons', 'quiz', or 'help'!")


if __name__ == "__main__":
    main()