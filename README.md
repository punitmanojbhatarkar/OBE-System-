# 🧠 AI-Driven Outcome-Based Education (OBE) System v2.0

An intelligent, end-to-end web application that leverages **Agentic AI** and Large Language Models (LLMs) to automate, orchestrate, and streamline Outcome-Based Education workflows for educational institutions.

## 🚀 Unique Selling Propositions (USPs)
What makes this system stand out from traditional OBE software?

1. **Agentic AI Integration:** We don't just store data; our system acts as a "co-pilot" for faculty. From reading syllabus PDFs to drafting Course Outcomes (COs) and generating complex exam papers, the AI agent performs high-level cognitive tasks autonomously.
2. **Automated Subjective Grading:** Instead of just multiple-choice questions, our AI evaluates long-form subjective answers against predefined rubrics, awarding marks and providing constructive feedback to students.
3. **Intelligent CO-PO Mapping:** The AI semantically maps Course Outcomes to Program Outcomes and provides justification for the mapping strength (1, 2, or 3), eliminating subjective human bias.
4. **Bloom's Taxonomy (RBT) Analyzer:** Automatically classifies questions and assessments into their respective cognitive levels (L1 to L6) to ensure balanced cognitive load in assessments.
5. **Frictionless Data Entry (Client-Side Parsing):** Faculty can drag-and-drop massive Excel/CSV sheets for marks entry. The system parses them locally in the browser, intelligently mapping student names/PRNs to their corresponding scores instantly.
6. **AI Advisor (Chat Co-Pilot):** A persistent, context-aware AI assistant built directly into the dashboard. Faculty can query it to brainstorm teaching philosophies, address curriculum gaps, and get pedagogical advice based on their specific course data.

## 🛠️ Tech Stack
This project uses a robust, high-performance tech stack:

### Backend (The Engine)
*   **Python 3 & FastAPI:** Provides a lightning-fast, asynchronous API backend that effortlessly handles AI requests and data processing.
*   **SQLite (via SQLAlchemy):** A unified, robust relational database that completely eliminates state-synchronization issues.
*   **Google Generative AI (Gemini SDK):** Powers the core LLM logic, running state-less and context-aware agents for document parsing and reasoning.

### Frontend (The Interface)
*   **Vanilla HTML5, CSS3, JavaScript:** Built without heavy frameworks for maximum performance. Uses modern Glassmorphism, dynamic animations, and vibrant color palettes for a premium SaaS feel.
*   **SheetJS:** Implemented for secure, client-side processing of `.xlsx` and `.csv` files.
*   **Custom API Bridge (`api.js`):** A custom networking layer that intercepts frontend requests and seamlessly synchronizes data with the FastAPI backend.

## 📂 Project Structure & Module Breakdown

*   `backend/` - The FastAPI server and AI logic layer.
    *   `main.py`: The core API router defining all endpoints for assignments, courses, students, and AI services.
    *   `database.py` & `models.py`: SQLAlchemy database configuration and schema definitions for persistence.
    *   `agents/ai_logic.py`: The heart of the Agentic AI. Contains the sophisticated prompt-engineering and function calls for the Gemini model to perform tasks like Syllabus Extraction, Subjective Grading, and NBA Report Generation.
*   `frontend/` - The user interface.
    *   `scripts/api.js`: The custom abstraction layer that links frontend actions to the backend database.
    *   `scripts/ai-chat.js`: Handles the UI and state management for the persistent AI Co-Pilot chat window.
    *   `faculty/`: The faculty dashboard containing distinct modules for Course Setup, Syllabus Management, Assessments, Marks Entry, and complex reporting like the 6A Indicator Matrix.

## ✨ Key Workflows & Features

1. **Course setup & Syllabus:** Faculty upload a syllabus PDF; the AI extracts the modules, drafts COs, and suggests a Teaching Philosophy.
2. **Assessments & AI Generation:** Faculty can click a button to let the AI generate an entire Internal Assessment (IA), Mid-Semester Exam (MSE), or End-Semester Exam (ESE) tailored to specific COs.
3. **Marks Entry:** Intuitive Excel pasting feature allows for bulk-uploading marks, which the system dynamically matches to student records.
4. **Attainment & 6A Matrix:** The system calculates real-time CO attainment based on student marks and automatically drafts compliance reports for NBA accreditation.

## ⚙️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/punitmanojbhatarkar/OBE-System-.git
   cd OBE-System-
   ```

2. **Set up the Python Backend:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the System:**
   You can either run the provided `start_system.bat` (on Windows) or start the server manually:
   ```bash
   python main.py
   ```
   The backend will serve both the API and the static frontend files.

5. **Access the Application:**
   Open your browser and navigate to `http://localhost:8080`.

---
*Developed for innovation in outcome-based education workflows.*
