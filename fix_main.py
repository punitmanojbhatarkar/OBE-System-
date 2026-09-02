import re
import datetime

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update GET /api/students to include pagination
students_pattern = re.compile(r'def get_students\(course_id: str, db: Session = Depends\(get_db\)\):\n\s*rows = db.query\(models\.Student\)\.filter\(models\.Student\.courseId == course_id\)\.all\(\)\n\s*return \[.*?\]', re.DOTALL)
new_students = '''def get_students(course_id: str, limit: int = 500, offset: int = 0, db: Session = Depends(get_db)):
    rows = db.query(models.Student).filter(models.Student.courseId == course_id).offset(offset).limit(limit).all()
    return [{"courseId":r.courseId,"prn":r.prn,"name":r.name,"email":r.email,"phone":r.phone,"avatar":r.avatar} for r in rows]'''
if students_pattern.search(content):
    content = students_pattern.sub(new_students, content)
    print("Updated get_students")

# 2. Update get_courses to include pagination
courses_pattern = re.compile(r'def get_courses\(facultyId: Optional\[str\] = None, deptId: Optional\[str\] = None, db: Session = Depends\(get_db\), current_user: models\.User = Depends\(auth_utils\.get_current_user\)\):\n\s*q = db.query\(models\.Course\)', re.DOTALL)
new_courses = '''def get_courses(facultyId: Optional[str] = None, deptId: Optional[str] = None, limit: int = 500, offset: int = 0, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    q = db.query(models.Course)'''
if courses_pattern.search(content):
    content = courses_pattern.sub(new_courses, content)
    print("Updated get_courses signature")

courses_return_pattern = re.compile(r'if deptId: q = q.filter\(models\.Course\.deptId == deptId\)\n\s*return \[course_to_dict\(c\) for c in q.all\(\)\]', re.DOTALL)
new_courses_return = '''if deptId: q = q.filter(models.Course.deptId == deptId)
    return [course_to_dict(c) for c in q.offset(offset).limit(limit).all()]'''
if courses_return_pattern.search(content):
    content = courses_return_pattern.sub(new_courses_return, content)
    print("Updated get_courses return")


# 3. Add Audit logs functionality to save_marks_ia
marks_ia_pattern = re.compile(r'def save_marks_ia\(body: MarksSaveIA, db: Session = Depends\(get_db\)\):.*?return \{"success\": True\}', re.DOTALL)
new_marks_ia = '''def save_marks_ia(body: MarksSaveIA, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db.query(models.MarksIA).filter(models.MarksIA.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksIA(courseId=body.courseId, prn=m["prn"],
                              assessmentNo=m["assessmentNo"], qNo=m["qNo"], marks=m.get("marks",0)))
    
    # Audit Logging
    audit = models.AuditLog(
        id=f"audit-{uid()}",
        user_id=current_user.id,
        action="Save IA Marks",
        details=f"Saved {len(body.marks)} IA marks for course {body.courseId}",
        timestamp=datetime.now().isoformat()
    )
    db.add(audit)
    db.commit()
    return {"success": True}'''
if marks_ia_pattern.search(content):
    content = marks_ia_pattern.sub(new_marks_ia, content)
    print("Updated save_marks_ia")

# 4. Add Audit logs functionality to save_marks_mse
marks_mse_pattern = re.compile(r'def save_marks_mse\(body: MarksSaveMSE, db: Session = Depends\(get_db\)\):.*?return \{"success\": True\}', re.DOTALL)
new_marks_mse = '''def save_marks_mse(body: MarksSaveMSE, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db.query(models.MarksMSE).filter(models.MarksMSE.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksMSE(courseId=body.courseId, prn=m["prn"], qNo=m["qNo"], marks=m.get("marks",0)))
    
    # Audit Logging
    audit = models.AuditLog(
        id=f"audit-{uid()}",
        user_id=current_user.id,
        action="Save MSE Marks",
        details=f"Saved {len(body.marks)} MSE marks for course {body.courseId}",
        timestamp=datetime.now().isoformat()
    )
    db.add(audit)
    db.commit()
    return {"success": True}'''
if marks_mse_pattern.search(content):
    content = marks_mse_pattern.sub(new_marks_mse, content)
    print("Updated save_marks_mse")

# 5. Add Audit logs functionality to save_marks_ese
marks_ese_pattern = re.compile(r'def save_marks_ese\(body: MarksSaveESE, db: Session = Depends\(get_db\)\):.*?return \{"success\": True\}', re.DOTALL)
new_marks_ese = '''def save_marks_ese(body: MarksSaveESE, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db.query(models.MarksESE).filter(models.MarksESE.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksESE(courseId=body.courseId, prn=m["prn"], qNo=m["qNo"], marks=m.get("marks",0)))
        
    # Audit Logging
    audit = models.AuditLog(
        id=f"audit-{uid()}",
        user_id=current_user.id,
        action="Save ESE Marks",
        details=f"Saved {len(body.marks)} ESE marks for course {body.courseId}",
        timestamp=datetime.now().isoformat()
    )
    db.add(audit)
    db.commit()
    return {"success": True}'''
if marks_ese_pattern.search(content):
    content = marks_ese_pattern.sub(new_marks_ese, content)
    print("Updated save_marks_ese")
    
# 6. Add Audit logs endpoint
audit_logs_endpoint = '''
# ─────────────────────────────────────────────
# AUDIT LOGS
# ─────────────────────────────────────────────
@app.get("/api/audit-logs")
def get_audit_logs(limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    rows = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit).all()
    return [{"id":r.id,"user_id":r.user_id,"action":r.action,"details":r.details,"timestamp":r.timestamp} for r in rows]

'''
if "@app.get(\"/api/audit-logs\")" not in content:
    # insert before @app.exception_handler
    content = content.replace('@app.exception_handler(Exception)', audit_logs_endpoint + '@app.exception_handler(Exception)')
    print("Added /api/audit-logs")

# Also add datetime import if missing
if "from datetime import datetime" not in content:
    content = "from datetime import datetime\n" + content

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
