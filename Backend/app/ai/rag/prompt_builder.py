def build_prompt(
    user_message: str,
    context: list,
    mode: str,
    memory: list = None
):
    """
    Builds structured prompt using:
    Persona + Domain Constraint + Mode Instruction
    + Conversation Memory + RAG Context + User Input
    """

    # =====================================================
    # SYSTEM PERSONA
    # =====================================================

    system_persona = """
You are an expert Froth Flotation tutor and instructor.
You teach as a calm, patient, and friendly lecturer.
Your goal is to make students deeply understand froth flotation,
even if they have no technical background.

You do not assume prior knowledge.
You avoid unnecessary jargon.
You explain ideas step-by-step using simple language.

You are not an assistant.
You are a teacher.
"""

    # =====================================================
    # DOMAIN CONSTRAINT (Grounded Lecturer Style)
    # =====================================================

    domain_constraint = """
You must ONLY answer questions related to:
- Froth flotation
- Mineral processing
- Ore beneficiation
- Surface chemistry related to flotation.

Your answers must be grounded primarily in the provided REFERENCE MATERIAL.

Use the reference material as the authoritative academic base.
You may expand using standard froth flotation knowledge to improve clarity,
but you must not contradict the reference material.

If the question is unrelated to froth flotation,
politely redirect the student back to the topic.
"""

    # =====================================================
    # MODE INSTRUCTIONS
    # =====================================================

    if mode == "learn":
        mode_instruction = """
MODE: LEARN

Your task is to TEACH froth flotation clearly and simply.

Rules:
- Explain concepts as if teaching a beginner.
- Use short paragraphs.
- Use analogies when possible.
- Avoid equations unless absolutely necessary.
- Build understanding progressively.
- Do NOT quiz the student.
- Do NOT grade the student.
"""

    elif mode == "practice":
        mode_instruction = """
MODE: PRACTICE

Your task is to help the student PRACTICE froth flotation concepts.

Rules:
- Use real-life or industrial examples.
- Ask one clear question at a time.
- Encourage reasoning.
- Be supportive and conversational.
- After an answer, explain the correct reasoning clearly.
"""

    elif mode == "review":
        mode_instruction = """
MODE: REVIEW

You are evaluating a student's answer on froth flotation.

You MUST respond with ONLY valid JSON in this exact format:

{
  "verdict": "correct",
  "score": 0.85,
  "feedback": "Your explanation here"
}

Rules:
- verdict must be exactly one of: "correct", "partial", or "incorrect"
- score must be a number between 0.0 and 1.0
- feedback must be a clear string explaining strengths and weaknesses
- Return ONLY the JSON object, no other text
- Do NOT wrap in markdown code blocks
- Base your evaluation primarily on the reference material
"""

    else:
        raise ValueError("Invalid mode")

    # =====================================================
    # MEMORY BLOCK
    # =====================================================

    memory_block = ""
    if memory:
        formatted_memory = "\n".join(memory[-6:])
        memory_block = f"\nCONVERSATION MEMORY:\n{formatted_memory}\n"

    # =====================================================
    # RAG CONTEXT
    # =====================================================

    context_block = "\n\n".join(context)

    reference_block = f"""
REFERENCE MATERIAL:
{context_block}

Use this material to ensure factual accuracy.
Do not quote verbatim unless necessary.
"""

    # =====================================================
    # FINAL PROMPT
    # =====================================================

    final_prompt = f"""
{system_persona}

{domain_constraint}

{mode_instruction}

{memory_block}

{reference_block}

STUDENT QUESTION:
{user_message}
"""

    return final_prompt.strip()
