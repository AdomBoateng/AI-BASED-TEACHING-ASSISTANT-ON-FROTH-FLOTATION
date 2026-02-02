import re

MAX_CHARS = 300

def clean_for_avatar(text: str) -> str:
    text = re.sub(r"[#*_>`]", "", text)
    text = re.sub(r"\n\s*[-•]\s*", " ", text)
    text = text.encode("ascii", "ignore").decode()
    text = re.sub(r"\s+", " ", text).strip()

    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS].rsplit(".", 1)[0] + "."

    return text