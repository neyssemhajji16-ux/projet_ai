from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from rag import RAGSystem
from exam_generator import ExamGenerator
from course_generator import CourseGenerator
import os

app = FastAPI(title="EduRAG API", version="1.0.0")

# Limitation des accès CORS pour des raisons de sécurité
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration de la taille maximale des fichiers (10 Mo)
MAX_UPLOAD_SIZE = 10 * 1024 * 1024

rag_system     = RAGSystem()
exam_generator = ExamGenerator()
course_generator = CourseGenerator()


class QuestionRequest(BaseModel):
    question: str
    session_id: Optional[str] = "default"

class ExamRequest(BaseModel):
    num_questions: int = 5
    difficulty: str = "medium"
    question_type: str = "mcq"
    topic: Optional[str] = None
    # Champs pour le mode mixte
    mcq_count: Optional[int] = 0
    open_count: Optional[int] = 0
    tf_count: Optional[int] = 0

class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []

class CourseRequest(BaseModel):
    topic: str
    level: str = "intermediate"

class LoadTextRequest(BaseModel):
    text: str
    filename: str


@app.get("/")
def root():
    return {"message": "EduRAG API is running!"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "pdf_loaded": rag_system.is_loaded(),
        "filename": rag_system.filename or None
    }

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")

    content = await file.read()

    # Validation de la taille du fichier importé
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Fichier trop volumineux ({len(content) // (1024*1024)} Mo). La taille maximale autorisée est de 10 Mo"
        )

    result = rag_system.load_pdf_bytes(content, file.filename)

    if result["success"]:
        return {
            "message": f"PDF '{file.filename}' chargé avec succès!",
            "pages":  result["pages"],
            "chunks": result["chunks"]
        }
    else:
        raise HTTPException(status_code=500, detail=result["error"])

@app.post("/chat", response_model=ChatResponse)
async def chat(request: QuestionRequest):
    if not rag_system.is_loaded():
        raise HTTPException(status_code=400, detail="Veuillez d'abord charger un document")

    result = rag_system.query(request.question)
    return ChatResponse(answer=result["answer"], sources=result["sources"])

@app.post("/generate-exam")
async def generate_exam(request: ExamRequest):
    if not rag_system.is_loaded():
        raise HTTPException(status_code=400, detail="Veuillez d'abord charger un document")

    context = rag_system.get_full_context(request.topic)

    if request.question_type == "mixed":
        total = (request.mcq_count or 0) + (request.open_count or 0) + (request.tf_count or 0)
        if total == 0:
            raise HTTPException(status_code=400, detail="Veuillez sélectionner au moins une question")
        exam = exam_generator.generate_mixed(
            context=context,
            mcq_count=request.mcq_count or 0,
            open_count=request.open_count or 0,
            tf_count=request.tf_count or 0,
            difficulty=request.difficulty
        )
    else:
        exam = exam_generator.generate(
            context=context,
            num_questions=request.num_questions,
            difficulty=request.difficulty,
            question_type=request.question_type
        )
    return exam

@app.post("/generate-course")
async def generate_course(request: CourseRequest):
    try:
        content = course_generator.generate(request.topic, request.level)
        return {"topic": request.topic, "content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/load-text")
async def load_text(request: LoadTextRequest):
    result = rag_system.load_text(request.text, request.filename)
    if result["success"]:
        return {
            "message": f"Cours '{request.filename}' généré et chargé avec succès!",
            "pages":  result["pages"],
            "chunks": result["chunks"]
        }
    else:
        raise HTTPException(status_code=500, detail=result["error"])

@app.delete("/reset")
def reset():
    rag_system.reset()
    return {"message": "Session réinitialisée"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
