import os
import sys
import json
import shutil
import time
import fitz  # PyMuPDF
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# S'assurer d'importer depuis le dossier courant
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rag import RAGSystem
from exam_generator import ExamGenerator

# Assurer l'encodage UTF-8 sous Windows pour éviter les UnicodeEncodeError
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

# Temps de pause entre chaque appel API pour respecter la limite Mistral Free Tier (5 requêtes par minute)
RATE_LIMIT_DELAY = 12.5

def create_test_pdf_bytes() -> bytes:
    """Génère un PDF en mémoire avec des faits spécifiques pour le test."""
    doc = fitz.open()
    page = doc.new_page()
    
    content = (
        "PROJET EDURAG\n\n"
        "1. Présentation générale :\n"
        "Le projet EduRAG a été officiellement conçu en l'an 2026 par le Dr. Neyssa.\n"
        "Ce système utilise des technologies avancées de Retrieval-Augmented Generation pour aider les étudiants.\n"
        "La couleur officielle du projet est le bleu azur, symbolisant la clarté et la profondeur.\n\n"
        "2. Caractéristiques techniques :\n"
        "Le moteur de recherche vectorielle utilisé par EduRAG est FAISS (Facebook AI Similarity Search).\n"
        "Le modèle de langage principal est Mistral Large (mistral-large-latest).\n"
        "Il dispose d'une sécurité robuste : la taille maximale des fichiers PDF acceptés est strictement limitée à 10 Mo.\n\n"
        "3. Anecdotes et Design :\n"
        "Le logo officiel représente un hibou bleu azur qui lit attentivement un livre doré."
    )
    
    rect = fitz.Rect(50, 50, 550, 750)
    page.insert_textbox(rect, content, fontsize=11, fontname="helv")
    
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

def print_result(test_name: str, success: bool, message: str = ""):
    icon = "[PASS]" if success else "[FAIL]"
    color_code = "\033[92m" if success else "\033[91m"
    reset_code = "\033[0m"
    print(f"{color_code}{icon}{reset_code} - {test_name} {message}")

def run_tests():
    print("==================================================")
    print("   Lancement des tests d'intégration du RAG")
    print("==================================================")

    # 0. Vérification de la clé API
    api_key = os.getenv("MISTRAL_API_KEY")
    if not api_key:
        print_result("Vérification API Key", False, "MISTRAL_API_KEY non trouvée dans le fichier .env")
        sys.exit(1)
    else:
        print_result("Vérification API Key", True, "(Clé détectée)")

    # 1. Nettoyage de l'état persistant précédent
    if os.path.exists("faiss_store"):
        shutil.rmtree("faiss_store")
        print("[INFO] Ancien index FAISS nettoyé.")

    # Instanciation du RAG
    rag = RAGSystem()
    print_result("Instanciation RAGSystem", True)

    # 2. Génération et chargement du PDF de test
    print("\n--- Étape 1: Chargement du PDF ---")
    pdf_bytes = create_test_pdf_bytes()
    filename = "test_document.pdf"
    
    result = rag.load_pdf_bytes(pdf_bytes, filename)
    
    if result.get("success"):
        print_result(
            "load_pdf_bytes", 
            True, 
            f"- Pages: {result.get('pages')}, Chunks: {result.get('chunks')}"
        )
    else:
        print_result("load_pdf_bytes", False, f"Erreur: {result.get('error')}")
        sys.exit(1)

    print_result("rag.is_loaded()", rag.is_loaded() is True)
    print_result("Vérification rag.filename", rag.filename == filename)

    # 3. Validation de la persistance FAISS
    print("\n--- Étape 2: Persistance & Rechargement ---")
    meta_path = os.path.join("faiss_store", "meta.json")
    faiss_index_path = os.path.join("faiss_store", "index.faiss")
    
    persistence_ok = os.path.exists(meta_path) and os.path.exists(faiss_index_path)
    print_result("Persistance des fichiers sur le disque", persistence_ok)
    
    # Charger depuis un nouvel objet RAG pour tester la recharge automatique
    new_rag = RAGSystem()
    print_result("Nouvelle instance RAGSystem recharge l'index", new_rag.is_loaded() is True)
    print_result("Fichier restauré dans la nouvelle instance", new_rag.filename == filename)

    # 4. Validation du Retrieval (Recherche de similarité)
    print("\n--- Étape 3: Retrieval (Similarité FAISS) ---")
    query_str = "Qui a créé le projet EduRAG-Quantum ?"
    docs = rag.vectorstore.similarity_search(query_str, k=2)
    
    retrieved_content_ok = any("Dr. Neyssa" in doc.page_content for doc in docs)
    print_result(
        "Recherche de similarité FAISS", 
        retrieved_content_ok, 
        f"- Retrouvé: {len(docs)} chunks"
    )

    # 5. Validation de la Génération QA (Appel LLM avec contexte RAG)
    print("\n--- Étape 4: Génération QA ---")
    print(f"Pause de {RATE_LIMIT_DELAY}s pour respecter le rate limit...")
    time.sleep(RATE_LIMIT_DELAY)
    
    qa_result = rag.query("Qui a créé le projet EduRAG-Quantum et en quelle année ?")
    answer = qa_result.get("answer", "")
    sources = qa_result.get("sources", [])

    if "Rate limit exceeded" in answer or "429" in answer:
        print_result("QA - Appel LLM", False, f"Rate limit atteint : {answer}")
        sys.exit(1)

    creator_ok = "Neyssa" in answer
    year_ok = "2026" in answer
    sources_ok = len(sources) > 0

    print_result("QA - Extraction du créateur (Neyssa)", creator_ok, f"| IA: \"{answer[:60].strip()}...\"")
    print_result("QA - Extraction de l'année (2026)", year_ok)
    print_result("QA - Récupération des sources", sources_ok, f"| Sources trouvées: {len(sources)}")

    # 6. Validation de la mémoire conversationnelle
    print("\n--- Étape 5: Mémoire Conversationnelle ---")
    print(f"Pause de {RATE_LIMIT_DELAY}s avant la première question de mémoire...")
    time.sleep(RATE_LIMIT_DELAY)
    
    # Première question (pour amorcer le contexte de mémoire)
    rag.query("De quoi parle la section caractéristiques techniques ?")
    
    print(f"Pause de {RATE_LIMIT_DELAY}s avant la deuxième question de mémoire...")
    time.sleep(RATE_LIMIT_DELAY)
    
    # Deuxième question avec pronom démonstratif faisant référence à la première question
    follow_up_result = rag.query("Quelle est sa limite de taille de fichier ?")
    follow_up_answer = follow_up_result.get("answer", "")
    
    if "Rate limit exceeded" in follow_up_answer or "429" in follow_up_answer:
        print_result("Mémoire conversationnelle", False, f"Rate limit atteint : {follow_up_answer}")
        sys.exit(1)

    memory_ok = "10" in follow_up_answer or "10 Mo" in follow_up_answer or "10 megabytes" in follow_up_answer.lower()
    print_result(
        "Mémoire conversationnelle (Rappels du contexte précédent)", 
        memory_ok, 
        f"| IA: \"{follow_up_answer[:80].strip()}...\""
    )

    # 7. Validation de l'ExamGenerator
    print("\n--- Étape 6: Génération d'Examens (Mode Mixte) ---")
    generator = ExamGenerator()
    context = rag.get_full_context("Caractéristiques techniques et Anecdotes")
    
    print(f"Pause de {RATE_LIMIT_DELAY}s avant la génération de l'examen mixte...")
    time.sleep(RATE_LIMIT_DELAY)
    
    mixed_exam = generator.generate_mixed(
        context=context, 
        mcq_count=1, 
        open_count=1, 
        tf_count=1, 
        difficulty="medium"
    )
    
    if "error" in mixed_exam:
        print_result("Génération Examen Mixte", False, f"Erreur: {mixed_exam.get('error')}")
        sys.exit(1)

    questions = mixed_exam.get("questions", [])
    mixed_ok = len(questions) >= 3
    
    # Validation détaillée du schéma de chaque type de question
    mcq_valid = False
    open_valid = False
    tf_valid = False
    
    for q in questions:
        q_type = q.get("type")
        if q_type == "mcq":
            mcq_valid = "question" in q and "options" in q and "correct" in q and "explanation" in q
        elif q_type == "open":
            open_valid = "question" in q and "model_answer" in q and "key_points" in q
        elif q_type == "tf":
            tf_valid = "statement" in q and "correct" in q and "explanation" in q

    print_result("Génération Examen Mixte - Nombre de questions", mixed_ok, f"({len(questions)} reçues)")
    print_result("Schéma Question QCM (MCQ) valide", mcq_valid)
    print_result("Schéma Question Ouverte (Open) valide", open_valid)
    print_result("Schéma Question Vrai/Faux (TF) valide", tf_valid)

    print("\n==================================================")
    print("   Fin des tests d'intégration du RAG")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
