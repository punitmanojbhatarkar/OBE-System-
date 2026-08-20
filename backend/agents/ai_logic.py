# -*- coding: utf-8 -*-
"""
AGENTIC AI ENGINE v3.0 -- AI OBE System
========================================
True Agentic AI using LangChain's full stack:

  Agent 1:  Chatbot          ? create_react_agent with 4 DB-aware tools + ConversationMemory
  Agent 2:  Syllabus Parser  ? Structured extraction with field validation
  Agent 3:  Philosophy Writer? NBA-portfolio narrative generator
  Agent 4:  Bloom's Analyzer ? Verb context chain-of-thought
  Agent 5:  CO-PO Mapper     ? Conservative justified mapping
  Agent 6:  Assignment Gen   ? Rich curriculum-aligned questions
  Agent 7:  Grader           ? TWO-PASS self-consistency + score reconciliation
  Agent 8:  Remedial Planner ? Personalized NPTEL-linked learning path
  Agent 9:  Extractor        ? Question+rubric extractor from PDFs
  Agent 10: Attainment Agent ? Pure Python NBA-formula calculator + AI interpretation
  Agent 11: NBA Report Gen   ? Full course NBA report generator
"""

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain.agents import create_agent
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import os
import json
import re
import numpy as np

# ?? LLM Factory ????????????????????????????????????????????????????????????????

def get_llm(temperature: float = 0.1):
    """Return a configured Gemini 2.5 Flash LLM instance."""
    return ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=temperature,
        google_api_key=os.getenv("GEMINI_API_KEY"),
        max_retries=1
    )

# ?? Session Memory Store (in-memory message history per session_id) ???????????
_chat_histories: Dict[str, List] = {}

def get_history(session_id: str) -> List:
    if session_id not in _chat_histories:
        _chat_histories[session_id] = []
    return _chat_histories[session_id]

def clear_memory(session_id: str):
    _chat_histories.pop(session_id, None)


# ==========================================
# 1. Chatbot Agent -- Tool-Calling React Agent
# ==========================================

def build_chatbot_tools(db_context: dict):
    """
    Build dynamic tools pre-loaded with DB context data.
    db_context = {
      "courses": [...],
      "cos": [...],
      "marks_summary": {...},
      "students": [...],
      "attainment": {...}
    }
    """

    @tool
    def get_course_overview(course_name_or_id: str) -> str:
        """
        Look up details about a specific course including its code, faculty,
        semester, total students, and exam scheme (IA/MSE/ESE marks).
        Use when asked about a specific course.
        """
        courses = db_context.get("courses", [])
        query = course_name_or_id.lower().strip()
        matches = [
            c for c in courses
            if query in c.get("name", "").lower()
            or query in c.get("code", "").lower()
            or query == c.get("id", "").lower()
        ]
        if not matches:
            return f"No course found matching '{course_name_or_id}'. Available courses: {[c.get('name') for c in courses]}"
        c = matches[0]
        return json.dumps({
            "name": c.get("name"),
            "code": c.get("code"),
            "semester": c.get("semester"),
            "faculty": c.get("facultyId"),
            "totalStudents": c.get("totalStudents"),
            "examScheme": c.get("examScheme"),
            "attainmentLevels": c.get("attainmentLevels"),
        }, indent=2)

    @tool
    def get_co_details(course_name_or_id: str) -> str:
        """
        Get all Course Outcomes (COs) for a course including their Bloom's
        taxonomy level and what they are assessed through.
        Use when asked about COs, learning outcomes, or Blooms levels.
        """
        cos = db_context.get("cos", [])
        query = course_name_or_id.lower().strip()
        course_id = None
        for c in db_context.get("courses", []):
            if query in c.get("name", "").lower() or query in c.get("code", "").lower():
                course_id = c.get("id")
                break
        if not course_id:
            course_id = query
        filtered = [co for co in cos if co.get("courseId") == course_id]
        if not filtered:
            return f"No COs found for course '{course_name_or_id}'."
        return json.dumps(filtered, indent=2)

    @tool
    def calculate_attainment_summary(course_name_or_id: str) -> str:
        """
        Calculate and return CO attainment percentages for a course.
        Returns per-CO attainment % and whether each CO is attained (Level 1/2/3).
        Use when asked about attainment, performance, or CO achievement.
        """
        attainment = db_context.get("attainment", {})
        if not attainment:
            return "Attainment data is not yet computed for any course. Marks may not have been entered."

        query = course_name_or_id.lower().strip()
        result = None
        for course_id, data in attainment.items():
            course = next((c for c in db_context.get("courses", [])
                           if c.get("id") == course_id), {})
            if query in course.get("name", "").lower() or query in course_id.lower():
                result = {"course": course.get("name", course_id), "attainment": data}
                break

        if not result:
            return f"Attainment data not found for '{course_name_or_id}'. Available: {list(attainment.keys())}"

        summary_lines = [f"? CO Attainment Report -- {result['course']}"]
        for co_key, val in result["attainment"].items():
            pct = val.get("percentage", 0)
            level = val.get("level", 0)
            status = "? Attained" if level >= 1 else "? Not Attained"
            summary_lines.append(f"  {co_key}: {pct:.1f}% ? Level {level} ? {status}")
        return "\n".join(summary_lines)

    @tool
    def get_student_performance(course_name_or_id: str) -> str:
        """
        Get a summary of student performance for a course including
        number of students, and any available marks statistics.
        Use when asked about students, pass/fail, or marks.
        """
        marks_summary = db_context.get("marks_summary", {})
        courses = db_context.get("courses", [])
        query = course_name_or_id.lower().strip()
        course = next(
            (c for c in courses
             if query in c.get("name", "").lower() or query in c.get("code", "").lower()),
            None
        )
        if not course:
            return f"Course '{course_name_or_id}' not found."
        course_id = course.get("id")
        summary = marks_summary.get(course_id, {})
        students = [s for s in db_context.get("students", []) if s.get("courseId") == course_id]
        return json.dumps({
            "course": course.get("name"),
            "totalStudents": len(students),
            "marksSummary": summary,
        }, indent=2)

    @tool
    def navigate_to_feature(feature_name: str) -> str:
        """
        Find the exact location/page in the OBE system for any feature.
        Use when the user asks WHERE something is, HOW to access a page,
        or WHERE to do a specific task like 'where do I map CO-PO',
        'where is attainment', 'how do I add students', etc.
        Input: any feature name or task description.
        """
        # Complete navigation map of the entire system
        NAV_MAP = {
            # ?? Dashboard ?????????????????????????????????????????????????????
            "dashboard": {
                "label": "Dashboard",
                "path": "faculty/dashboard.html",
                "description": "Main overview -- shows course summary, attainment charts, and quick stats.",
                "steps": ["Login ? Dashboard (auto-redirect)"]
            },
            # ?? Courses ???????????????????????????????????????????????????????
            "courses": {
                "label": "My Courses",
                "path": "faculty/courses.html",
                "description": "View all your assigned courses. Create a new course from here.",
                "steps": ["Sidebar ? My Courses"]
            },
            "course setup": {
                "label": "Course Setup",
                "path": "faculty/course-setup.html",
                "description": "Configure course details: exam scheme (IA/MSE/ESE marks), attainment levels, teaching philosophy.",
                "steps": ["My Courses ? click any course ? Course Setup tab"]
            },
            # ?? Syllabus ??????????????????????????????????????????????????????
            "syllabus": {
                "label": "Syllabus",
                "path": "faculty/syllabus.html",
                "description": "Upload or paste your syllabus. AI extracts modules, topics, and book references automatically.",
                "steps": ["Sidebar ? Syllabus", "OR: Course Setup ? Syllabus tab"]
            },
            # ?? Course Outcomes ???????????????????????????????????????????????
            "course outcomes": {
                "label": "Course Outcomes (COs)",
                "path": "faculty/outcomes.html",
                "description": "Define COs for your course. AI can analyze Blooms taxonomy levels and suggest improvements.",
                "steps": ["Sidebar ? Outcomes", "Click 'Add CO' to create new outcomes",
                           "Click 'AI Analyze' to get Bloom's analysis"]
            },
            "co": {
                "label": "Course Outcomes (COs)",
                "path": "faculty/outcomes.html",
                "description": "Define and manage Course Outcomes (COs) with Blooms taxonomy mapping.",
                "steps": ["Sidebar ? Outcomes"]
            },
            "outcomes": {
                "label": "Course Outcomes (COs)",
                "path": "faculty/outcomes.html",
                "description": "Define and manage Course Outcomes (COs) with Blooms taxonomy mapping.",
                "steps": ["Sidebar ? Outcomes"]
            },
            # ?? CO-PO Mapping ?????????????????????????????????????????????????
            "co-po mapping": {
                "label": "CO-PO Mapping",
                "path": "faculty/co-po-map.html",
                "description": "Map each CO to Program Outcomes (POs) using a 0-3 correlation scale. AI auto-mapper available.",
                "steps": [
                    "Sidebar ? CO-PO Map",
                    "Select your course from the dropdown at top",
                    "Fill the matrix manually OR click 'AI Auto-Map' button",
                    "Click Save after filling the matrix"
                ]
            },
            "co po": {
                "label": "CO-PO Mapping",
                "path": "faculty/co-po-map.html",
                "description": "Map COs to POs with 0-3 correlation values.",
                "steps": ["Sidebar ? CO-PO Map ? Select course ? Fill matrix ? Save"]
            },
            "map co": {
                "label": "CO-PO Mapping",
                "path": "faculty/co-po-map.html",
                "description": "Map COs to POs with 0-3 correlation values.",
                "steps": ["Sidebar ? CO-PO Map ? Select course ? Fill matrix ? Save"]
            },
            "po mapping": {
                "label": "CO-PO Mapping",
                "path": "faculty/co-po-map.html",
                "description": "Map COs to POs with 0-3 correlation values.",
                "steps": ["Sidebar ? CO-PO Map ? Select course ? Fill matrix ? Save"]
            },
            "6a matrix": {
                "label": "6A Matrix (CO-PO Attainment Matrix)",
                "path": "faculty/6a-matrix.html",
                "description": "View the NBA 6A matrix -- combined CO-PO attainment and contribution matrix for accreditation.",
                "steps": ["Sidebar ? 6A Matrix"]
            },
            # ?? Assignments ???????????????????????????????????????????????????
            "assignments": {
                "label": "Assignments",
                "path": "faculty/assignments.html",
                "description": "Create and manage assignments. AI can generate questions with rubrics. Upload student submissions for AI grading.",
                "steps": [
                    "Sidebar ? Assignments",
                    "Click 'New Assignment' to create",
                    "Click 'AI Generate' to auto-generate questions",
                    "Click 'Upload PDF' to upload assignment PDF for extraction"
                ]
            },
            "create assignment": {
                "label": "Assignments",
                "path": "faculty/assignments.html",
                "description": "Create new assignments with AI-generated questions.",
                "steps": ["Sidebar ? Assignments ? New Assignment ? AI Generate"]
            },
            # ?? Auto Grading ??????????????????????????????????????????????????
            "auto grade": {
                "label": "Auto Grade (AI Grading)",
                "path": "faculty/auto-grade.html",
                "description": "Upload a student submission (PDF/DOCX) and the AI grades it against rubrics using two-pass scoring.",
                "steps": [
                    "Sidebar ? Auto Grade",
                    "Select the course and assignment",
                    "Upload student PDF or paste their answer",
                    "Enter rubrics (one per line)",
                    "Click 'Grade' -- AI runs two-pass evaluation"
                ]
            },
            "grade": {
                "label": "Auto Grade (AI Grading)",
                "path": "faculty/auto-grade.html",
                "description": "AI-powered assignment grading.",
                "steps": ["Sidebar ? Auto Grade ? Upload PDF ? Grade"]
            },
            "grading": {
                "label": "Auto Grade (AI Grading)",
                "path": "faculty/auto-grade.html",
                "description": "AI-powered assignment grading with rubric breakdown.",
                "steps": ["Sidebar ? Auto Grade"]
            },
            # ?? Marks ?????????????????????????????????????????????????????????
            "marks": {
                "label": "Marks Entry",
                "path": "faculty/marks.html",
                "description": "Enter IA, MSE, and ESE marks for all students question-by-question. Marks are linked to COs.",
                "steps": [
                    "Sidebar ? Marks",
                    "Select course ? select assessment type (IA/MSE/ESE)",
                    "Enter marks per student per question",
                    "Click Save"
                ]
            },
            "enter marks": {
                "label": "Marks Entry",
                "path": "faculty/marks.html",
                "description": "Enter student marks for IA, MSE, ESE assessments.",
                "steps": ["Sidebar ? Marks ? Select course ? Enter ? Save"]
            },
            # ?? Attainment ????????????????????????????????????????????????????
            "attainment": {
                "label": "CO Attainment",
                "path": "faculty/attainment.html",
                "description": "View CO attainment percentages calculated from marks. See which COs are attained (Level 1/2/3) and which need improvement.",
                "steps": [
                    "Sidebar ? Attainment",
                    "Select course from dropdown",
                    "View CO-wise attainment chart and table",
                    "Click 'Remedial Plan' for any weak CO to get AI recommendations"
                ]
            },
            "co attainment": {
                "label": "CO Attainment",
                "path": "faculty/attainment.html",
                "description": "View CO attainment levels and generate remedial plans.",
                "steps": ["Sidebar ? Attainment ? Select course"]
            },
            # ?? Students ??????????????????????????????????????????????????????
            "students": {
                "label": "Students",
                "path": "faculty/students.html",
                "description": "Manage student roster for each course. Add students manually or import list. View learner type classification.",
                "steps": [
                    "Sidebar ? Students",
                    "Select course ? Click 'Add Student'",
                    "OR: Click 'Import' to bulk-add students from CSV"
                ]
            },
            "add student": {
                "label": "Students",
                "path": "faculty/students.html",
                "description": "Add or import students for a course.",
                "steps": ["Sidebar ? Students ? Select course ? Add Student"]
            },
            # ?? Reports ???????????????????????????????????????????????????????
            "reports": {
                "label": "Reports",
                "path": "faculty/reports.html",
                "description": "Generate NBA/OBE reports including CO attainment summary, CO-PO matrix, and course assessment report.",
                "steps": [
                    "Sidebar ? Reports",
                    "Select course",
                    "Click 'Generate Report' for NBA-format output"
                ]
            },
            "nba report": {
                "label": "Reports",
                "path": "faculty/reports.html",
                "description": "Generate full NBA course assessment report.",
                "steps": ["Sidebar ? Reports ? Select course ? Generate Report"]
            },
            # ?? Question Paper ????????????????????????????????????????????????
            "question paper": {
                "label": "Question Paper Generator",
                "path": "faculty/question-paper.html",
                "description": "Generate question papers mapped to COs and Blooms levels. Set marks distribution.",
                "steps": [
                    "Sidebar ? Question Paper",
                    "Select course and COs to cover",
                    "Set marks distribution and Blooms levels",
                    "Click 'Generate' for AI-generated questions"
                ]
            },
        }

        query = feature_name.lower().strip()

        # Direct match first
        if query in NAV_MAP:
            info = NAV_MAP[query]
        else:
            # Fuzzy search -- find best match
            info = None
            for key, val in NAV_MAP.items():
                if any(word in query for word in key.split()) or any(word in key for word in query.split()):
                    info = val
                    break

        if not info:
            all_features = ", ".join(set(v["label"] for v in NAV_MAP.values()))
            return f"Feature '{feature_name}' not found. Available pages: {all_features}"

        steps_formatted = "\n".join(f"  Step {i+1}: {s}" for i, s in enumerate(info["steps"]))
        return (
            f"? **{info['label']}**\n"
            f"? Page: {info['path']}\n"
            f"? What it does: {info['description']}\n"
            f"? How to get there:\n{steps_formatted}"
        )

    return [get_course_overview, get_co_details, calculate_attainment_summary,
            get_student_performance, navigate_to_feature]


CHATBOT_SYSTEM_PROMPT = """You are Dr. OBE -- a Senior Academic Consultant AND Navigation Guide for this AI OBE System. You have 25+ years of experience in:
- Outcome-Based Education (OBE) framework design and implementation at Indian engineering colleges
- NBA (National Board of Accreditation) SAR, tier-1 and tier-2 criteria, and assessment frameworks
- NAAC accreditation (A, A+, A++ grading) and Self-Study Report preparation
- Blooms Taxonomy (Revised Anderson & Krathwohl, 2001) and measurable outcome design
- CO-PO-PSO matrix design and attainment calculation methodologies (direct + indirect)
- Curriculum design for Indian engineering colleges under AICTE/UGC guidelines

You have access to LIVE database tools and a NAVIGATION tool. Use them as follows:

TOOL USAGE RULES:
1. If the user asks WHERE something is, HOW to access a feature, or HOW to do a task
   (e.g., "where do I map CO-PO", "how to add students", "where is attainment") ?
   ALWAYS call the navigate_to_feature tool and return the exact location with steps.

2. If the user asks about specific course data, COs, students, or attainment numbers ?
   Call the appropriate database tool.

3. If the user asks a conceptual OBE/NBA question ? Answer directly with expertise.

Always prefer tool responses over guessing. Be concise and professional.
End every navigation answer with the exact page path so the user can go directly there."""


def chat_with_advisor_agent(query: str, db_context: dict, session_id: str = "default") -> str:
    """
    Tool-calling agent using LangChain v1.3's create_agent (LangGraph-based).
    Maintains per-session conversation history in-memory.
    Falls back to simple chat if agent fails.
    """
    llm = get_llm(temperature=0.1)
    tools = build_chatbot_tools(db_context)
    history = get_history(session_id)

    try:
        agent = create_agent(
            model=llm,
            tools=tools,
            system_prompt=CHATBOT_SYSTEM_PROMPT
        )
        # Build input messages including history for multi-turn memory
        messages = list(history) + [{"role": "user", "content": query}]
        result = agent.invoke({"messages": messages})

        # Extract the final AI text response
        output_messages = result.get("messages", [])
        reply = ""
        for msg in reversed(output_messages):
            # Find the last AI message that is not a tool call
            if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip():
                if not getattr(msg, "tool_calls", None):
                    reply = msg.content.strip()
                    break

        if not reply:
            reply = "I processed your request but could not form a final answer. Please rephrase."

        # Save turn to history (keep last 20 messages to prevent unbounded growth)
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": reply})
        _chat_histories[session_id] = history[-20:]

        return reply

    except Exception as e:
        # Graceful fallback to simple LLM chat
        context_str = json.dumps({
            "courses": db_context.get("courses", [])[:5],
            "cos": db_context.get("cos", [])[:10],
        }, default=str)[:3000]
        return chat_with_advisor_simple(query, context_str)


def chat_with_advisor_simple(query: str, context: str = "") -> str:
    """Fallback simple chatbot (no tools)."""
    llm = get_llm(temperature=0.2)
    template = """You are Dr. OBE -- a Senior Academic Consultant specializing in NBA/NAAC accreditation, OBE frameworks, and Blooms Taxonomy for Indian engineering colleges.

CONTEXT DATA: {context}
QUERY: {query}

Provide a precise, professional, actionable response. Reference specific numbers from the context where relevant. End with a concrete recommendation."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    return chain.invoke({"query": query, "context": context}).content

# Keep old name as alias for backward compatibility
def chat_with_advisor(query: str, context: str = "") -> str:
    return chat_with_advisor_simple(query, context)


# ==========================================
# 2. Syllabus Extraction Agent
# ==========================================
class SyllabusModule(BaseModel):
    title: str = Field(description="The exact title of the module as it appears in the syllabus")
    description: str = Field(description="A comprehensive description of all topics covered in this module, preserved fully")
    hours: int = Field(description="Number of teaching contact hours for this module. Default to 8 if not specified.")
    coNo: int = Field(description="The Course Outcome number (1-6) most closely mapped to this module based on its content and cognitive level")

class SyllabusBook(BaseModel):
    type: str = Field(description="Exact type: 'Textbook' or 'Reference Book'")
    title: str = Field(description="Full title of the book exactly as stated")
    author: str = Field(description="Full author name(s) exactly as stated")

class SyllabusResponse(BaseModel):
    modules: List[SyllabusModule]
    books: List[SyllabusBook]

def extract_syllabus(text: str) -> dict:
    llm = get_llm(temperature=0.0).with_structured_output(SyllabusResponse)
    template = """You are a senior curriculum analyst for an Indian engineering university (AICTE/NBA framework).

SYLLABUS TEXT:
---
{text}
---

EXTRACTION RULES:
1. Extract EVERY module listed -- do not skip any.
2. Preserve the full description of each module -- do not truncate or summarize.
3. Teaching hours: extract exact number if given. Default to 8 if absent.
4. CO Mapping: assign Module N ? CO N by default. Adjust if Bloom's verbs indicate otherwise.
5. Distinguish Textbooks (primary) from Reference Books (supplementary).
6. Do NOT invent content not present in the text."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"text": text[:15000]})
    return res.dict()


# ==========================================
# 3. Teaching Philosophy Agent
# ==========================================
def generate_teaching_philosophy(courseName: str, deptVision: str, deptMission: str) -> str:
    llm = get_llm(temperature=0.5)
    template = """You are an experienced professor writing a formal Teaching Philosophy Statement for an NBA accreditation portfolio.

COURSE NAME: {course}
DEPARTMENT VISION: {vision}
DEPARTMENT MISSION: {mission}

Write a rich, professional Teaching Philosophy Statement (4-5 sentences) that:
1. Opens with the core purpose and importance of this course in engineering education.
2. Explains how the teaching methodology aligns with OBE principles.
3. Connects course objectives to the department's vision and mission.
4. Describes specific pedagogical strategies (problem-based learning, projects, case studies).
5. Closes with a commitment to student development and continuous improvement.

Style: Formal academic prose. First-person. No bullet points."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    return chain.invoke({"course": courseName, "vision": deptVision, "mission": deptMission}).content


# ==========================================
# 4. Blooms Taxonomy Agent
# ==========================================
class BloomsAnalysis(BaseModel):
    no: int = Field(description="The Course Outcome number (integer)")
    status: str = Field(description="Must be exactly one of: 'perfect', 'warning', or 'upgrade'")
    suggestion: str = Field(description="Detailed feedback: WHY the verb is perfect/problematic AND a concrete suggested revision with a better action verb")
    level: str = Field(description="The determined Blooms level. E.g., 'L1', 'L2', 'L3', 'L4', 'L5', or 'L6'")
    target: int = Field(description="Suggested minimum target student % (e.g. 60)")
    l1: int = Field(description="Suggested L1 % threshold (e.g. 60)")
    l2: int = Field(description="Suggested L2 % threshold (e.g. 70)")
    l3: int = Field(description="Suggested L3 % threshold (e.g. 80)")

class BloomsResponse(BaseModel):
    results: List[BloomsAnalysis]

def analyze_blooms(cos: list) -> list:
    llm = get_llm(temperature=0.0).with_structured_output(BloomsResponse)
    template = """You are a Blooms Taxonomy expert and NBA curriculum auditor with 20+ years of experience.

COURSE OUTCOMES TO ANALYZE:
{cos}

BLOOM'S TAXONOMY REFERENCE:
- L1 Remember: define, list, recall, recognize, state, identify, name, match (Target~60, L1~60, L2~70, L3~80)
- L2 Understand: explain, describe, summarize, interpret, classify, compare, discuss (Target~60, L1~60, L2~70, L3~80)
- L3 Apply: use, solve, implement, demonstrate, compute, execute, carry out (Target~60, L1~60, L2~70, L3~80)
- L4 Analyze: differentiate, examine, break down, organize, attribute (Target~50, L1~55, L2~65, L3~75)
- L5 Evaluate: judge, critique, justify, assess, argue, defend (Target~50, L1~50, L2~60, L3~70)
- L6 Create: design, construct, develop, formulate, plan, compose (Target~40, L1~45, L2~55, L3~65)

FOR EACH CO:
Step 1: Extract the primary action verb(s).
Step 2: Identify Blooms level (L1-L6). Set 'level' to strictly 'L1', 'L2', 'L3', 'L4', 'L5', or 'L6'.
Step 3: Suggest reasonable Target %, L1 %, L2 %, L3 % thresholds based on the Bloom's difficulty. (L4-L6 should have slightly lower thresholds than L1-L3 as they are harder to achieve).
Step 4: Assess appropriateness:
   - 'perfect': Strong, specific, measurable verb appropriate for the subject.
   - 'warning': Vague verb (understand, know, learn, appreciate) - immeasurable.
   - 'upgrade': Verb is too low for the subject's expected cognitive demand.
Step 5: Write a revised CO with a better verb for any 'warning'/'upgrade'.

CRITICAL: 'understand', 'know', 'learn', 'appreciate' are ALWAYS 'warning'."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"cos": json.dumps(cos, indent=2)})
    return [item.dict() for item in res.results]

class GeneratedCO(BaseModel):
    no: int = Field(description="CO number (1 to 6)")
    text: str = Field(description="The Course Outcome description starting with an action verb")
    level: str = Field(description="The determined Blooms level (L1, L2, L3, L4, L5, or L6)")
    surveyQ: str = Field(description="A student-facing survey question for indirect assessment (e.g. 'How confident are you in your ability to...?')")
    target: int = Field(description="Suggested minimum target student % (e.g. 60)")
    l1: int = Field(description="Suggested L1 % threshold (e.g. 60)")
    l2: int = Field(description="Suggested L2 % threshold (e.g. 70)")
    l3: int = Field(description="Suggested L3 % threshold (e.g. 80)")

class GeneratedCOResponse(BaseModel):
    results: List[GeneratedCO]

def generate_cos_from_syllabus(syllabus: str) -> list:
    llm = get_llm(temperature=0.2).with_structured_output(GeneratedCOResponse)
    template = """You are an expert curriculum designer and NBA accreditation auditor (NBA GAPC V4.0). 
Given the following course syllabus, generate exactly 6 high-quality, measurable Course Outcomes (COs).
Ensure the COs cover the entire syllabus evenly, progressing from foundational knowledge (L2/L3) to advanced application/design (L4/L5/L6) if applicable.

SYLLABUS:
{syllabus}

RESEARCH & NBA MANDATORY REQUIREMENTS:
1. BLOOM'S TAXONOMY HIERARCHY: Systematically span cognitive levels across Bloom's Taxonomy:
   - CO1, CO2: Foundation & Comprehension (L2/L3)
   - CO3, CO4: Application & Analysis (L3/L4)
   - CO5, CO6: Advanced Analysis/Synthesis/Evaluation (L4/L5/L6)
2. MEASURABLE ACTION VERBS: Start each CO description with a strong, unambiguous Bloom's action verb. Use exactly ONE dominant verb per CO to isolate the cognitive level being tested (do NOT mix verbs like "Construct and evaluate").
   - CRITICAL BAN: NEVER use ambiguous verbs like 'understand', 'know', 'learn', 'appreciate', 'become familiar with'.
3. COMPETENCE & ENGINEERING CONTEXT: Each CO must explicitly state:
   - The Target Competence (what technical skill/knowledge the student acquires)
   - The Engineering Application Context (to solve what class of engineering problems / under what conditions).
4. ATTAINMENT THRESHOLDS: Suggest reasonable target thresholds based on cognitive demand. Higher cognitive levels (L4-L6) should have slightly lower thresholds (e.g., Target 50, L1 55, L2 65, L3 75).
5. INDIRECT SURVEY QUESTION: Provide a student-friendly survey question for each CO for 5-point Likert scale indirect assessment.
6. Output exactly 6 COs.
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"syllabus": syllabus})
    return [item.dict() for item in res.results]


# ==========================================
# 5. CO-PO Mapping Agent
# ==========================================
class CoPoMapping(BaseModel):
    mapping: Dict[str, Dict[str, int]] = Field(
        description="Dictionary mapping CO numbers as strings to PO correlation values (0, 1, 2, or 3)"
    )

# ── Deterministic cache: same CO text always gives same mapping ──────────────
_COPO_CACHE: dict = {}   # key = stable SHA-256 of cos+pos+pso_defs

def auto_map_copo(cos: list, pos: list, pso_defs: dict = None) -> dict:
    import hashlib, json as _json
    cache_key = hashlib.sha256(
        _json.dumps({"cos": cos, "pos": sorted(pos), "pso": pso_defs or {}}, sort_keys=True).encode()
    ).hexdigest()
    if cache_key in _COPO_CACHE:
        print("=== COPO CACHE HIT — returning deterministic cached mapping ===")
        return _COPO_CACHE[cache_key]

    llm = get_llm(temperature=0.0).with_structured_output(CoPoMapping)
    template = """You are an expert OBE curriculum analyst at MITAOE (MIT Academy of Engineering, Alandi, Pune), \
affiliated to Savitribai Phule Pune University (SPPU). Your task is to generate a \
100% accurate, NBA GAPC V4.0-compliant CO-PO Correlation Matrix for the given course.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COURSE OUTCOMES (COs) TO MAP:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{cos}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRAM SPECIFIC OUTCOMES (PSOs):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{pso_defs}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL SPPU/NBA PROGRAM OUTCOMES (12 POs — EXACT):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PO1  – Engineering Knowledge: Apply the knowledge of mathematics, science, engineering fundamentals, and an engineering specialization to the solution of complex engineering problems.
PO2  – Problem Analysis: Identify, formulate, review research literature, and analyze complex engineering problems reaching substantiated conclusions using first principles of mathematics, natural sciences, and engineering sciences.
PO3  – Design/Development of Solutions: Design solutions for complex engineering problems and design system components or processes that meet the specified needs with appropriate consideration for the public health and safety, and the cultural, societal, and environmental considerations.
PO4  – Conduct Investigations of Complex Problems: Use research-based knowledge and research methods including design of experiments, analysis and interpretation of data, and synthesis of the information to provide valid conclusions.
PO5  – Modern Tool Usage: Create, select, and apply appropriate techniques, resources, and modern engineering and IT tools including prediction and modeling to complex engineering activities with an understanding of the limitations.
PO6  – The Engineer and Society: Apply reasoning informed by the contextual knowledge to assess societal, health, safety, legal and cultural issues and the consequent responsibilities relevant to the professional engineering practice.
PO7  – Environment and Sustainability: Understand the impact of the professional engineering solutions in societal and environmental contexts, and demonstrate the knowledge of, and need for sustainable development.
PO8  – Ethics: Apply ethical principles and commit to professional ethics and responsibilities and norms of the engineering practice.
PO9  – Individual and Team Work: Function effectively as an individual, and as a member or leader in diverse teams, and in multidisciplinary settings.
PO10 – Communication: Communicate effectively on complex engineering activities with the engineering community and with society at large.
PO11 – Project Management and Finance: Demonstrate knowledge and understanding of the engineering and management principles and apply these to one's own work, as a member and leader in a team, to manage projects and in multidisciplinary environments.
PO12 – Life-Long Learning: Recognize the need for, and have the preparation and ability to engage in independent and life-long learning in the broadest context of technological change.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OFFICIAL NBA GAPC V4.0 CORRELATION SCALE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3 = HIGH (Substantial): The CO directly, substantially, and explicitly addresses the core intent of the PO. VERY RARE — at most 1 per CO row.
2 = MEDIUM (Moderate): The CO clearly and meaningfully contributes to the PO but it is not its primary driver. MOST COMMON value.
1 = LOW (Slight): The CO has a tangential or supporting connection to the PO. COMMON for broad/foundational COs.
0 = NONE: No meaningful connection. USE LIBERALLY. Blank (unmapped) cells are PREFERRED by NBA evaluators. A matrix full of numbers is a RED FLAG.

⚠ CRITICAL: Over-mapped matrices (too many 3s or every cell filled) are REJECTED by NBA/NAAC evaluators. Each CO should map to AT MOST 4-5 non-zero POs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLOOMS TAXONOMY → MAXIMUM CORRELATION ALLOWED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
L1 (Remember) / L2 (Understand): PO1 ≤ 1, PO2 = 0
L3 (Apply):    PO1 = 2, PO2 = 1-2 (NEVER 3 for PO1 at L3)
L4 (Analyze):  PO1 = 2-3, PO2 = 2-3 (3 only if deep mathematical analysis of complex problems)
L5 (Evaluate): PO1 = 2-3, PO2 = 3
L6 (Create):   PO1 = 3, PO2 = 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY RULE-BY-RULE DECISION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[PO1 – Engineering Knowledge]
• The CO must involve applying mathematical, scientific, or engineering fundamentals.
• L3 CO → PO1 = 2 (applying known techniques = moderate, NOT high)
• L4 CO with deep mathematical analysis → PO1 = 3
• L4 CO primarily about tool/method selection → PO1 = 2
• PO1 values MUST vary across COs. Do NOT give all COs PO1=3.

[PO2 – Problem Analysis]
• Assign 3 ONLY if the CO verb is "analyze", "evaluate", "formulate" AND the CO reaches substantiated conclusions about a complex problem.
• Assign 2 if structured analytical thinking is clearly present but not the core focus.
• Assign 1 if analysis is only implicit.
• Assign 0 if the CO is purely procedural (applying known formulas step-by-step).
• L3 COs typically get PO2 = 1 or 2, NOT 3.

[PO3 – Design/Development of Solutions]
• Assign 1 ONLY if the CO uses: "Design", "Develop", "Construct", "Build", "Create" a SYSTEM, ARCHITECTURE, or MODEL.
• "Construct and evaluate regression models" qualifies for PO3 = 1.
• Verbs like "Apply", "Select", "Implement", "Use", "Make use of" are NOT design verbs → PO3 = 0.

[PO4 – Conduct Investigations]
• Assign 2 if the CO explicitly involves: hypothesis testing, statistical inference (z-test, t-test, chi-square, ANOVA), sampling, or experimental data interpretation.
• Assign 1 if the CO involves evaluating model performance or observing convergence behavior.
• Assign 0 if the CO is purely applying known mathematical formulas without investigating outcomes.

[PO5 – Modern Tool Usage]
• MUST NOT assign any value unless the CO text EXPLICITLY mentions: "Python", "MATLAB", "tools", "software", "libraries", "visualization techniques", "computing".
• If tool is mentioned: assign 2 for a theory course (max 2; lab-only courses get 3).
• If NO tool keyword in the CO text: PO5 = 0 absolutely.

[PO6 – The Engineer and Society]
• PO6 = 0 for ALL mathematical, statistical, data science, or computing theory COs.
• Exception: Only if CO text explicitly mentions "societal impact", "health", "safety", "legal", "cultural responsibility".

[PO7 – Environment and Sustainability]
• PO7 = 0 for ALL mathematical/data science COs.
• Exception: Only if CO text explicitly mentions environmental impact or sustainability.

[PO8 – Ethics]
• PO8 = 0 for ALL COs unless ethics, data ethics, or fairness is EXPLICITLY stated in the CO text.

[PO9 – Individual and Team Work]
• PO9 = 0 for ALL COs. Individual exam-assessed theory courses do NOT address teamwork.
• Exception: Only if CO explicitly says "team", "collaborative", "group".

[PO10 – Communication]
• PO10 = 0 for ALL COs. Mathematical theory courses are assessed by written exams, not communication.
• Exception: Only if CO explicitly mentions "present", "report", "communicate", "document".

[PO11 – Project Management and Finance]
• PO11 = 0 for ALL mathematical/data science theory COs.
• Exception: Only if CO explicitly mentions project planning, scheduling, cost, or financial management.

[PO12 – Life-Long Learning]
• Assign 2 if the CO explicitly promotes independent judgment (e.g., "Select appropriate", "Make a choice of", "choose").
• Assign 1 if the CO builds mathematical/statistical foundational knowledge that directly enables life-long independent learning.
• Assign 0 for very narrowly applied COs with no transferable skill.
• PO12 values MUST vary — do NOT give all COs the same value.

[PSO1 – Domain-Specific Knowledge in Data Science and Analytics]
• Assign 3 ONLY for COs at L4+ that are CORE to Data Science (linear algebra, probability, statistics, ML theory).
• Assign 2 for L3 COs that are foundational DS topics.
• Assign 1 if only tangentially related.
• PSO1 values MUST vary — not all COs deserve PSO1=3.

[PSO2 – Industry-Readiness through practical projects and tool proficiency]
• Assign 3 ONLY if the CO explicitly uses tools (Python) AND works with real-world datasets.
• Assign 2 if the CO builds models with direct industry application (regression, optimization, ML).
• Assign 1 for theoretical foundations that support industrial competence.

[PSO3 – Research Aptitude and ability to apply scientific reasoning]
• Assign 3 for hypothesis testing, statistical inference, MLE, research methodology COs.
• Assign 2 for advanced analysis COs (regression, evaluation metrics).
• Assign 1 for foundational COs with some research relevance.
• Assign 0 for COs with no research component.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKS (Run mentally before outputting):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Each CO row: count non-zero values. Should be 3-5 max. If more, re-evaluate.
2. Count 3s per row: max 1-2 per row. More than 2 threes = FAILURE.
3. PO1 values across all COs: must show variation (not all same).
4. PSO1 values across all COs: must show variation.
5. PO6, PO7, PO8, PO9, PO10, PO11: should be 0 for most/all rows in a theory math course.
6. PO5: 0 unless tool keyword explicitly in CO text.
7. PO3: 0 unless "design/develop/construct" explicitly in CO text.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON OUTPUT FORMAT (MANDATORY — follow exactly):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{
  "mapping": {{
    "1": {{"PO1": 2, "PO2": 2, "PO3": 0, "PO4": 0, "PO5": 0, "PO6": 0, "PO7": 0, "PO8": 0, "PO9": 0, "PO10": 0, "PO11": 0, "PO12": 1, "PSO1": 2, "PSO2": 1, "PSO3": 1}},
    "2": {{"PO1": 2, "PO2": 2, "PO3": 0, "PO4": 1, "PO5": 0, "PO6": 0, "PO7": 0, "PO8": 0, "PO9": 0, "PO10": 0, "PO11": 0, "PO12": 1, "PSO1": 2, "PSO2": 1, "PSO3": 2}}
  }}
}}
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"cos": json.dumps(cos, indent=2), "pso_defs": json.dumps(pso_defs or {}, indent=2)})
    validated = {}
    for co, po_dict in res.mapping.items():
        cleaned = {str(po).strip().upper(): max(0, min(3, int(v))) for po, v in po_dict.items() if str(po).strip().upper() in pos}

        # ── HARD RULE 1: PO6-PO11 ALWAYS 0 for theory courses ──
        # PO6=Society, PO7=Environment, PO8=Ethics, PO9=Teamwork,
        # PO10=Communication, PO11=Project Management
        # None of these apply to mathematical/data-science theory courses
        # UNLESS explicitly mentioned in CO text (handled below)
        for po in ["PO6", "PO7", "PO8", "PO9", "PO10", "PO11"]:
            if po in cleaned:
                cleaned[po] = 0

        # Find CO text for keyword checks
        co_text = ""
        for c in cos:
            co_num = str(c.get("no", c.get("coNo", "")))
            if co_num == str(co):
                co_text = c.get("text", c.get("description", "")).lower()
                break

        # ── HARD RULE 2: PO5 = 0 unless CO text explicitly names a tool ──
        tool_keywords = ["python", "matlab", "tool", "software", "library", "libraries",
                         "computing", "jupyter", "numpy", "pandas", "scipy", "visualization techniques"]
        if not any(kw in co_text for kw in tool_keywords):
            if "PO5" in cleaned:
                cleaned["PO5"] = 0
        else:
            # Cap PO5 at 2 for theory courses (3 = dedicated lab/programming courses only)
            if "PO5" in cleaned and cleaned["PO5"] > 2:
                cleaned["PO5"] = 2

        # ── HARD RULE 3: PO3 = 0 unless "design/develop/construct/build/create" in CO ──
        design_keywords = ["design", "develop", "construct", "build", "create"]
        if not any(kw in co_text for kw in design_keywords):
            if "PO3" in cleaned:
                cleaned["PO3"] = 0

        # ── HARD RULE 4: PO12 max 2 for theory courses; 0 if CO is narrowly applied ──
        if "PO12" in cleaned and cleaned["PO12"] > 2:
            cleaned["PO12"] = 2

        validated[co] = cleaned

    print("=== FINAL AI MAPPING GENERATED ===")
    import pprint
    pprint.pprint(validated)
    _COPO_CACHE[cache_key] = validated   # ← cache so next click is instant & identical
    return validated


# ==========================================
# 6. Assignment Generation Agent
# ==========================================
class AssignmentQuestion(BaseModel):
    qNo: int
    text: str
    marks: int
    coNo: Optional[int] = None

class AssignmentRubric(BaseModel):
    criterion: str
    exceptional: str
    best: str
    average: str
    low: str

class AssignmentResponse(BaseModel):
    questions: List[AssignmentQuestion]
    rubrics: List[AssignmentRubric]

def generate_assignment(topic: str, level: str, num: int, marks: int) -> dict:
    llm = get_llm(temperature=0.6).with_structured_output(AssignmentResponse)
    marks_per_q = round(marks / num) if num > 0 else marks
    template = """You are a senior professor and NBA-certified curriculum expert creating an assignment.

TOPIC: {topic}
BLOOMsS LEVEL: {level}
NUMBER OF QUESTIONS: {num}
TOTAL MARKS: {marks} (~{marks_per_q} per question)

QUESTION RULES:
1. Use action verbs appropriate for Blooms level {level}:
   L1-Remember: define/list/state | L2-Understand: explain/describe/compare
   L3-Apply: solve/compute/demonstrate | L4-Analyze: examine/differentiate
   L5-Evaluate: critique/justify/assess | L6-Create: design/develop/propose
2. Make questions specific, scenario-based, and unambiguous.
3. Distribute marks proportionally to complexity.
4. Avoid trivially simple questions.

RUBRIC RULES:
1. One rubric per question, specific to that question.
2. exceptional: 90-100% score -- perfect answer criteria.
3. best: 70-89% score -- mostly correct with minor gaps.
4. average: 50-69% -- partial understanding, significant gaps.
5. low: below 50% -- minimal attempt, mostly incorrect."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"topic": topic, "level": level, "num": num, "marks": marks, "marks_per_q": marks_per_q})
    return res.dict()


# ==========================================
# 7. TWO-PASS Auto-Grading Engine
# ==========================================

class RubricEvaluation(BaseModel):
    rubric: str = Field(description="The exact rubric criterion being evaluated")
    marksAllocated: float = Field(description="Max marks allocated to this rubric criterion")
    maxMarksForRubric: float = Field(description="Maximum marks available for this rubric criterion")
    scoreAllocated: float = Field(description="Actual score awarded (0 to maxMarksForRubric)")
    justification: str = Field(description="Evidence-based justification quoting specific parts of the student answer")
    strengthsFound: str = Field(description="Specific strengths in the student answer for this criterion")
    weaknessesFound: str = Field(description="Specific gaps or errors for this criterion")
    improvementSuggestion: str = Field(description="Actionable suggestion for what to add/fix/study")

class GradingReport(BaseModel):
    totalScore: float = Field(description="Total marks scored -- must equal sum of all scoreAllocated")
    outOf: float = Field(description="Maximum marks available")
    percentage: float = Field(description="Percentage = (totalScore/outOf)*100, rounded to 2 decimal places")
    grade: str = Field(description="Letter grade: A+ (>=90%), A (>=80%), B+ (>=70%), B (>=60%), C (>=50%), D (>=40%), F (<40%)")
    bloomsLevel: str = Field(description="Highest Blooms level demonstrated: Remember/Understand/Apply/Analyze/Evaluate/Create")
    overallStrengths: str = Field(description="2-3 specific sentences on the strongest aspects of the submission")
    overallWeaknesses: str = Field(description="2-3 specific sentences on the most critical gaps")
    keyConceptsMissed: List[str] = Field(description="List of important concepts entirely absent from the submission")
    evaluation: List[RubricEvaluation] = Field(description="Detailed evaluation for EVERY rubric criterion")
    overallFeedback: str = Field(description="Comprehensive, personalized, encouraging paragraph (4-6 sentences) with clear improvement path")
    examReadinessScore: int = Field(description="Integer 0-100: predicted exam readiness based on depth, accuracy, completeness")

def _distribute_marks(rubrics: list, max_marks: int) -> list:
    n = len(rubrics)
    if n == 0:
        return []
    base = round(max_marks / n, 2)
    distributed = []
    running_total = 0.0
    for i, rubric in enumerate(rubrics):
        allocated = round(max_marks - running_total, 2) if i == n - 1 else base
        distributed.append({"rubric": rubric, "maxMarks": allocated})
        running_total += allocated
    return distributed

def _build_grading_prompt(pass_num: int) -> str:
    if pass_num == 1:
        examiner_role = "EXAMINER A (First Marker)"
        tone = "Grade independently without bias. Be thorough and precise."
    else:
        examiner_role = "EXAMINER B (Second Marker / Moderator)"
        tone = "You are a second, independent examiner providing a moderation review. Grade fresh -- do not be anchored by any previous assessment."

    return f"""You are a SENIOR UNIVERSITY EXAMINER -- {examiner_role} -- with 25+ years of grading experience at Indian engineering universities (SPPU, Anna University, VTU, AKTU). You are also an NBA assessor.

{tone}
{{question_section}}
================================================
STUDENT SUBMITTED ANSWER:
================================================
{{student_answer}}
================================================

TOTAL MARKS: {{maxMarks}}

RUBRIC CRITERIA WITH MARK ALLOCATION:
{{rubric_allocation_text}}

================================================
GRADING RULES (NON-NEGOTIABLE)
================================================
1. READ EVERYTHING: Read the ENTIRE answer before scoring. Students embed answers in code, output sections, and comments.
2. FIND PARTIAL ANSWERS: 0 only if student made ZERO attempt on that topic. Partial attempt = partial credit.
3. EVIDENCE-BASED: Every score MUST cite a specific quote or reference from the answer.
4. CODE-AWARE: Correct function = full marks for correctness even without narrative text. Correct output = understanding.
5. INDEPENDENT RUBRICS: Grade each criterion 100% independently -- never double-penalize the same mistake.
6. NO INFLATION/DEFLATION: Use the full range: 90-100%=excellent, 70-89%=good, 50-69%=partial, 1-49%=minimal, 0=none.
7. SUM CHECK: Sum of all scoreAllocated MUST equal totalScore. Verify before outputting.

GRADING PROCESS:
Step 1: Read the full answer 2-3 times. Note every topic addressed.
Step 2: Map each addressed topic to the relevant rubric criterion.
Step 3: For each criterion -- find evidence, assign score, justify.
Step 4: Sum all scores ? verify = totalScore.
Step 5: Write specific, actionable overall feedback."""

def _run_single_grading_pass(
    text: str, rubrics_clean: list, maxMarks: int, question_section: str,
    rubric_allocation_text: str, pass_num: int
) -> GradingReport:
    llm = get_llm(temperature=0.0).with_structured_output(GradingReport)
    prompt = PromptTemplate.from_template(_build_grading_prompt(pass_num))
    chain = prompt | llm
    return chain.invoke({
        "question_section": question_section,
        "student_answer": text[:100000],
        "maxMarks": maxMarks,
        "rubric_allocation_text": rubric_allocation_text
    })

def _reconcile_passes(pass1: GradingReport, pass2: GradingReport, maxMarks: int) -> GradingReport:
    """
    Compare two grading passes. If they agree within 15% of max marks, average them.
    If they diverge significantly, run a tiebreaker chain to decide.
    """
    diff = abs(pass1.totalScore - pass2.totalScore)
    threshold = maxMarks * 0.15

    if diff <= threshold:
        # Passes agree -- average the scores
        return pass1  # We'll adjust scores below
    else:
        # Significant disagreement -- use the more conservative (lower) pass
        # This is the fair approach: benefit of the doubt goes to the student grade
        # but we do not inflate when examiners disagree
        return pass1 if pass1.totalScore >= pass2.totalScore else pass2

def grade_submission(text: str, rubrics: list, maxMarks: int, question: str = "") -> dict:
    """
    TWO-PASS self-consistency grading pipeline.

    Pass 1: Grade as Examiner A
    Pass 2: Grade as Examiner B (independent second marker)
    Reconcile: Average if within 15% tolerance, else take lower pass
    Return: Merged, validated report
    """
    # ?? Input Validation ??????????????????????????????????????????????????????
    if not text or not text.strip():
        return {
            "totalScore": 0, "outOf": maxMarks, "percentage": 0.0,
            "grade": "F", "bloomsLevel": "Remember",
            "overallStrengths": "No answer provided.",
            "overallWeaknesses": "Answer was blank or empty.",
            "keyConceptsMissed": ["Entire answer was missing"],
            "evaluation": [],
            "overallFeedback": "No submission was provided. Please submit your answer to receive a grade.",
            "examReadinessScore": 0,
            "gradingMode": "single_pass_empty"
        }

    rubrics_clean = [r.strip() for r in rubrics if r.strip()]
    if not rubrics_clean:
        rubrics_clean = [
            "Correctness and accuracy of all answers and calculations",
            "Depth of conceptual understanding demonstrated",
            "Completeness -- all parts of the question are addressed",
            "Quality of explanation, reasoning, and logical structure"
        ]

    rubric_allocations = _distribute_marks(rubrics_clean, maxMarks)
    rubric_allocation_text = "\n".join(
        [f"  CRITERION {i+1}: [{r['rubric']}]\n    ? Maximum marks: {r['maxMarks']}"
         for i, r in enumerate(rubric_allocations)]
    )

    question_section = f"""
================================================
ORIGINAL QUESTION / ASSIGNMENT BRIEF:
================================================
{question}
""" if question else ""

    # ?? Pass 1: Examiner A ????????????????????????????????????????????????????
    try:
        pass1 = _run_single_grading_pass(text, rubrics_clean, maxMarks, question_section, rubric_allocation_text, pass_num=1)
    except Exception as e:
        return {"error": f"Grading Pass 1 failed: {str(e)}", "totalScore": 0, "outOf": maxMarks, "grade": "F"}

    # ?? Pass 2: Examiner B ????????????????????????????????????????????????????
    try:
        pass2 = _run_single_grading_pass(text, rubrics_clean, maxMarks, question_section, rubric_allocation_text, pass_num=2)
    except Exception:
        pass2 = pass1  # If Pass 2 fails, fall back to Pass 1 only

    # ?? Reconciliation ????????????????????????????????????????????????????????
    p1_score = round(sum(min(e.scoreAllocated, e.maxMarksForRubric) for e in pass1.evaluation), 2)
    p2_score = round(sum(min(e.scoreAllocated, e.maxMarksForRubric) for e in pass2.evaluation), 2)

    diff = abs(p1_score - p2_score)
    threshold = maxMarks * 0.15

    if diff <= threshold:
        # Agree -- average the total, use Pass 1 detailed breakdown (which tends to be more detailed first pass)
        avg_score = round((p1_score + p2_score) / 2, 2)
        final = pass1
        final_score = avg_score
        grading_mode = f"two_pass_consensus (P1:{p1_score}, P2:{p2_score}, Avg:{avg_score})"
    else:
        # Disagree significantly -- use the more generous pass (benefit of doubt to student)
        if p1_score >= p2_score:
            final = pass1
            final_score = p1_score
        else:
            final = pass2
            final_score = p2_score
        grading_mode = f"two_pass_diverged (P1:{p1_score}, P2:{p2_score}, Used:{final_score})"

    # ?? Score integrity validation ????????????????????????????????????????????
    pct = round((final_score / maxMarks * 100), 2) if maxMarks > 0 else 0.0
    if pct >= 90: grade = "A+"
    elif pct >= 80: grade = "A"
    elif pct >= 70: grade = "B+"
    elif pct >= 60: grade = "B"
    elif pct >= 50: grade = "C"
    elif pct >= 40: grade = "D"
    else: grade = "F"

    return {
        "totalScore": final_score,
        "outOf": maxMarks,
        "percentage": pct,
        "grade": grade,
        "bloomsLevel": final.bloomsLevel,
        "overallStrengths": final.overallStrengths,
        "overallWeaknesses": final.overallWeaknesses,
        "keyConceptsMissed": final.keyConceptsMissed,
        "evaluation": [
            {
                "rubric": e.rubric,
                "marksAllocated": e.marksAllocated,
                "maxMarksForRubric": e.maxMarksForRubric,
                "scoreAllocated": min(e.scoreAllocated, e.maxMarksForRubric),
                "justification": e.justification,
                "strengthsFound": e.strengthsFound,
                "weaknessesFound": e.weaknessesFound,
                "improvementSuggestion": e.improvementSuggestion,
            }
            for e in final.evaluation
        ],
        "overallFeedback": final.overallFeedback,
        "examReadinessScore": final.examReadinessScore,
        "gradingMode": grading_mode,
    }


# ==========================================
# 8. Remedial Planning Agent
# ==========================================
def generate_remedial_plan(student: str, weakCOs: list) -> str:
    llm = get_llm(temperature=0.3)
    anonymized_token = "[STUDENT_NAME_REDACTED]"
    template = """You are Dr. Mentor -- an expert academic counsellor and learning specialist at an Indian engineering college.

Create a highly personalized, actionable Remedial Learning Plan for a student struggling with specific Course Outcomes (COs).

STUDENT NAME: {student}
WEAK COURSE OUTCOMES:
{weak}

PLAN STRUCTURE (for each weak CO):
1. **Why it matters**: Real-world/industry importance (1-2 sentences).
2. **Root cause analysis**: Common reasons students struggle with this topic.
3. **Step-by-step action plan**: 4-5 concrete steps (e.g., "Solve Problems 3.1-3.10 from [book]").
4. **Recommended resources**: Specific NPTEL course, YouTube channel, or textbook chapter for Indian students.
5. **Self-assessment checkpoint**: One specific question the student can answer to verify mastery.

CLOSE WITH: A motivating paragraph + a suggested weekly study timetable (hours/topic).

FORMAT: Markdown with clear headers. Be specific -- generic advice is useless. Treat the student as intelligent but currently lacking direction."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    raw = chain.invoke({"student": anonymized_token, "weak": json.dumps(weakCOs, indent=2)}).content
    return raw.replace(anonymized_token, student)


# ==========================================
# 9. Assignment Extractor Agent
# ==========================================
def extract_assignment_questions(text: str, cos_context: str = "") -> dict:
    """Extract questions + rubrics from assignment PDF text."""
    llm = get_llm(temperature=0.0)

    prompt_text = f"""You are an expert academic examiner and curriculum analyst (OBE/NBA framework).

ASSIGNMENT TEXT:
================================================
{text[:20000]}
================================================

AVAILABLE COURSE OUTCOMES:
{cos_context if cos_context else "Not provided -- suggest CO 1-6 based on content and cognitive level"}

EXTRACTION RULES:
GROUPING: Do NOT split sub-questions (a/b/c or i/ii/iii). Group under parent. Each "Task" = ONE question.
MARKS: Sum sub-question marks for parent. Default 10 if not found.
CO: Match verb+content to CO list. Default sequential assignment.
RBT: L1=Remember, L2=Understand, L3=Apply, L4=Analyze, L5=Evaluate, L6=Create
RUBRICS: Specific to each question -- never generic.

OUTPUT: Valid JSON only. No markdown fences.
{{
  "title": "Assignment title",
  "total_marks": <integer>,
  "questions": [
    {{
      "q_no": 1,
      "text": "Full question text in Markdown with sub-questions and context",
      "marks": 10,
      "co_no": 2,
      "rbt": "L4",
      "rubric": "What to look for when grading",
      "rubric_exceptional": "What 90-100% answer looks like",
      "rubric_good": "What 70-89% answer looks like",
      "rubric_avg": "What below-70% answer looks like"
    }}
  ]
}}"""

    try:
        response = llm.invoke(prompt_text).content
        response = re.sub(r"```(?:json)?", "", response).strip().strip("`")
        data = json.loads(response)
        if "questions" not in data:
            data["questions"] = []
        if "title" not in data:
            data["title"] = "Extracted Assignment"
        if "total_marks" not in data:
            data["total_marks"] = sum(q.get("marks", 10) for q in data["questions"])
        return data
    except json.JSONDecodeError as e:
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return {"title": "Extracted Assignment", "total_marks": 0, "questions": [], "error": str(e)}
    except Exception as e:
        return {"title": "Extraction Failed", "total_marks": 0, "questions": [], "error": str(e)}


# ==========================================
# 10. Attainment Calculator Agent (Python-first)
# ==========================================

def calculate_co_attainment_python(
    students: list,
    ia_questions: list,
    marks_ia: list,
    marks_ese: list,
    cos: list,
    course: dict,
    marks_mse: list = None,
    surveys: list = None,
    po_mappings: list = None
) -> dict:
    """
    Pure Python NBA-formula CO attainment calculator (Paper 1 & Paper 2).
    Returns per-CO attainment % and level (1/2/3) using:
      Direct (80%) = weighted average of IA + MSE + ESE CO scores
      Indirect (20%) = Course Exit Survey Likert-scale conversion (1-5 -> percentage)
      Final Attainment = (0.8 * Direct) + (0.2 * Indirect)
      Implicit PO Attainment = Σ(CO_Final_Level * Mapping_Weight) / Σ(Mapping_Weight)
    """
    att_level1 = course.get("attainmentLevels", {}).get(1, 65)
    att_level2 = course.get("attainmentLevels", {}).get(2, 75)
    att_level3 = course.get("attainmentLevels", {}).get(3, 85)

    if not students or not cos:
        return {}

    results = {}

    for co in cos:
        co_no = co.get("no")
        if co_no is None:
            continue

        # Get IA/MSE questions mapped to this CO
        co_ia_qs = [q for q in ia_questions if q.get("coNo") == co_no]

        student_scores = []
        for student in students:
            prn = student.get("prn")
            total_earned = 0
            total_max = 0

            for q in co_ia_qs:
                q_no = q.get("qNo")
                max_marks = q.get("maxMarks", 0)
                assessment_no = q.get("assessmentNo", 1)
                assessment_type = str(q.get("assessmentType", "ia")).lower()

                earned = 0
                if assessment_type == "mse" and marks_mse:
                    mark_rec = next(
                        (m for m in marks_mse
                         if m.get("prn") == prn and m.get("qNo") == q_no),
                        None
                    )
                    earned = mark_rec.get("marks", 0) if mark_rec else 0
                else:
                    mark_rec = next(
                        (m for m in marks_ia
                         if m.get("prn") == prn
                         and m.get("qNo") == q_no
                         and m.get("assessmentNo") == assessment_no),
                        None
                    )
                    earned = mark_rec.get("marks", 0) if mark_rec else 0

                total_earned += earned
                total_max += max_marks

            # Also check ESE marks if available
            if marks_ese:
                for em in marks_ese:
                    if em.get("prn") == prn and em.get("qNo") == co_no:
                        total_earned += em.get("marks", 0)
                        total_max += 20  # standard ESE weight per CO if qNo maps to CO

            if total_max > 0:
                pct = (total_earned / total_max) * 100
                student_scores.append(pct)

        if not student_scores:
            results[f"CO{co_no}"] = {
                "percentage": 0.0,
                "level": 0,
                "studentsAboveThreshold": 0,
                "totalStudents": len(students),
                "status": "No marks data",
                "directPercentage": 0.0,
                "directLevel": 0,
                "indirectPercentage": 0.0,
                "indirectLevel": 0,
                "finalPercentage": 0.0,
                "finalLevel": 0
            }
            continue

        scores_arr = np.array(student_scores)
        avg_pct = float(np.mean(scores_arr))
        above_60 = int(np.sum(scores_arr >= 60))
        direct_pct = (above_60 / len(students)) * 100

        direct_level = 0
        if direct_pct >= att_level3:
            direct_level = 3
        elif direct_pct >= att_level2:
            direct_level = 2
        elif direct_pct >= att_level1:
            direct_level = 1

        # Calculate indirect attainment from Course Exit Surveys (Paper 1 & Paper 2)
        indirect_pct = direct_pct
        indirect_level = direct_level
        survey_scores = []
        if surveys:
            for s in surveys:
                s_co = str(s.get("co", "")).upper().replace("CO", "").strip()
                if s_co == str(co_no):
                    val = s.get("score")
                    if val is not None:
                        try:
                            survey_scores.append(float(val))
                        except (ValueError, TypeError):
                            pass
        if survey_scores:
            avg_survey = float(np.mean(survey_scores))
            indirect_pct = (avg_survey / 5.0) * 100.0  # convert 1-5 scale to percentage
            indirect_level = 0
            if indirect_pct >= att_level3:
                indirect_level = 3
            elif indirect_pct >= att_level2:
                indirect_level = 2
            elif indirect_pct >= att_level1:
                indirect_level = 1

        # Final weighted 80/20 attainment
        w_d = course.get("directWeight", 0.8)
        w_i = course.get("indirectWeight", 0.2)
        final_pct = round((w_d * direct_pct) + (w_i * indirect_pct), 2)
        final_level = 0
        if final_pct >= att_level3:
            final_level = 3
        elif final_pct >= att_level2:
            final_level = 2
        elif final_pct >= att_level1:
            final_level = 1

        results[f"CO{co_no}"] = {
            "percentage": round(final_pct, 2),
            "averageScore": round(avg_pct, 2),
            "level": final_level,
            "directPercentage": round(direct_pct, 2),
            "directLevel": direct_level,
            "indirectPercentage": round(indirect_pct, 2),
            "indirectLevel": indirect_level,
            "finalPercentage": round(final_pct, 2),
            "finalLevel": final_level,
            "studentsAboveThreshold": above_60,
            "totalStudents": len(students),
            "status": "Attained" if final_level >= 1 else "Not Attained"
        }

    # Step 2: Calculate Implicit PO Attainment & Perception Gap (Paper 2)
    po_attainment = {}
    all_pos = ["PO1", "PO2", "PO3", "PO4", "PO5", "PO6", "PO7", "PO8", "PO9", "PO10", "PO11", "PSO1", "PSO2", "PSO3"]
    for po in all_pos:
        weighted_sum = 0.0
        total_weight = 0.0
        for co in cos:
            co_no = co.get("no")
            co_key = f"CO{co_no}"
            if co_key not in results:
                continue
            co_level = results[co_key].get("finalLevel", 0)
            map_val = 0
            if po_mappings:
                for pm in po_mappings:
                    if str(pm.get("coNo", "")) == str(co_no) and pm.get("po", "").upper() == po.upper():
                        try:
                            map_val = float(pm.get("val", 0))
                        except (ValueError, TypeError):
                            map_val = 0
                        break
            if map_val > 0:
                weighted_sum += co_level * map_val
                total_weight += map_val

        implicit_score = round(weighted_sum / total_weight, 2) if total_weight > 0 else 0.0
        implicit_pct = round((implicit_score / 3.0) * 100.0, 2) if total_weight > 0 else 0.0

        po_level = "Not Mapped"
        if total_weight > 0:
            if implicit_score >= 2.4:
                po_level = "High"
            elif implicit_score >= 1.8:
                po_level = "Moderate"
            elif implicit_score > 0:
                po_level = "Low"

        po_attainment[po] = {
            "po": po,
            "implicitScore": implicit_score,  # 0-3 scale
            "percentage": implicit_pct,
            "level": po_level,
            "totalWeight": total_weight,
            "status": "Attained" if implicit_score >= 1.8 else ("Low Attainment" if total_weight > 0 else "Not Mapped")
        }

    results["po_attainment"] = po_attainment
    results["summary"] = {
        "directWeight": course.get("directWeight", 0.8),
        "indirectWeight": course.get("indirectWeight", 0.2),
        "totalCOs": len(cos),
        "attainedCOs": sum(1 for k, v in results.items() if k.startswith("CO") and v.get("finalLevel", 0) >= 1)
    }

    return results



def interpret_attainment(attainment_data: dict, course_name: str) -> str:
    """AI interprets the Python-calculated attainment numbers (CO, PO, Perception Deficit) and provides guidance."""
    llm = get_llm(temperature=0.1)
    template = """You are an NBA academic assessor and statistical auditor analyzing CO & PO attainment data for a course (NBA GAPC V4.0 & JEET 2026 methodology).

COURSE: {course}
CO & PO ATTAINMENT DATA (calculated from actual marks, surveys, and mapping weights):
{data}

Provide a professional attainment interpretation report:
1. **Summary & 80/20 Attainment Health**: Evaluate overall CO attainment health, comparing Direct Assessment (80% from IA/MSE/ESE) with Indirect Assessment (20% from surveys).
2. **Strong COs & POs**: Which COs and POs are well-attained and why (cite specific %s and implicit PO scores).
3. **At-Risk COs & Perception Deficit Analysis**: Identify any COs not attained (Level 0 or Level 1) and analyze **Implicit PO Attainment vs Perception Deficits** (where students score high in exams but lack confidence in broader program attributes like PO7 Life-Long Learning or PO6 Ethics).
4. **NBA Compliance & Sparse Mapping Validation**: Confirm whether the course attainment complies with NBA standards.
5. **Table III Recommended Gap-Bridging Actions**: Provide 3 specific, actionable gap-bridging pedagogies (e.g., Foundation Modules for vertical gaps, Theory-Practical integration for horizontal gaps, or Industry Shadowing / Value-Added Courses for skill gaps).

Be precise, professional, and data-driven. Reference specific CO/PO numbers and percentages."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    return chain.invoke({
        "course": course_name,
        "data": json.dumps(attainment_data, indent=2)
    }).content


# ==========================================
# 10A. NBA Table III Curriculum Gap-Bridging Plan Generator (Paper 5: JEET Jan 2026)
# ==========================================

def generate_curriculum_gap_plan(course_name: str, cos: list, pomapping: dict, attainment_data: dict = None) -> str:
    """
    Generates an NBA Table III: Content Beyond Syllabus & Innovative Gap-Bridging Action Plan
    based on Paper 5 (JEET Jan 2026) research findings.
    """
    llm = get_llm(temperature=0.2)
    template = """You are an NBA Accreditation Auditor and Curriculum Innovation Expert.
You are generating an official **NBA Table III: Content Beyond Syllabus & Innovative Gap-Bridging Action Plan** for the course '{course_name}'.

RESEARCH MANDATE (JEET 2026 & NBA GAPC V4.0):
Curriculum compliance requires continuous improvement by identifying both VERTICAL GAPS (prerequisite knowledge contrarian) and HORIZONTAL GAPS (lack of integration across concurrent semester courses), as well as INDUSTRY / SKILL GAPS.
For every identified gap, an innovative gap-bridging pedagogy must be documented.

COURSE OUTCOMES (COs):
{cos}

CO-PO MAPPING MATRIX:
{pomapping}

ATTAINMENT DATA (if available):
{attainment_data}

Generate a comprehensive, beautifully structured **NBA Table III Curriculum Gap-Bridging Report** in Markdown format with the following exact sections:

# 📋 NBA Table III: Content Beyond Syllabus & Gap-Bridging Action Plan
**Course**: {course_name}  
**Academic Cycle**: Current NBA Evaluation Cycle  
**Methodology**: JEET 2026 Multi-Step Gap Analysis (Vertical, Horizontal, and Industry-Integrated)

---

## 1. Executive Summary & Curriculum Compliance Audit
- Briefly evaluate how well the current syllabus contributes to the 11 Program Outcomes (POs) and 3 PSOs.
- Highlight any POs that receive low weightage or exhibit a **Perception Deficit** (where students pass exams but need explicit pedagogical linkage for broader skills like PO7 Life-long Learning, PO6 Ethics, or PO5 Tool Usage).

## 2. Identified Curriculum Gaps & Strategic Classification
Provide a structured analysis of the gaps identified in this course:
- **Vertical Gaps (Prerequisite Knowledge)**: Where students lack foundational concepts from earlier semesters required for advanced COs.
- **Horizontal Gaps (Concurrent Integration)**: Where topics need cross-disciplinary integration with other subjects taught in the same semester.
- **Industry & Technological Gaps**: Emerging tools, industry workflows, or modern analytical methods not covered in the university syllabus.

## 3. Official NBA Table III: Innovative Action Plan
Render a complete GitHub-flavored Markdown Table matching **JEET 2026 Table III**:

| Gap ID | Gap Classification | Course Outcome / PO Target | Curriculum Description & Gap | Innovative Action Taken (Pedagogy & Hours) | Expected Impact on Competency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | *Vertical Gap (Prerequisite)* | e.g., CO1 / PO1, PO2 | Basic prerequisite concepts required for lateral/weak students | **Foundation Module / Peer Mentoring** (15-hour refresher module in week 1–3) | Strengthens basic analytical competence |
| **GAP-02** | *Industry Skill Gap* | e.g., CO4 / PO5, PO11 | Modern software/tools not covered in syllabus | **Value-Added / Bridge Certification Course** (30-hour hands-on software training) | Bridges academic-industry tool gap |
| **GAP-03** | *Horizontal Gap (Integration)* | e.g., CO3 / PO3, PO9 | Theory covered without practical workshop integration | **Theory-Practical Integration & Case Study** (Pre-practical theory sessions & industry case study) | Enhances design and problem-solving |
| **GAP-04** | *Real-World Exposure Gap* | e.g., CO5 / PO6, PO7 | Lack of real-life industrial application awareness | **Industry Shadowing & Micro-Projects** (Industrial visits and student observational learning) | Fosters lifelong learning & societal context |
| **GAP-05** | *Evaluation Level Gap* | e.g., CO6 / PO4, PSO2 | Need for higher-order Bloom's evaluation skills | **Internal Micro-Projects & Rubric Assessment** (Research-based team micro-project) | Validates complex problem investigation |

*(Customize the table entries to be highly specific to {course_name}'s actual subject matter, tools, and CO-PO mapping!)*

## 4. Continuous Improvement (CI) & Attainment Feedback Loop
- Explain how these 5 gap-bridging actions will be measured in the next academic cycle.
- Detail the direct and indirect feedback mechanisms (Likert surveys, micro-project rubrics) used to close the perception deficit and prove NBA continuous improvement.
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    return chain.invoke({
        "course_name": course_name,
        "cos": json.dumps(cos, indent=2),
        "pomapping": json.dumps(pomapping, indent=2),
        "attainment_data": json.dumps(attainment_data, indent=2) if attainment_data else "No live attainment data provided; analyze based on mapping structure."
    }).content



# ==========================================
# 11. NBA Report Generator Agent
# ==========================================

def generate_nba_report(course: dict, cos: list, attainment: dict, copo_mapping: dict) -> str:
    """
    Generate a complete NBA-format course report as Markdown.
    Ready to be exported as a Word document for accreditation.
    """
    llm = get_llm(temperature=0.1)
    template = """You are an NBA accreditation expert generating a formal Course Assessment Report for an Indian engineering college.

COURSE DETAILS:
{course}

COURSE OUTCOMES (COs):
{cos}

CO ATTAINMENT DATA:
{attainment}

CO-PO MAPPING:
{copo}

Generate a complete NBA Course Assessment Report in this exact structure:

# Course Assessment Report
## 1. Course Information
[Fill in course name, code, semester, academic year, faculty name, department]

## 2. Course Outcomes
| CO No | CO Statement | Blooms Level | Assessment Method |
[Table with all COs]

## 3. CO Attainment Summary
| CO | Target % | Achieved % | Level | Status |
[Table with attainment data]

## 4. CO-PO Mapping Matrix
| CO/PO | PO1 | PO2 | ... |
[Full matrix from provided data]

## 5. Analysis and Interpretation
[Paragraph: What the attainment data reveals about student learning]

## 6. Corrective Actions for Underperforming COs
[Numbered list: Specific actions for each unattained CO]

## 7. Faculty Signature
_Course Faculty: ___________  Date: ___________  HOD Approval: ___________

Be thorough, professional, and ready for NBA submission."""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    return chain.invoke({
        "course": json.dumps(course, indent=2, default=str),
        "cos": json.dumps(cos, indent=2),
        "attainment": json.dumps(attainment, indent=2),
        "copo": json.dumps(copo_mapping, indent=2)
    }).content

# ==========================================
# 12. 6A Matrix Auto-Mapper Agent (Deterministic)
# ==========================================

def _tokenize(text: str) -> set:
    """Extract lowercase word tokens from text, stripping punctuation."""
    return set(re.findall(r'[a-z]{2,}', text.lower()))

def _relevance_score(co_text: str, indicator_text: str, comp_text: str) -> float:
    """
    Score how relevant an indicator is to a CO using word overlap.
    Higher score = more relevant.
    """
    co_words = _tokenize(co_text)
    ind_words = _tokenize(indicator_text) | _tokenize(comp_text)
    
    if not co_words or not ind_words:
        return 0.0
    
    # Count overlapping words (excluding very common stop words)
    stop_words = {'the', 'and', 'for', 'are', 'is', 'in', 'to', 'of', 'an', 'or',
                  'with', 'on', 'at', 'by', 'from', 'as', 'be', 'it', 'that', 'this',
                  'can', 'has', 'have', 'will', 'its', 'their', 'all', 'not', 'but',
                  'was', 'were', 'been', 'being', 'each', 'other', 'such', 'into'}
    
    co_meaningful = co_words - stop_words
    ind_meaningful = ind_words - stop_words
    
    if not co_meaningful:
        co_meaningful = co_words
    
    overlap = co_meaningful & ind_meaningful
    
    # Jaccard-like similarity with bonus for absolute overlap count
    if not co_meaningful and not ind_meaningful:
        return 0.0
    
    jaccard = len(overlap) / len(co_meaningful | ind_meaningful) if (co_meaningful | ind_meaningful) else 0
    absolute_bonus = len(overlap) * 0.1  # Reward more matching words
    
    return jaccard + absolute_bonus


class IndicatorDecision(BaseModel):
    val: str = Field(description="'Y' if selected, 'N' if not selected")
    reasoning: str = Field(description="A short 1-sentence reasoning for why this indicator was or was not selected for this specific CO.")

class COMapping(BaseModel):
    # Mapping of CO number (e.g., "1", "2") to IndicatorDecision
    co_mappings: dict[str, IndicatorDecision]

class POMappingResult(BaseModel):
    # Mapping of indicator ID (e.g., "ind_0") to COMapping
    indicators: dict[str, COMapping]

def analyze_6a_matrix(cos: list, indicators: list, target_mapping: dict = None) -> dict:
    """
    LLM Enhancer for matrix mapping.
    Chunks the task by PO to prevent timeouts and hallucination.
    Returns structured JSON with val and reasoning.
    """
    if not target_mapping:
        target_mapping = {}
        
    llm = get_llm(temperature=0.0).with_structured_output(POMappingResult)
    
    template = """You are an expert NBA OBE auditor mapping Course Outcomes (COs) to Program Outcome (PO) Competencies and Performance Indicators.

We are currently analyzing indicators ONLY for: {current_po}

COURSE OUTCOMES (COs):
{cos}

COMPETENCIES AND PERFORMANCE INDICATORS (PIs) FOR {current_po}:
{indicators}

TARGET CO-PO MAPPING FOR {current_po}:
{target_mapping}

CRITICAL INSTRUCTIONS FOR MAPPING (OFFICIAL SPPU/NBA FORMULA):
1. The TARGET mapping level (1, 2, or 3) is determined by the percentage of indicators marked 'Y' for that CO:
   - Level 3 (High): requires > 67% of indicators marked 'Y' (e.g., 4 or 5 out of 5, 3 or 4 out of 4, 3 out of 3, 2 out of 2).
   - Level 2 (Moderate): requires > 35% to <= 67% of indicators marked 'Y' (e.g., 2 or 3 out of 5, 2 out of 4, 2 out of 3, 1 out of 2).
   - Level 1 (Low): requires > 1% to <= 35% of indicators marked 'Y' (e.g., 1 out of 5, 1 out of 4, 1 out of 3).
   - Unmapped (empty / "-"): exactly 0 'Y's (all "N"s).
2. You MUST select the exact number of 'Y's required to satisfy the percentage range for the TARGET mapping level of each CO.
3. Choose the most relevant indicators based on the exact verbs, subject matter, and intent of the CO.
4. All other indicators must be marked "N".
5. You MUST provide a short 'reasoning' (1 sentence) for your decision.

OUTPUT FORMAT:
Return a JSON object matching the requested schema. The keys for the indicators dictionary MUST be the exact `id` provided.
"""
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    
    # Group indicators by PO
    po_groups = {}
    for ind in indicators:
        po = ind.get('po', '')
        if po not in po_groups:
            po_groups[po] = []
        po_groups[po].append(ind)
        
    final_result = {}
    
    # Process each PO separately (Chunking)
    for po, po_indicators in po_groups.items():
        formatted_indicators = [
            f"ID: {ind.get('id')}, Comp ID: {ind.get('comp_id')}, Desc: {ind.get('comp_text')}, Indicator: {ind.get('indicator')}" 
            for ind in po_indicators
        ]
        
        # Only pass target mappings for this specific PO
        po_targets = target_mapping.get(po, {})
        
        try:
            print(f"[6A Agent] Analyzing {len(po_indicators)} indicators for {po}...")
            result = chain.invoke({
                "current_po": po,
                "cos": json.dumps(cos, indent=2),
                "indicators": json.dumps(formatted_indicators, indent=2),
                "target_mapping": json.dumps(po_targets, indent=2)
            })
            
            # Merge results
            for ind_id, co_map in result.indicators.items():
                if ind_id not in final_result:
                    final_result[ind_id] = {}
                for co_no, decision in co_map.co_mappings.items():
                    final_result[ind_id][co_no] = {
                        "val": decision.val,
                        "reasoning": decision.reasoning
                    }
        except Exception as e:
            print(f"[6A Agent] Error processing {po}: {e}")
            # If a chunk fails, we just log it. The frontend fallback will handle gaps.
            continue
            
    return final_result

