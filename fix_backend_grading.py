import os

# 1. Update ai_logic.py
ai_logic_path = 'backend/agents/ai_logic.py'
with open(ai_logic_path, 'r', encoding='utf-8') as f:
    ai_logic = f.read()

old_grade_func = """def grade_submission(text: str, rubrics: list, maxMarks: int) -> dict:
    llm = get_llm().with_structured_output(GradeResponse)
    template = \"\"\"
    Grade this submission: {text}. Max marks: {maxMarks}. Rubrics: {rubrics}.
    Be extremely objective and critical. Provide granular feedback for each criterion.
    \"\"\"
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"text": text, "rubrics": str(rubrics), "maxMarks": maxMarks})
    return res.dict()"""

new_grade_func = """def grade_submission(text: str, rubrics: list, maxMarks: int, question: str = "") -> dict:
    llm = get_llm().with_structured_output(GradeResponse)
    template = \"\"\"
    Grade this student submission: {text}. Max marks: {maxMarks}. Rubrics: {rubrics}.
    \"\"\"
    if question:
        template += \"\\nThe original assignment question was: {question}\\n\"
    template += \"\\nBe extremely objective and critical. Provide granular feedback for each criterion.\"
    prompt = PromptTemplate.from_template(template)
    chain = prompt | llm
    res = chain.invoke({"text": text, "rubrics": str(rubrics), "maxMarks": maxMarks, "question": question})
    return res.dict()"""

ai_logic = ai_logic.replace(old_grade_func, new_grade_func)
with open(ai_logic_path, 'w', encoding='utf-8') as f:
    f.write(ai_logic)

# 2. Update main.py
main_py_path = 'backend/main.py'
with open(main_py_path, 'r', encoding='utf-8') as f:
    main_py = f.read()

# Update /api/grade to accept question
old_grade_route = """@app.post("/api/grade")
async def api_grade(payload: dict):
    return {"success": True, "data": grade_submission(
        payload["text"], payload["rubrics"], payload["maxMarks"]
    )}"""
new_grade_route = """@app.post("/api/grade")
async def api_grade(payload: dict):
    return {"success": True, "data": grade_submission(
        payload["text"], payload["rubrics"], payload.get("maxMarks", 10), payload.get("question", "")
    )}"""
main_py = main_py.replace(old_grade_route, new_grade_route)

# Update /api/grade-upload to accept question
old_upload_sig = """async def api_grade_upload(
    rubrics: str = Form(...),
    maxMarks: int = Form(...),
    file: UploadFile = File(...)
):"""
new_upload_sig = """async def api_grade_upload(
    rubrics: str = Form(...),
    maxMarks: int = Form(...),
    question: str = Form(""),
    file: UploadFile = File(...)
):"""
main_py = main_py.replace(old_upload_sig, new_upload_sig)

old_return_call = """return {"success": True, "data": grade_submission(text, rubrics_list, maxMarks)}"""
new_return_call = """return {"success": True, "data": grade_submission(text, rubrics_list, maxMarks, question)}"""
main_py = main_py.replace(old_return_call, new_return_call)

with open(main_py_path, 'w', encoding='utf-8') as f:
    f.write(main_py)

print("Updated ai_logic.py and main.py to support 'question' field.")
