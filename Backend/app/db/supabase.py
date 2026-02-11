from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL", "https://fdqilmfldmzqynpvyiql.supabase.co"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkcWlsbWZsZG16cXlucHZ5aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDAwMzI1MywiZXhwIjoyMDg1NTc5MjUzfQ.fzfAQrDACv1J4cItbI2F5Em-D-bAfq_gF-y75jLxmBg")
)
