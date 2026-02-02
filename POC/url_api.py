from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

app = FastAPI()

app.mount(
    "/audio",
    StaticFiles(directory="audio"),
    name="audio"
)