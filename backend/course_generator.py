from langchain_mistralai import ChatMistralAI
import os
from dotenv import load_dotenv

load_dotenv()

class CourseGenerator:
    """Générateur de cours académiques propulsé par Mistral AI."""
    
    def __init__(self):
        self.api_key = os.getenv("MISTRAL_API_KEY")
        self.llm = ChatMistralAI(
            model="mistral-large-latest",
            mistral_api_key=self.api_key,
            temperature=0.5,
            timeout=180
        )

    def generate(self, topic: str, level: str) -> str:
        level_map = {
            "beginner": "Débutant (concepts de base, définitions simples, exemples d'introduction)",
            "intermediate": "Intermédiaire (approfondissement technique, cas pratiques détaillés)",
            "advanced": "Avancé (analyse théorique rigoureuse, détails complexes, cas d'étude réels)"
        }
        level_text = level_map.get(level, "de niveau intermédiaire")
        
        prompt = f"""Tu es un expert en intelligence artificielle, deep learning et pédagogie universitaire.

Ta mission est de générer un cours COMPLET, STRUCTURÉ, CLAIR et PÉDAGOGIQUE sur le sujet suivant : "{topic}".
Le niveau ciblé pour ce cours est : {level_text}.

Le cours doit être adapté à un niveau étudiant ingénieur/universitaire et doit expliquer les concepts progressivement, du plus simple au plus avancé.

Consignes importantes :

* Utiliser un français clair et professionnel.
* Éviter les explications trop génériques ou répétitives.
* Éviter le style “Wikipedia” ou trop théorique sans intuition.
* Expliquer les concepts avec intuition + théorie + exemples.
* Ajouter des analogies simples lorsque c’est utile.
* Structurer le cours avec :

  * Introduction
  * Objectifs d’apprentissage
  * Sections numérotées
  * Sous-sections
  * Conclusion
  * Résumé final des concepts clés

Le cours doit contenir :

1. Définitions claires des concepts.
2. Explications détaillées mais compréhensibles.
3. Formules mathématiques bien présentées et expliquées (au format LaTeX/Markdown).
4. Tableaux récapitulatifs lorsque nécessaire.
5. Exemples concrets et intuitifs.
6. Exemples de code modernes et fonctionnels.
7. Applications pratiques réelles.
8. Avantages et limites des méthodes présentées.
9. Bonnes pratiques et erreurs fréquentes.
10. Une progression pédagogique logique.

IMPORTANT :

* Ajouter des schémas explicatifs en ASCII ou descriptions visuelles lorsque possible.
* Ajouter des résumés courts à la fin de chaque grande section.
* Mettre en évidence les notions importantes.
* Bien séparer théorie et pratique.
* Donner des exemples simples avant les exemples complexes.
* Corriger automatiquement les erreurs de formatage Markdown/code.
* Les blocs de code doivent être propres, complets et exécutables.
* Utiliser des tableaux pour comparer les architectures/modèles/méthodes.
* Ajouter une section “Questions fréquentes” à la fin.
* Ajouter une section “Pièges et erreurs classiques”.
* Ajouter une mini conclusion après chaque grande partie.

Si le sujet concerne le Machine Learning ou le Deep Learning :

* Expliquer les intuitions mathématiques.
* Détailler le rôle des hyperparamètres.
* Expliquer les étapes d’entraînement.
* Présenter les architectures importantes historiquement.
* Inclure des exemples avec TensorFlow ou PyTorch.
* Ajouter des cas pratiques réalistes.
* Expliquer les problèmes possibles : overfitting, biais, coût computationnel, interprétabilité, etc.

Le résultat final doit ressembler à un vrai chapitre de cours universitaire moderne, lisible et bien organisé.
Ne rajoute pas d'introduction ou de conclusion de discussion avec l'utilisateur du type "Voici votre cours...", commence directement par le titre principal en Markdown (#)."""

        response = self.llm.invoke(prompt)
        return response.content.strip()
