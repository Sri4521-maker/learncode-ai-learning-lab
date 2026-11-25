"""HTTP-friendly conversation layer for the rule-based Veritas coach."""
from __future__ import annotations

import random
import re
from typing import Any

import veritas

PRIVATE_TEXT = re.compile(r"https?://|www\.|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|(?:^|\D)(?:\+?\d[\d ().-]{7,}\d)(?:\D|$)", re.I)


def _clean_state(value: Any) -> dict[str, Any]:
    value = value if isinstance(value, dict) else {}
    name = value.get("user", "friend")
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z][A-Za-z '-]{0,23}", name):
        name = "friend"
    seen = value.get("lessons_seen", [])
    if not isinstance(seen, list):
        seen = []
    seen = [topic for topic in seen if isinstance(topic, str) and topic in veritas.LESSONS]
    quiz_questions = value.get("quiz_questions", [])
    if not isinstance(quiz_questions, list):
        quiz_questions = []
    quiz_questions = [i for i in quiz_questions if isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(veritas.QUIZ)][:5]
    challenge = value.get("challenge")
    if not isinstance(challenge, int) or isinstance(challenge, bool) or not 0 <= challenge < len(veritas.CHALLENGES):
        challenge = None
    mode = value.get("mode") if value.get("mode") in ("quiz", "challenge") else None
    if mode == "quiz" and not quiz_questions:
        mode = None
    if mode == "challenge" and challenge is None:
        mode = None
    return {
        "user": name,
        "lessons_seen": list(dict.fromkeys(seen)),
        "quizzes_taken": max(0, min(10000, int(value.get("quizzes_taken", 0) or 0))) if str(value.get("quizzes_taken", 0)).isdigit() else 0,
        "quiz_correct": max(0, min(10000, int(value.get("quiz_correct", 0) or 0))) if str(value.get("quiz_correct", 0)).isdigit() else 0,
        "best_score": max(0, min(5, float(value.get("best_score", 0) or 0))) if str(value.get("best_score", 0)).replace('.', '', 1).isdigit() else 0,
        "challenges_done": max(0, min(10000, int(value.get("challenges_done", 0) or 0))) if str(value.get("challenges_done", 0)).isdigit() else 0,
        "mode": mode,
        "quiz_questions": quiz_questions,
        "quiz_index": max(0, min(5, int(value.get("quiz_index", 0) or 0))) if str(value.get("quiz_index", 0)).isdigit() else 0,
        "quiz_score": max(0, min(5, float(value.get("quiz_score", 0) or 0))) if str(value.get("quiz_score", 0)).replace('.', '', 1).isdigit() else 0,
        "quiz_hint_used": bool(value.get("quiz_hint_used", False)),
        "challenge": challenge,
    }


def _next_quiz_question(state: dict[str, Any]) -> str:
    index = state["quiz_index"]
    if index >= len(state["quiz_questions"]):
        state["mode"] = None
        state["quizzes_taken"] += 1
        state["best_score"] = max(state["best_score"], state["quiz_score"])
        return f"Quiz done! You scored {state['quiz_score']} out of {len(state['quiz_questions'])}. Type 'quiz' to play again or 'lessons' to review."
    question = veritas.QUIZ[state["quiz_questions"][index]][0]
    return f"Quiz · question {index + 1} of {len(state['quiz_questions'])}: {question} Type 'hint' for a clue or 'skip' to pass."


def reply_to_veritas(message: str, incoming_state: Any = None) -> tuple[str, dict[str, Any]]:
    state = _clean_state(incoming_state)
    text = message.strip()
    if not text:
        raise ValueError("Please enter a message for Veritas.")
    if len(text) > 500:
        raise ValueError("Please keep messages under 500 characters.")
    if PRIVATE_TEXT.search(text):
        return "Please remove links, phone numbers, and email addresses. Keep personal details private when chatting with AI.", state

    lowered = text.lower().strip()
    tokens = veritas.tokenize(lowered)
    if state["mode"] == "quiz":
        idx = state["quiz_index"]
        if lowered == "hint":
            state["quiz_hint_used"] = True
            return "Hint: " + veritas.QUIZ[state["quiz_questions"][idx]][2], state
        if lowered == "skip":
            answer = veritas.QUIZ[state["quiz_questions"][idx]][1][0]
            state["quiz_index"] += 1
            state["quiz_hint_used"] = False
            return f"No worries! The answer was {answer}. " + _next_quiz_question(state), state
        question = veritas.QUIZ[state["quiz_questions"][idx]]
        if lowered in [answer.lower() for answer in question[1]]:
            state["quiz_score"] += 0.5 if state["quiz_hint_used"] else 1
            state["quiz_correct"] += 1
            feedback = "Correct! Nice work. "
        else:
            return "Not quite. Try again, or type 'hint' or 'skip'.", state
        state["quiz_index"] += 1
        state["quiz_hint_used"] = False
        return feedback + _next_quiz_question(state), state
    if state["mode"] == "challenge":
        task = veritas.CHALLENGES[state["challenge"]]
        if lowered == "hint": return "Hint: " + task["hint"], state
        if lowered == "solution":
            state["mode"] = None
            return "One possible Python solution:\n" + task["solution"], state
        if lowered == "done":
            state["mode"] = None
            state["challenges_done"] += 1
            return "Nice work! Solving it yourself helps the idea stick. Try another challenge any time.", state
        return "Type 'hint', 'solution', or 'done' when you’re ready.", state

    if not tokens:
        return "Say something and I’ll help! Try 'lessons', 'quiz', 'challenge', 'joke', or 'tip'.", state
    if any(word in tokens for word in ("bye", "quit", "exit")):
        return f"Keep coding, {state['user']}. You’re doing great!", state
    if "help" in tokens:
        return "I can explain Python lessons, give you a 5-question quiz, offer a coding challenge with hints, share a joke or tip, and show your stats. Try 'lessons', 'quiz', or 'challenge'.", state
    if "lessons" in tokens or "topics" in tokens:
        return "I can explain: " + ", ".join(veritas.LESSONS) + ". Just ask about one!", state
    if "quiz" in tokens:
        state["mode"] = "quiz"
        state["quiz_questions"] = random.sample(range(len(veritas.QUIZ)), 5)
        state["quiz_index"] = 0
        state["quiz_score"] = 0
        state["quiz_hint_used"] = False
        return "Quiz time! Five questions. " + _next_quiz_question(state), state
    if "challenge" in tokens or "practice" in tokens:
        state["mode"] = "challenge"
        state["challenge"] = random.randrange(len(veritas.CHALLENGES))
        return "Challenge: " + veritas.CHALLENGES[state["challenge"]]["goal"] + "\nType 'hint', 'solution', or 'done'.", state
    if "joke" in tokens: return random.choice(veritas.JOKES), state
    if "tip" in tokens or "advice" in tokens: return random.choice(veritas.TIPS), state
    if "stats" in tokens or "progress" in tokens:
        return f"Progress for {state['user']}: {len(state['lessons_seen'])}/{len(veritas.LESSONS)} lessons seen; {state['quizzes_taken']} quizzes taken (best {state['best_score']}); {state['challenges_done']} challenges done.", state
    if "rename" in tokens: return "I can use a nickname. Say 'call me Sam' with a first name or nickname only.", state
    if "call" in tokens and "me" in tokens:
        match = re.search(r"\bcall me ([A-Za-z][A-Za-z'-]{0,23})\b", lowered)
        if match:
            state["user"] = match.group(1).title()
            return f"Got it, {state['user']}! What would you like to learn?", state
    if any(word in tokens for word in ("hello", "hi", "hey")):
        return f"Hey {state['user']}! What do you want to learn today? You can ask about a topic, or type 'quiz' or 'challenge'.", state
    if "who" in tokens and "you" in tokens or "name" in tokens and "your" in tokens:
        return "I’m Veritas, a friendly rule-based Python coding coach.", state
    if "thanks" in tokens or "thank" in tokens: return "Anytime! Want a quiz or challenge next?", state
    lesson = veritas.find_lesson(tokens)
    if lesson:
        data = veritas.LESSONS[lesson]
        if lesson not in state["lessons_seen"]: state["lessons_seen"].append(lesson)
        return f"{data['text']}\n\nPython example:\n{data['example']}\n\nTry changing a value and predict what happens first!", state
    return "I don’t know that one yet. Try 'lessons', 'quiz', 'challenge', 'joke', or 'help'.", state
