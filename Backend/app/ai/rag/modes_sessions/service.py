# app/mode_sessions/service.py
import json
from typing import Any, Dict, List, Tuple, Optional

from app.ai.rag.claude import generate_response
from app.ai.rag.retriever import retrieve_context


# -------------------------
# Utilities
# -------------------------

def _safe_json(text: str) -> Dict[str, Any]:
    try:
        return json.loads(text)
    except Exception as e:
        raise ValueError(f"Invalid JSON from model: {e}\nRaw:\n{text}")


def adjust_difficulty(current: str, score: float) -> str:
    levels = ["Basic", "Intermediate", "Advanced"]
    if current not in levels:
        current = "Basic"
    idx = levels.index(current)

    if score >= 0.85 and idx < 2:
        idx += 1
    elif score <= 0.60 and idx > 0:
        idx -= 1

    return levels[idx]


# -------------------------
# REVIEW GENERATORS
# -------------------------

async def generate_review_item(session_type: str, difficulty: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Returns (item_json, contexts)
    item_json schema differs per review type but always includes:
      - type
      - difficulty
      - prompt/question content
    """
    session_type = session_type.lower().strip()
    difficulty = difficulty.strip().title()

    seed = f"Froth flotation review assessment question type={session_type}, difficulty={difficulty}"
    contexts = retrieve_context(query=seed, mode="review", top_k=6)

    if session_type == "mcq":
        prompt = f"""
You are generating a structured MCQ (objectives) review question for froth flotation.

Output JSON ONLY in this schema:
{{
  "type": "mcq",
  "question_id": "REV-MCQ-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "question": "string",
  "options": {{"A":"...", "B":"...", "C":"...", "D":"..."}}
}}

Rules:
- Base content ONLY on REFERENCE MATERIAL.
- Do NOT include answer.
- Options must be clearly distinct.
- Keep language clear and exam-like.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        item = _safe_json(await generate_response(prompt=prompt, mode="review"))
        return item, contexts

    if session_type == "fill_blank":
        prompt = f"""
Generate a fill-in-the-blank review item for froth flotation.

Output JSON ONLY:
{{
  "type": "fill_blank",
  "item_id": "REV-FB-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "sentence_with_blank": "A sentence with ____ as the blank",
  "answer_key": null
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- Do NOT include the answer.
- Use exactly ONE blank (____).

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        item = _safe_json(await generate_response(prompt=prompt, mode="review"))
        return item, contexts

    if session_type == "flashcard":
        prompt = f"""
Generate a flashcard review item for froth flotation.

Output JSON ONLY:
{{
  "type": "flashcard",
  "card_id": "REV-FC-XXXX",
  "difficulty": "{difficulty}",
  "front": "Concept/question prompt",
  "expected_points": ["point1", "point2", "point3"]
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- expected_points must be 3-5 items.
- Do NOT include a model answer paragraph.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
        item = _safe_json(await generate_response(prompt=prompt, mode="review"))
        return item, contexts

    # default: short_answer
    prompt = f"""
Generate a short-answer review question for froth flotation.

Output JSON ONLY:
{{
  "type": "short_answer",
  "question_id": "REV-SA-XXXX",
  "difficulty": "{difficulty}",
  "category": "Surface Chemistry|Reagents|Process Variables|Troubleshooting",
  "question": "string",
  "expected_points": ["point1", "point2", "point3"]
}}

Rules:
- Base ONLY on REFERENCE MATERIAL.
- expected_points should be 3-6 bullets.
- Do NOT include the answer.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    item = _safe_json(await generate_response(prompt=prompt, mode="review"))
    return item, contexts


async def evaluate_review_answer(item: Dict[str, Any], student_answer: str, contexts: List[str]) -> Dict[str, Any]:
    """
    Returns grading JSON. Uses rubric bands.
    """
    reference = "\n\n".join(contexts)
    itype = item.get("type")

    # normalize question prompt for evaluation
    if itype == "mcq":
        qtext = item["question"]
        options = item["options"]
        qblock = qtext + "\nOptions:\n" + "\n".join([f"{k}) {v}" for k, v in options.items()])
    elif itype == "fill_blank":
        qblock = item["sentence_with_blank"]
    elif itype == "flashcard":
        qblock = item["front"]
    else:
        qblock = item.get("question", "")

    expected_points = item.get("expected_points", [])

    prompt = f"""
You are grading a student's REVIEW answer on froth flotation.

Item Type: {itype}
Prompt/Question:
{qblock}

Student Answer:
{student_answer}

Expected points (if provided):
{json.dumps(expected_points)}

REFERENCE MATERIAL:
{reference}

Rubric bands:
- Excellent (0.90–1.00)
- Good (0.75–0.89)
- Satisfactory (0.60–0.74)
- Needs Improvement (0.40–0.59)
- Unsatisfactory (0.00–0.39)

Rules:
- Grade ONLY using REFERENCE MATERIAL.
- If answer includes claims not supported by reference, list them.
- If MCQ: student_answer may be A/B/C/D; infer correctness from reference.

Output JSON ONLY:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "rubric_level": "Excellent|Good|Satisfactory|Needs Improvement|Unsatisfactory",
  "feedback": "clear concise feedback",
  "missing_points": ["..."],
  "unsupported_claims": ["..."],
  "correct_answer": "optional - include if MCQ or fill_blank"
}}
"""
    return _safe_json(await generate_response(prompt=prompt, mode="review"))


def format_review_prompt(item: Dict[str, Any]) -> str:
    itype = item.get("type")

    if itype == "mcq":
        opts = item["options"]
        opt_lines = "\n".join([f"{k}) {v}" for k, v in opts.items()])
        return (
            f"### REVIEW (MCQ)\n"
            f"Question ID: {item.get('question_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n"
            f"Category: {item.get('category','')}\n\n"
            f"**Question:**\n{item['question']}\n\n"
            f"**Options:**\n{opt_lines}\n"
            f"\nReply with A, B, C, or D."
        )

    if itype == "fill_blank":
        return (
            f"### REVIEW (Fill-in)\n"
            f"Item ID: {item.get('item_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n"
            f"Category: {item.get('category','')}\n\n"
            f"**Fill the blank:**\n{item['sentence_with_blank']}\n"
        )

    if itype == "flashcard":
        return (
            f"### REVIEW (Flashcard)\n"
            f"Card ID: {item.get('card_id','')}\n"
            f"Difficulty: {item.get('difficulty','')}\n\n"
            f"**Front:**\n{item['front']}\n"
            f"\nExplain the concept in your own words."
        )

    # short answer
    return (
        f"### REVIEW (Short Answer)\n"
        f"Question ID: {item.get('question_id','')}\n"
        f"Difficulty: {item.get('difficulty','')}\n"
        f"Category: {item.get('category','')}\n\n"
        f"**Question:**\n{item.get('question','')}\n"
    )


# -------------------------
# PRACTICE GENERATORS
# -------------------------

async def generate_practice_scenario(session_type: str, difficulty: str) -> Tuple[Dict[str, Any], List[str]]:
    """
    Returns scenario JSON + contexts.
    Must contain guided_questions list (exactly 3) to satisfy your "A" rule.
    """
    session_type = session_type.lower().strip()
    difficulty = difficulty.strip().title()

    seed = f"Froth flotation practice scenario type={session_type}, difficulty={difficulty}"
    contexts = retrieve_context(query=seed, mode="practice", top_k=6)

    prompt = f"""
You are generating a structured PRACTICE scenario for froth flotation.
Session type: {session_type}
Difficulty: {difficulty}

Output JSON ONLY in this schema:
{{
  "type": "{session_type}",
  "scenario_id": "PRAC-XXXX",
  "title": "short title",
  "difficulty": "{difficulty}",
  "situation": "immersive narrative or plant scenario",
  "available_data": ["...", "..."],
  "guided_questions": ["Q1", "Q2", "Q3"],
  "expected_elements": [
    ["elements expected in Q1 answer"],
    ["elements expected in Q2 answer"],
    ["elements expected in Q3 answer"]
  ],
  "key_learning_points": ["...", "..."]
}}

Rules:
- Base all technical facts ONLY on REFERENCE MATERIAL.
- Do NOT invent numeric values unless present in REFERENCE MATERIAL.
- guided_questions must be EXACTLY 3.
- expected_elements must be length 3.
- Keep scenario immersive and realistic for the chosen type.

REFERENCE MATERIAL:
{chr(10).join(contexts)}
"""
    scenario = _safe_json(await generate_response(prompt=prompt, mode="practice"))
    return scenario, contexts


async def evaluate_practice_answer(
    scenario: Dict[str, Any],
    step: int,
    student_answer: str,
    contexts: List[str]
) -> Dict[str, Any]:
    reference = "\n\n".join(contexts)
    idx = step - 1

    question = scenario["guided_questions"][idx]
    expected = scenario["expected_elements"][idx]
    expected_block = "\n".join([f"- {x}" for x in expected])

    prompt = f"""
You are evaluating a student's PRACTICE answer on froth flotation.

Scenario:
{scenario.get('situation','')}

Guided Question {step}:
{question}

Student Answer:
{student_answer}

Expected elements:
{expected_block}

REFERENCE MATERIAL:
{reference}

Rules:
- Grade ONLY using REFERENCE MATERIAL.
- Be supportive and corrective.
- List unsupported claims if the student goes beyond reference.

Output JSON ONLY:
{{
  "verdict": "correct|partial|incorrect",
  "score": 0.0,
  "feedback": "short clear feedback",
  "missing_points": ["..."],
  "unsupported_claims": ["..."]
}}
"""
    return _safe_json(await generate_response(prompt=prompt, mode="review"))


def format_practice_prompt(scenario: Dict[str, Any], step: int) -> str:
    idx = step - 1
    data_lines = "\n".join([f"- {x}" for x in scenario.get("available_data", [])])
    q = scenario["guided_questions"][idx]

    return (
        f"### PRACTICE ({scenario.get('type','')})\n"
        f"Scenario ID: {scenario.get('scenario_id','')}\n"
        f"Title: {scenario.get('title','')}\n"
        f"Difficulty: {scenario.get('difficulty','')}\n\n"
        f"**SITUATION:**\n{scenario.get('situation','')}\n\n"
        f"**Available Data:**\n{data_lines}\n\n"
        f"**Guided Question {step}:**\n{q}\n"
    )