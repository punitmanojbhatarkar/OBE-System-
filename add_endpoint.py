with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

if 'UploadFile' not in content:
    content = content.replace('from fastapi import FastAPI, Depends, HTTPException', 'from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form')

new_endpoint = """
@app.post("/api/grade-upload")
async def api_grade_upload(
    rubrics: str = Form(...),
    maxMarks: int = Form(...),
    file: UploadFile = File(...)
):
    import io
    text = ""
    contents = await file.read()
    
    if file.filename.endswith('.pdf'):
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(contents))
        text = "\\n".join(page.extract_text() for page in reader.pages if page.extract_text())
    elif file.filename.endswith('.docx'):
        import docx
        doc = docx.Document(io.BytesIO(contents))
        text = "\\n".join(para.text for para in doc.paragraphs)
    else:
        text = contents.decode('utf-8', errors='ignore')
        
    rubrics_list = [r.strip() for r in rubrics.split('\\n') if r.strip()]
    return {"success": True, "data": grade_submission(text, rubrics_list, maxMarks)}
"""

if '/api/grade-upload' not in content:
    content = content.replace('@app.post("/api/grade")', new_endpoint + '\n@app.post("/api/grade")')

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated main.py")
