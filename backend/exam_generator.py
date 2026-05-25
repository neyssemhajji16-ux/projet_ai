from langchain_mistralai import ChatMistralAI
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

class ExamGenerator:
    def __init__(self):
        self.api_key = os.getenv("MISTRAL_API_KEY")
        self.llm = ChatMistralAI(
            model="mistral-large-latest",
            mistral_api_key=self.api_key,
            temperature=0.7,
            timeout=180
        )

    def generate(self, context: str, num_questions: int = 5, difficulty: str = "medium", question_type: str = "mcq") -> dict:
        
        difficulty_map = {
            "easy": "faciles et directes",
            "medium": "de difficulté moyenne, nécessitant de la compréhension",
            "hard": "difficiles, nécessitant analyse et réflexion approfondie"
        }
        
        diff_text = difficulty_map.get(difficulty, "de difficulté moyenne")

        if question_type == "mcq":
            prompt = f"""Tu es un professeur expert. À partir du contenu suivant, génère exactement {num_questions} questions QCM {diff_text}.

Contenu du cours:
{context}

Génère les questions en JSON UNIQUEMENT (sans markdown, sans backticks), dans ce format exact:
{{
  "title": "Examen généré automatiquement",
  "questions": [
    {{
      "id": 1,
      "question": "La question ici?",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct": "A",
      "explanation": "Explication de la bonne réponse"
    }}
  ]
}}"""

        elif question_type == "open":
            prompt = f"""Tu es un professeur expert. À partir du contenu suivant, génère exactement {num_questions} questions ouvertes {diff_text}.

Contenu du cours:
{context}

Génère les questions en JSON UNIQUEMENT (sans markdown, sans backticks), dans ce format exact:
{{
  "title": "Examen généré automatiquement",
  "questions": [
    {{
      "id": 1,
      "question": "La question ouverte ici?",
      "model_answer": "La réponse modèle complète",
      "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"]
    }}
  ]
}}"""

        else:  # true/false
            prompt = f"""Tu es un professeur expert. À partir du contenu suivant, génère exactement {num_questions} questions Vrai/Faux {diff_text}.

Contenu du cours:
{context}

Génère les questions en JSON UNIQUEMENT (sans markdown, sans backticks), dans ce format exact:
{{
  "title": "Examen généré automatiquement",
  "questions": [
    {{
      "id": 1,
      "statement": "L'affirmation à évaluer",
      "correct": true,
      "explanation": "Explication pourquoi c'est vrai ou faux"
    }}
  ]
}}"""

        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            
            # Clean potential markdown
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```\s*', '', content)
            content = content.strip()
            
            exam_data = json.loads(content)
            exam_data["difficulty"] = difficulty
            exam_data["question_type"] = question_type
            exam_data["num_questions"] = num_questions
            return exam_data

        except json.JSONDecodeError as e:
            return {
                "title": "Examen généré",
                "error": f"Erreur de parsing JSON: {str(e)}",
                "raw": content if 'content' in locals() else "",
                "questions": []
            }
        except Exception as e:
            return {
                "title": "Erreur",
                "error": str(e),
                "questions": []
            }

    def generate_mixed(self, context: str, mcq_count: int = 0, open_count: int = 0,
                       tf_count: int = 0, difficulty: str = "medium") -> dict:
        difficulty_map = {
            "easy": "faciles et directes",
            "medium": "de difficulté moyenne",
            "hard": "difficiles, nécessitant analyse et réflexion"
        }
        diff_text = difficulty_map.get(difficulty, "de difficulté moyenne")

        prompt = f"""Tu es un professeur expert. Génère un examen mixte {diff_text} à partir du contenu suivant.

L'examen doit contenir EXACTEMENT :
- {mcq_count} questions QCM (type "mcq")
- {open_count} questions ouvertes (type "open")
- {tf_count} questions Vrai/Faux (type "tf")

Contenu du cours:
{context}

Retourne UNIQUEMENT du JSON valide sans markdown, sans backticks, dans ce format:
{{
  "title": "Examen Mixte",
  "questions": [
    {{"id": 1, "type": "mcq", "question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "correct": "A", "explanation": "..."}},
    {{"id": 2, "type": "open", "question": "...", "model_answer": "...", "key_points": ["...", "..."]}},
    {{"id": 3, "type": "tf", "statement": "...", "correct": true, "explanation": "..."}}
  ]
}}"""

        try:
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            content = re.sub(r'```json\s*', '', content)
            content = re.sub(r'```\s*', '', content)
            content = content.strip()

            exam_data = json.loads(content)
            exam_data["difficulty"] = difficulty
            exam_data["question_type"] = "mixed"
            exam_data["num_questions"] = len(exam_data.get("questions", []))
            return exam_data

        except json.JSONDecodeError as e:
            return {
                "title": "Examen Mixte",
                "error": f"Erreur de parsing JSON: {str(e)}",
                "raw": content if 'content' in locals() else "",
                "questions": []
            }
        except Exception as e:
            return {"title": "Erreur", "error": str(e), "questions": []}
