from typing import List, Dict

def chunk_text(sections: List[Dict], doc_type: str) -> List[Dict]:
    """
    Mode-aware semantic chunking.
    Routes chunking logic based on document type.
    """

    mode_map = {
        "knowledge": "learn",
        "assessment": "review",
        "practice": "practice"
    }

    if doc_type not in mode_map:
        raise ValueError(f"Unsupported doc_type: {doc_type}")

    mode = mode_map[doc_type]

    if mode == "learn":
        return _chunk_learn(sections)

    if mode == "review":
        return _chunk_review(sections)

    if mode == "practice":
        return _chunk_practice(sections)

    return []


# =====================================================
# LEARN MODE CHUNKING
# =====================================================

def _chunk_learn(sections: List[Dict]) -> List[Dict]:
    """
    Learn mode:
    - One concept per chunk
    - Simple, explanatory text
    """

    chunks = []

    for section in sections:
        topic = section.get("title")
        paragraphs = _split_paragraphs(section["content"])

        for para in paragraphs:
            if len(para.split()) < 40:
                continue  # avoid low-signal chunks

            chunks.append({
                "text": para.strip(),
                "mode": "learn",
                "topic": topic
            })

    return chunks


# =====================================================
# REVIEW MODE CHUNKING
# =====================================================

def _chunk_review(sections: List[Dict]) -> List[Dict]:
    """
    Review mode:
    - Question-focused chunks
    - Used for assessment & evaluation
    """

    chunks = []

    for section in sections:
        topic = section.get("title")
        questions = _split_questions(section["content"])

        for question in questions:
            chunks.append({
                "text": question.strip(),
                "mode": "review",
                "topic": topic
            })

    return chunks


# =====================================================
# PRACTICE MODE CHUNKING
# =====================================================

def _chunk_practice(sections: List[Dict]) -> List[Dict]:
    """
    Practice mode:
    - Scenario-based chunks
    - Real-life application
    """

    chunks = []

    for section in sections:
        topic = section.get("title")
        scenarios = _split_scenarios(section["content"])

        for scenario in scenarios:
            chunks.append({
                "text": scenario.strip(),
                "mode": "practice",
                "topic": topic
            })

    return chunks


# =====================================================
# HELPERS
# =====================================================

def _split_paragraphs(text: str) -> List[str]:
    """
    Splits text into paragraphs.
    """
    return [p.strip() for p in text.split("\n\n") if p.strip()]


def _split_questions(text: str) -> List[str]:
    """
    Splits text into question-based chunks.
    """
    lines = text.splitlines()
    questions = []
    current = ""

    for line in lines:
        if line.strip().endswith("?"):
            if current:
                questions.append(current.strip())
            current = line
        else:
            current += " " + line

    if current.strip():
        questions.append(current.strip())

    return questions


def _split_scenarios(text: str) -> List[str]:
    """
    Splits text into scenario-based chunks.
    """
    blocks = text.split("\n\n")
    scenarios = []

    for block in blocks:
        word_count = len(block.split())
        if "scenario" in block.lower() or word_count > 80:
            scenarios.append(block.strip())

    return scenarios
