import requests
from pathlib import Path
import sqlite3
from datetime import datetime
import uuid
from rag import RAGEngine
from audio_utils import record_audio
from whisper_stt import transcribe
from text_cleaner import clean_for_avatar
from did_avatar import create_avatar_video_from_audio
from elevenlabs_tts import generate_tts
import sys


rag_engine = RAGEngine()
rag_engine.build_index()
BASE_DIR = Path(__file__).parent
OLLAMA_API_URL = "http://localhost:11434/api/generate"
MODEL = "gpt-oss:latest"
KNOWLEDGE_PATH = BASE_DIR / "knowledge"
DB_PATH = BASE_DIR / "database" / "tutor.db"
PUBLIC_BASE_URL = "https://e41d76122203.ngrok-free.app"  # public tunnel base URL


#### Database Setup ####
def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        mode TEXT,
        user_input TEXT,
        tutor_response TEXT,
        timestamp TEXT,
        FOREIGN KEY(session_id) REFERENCES sessions(id)
    )
    """)
    
    cursor.execute("""
                   CREATE TABLE IF NOT EXISTS  evaluations (
                       id TEXT PRIMARY KEY,
                       interaction_id TEXT,
                       verdict TEXT,
                       score REAL,
                       feedback TEXT,
                       timestamp TEXT,
                       FOREIGN KEY(interaction_id) REFERENCES interactions(id)
                   )
                   """)
    
    
    
    conn.commit()
    conn.close()

def create_session() -> str:
    session_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("INSERT INTO sessions (id, started_at) VALUES (?, ?)",
                   (session_id, datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return session_id

def log_interaction(session_id: str, mode: str, user_input: str, tutor_response: str):
    interaction_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    INSERT INTO interactions (id, session_id, mode, user_input, tutor_response, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (interaction_id, session_id, mode, user_input, tutor_response, datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()
    return interaction_id

def log_evaluation(interaction_id: str, verdict: str, score: float, feedback: str):
    evaluation_id = str(uuid.uuid4())
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    INSERT INTO evaluations (id, interaction_id, verdict, score, feedback, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (evaluation_id, interaction_id, verdict, score, feedback, datetime.utcnow().isoformat()))
    
    conn.commit()
    conn.close()

def get_recent_history(session_id: str, limit: int = 5) -> str:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT user_input, tutor_response FROM interactions
    WHERE session_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
    """, (session_id, limit))
    
    rows = cursor.fetchall()
    conn.close()
    
    rows.reverse()  # To get chronological order
    history_lines = []
    for user, tutor in rows:
        history_lines.append(f"Student: {user}\nTutor: {tutor}\n")

    return "\n".join(history_lines)

def get_session_interactions(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT id, user_input, tutor_response, mode FROM interactions
    WHERE session_id = ?
    ORDER BY timestamp ASC
    """, (session_id,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_session_evaluations(session_id: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
    SELECT e.verdict, e.score, i.user_input FROM evaluations e
    JOIN interactions i ON e.interaction_id = i.id
    WHERE i.session_id = ?
    ORDER BY e.timestamp ASC
    """, (session_id,))
    
    rows = cursor.fetchall()
    conn.close()
    return rows

#### Tutor Logic ####

def load_prompts():
    with open("prompts/tutor_system.txt", "r") as file:
        return file.read()

# def load_knowledge() -> str :
#     """_summary_

#     Returns:
#         str: _description_
#     """
#     contents = []
#     for md_file in KNOWLEDGE_PATH.glob("**/*.md"):
#         text = md_file.read_text(encoding="utf-8")
#         contents.append(f"# {md_file.stem}\n{text}")

#     return "\n\n".join(contents)

def parse_evaluation(evaluation_text: str):
    verdict = None
    score = None
    feedback = None
    
    for line in evaluation_text.splitlines():
        if line.startswith("VERDICT:"):
            verdict = line.split("VERDICT:")[1].strip()
        elif line.startswith("SCORE:"):
            score = float(line.split("SCORE:")[1].strip())
        elif line.startswith("FEEDBACK:"):
            feedback = line.split("FEEDBACK:")[1].strip()
    return verdict, score, feedback

def build_review_context(session_id: str) -> str:
    interactions = get_session_interactions(session_id)
    evaluations = get_session_evaluations(session_id)
    
    summary_lines = []
    
    if interactions:
        summary_lines.append("TOPICS DISCUSSED:\n")
        for _, mode, user_input, _ in interactions:
            if mode != "practice":
                summary_lines.append(f"- {user_input}")
    
    if evaluations:
        summary_lines.append("\nSTUDENT PERFORMANCE:\n")
        for verdict, score, question in evaluations:
            summary_lines.append(f"- Question: {question} | Verdict: {verdict}| Score: {score}")

    return "\n".join(summary_lines)

def get_student_input(input_mode: str, prompt="\nStudent: ", duration=5):
    if input_mode == "voice":
        audio_path = record_audio(duration=duration)
        text = transcribe(str(audio_path))
        print(f"\n📝 Transcribed: {text}")
        return text
    else:
        return input(prompt)


def generate_review(session_id: str) -> str:
    review_system_prompt = (BASE_DIR / "prompts/reviewer.txt").read_text()
    review_context = build_review_context(session_id)
    
    prompt = f"""{review_system_prompt}

{review_context}
"""
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(OLLAMA_API_URL, json=payload)
    response.raise_for_status()
    return response.json()["response"]

def evaluate_answer(question: str, student_answer: str, reference_material: str) -> str:
    evaluator_prompt = (BASE_DIR / "prompts/evaluator.txt").read_text()
    
    prompt = f"""{evaluator_prompt}

QUESTION:
{question}

STUDENT ANSWER:
{student_answer}

REFERENCE MATERIAL:
{reference_material}
"""
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(OLLAMA_API_URL, json=payload)
    response.raise_for_status()
    
    return response.json()["response"]

def ask_tutor(user_input:str , mode: str, session_id: str) -> str:
    system_prompt = load_prompts()
    history_context = get_recent_history(session_id)
    retrieval_query = f"""
    Conversation history:
    {history_context}
    Current question:
    {user_input}
    """
    retrieved_chunks = rag_engine.retrieve(retrieval_query, top_k=3)
    contents = "\n\n".join(retrieved_chunks)
    
    mode_instructions = {
        "learn":"Explain the concept clearly and then ask one short follow-up question to check understanding.",
        "practice": "Ask the student a question, wait for their answer, then give feedback and explain the correct answer.",
        "review": "Summarize key points briefly and reinforce learning"
    }
    
    prompt = f"""{system_prompt}

MODE: {mode.upper()}
MODE INSTRUCTIONS: {mode_instructions[mode]}

REFERENCE MATERIAL:
[Only 2-3 relevant chunks from the knowledge base are provided below to assist in answering the student's question.]
{contents}

STUDENT INPUT:
{user_input}

TUTOR RESPONSE:"""
    
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False
    }
    response = requests.post(OLLAMA_API_URL, json=payload)
    response.raise_for_status()
    
    return response.json()["response"]

if __name__ == "__main__":
    init_db()

print("Froth Flotation Tutor (type 'exit' to stop)")
print("Choose mode: learn, practice, review")

mode = input("Mode: ").strip().lower() or "learn"
input_type = input("Input type (text / voice) [text]: ").strip().lower() or "text"

session_id = create_session()
print(f"\nSession started: {session_id}")

# -------------------------
# REVIEW MODE
# -------------------------
if mode == "review":
    review_text = generate_review(session_id)
    print(review_text)

    if input("\nGenerate avatar video? (y/n): ").lower() == "y":
        try:
            clean_text = clean_for_avatar(review_text)
            audio_path = generate_tts(clean_text, "review.mp3")
            audio_url = f"{PUBLIC_BASE_URL}/audio/{audio_path.name}"
            video_url = create_avatar_video_from_audio(audio_url)
            print("Avatar video:", video_url)
        except Exception as e:
            print("Avatar failed:", e)

    sys.exit(0)

# -------------------------
# LEARN / PRACTICE
# -------------------------
while True:

    if mode == "practice":
        question = ask_tutor("Ask a practice question.", mode, session_id)
        print("\nTutor:", question)

        answer = get_student_input(input_type)
        if answer.lower() in ["exit", "quit"]:
            break

        context = "\n".join(rag_engine.retrieve(question, top_k=3))
        eval_text = evaluate_answer(question, answer, context)
        verdict, score, feedback = parse_evaluation(eval_text)

        interaction_id = log_interaction(
            session_id, mode, answer, question
        )

        log_evaluation(interaction_id, verdict, score, feedback)

        print(f"\nVerdict: {verdict}")
        print(f"Score: {score}")
        print(f"Feedback: {feedback}")
        continue

    # LEARN MODE
    user_input = get_student_input(input_type)
    if user_input.lower() in ["exit", "quit"]:
        break

    tutor_response = ask_tutor(user_input, mode, session_id)
    log_interaction(session_id, mode, user_input, tutor_response)

    print("\nTutor:", tutor_response)

    if input("\nGenerate avatar video? (y/n): ").lower() == "y":
        try:
            clean_text = clean_for_avatar(tutor_response)
            audio_path = generate_tts(clean_text, "learn.mp3")
            audio_url = f"{PUBLIC_BASE_URL}/audio/{audio_path.name}"
            video_url = create_avatar_video_from_audio(audio_url)
            print("Avatar video:", video_url)
        except Exception as e:
            print("Avatar failed:", e)