import sys
from pathlib import Path

# Add parent directory to path to import rag module
sys.path.insert(0, str(Path(__file__).parent.parent))

from rag import RAGEngine

rag = RAGEngine()
rag.build_index()