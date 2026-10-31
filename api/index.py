import os
import sys

# Add root directory to sys.path so modules like database, pdf_parser, etc. are importable
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from main import app
