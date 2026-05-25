from langchain_mistralai import ChatMistralAI, MistralAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
import fitz  # PyMuPDF
import os
import json
import shutil
from dotenv import load_dotenv

load_dotenv()

FAISS_PATH = "faiss_store"
META_PATH  = "faiss_store/meta.json"


class RAGSystem:
    def __init__(self):
        self.api_key     = os.getenv("MISTRAL_API_KEY")
        self.vectorstore = None
        self.qa_chain    = None
        self.memory      = None
        self.pdf_text    = ""
        self.filename    = ""
        self._loaded     = False

        self.llm = ChatMistralAI(
            model="mistral-large-latest",
            mistral_api_key=self.api_key,
            temperature=0.3,
            timeout=180
        )

        self.embeddings = MistralAIEmbeddings(
            model="mistral-embed",
            mistral_api_key=self.api_key
        )

        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )

        # Charger l'index existant s'il y en a un
        self._try_load_persisted()

    # ------------------------------------------------------------------
    # Helpers privés
    # ------------------------------------------------------------------

    def _build_prompt(self) -> PromptTemplate:
        template = """Tu es un assistant pédagogique expert. Utilise le contexte suivant pour répondre à la question de manière claire, détaillée et structurée en français.

Contexte:
{context}

Question: {question}

Réponds de façon complète, pédagogique et bien structurée. Si la réponse n'est pas dans le contexte, dis-le clairement."""
        return PromptTemplate(
            template=template,
            input_variables=["context", "question"]
        )

    def _build_chain(self):
        """Construit la chaîne RAG avec mémoire conversationnelle."""
        # Initialisation de la mémoire pour retenir l'historique des échanges
        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )

        self.qa_chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vectorstore.as_retriever(search_kwargs={"k": 4}),
            memory=self.memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": self._build_prompt()}
        )

    def _try_load_persisted(self):
        """Recharge l'index FAISS depuis le stockage local au démarrage."""
        try:
            if os.path.exists(FAISS_PATH) and os.path.exists(META_PATH):
                self.vectorstore = FAISS.load_local(
                    FAISS_PATH,
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                with open(META_PATH, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                self.pdf_text = meta.get("pdf_text", "")
                self.filename = meta.get("filename", "")
                self._build_chain()
                self._loaded = True
                print(f"[OK] Index FAISS charge depuis le disque : {self.filename}")
        except Exception as e:
            print(f"[WARN] Impossible de charger l'index persiste : {e}")

    # ------------------------------------------------------------------
    # API publique
    # ------------------------------------------------------------------

    def load_pdf_bytes(self, pdf_bytes: bytes, filename: str) -> dict:
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")

            # Nombre réel de pages du document PDF
            num_pages = len(doc)

            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()

            if not text.strip():
                return {"success": False, "error": "Le PDF ne contient pas de texte extractible"}

            self.pdf_text = text
            self.filename = filename

            chunks = self.text_splitter.split_text(text)
            self.vectorstore = FAISS.from_texts(chunks, self.embeddings)

            # Sauvegarder l'index localement
            os.makedirs(FAISS_PATH, exist_ok=True)
            self.vectorstore.save_local(FAISS_PATH)
            with open(META_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {"pdf_text": text, "filename": filename},
                    f,
                    ensure_ascii=False
                )

            self._build_chain()
            self._loaded = True

            return {"success": True, "pages": num_pages, "chunks": len(chunks)}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def load_text(self, text: str, filename: str) -> dict:
        """Indexe directement un texte de cours brut."""
        try:
            if not text.strip():
                return {"success": False, "error": "Le contenu du cours est vide"}

            self.pdf_text = text
            self.filename = filename

            chunks = self.text_splitter.split_text(text)
            self.vectorstore = FAISS.from_texts(chunks, self.embeddings)

            # Sauvegarder l'index localement
            os.makedirs(FAISS_PATH, exist_ok=True)
            self.vectorstore.save_local(FAISS_PATH)
            with open(META_PATH, "w", encoding="utf-8") as f:
                json.dump(
                    {"pdf_text": text, "filename": filename},
                    f,
                    ensure_ascii=False
                )

            self._build_chain()
            self._loaded = True

            return {"success": True, "pages": 1, "chunks": len(chunks)}

        except Exception as e:
            return {"success": False, "error": str(e)}

    def query(self, question: str) -> dict:
        try:
            # Interrogation de la chaîne conversationnelle
            result = self.qa_chain({"question": question})
            answer = result["answer"]

            sources = []
            if "source_documents" in result:
                for doc in result["source_documents"][:2]:
                    snippet = doc.page_content[:150].strip() + "..."
                    sources.append(snippet)

            return {"answer": answer, "sources": sources}

        except Exception as e:
            return {"answer": f"Erreur: {str(e)}", "sources": []}

    def get_full_context(self, topic: str = None) -> str:
        if topic and self.vectorstore:
            docs = self.vectorstore.similarity_search(topic, k=8)
            return "\n\n".join([d.page_content for d in docs])
        return self.pdf_text[:6000]

    def is_loaded(self) -> bool:
        return self._loaded

    def reset(self):
        self.vectorstore = None
        self.qa_chain    = None
        self.memory      = None
        self.pdf_text    = ""
        self._loaded     = False

        # Supprimer l'index persisté
        if os.path.exists(FAISS_PATH):
            shutil.rmtree(FAISS_PATH)
