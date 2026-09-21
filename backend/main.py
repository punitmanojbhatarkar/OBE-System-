import json
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List
import os
import uuid
from dotenv import load_dotenv

from database import engine, get_db
import models

from agents.ai_logic import (
    chat_with_advisor, chat_with_advisor_agent, clear_memory,
    extract_syllabus, generate_teaching_philosophy, generate_cos_from_syllabus,
    analyze_blooms, auto_map_copo, generate_assignment,
    calculate_co_attainment_python, interpret_attainment, generate_nba_report, analyze_6a_matrix,
    generate_curriculum_gap_plan, grade_submission, extract_assignment_questions
)

load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI OBE System", version="2.0.0")

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": str(exc), "traceback": traceback.format_exc()}
    )

@app.middleware("http")
async def add_pna_and_cors(request: Request, call_next):
    if request.method == "OPTIONS":
        response = JSONResponse(content="OK")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response

frontend_url = os.getenv("FRONTEND_URL", "https://obe-git-master-punitbhatarkar650s-projects.vercel.app")
allowed_origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:3000",
    frontend_url
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def uid():
    return str(uuid.uuid4())[:12]

def course_to_dict(c: models.Course) -> dict:
    return {
        "id": c.id, "code": c.code, "name": c.name, "shortName": c.shortName,
        "deptId": c.deptId, "facultyId": c.facultyId, "semester": c.semester,
        "year": c.year, "division": c.division, "batch": c.batch, "class": c.klass,
        "champion": c.champion, "champDate": c.champDate,
        "lecturesPerWeek": c.lecturesPerWeek, "totalStudents": c.totalStudents,
        "teachingPhilosophy": c.teachingPhilosophy, "status": c.status,
        "examScheme": {"ia": c.ia, "mse": c.mse, "ese": c.ese},
        "coThreshold": getattr(c, "coThreshold", 60),
        "attainmentLevels": {1: c.attLevel1, 2: c.attLevel2, 3: c.attLevel3},
        "directWeight": c.directWeight, "indirectWeight": c.indirectWeight,
    }

def co_to_dict(co: models.CourseOutcome) -> dict:
    return {
        "id": co.id, "courseId": co.courseId, "no": co.no, "code": co.code,
        "text": co.text or "", "bloomsLevel": co.bloomsLevel or "",
        "assessedThrough": (co.assessedThrough or "").split(",") if co.assessedThrough else [],
    }

def user_to_dict(u: models.User) -> dict:
    return {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
            "deptId": u.deptId, "avatar": u.avatar}

def dept_to_dict(d: models.Department) -> dict:
    return {"id": d.id, "name": d.name, "code": d.code, "hod": d.hod,
            "vision": d.vision, "mission": d.mission}

def student_to_dict(s: models.Student) -> dict:
    return {"id": s.id, "courseId": s.courseId, "prn": s.prn, "name": s.name,
            "preSurveyScore": s.preSurveyScore, "learnerType": s.learnerType}

def uid():
    import time, random, string
    return str(int(time.time() * 1000)) + "".join(random.choices(string.ascii_lowercase, k=5))

def _ensure_course(db: Session, course_id: str):
    if not course_id:
        return
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not c:
        c = models.Course(id=course_id, code=course_id, name=course_id, status="active")
        db.add(c)
        db.commit()


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/api/migrate")
async def migrate_db(request: Request, db: Session = Depends(get_db)):
    # Receives the entire localStorage blob and overwrites db.
    data = await request.json()
    
    # Drop all and recreate to ensure clean slate
    models.Base.metadata.drop_all(bind=engine)
    models.Base.metadata.create_all(bind=engine)
    
    # 1. Insert Departments first (Parent of Users and Courses)
    if 'obe_departments' in data:
        for d in data['obe_departments']:
            db.merge(models.Department(
                id=d.get('id'), name=d.get('name'), code=d.get('code'), 
                hod=d.get('hod'), vision=d.get('vision'), mission=d.get('mission')
            ))
        db.commit() # Commit so Users can reference them
            
    # 2. Insert Users (Parent of Courses)
    if 'obe_users' in data:
        for u in data['obe_users']:
            db.merge(models.User(
                id=u.get('id'), name=u.get('name'), email=u.get('email'), 
                password=u.get('password', '1234'), role=u.get('role'), 
                deptId=u.get('deptId'), avatar=u.get('avatar')
            ))
        db.commit()
            
    # 3. Insert Courses
    if 'obe_courses' in data:
        for c in data['obe_courses']:
            exam = c.get('examScheme') or {}
            att = c.get('attainmentLevels') or {}
            db.merge(models.Course(
                id=c.get('id'), code=c.get('code'), name=c.get('name'), shortName=c.get('shortName'), 
                deptId=c.get('deptId'), facultyId=c.get('facultyId'), semester=c.get('semester'), 
                year=c.get('year'), division=c.get('division'), batch=c.get('batch'), klass=c.get('class'), 
                champion=c.get('champion'), champDate=c.get('champDate'), 
                lecturesPerWeek=c.get('lecturesPerWeek', 3), totalStudents=c.get('totalStudents', 0), 
                teachingPhilosophy=c.get('teachingPhilosophy'), status=c.get('status', 'active'),
                ia=exam.get('ia', 30), mse=exam.get('mse', 20), ese=exam.get('ese', 50),
                attLevel1=att.get('l1', 65), attLevel2=att.get('l2', 75), attLevel3=att.get('l3', 85),
                directWeight=c.get('directWeight', 80), indirectWeight=c.get('indirectWeight', 20)
            ))
        db.commit()
        
    # 4. Insert COs
    if 'obe_cos' in data:
        for co in data['obe_cos']:
            assessed = co.get('assessedThrough')
            if isinstance(assessed, list):
                assessed = ",".join(assessed)
            db.merge(models.CourseOutcome(
                id=co.get('id'), courseId=co.get('courseId'), no=co.get('no'), code=co.get('code'),
                text=co.get('text') or co.get('description'), bloomsLevel=co.get('bloomsLevel') or co.get('btLevel'),
                assessedThrough=assessed
            ))
        db.commit()
        
    # 5. Insert Students
    if 'obe_students' in data:
        for s in data['obe_students']:
            db.merge(models.Student(
                id=s.get('id'), courseId=s.get('courseId'), prn=s.get('prn'),
                name=s.get('name'), preSurveyScore=s.get('preSurveyScore'),
                learnerType=s.get('learnerType')
            ))
        db.commit()
            
    return {"success": True, "message": "Migrated successfully"}


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email_clean = req.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == req.email.strip()).first()
    if not user:
        user = db.query(models.User).filter(models.User.email.ilike(email_clean)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user.password and user.password != req.password:
        # Fallback check or invalid password
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"success": True, "user": user_to_dict(user)}

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
@app.get("/api/config")
def get_config(db: Session = Depends(get_db)):
    cfg = db.query(models.Config).filter(models.Config.id == 1).first()
    if not cfg:
        cfg = models.Config(id=1); db.add(cfg); db.commit(); db.refresh(cfg)
    ia_questions = db.query(models.IAQuestion).all()
    ia_q_list = [{"courseId":q.courseId,"assessmentType":q.assessmentType,"assessmentNo":q.assessmentNo,
                  "questions":[{"qNo":q.qNo,"desc":q.desc,"bloomsLevel":q.bloomsLevel,"coNo":q.coNo,"maxMarks":q.maxMarks}]}
                 for q in ia_questions]
    return {"academicYear": cfg.academicYear, "aiEnabled": cfg.aiEnabled,
            "aiModel": cfg.aiModel, "aiApiKey": cfg.aiApiKey,
            "aiCallsUsed": cfg.aiCallsUsed, "maxAICalls": cfg.maxAICalls,
            "instituteVision": cfg.instituteVision, "instituteMission": cfg.instituteMission,
            "attainmentDefaultLevels": cfg.attainmentDefaultLevels,
            "directWeight": cfg.directWeight, "indirectWeight": cfg.indirectWeight,
            "collegeFullName": cfg.collegeFullName,
            "iaQuestions": ia_q_list}

class ConfigPatch(BaseModel):
    academicYear: Optional[str] = None
    aiEnabled: Optional[bool] = None
    aiModel: Optional[str] = None
    aiApiKey: Optional[str] = None
    aiCallsUsed: Optional[int] = None
    maxAICalls: Optional[int] = None
    instituteVision: Optional[str] = None
    instituteMission: Optional[str] = None
    attainmentDefaultLevels: Optional[dict] = None
    directWeight: Optional[int] = None
    indirectWeight: Optional[int] = None
    collegeFullName: Optional[str] = None

@app.put("/api/config")
def update_config(patch: ConfigPatch, db: Session = Depends(get_db)):
    cfg = db.query(models.Config).filter(models.Config.id == 1).first()
    if not cfg:
        cfg = models.Config(id=1); db.add(cfg)
    for field, val in patch.dict(exclude_none=True).items():
        setattr(cfg, field, val)
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# DEPARTMENTS
# ─────────────────────────────────────────────
@app.get("/api/departments")
def get_departments(db: Session = Depends(get_db)):
    return [dept_to_dict(d) for d in db.query(models.Department).all()]

@app.get("/api/departments/{dept_id}")
def get_department(dept_id: str, db: Session = Depends(get_db)):
    d = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not d: raise HTTPException(404, "Department not found")
    return dept_to_dict(d)

class DepartmentBody(BaseModel):
    id: Optional[str] = None
    name: str
    code: str
    hod: Optional[str] = None
    vision: Optional[str] = None
    mission: Optional[str] = None

@app.post("/api/departments")
def add_department(body: DepartmentBody, db: Session = Depends(get_db)):
    d = models.Department(id=body.id or uid(), name=body.name, code=body.code,
                          hod=body.hod, vision=body.vision, mission=body.mission)
    db.add(d); db.commit(); db.refresh(d)
    return dept_to_dict(d)

@app.put("/api/departments/{dept_id}")
def update_department(dept_id: str, body: DepartmentBody, db: Session = Depends(get_db)):
    d = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not d: raise HTTPException(404)
    for field in ["name","code","hod","vision","mission"]:
        val = getattr(body, field, None)
        if val is not None: setattr(d, field, val)
    db.commit()
    return dept_to_dict(d)

@app.delete("/api/departments/{dept_id}")
def delete_department(dept_id: str, db: Session = Depends(get_db)):
    d = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if d: db.delete(d); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────
@app.get("/api/users")
def get_users(role: Optional[str] = None, deptId: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.User)
    if role: q = q.filter(models.User.role == role)
    if deptId: q = q.filter(models.User.deptId == deptId)
    return [user_to_dict(u) for u in q.all()]

@app.get("/api/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u: raise HTTPException(404)
    return user_to_dict(u)

class UserBody(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    password: Optional[str] = None
    role: str
    deptId: Optional[str] = None
    avatar: Optional[str] = None

@app.post("/api/users")
def add_user(body: UserBody, db: Session = Depends(get_db)):
    u = models.User(id=body.id or uid(), name=body.name, email=body.email,
                    password=body.password, role=body.role, deptId=body.deptId,
                    avatar=body.avatar or body.name[0].upper())
    db.add(u); db.commit(); db.refresh(u)
    return user_to_dict(u)

@app.put("/api/users/{user_id}")
def update_user(user_id: str, body: UserBody, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if not u: raise HTTPException(404)
    for f in ["name","email","role","deptId","avatar"]:
        val = getattr(body, f, None)
        if val is not None: setattr(u, f, val)
    if body.password: u.password = body.password
    db.commit()
    return user_to_dict(u)

@app.delete("/api/users/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id).first()
    if u: db.delete(u); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# COURSES
# ─────────────────────────────────────────────
@app.get("/api/courses")
def get_courses(facultyId: Optional[str] = None, deptId: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.Course)
    if facultyId:
        # HOD gets all dept courses
        u = db.query(models.User).filter(models.User.id == facultyId).first()
        if u and u.role == "hod":
            q = q.filter(models.Course.deptId == u.deptId)
        else:
            q = q.filter(models.Course.facultyId == facultyId)
    if deptId: q = q.filter(models.Course.deptId == deptId)
    return [course_to_dict(c) for c in q.all()]

@app.get("/api/courses/{course_id}")
def get_course(course_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not c: raise HTTPException(404)
    return course_to_dict(c)

class ExamScheme(BaseModel):
    ia: int = 30; mse: int = 20; ese: int = 50

class CourseBody(BaseModel):
    id: Optional[str] = None
    code: str; name: str
    shortName: Optional[str] = None
    deptId: Optional[str] = None; facultyId: Optional[str] = None
    semester: Optional[str] = None; year: Optional[str] = None
    division: Optional[str] = None; batch: Optional[str] = None
    klass: Optional[str] = None; champion: Optional[str] = None
    champDate: Optional[str] = None; lecturesPerWeek: Optional[int] = None
    totalStudents: Optional[int] = None; teachingPhilosophy: Optional[str] = None
    status: Optional[str] = "active"
    examScheme: Optional[ExamScheme] = None
    directWeight: Optional[int] = 80; indirectWeight: Optional[int] = 20
    coThreshold: Optional[int] = 60
    attainmentLevels: Optional[dict] = None

@app.post("/api/courses")
def add_course(body: CourseBody, db: Session = Depends(get_db)):
    es = body.examScheme or ExamScheme()
    c = models.Course(
        id=body.id or uid(), code=body.code, name=body.name,
        shortName=body.shortName or body.code, deptId=body.deptId,
        facultyId=body.facultyId, semester=body.semester, year=body.year,
        division=body.division, batch=body.batch, klass=body.klass,
        champion=body.champion, champDate=body.champDate,
        lecturesPerWeek=body.lecturesPerWeek, totalStudents=body.totalStudents,
        teachingPhilosophy=body.teachingPhilosophy, status=body.status or "active",
        ia=es.ia, mse=es.mse, ese=es.ese,
        directWeight=body.directWeight or 80, indirectWeight=body.indirectWeight or 20
    )
    db.add(c); db.commit(); db.refresh(c)
    return course_to_dict(c)

@app.put("/api/courses/{course_id}")
def update_course(course_id: str, body: CourseBody, db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    es = body.examScheme or ExamScheme()
    if not c:
        c = models.Course(
            id=course_id, code=body.code or course_id, name=body.name or course_id,
            shortName=body.shortName or body.code or course_id, deptId=body.deptId,
            facultyId=body.facultyId, semester=body.semester, year=body.year,
            division=body.division, batch=body.batch, klass=body.klass,
            champion=body.champion, champDate=body.champDate,
            lecturesPerWeek=body.lecturesPerWeek or 3, totalStudents=body.totalStudents or 0,
            teachingPhilosophy=body.teachingPhilosophy, status=body.status or "active",
            ia=es.ia, mse=es.mse, ese=es.ese,
            directWeight=body.directWeight or 80, indirectWeight=body.indirectWeight or 20
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        return course_to_dict(c)

    for f in ["code","name","shortName","deptId","facultyId","semester","year","division","batch",
              "champion","champDate","lecturesPerWeek","totalStudents","teachingPhilosophy","status",
              "directWeight","indirectWeight","coThreshold"]:
        val = getattr(body, f, None)
        if val is not None: setattr(c, f, val)
    if body.klass: c.klass = body.klass
    if body.examScheme:
        c.ia = body.examScheme.ia; c.mse = body.examScheme.mse; c.ese = body.examScheme.ese
    if body.attainmentLevels:
        c.attLevel1 = body.attainmentLevels.get("1", c.attLevel1)
        c.attLevel2 = body.attainmentLevels.get("2", c.attLevel2)
        c.attLevel3 = body.attainmentLevels.get("3", c.attLevel3)
    db.commit()
    return course_to_dict(c)

@app.delete("/api/courses/{course_id}")
def delete_course(course_id: str, db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if c: db.delete(c); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# COURSE OUTCOMES
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/cos")
def get_cos(course_id: str, db: Session = Depends(get_db)):
    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == course_id)\
            .order_by(models.CourseOutcome.no).all()
    return [co_to_dict(co) for co in cos]

class COBody(BaseModel):
    id: Optional[str] = None; courseId: str; no: int; code: str
    text: Optional[str] = ""; bloomsLevel: Optional[str] = ""
    assessedThrough: Optional[list] = []

@app.post("/api/cos")
def add_co(body: COBody, db: Session = Depends(get_db)):
    # Ensure course exists
    c = db.query(models.Course).filter(models.Course.id == body.courseId).first()
    if not c:
        c = models.Course(id=body.courseId, code=body.courseId, name=body.courseId, status="active")
        db.add(c); db.commit()

    co = models.CourseOutcome(
        id=body.id or uid(), courseId=body.courseId, no=body.no, code=body.code,
        text=body.text, bloomsLevel=body.bloomsLevel,
        assessedThrough=",".join(body.assessedThrough) if body.assessedThrough else ""
    )
    db.add(co); db.commit(); db.refresh(co)
    return co_to_dict(co)

class COSaveAll(BaseModel):
    courseId: str
    cos: list

@app.post("/api/cos/saveall")
def save_all_cos(body: COSaveAll, db: Session = Depends(get_db)):
    # Ensure course exists in PostgreSQL
    c = db.query(models.Course).filter(models.Course.id == body.courseId).first()
    if not c:
        c = models.Course(
            id=body.courseId,
            code=body.courseId,
            name=body.courseId,
            status="active"
        )
        db.add(c)
        db.commit()

    db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == body.courseId).delete()
    for item in body.cos:
        if not item.get("text") and not item.get("code"):
            continue
        co = models.CourseOutcome(
            id=item.get("id") or uid(),
            courseId=body.courseId,
            no=item.get("no", 1),
            code=item.get("code", f"CO{item.get('no', 1)}"),
            text=item.get("text", ""),
            bloomsLevel=item.get("bloomsLevel", "L3"),
            assessedThrough=",".join(item.get("assessedThrough", [])) if item.get("assessedThrough") else "ia,mse,ese"
        )
        db.add(co)
    db.commit()
    return {"success": True}

@app.put("/api/cos/{co_id}")
def update_co(co_id: str, body: COBody, db: Session = Depends(get_db)):
    co = db.query(models.CourseOutcome).filter(models.CourseOutcome.id == co_id).first()
    if not co: raise HTTPException(404)
    co.text = body.text; co.bloomsLevel = body.bloomsLevel
    co.assessedThrough = ",".join(body.assessedThrough) if body.assessedThrough else ""
    db.commit()
    return co_to_dict(co)

@app.delete("/api/cos/{co_id}")
def delete_co(co_id: str, db: Session = Depends(get_db)):
    co = db.query(models.CourseOutcome).filter(models.CourseOutcome.id == co_id).first()
    if co: db.delete(co); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# PO MAPPING
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/pomapping")
def get_pomapping(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.PoMapping).filter(models.PoMapping.courseId == course_id).all()
    return [{"courseId":r.courseId,"coNo":r.coNo,"po":r.po,"val":r.val,"justification":r.justification} for r in rows]

class POMapSave(BaseModel):
    courseId: str
    matrix: list  # [{coNo, po, val, justification}]

@app.post("/api/pomapping/save")
def save_pomapping(body: POMapSave, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.PoMapping).filter(models.PoMapping.courseId == body.courseId).delete()
    for item in body.matrix:
        db.add(models.PoMapping(courseId=body.courseId, coNo=item["coNo"], po=item["po"], val=item["val"], justification=item.get("justification", "")))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# STUDENTS
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/students")
def get_students(course_id: str, db: Session = Depends(get_db)):
    return [student_to_dict(s) for s in db.query(models.Student).filter(models.Student.courseId == course_id).all()]

class StudentBody(BaseModel):
    id: Optional[str] = None; courseId: str; prn: str; name: str
    preSurveyScore: Optional[int] = None; learnerType: Optional[str] = None

class StudentsSaveAll(BaseModel):
    courseId: str
    students: list

@app.post("/api/students/saveall")
def save_all_students(body: StudentsSaveAll, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.Student).filter(models.Student.courseId == body.courseId).delete()
    for item in body.students:
        db.add(models.Student(
            id=item.get("id") or uid(), courseId=body.courseId,
            prn=item.get("prn",""), name=item.get("name",""),
            preSurveyScore=item.get("preSurveyScore"), learnerType=item.get("learnerType","average")
        ))
    db.commit()
    return {"success": True}

@app.post("/api/students")
def add_student(body: StudentBody, db: Session = Depends(get_db)):
    s = models.Student(id=body.id or uid(), courseId=body.courseId, prn=body.prn,
                       name=body.name, preSurveyScore=body.preSurveyScore, learnerType=body.learnerType)
    db.add(s); db.commit(); db.refresh(s)
    return student_to_dict(s)

@app.put("/api/students/{student_id}")
def update_student(student_id: str, body: StudentBody, db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if s:
        s.prn = body.prn
        s.name = body.name
        s.preSurveyScore = body.preSurveyScore
        s.learnerType = body.learnerType
        db.commit(); db.refresh(s)
        return student_to_dict(s)
    raise HTTPException(status_code=404, detail="Student not found")

@app.delete("/api/students/{student_id}")
def delete_student(student_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Student).filter(models.Student.id == student_id).first()
    if s: db.delete(s); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# MARKS — IA
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/marks/ia")
def get_marks_ia(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksIA).filter(models.MarksIA.courseId == course_id).all()
    return [{"courseId":r.courseId,"prn":r.prn,"assessmentNo":r.assessmentNo,"qNo":r.qNo,"marks":r.marks} for r in rows]

class MarksSaveIA(BaseModel):
    courseId: str
    marks: list  # [{prn, assessmentNo, qNo, marks}]

@app.post("/api/marks/ia/save")
def save_marks_ia(body: MarksSaveIA, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.MarksIA).filter(models.MarksIA.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksIA(courseId=body.courseId, prn=m["prn"],
                              assessmentNo=m["assessmentNo"], qNo=m["qNo"], marks=m.get("marks",0)))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# MARKS — MSE
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/marks/mse")
def get_marks_mse(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksMSE).filter(models.MarksMSE.courseId == course_id).all()
    return [{"courseId":r.courseId,"prn":r.prn,"qNo":r.qNo,"marks":r.marks} for r in rows]

class MarksSaveMSE(BaseModel):
    courseId: str
    marks: list

@app.post("/api/marks/mse/save")
def save_marks_mse(body: MarksSaveMSE, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.MarksMSE).filter(models.MarksMSE.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksMSE(courseId=body.courseId, prn=m["prn"], qNo=m["qNo"], marks=m.get("marks",0)))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# MARKS — ESE
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/marks/ese")
def get_marks_ese(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksESE).filter(models.MarksESE.courseId == course_id).all()
    return [{"courseId":r.courseId,"prn":r.prn,"qNo":r.qNo,"marks":r.marks} for r in rows]

class MarksSaveESE(BaseModel):
    courseId: str
    marks: list

@app.post("/api/marks/ese/save")
def save_marks_ese(body: MarksSaveESE, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.MarksESE).filter(models.MarksESE.courseId == body.courseId).delete()
    for m in body.marks:
        db.add(models.MarksESE(courseId=body.courseId, prn=m["prn"], qNo=m["qNo"], marks=m.get("marks",0)))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# IA QUESTIONS
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/ia-questions")
def get_ia_questions(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.IAQuestion).filter(models.IAQuestion.courseId == course_id).all()
    # Group by assessmentType + assessmentNo
    grouped = {}
    for r in rows:
        key = (r.assessmentType, r.assessmentNo)
        if key not in grouped:
            grouped[key] = {"courseId": r.courseId, "assessmentType": r.assessmentType, "assessmentNo": r.assessmentNo, "questions": []}
        grouped[key]["questions"].append({"qNo": r.qNo, "desc": r.desc, "bloomsLevel": r.bloomsLevel, "coNo": r.coNo, "maxMarks": r.maxMarks})
    return list(grouped.values())

class IAQSaveAll(BaseModel):
    courseId: str
    assessmentType: str
    assessmentNo: int
    questions: list

@app.post("/api/ia-questions/save")
def save_ia_questions(body: IAQSaveAll, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.IAQuestion).filter(
        models.IAQuestion.courseId == body.courseId,
        models.IAQuestion.assessmentType == body.assessmentType,
        models.IAQuestion.assessmentNo == body.assessmentNo
    ).delete()
    for q in body.questions:
        db.add(models.IAQuestion(
            courseId=body.courseId, assessmentType=body.assessmentType,
            assessmentNo=body.assessmentNo, qNo=q["qNo"], desc=q.get("desc",""),
            bloomsLevel=q.get("bloomsLevel",""), coNo=q.get("coNo",1), maxMarks=q.get("maxMarks",10)
        ))
    db.commit()
    return {"success": True}

@app.delete("/api/ia-questions/{course_id}/{assessment_type}/{assessment_no}")
def delete_ia_questions(course_id: str, assessment_type: str, assessment_no: int, db: Session = Depends(get_db)):
    db.query(models.IAQuestion).filter(
        models.IAQuestion.courseId == course_id,
        models.IAQuestion.assessmentType == assessment_type,
        models.IAQuestion.assessmentNo == assessment_no
    ).delete()
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# SURVEY
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/survey")
def get_survey(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Survey).filter(models.Survey.courseId == course_id).all()
    return [{"courseId":r.courseId,"prn":r.prn,"co":r.co,"score":r.score} for r in rows]

class SurveySaveAll(BaseModel):
    courseId: str
    data: Optional[List] = None
    survey: Optional[List] = None

@app.post("/api/survey/save")
def save_survey(body: SurveySaveAll, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    db.query(models.Survey).filter(models.Survey.courseId == body.courseId).delete()
    items = body.survey if body.survey is not None else (body.data or [])
    for s in items:
        db.add(models.Survey(courseId=body.courseId, prn=s["prn"], co=str(s["co"]), score=int(s.get("score", 0))))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# ASSIGNMENTS
# ─────────────────────────────────────────────
def assignment_to_dict(a):
    return {
        "id": a.id, "courseId": a.courseId,
        "type": a.type or "assignment",
        "no": a.no or 1,
        "title": a.title,
        "description": a.description or "",
        "topic": a.topic,
        "level": a.level,
        "dueDate": a.dueDate,
        "rbtLevel": a.rbtLevel,
        "coNo": a.coNo,
        "coNos": json.loads(a.coNos or "[]"),
        "maxMarks": a.maxMarks,
        "questions": json.loads(a.questions or "[]"),
        "rubrics": json.loads(a.rubrics or "[]"),
        "aiGenerated": bool(a.aiGenerated),
        "createdAt": a.createdAt
    }

@app.get("/api/courses/{course_id}/assignments")
def get_assignments(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Assignment).filter(models.Assignment.courseId == course_id).all()
    return [assignment_to_dict(a) for a in rows]

class AssignmentBody(BaseModel):
    id: Optional[str] = None
    courseId: str
    title: str
    type: Optional[str] = "assignment"
    no: Optional[int] = 1
    description: Optional[str] = None
    topic: Optional[str] = None
    level: Optional[str] = None
    dueDate: Optional[str] = None
    rbtLevel: Optional[str] = None
    coNo: Optional[int] = None
    coNos: Optional[list] = []
    maxMarks: Optional[int] = None
    questions: Optional[list] = []
    rubrics: Optional[list] = []
    aiGenerated: Optional[bool] = False

@app.post("/api/assignments")
def add_assignment(body: AssignmentBody, db: Session = Depends(get_db)):
    import datetime
    aid = body.id or uid()
    # Upsert: update if exists, insert if new
    existing = db.query(models.Assignment).filter(models.Assignment.id == aid).first()
    if existing:
        existing.type = body.type or "assignment"
        existing.no = body.no or 1
        existing.title = body.title
        existing.description = body.description
        existing.topic = body.topic
        existing.level = body.level
        existing.dueDate = body.dueDate
        existing.rbtLevel = body.rbtLevel
        existing.coNo = body.coNo
        existing.coNos = json.dumps(body.coNos or [])
        existing.maxMarks = body.maxMarks
        existing.questions = json.dumps(body.questions or [])
        existing.rubrics = json.dumps(body.rubrics or [])
        existing.aiGenerated = body.aiGenerated
        db.commit(); db.refresh(existing)
        return assignment_to_dict(existing)
    else:
        a = models.Assignment(
            id=aid, courseId=body.courseId,
            type=body.type or "assignment", no=body.no or 1,
            title=body.title, description=body.description,
            topic=body.topic, level=body.level, dueDate=body.dueDate,
            rbtLevel=body.rbtLevel, coNo=body.coNo,
            coNos=json.dumps(body.coNos or []),
            maxMarks=body.maxMarks,
            questions=json.dumps(body.questions or []),
            rubrics=json.dumps(body.rubrics or []),
            aiGenerated=body.aiGenerated,
            createdAt=datetime.datetime.utcnow().isoformat()
        )
        db.add(a); db.commit(); db.refresh(a)
        return assignment_to_dict(a)

@app.delete("/api/assignments/{assignment_id}")
def delete_assignment(assignment_id: str, db: Session = Depends(get_db)):
    a = db.query(models.Assignment).filter(models.Assignment.id == assignment_id).first()
    if a: db.delete(a); db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# SYLLABUS
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/syllabus")
def get_syllabus(course_id: str, db: Session = Depends(get_db)):
    s = db.query(models.Syllabus).filter(models.Syllabus.courseId == course_id).first()
    if not s: return {"courseId": course_id, "modules": [], "books": []}
    return {"courseId": s.courseId, "modules": json.loads(s.modules or "[]"), "books": json.loads(s.books or "[]")}

class SyllabusBody(BaseModel):
    courseId: str
    modules: Optional[list] = []
    books: Optional[list] = []

@app.post("/api/syllabus/save")
def save_syllabus(body: SyllabusBody, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    s = db.query(models.Syllabus).filter(models.Syllabus.courseId == body.courseId).first()
    if s:
        s.modules = json.dumps(body.modules); s.books = json.dumps(body.books)
    else:
        db.add(models.Syllabus(courseId=body.courseId, modules=json.dumps(body.modules), books=json.dumps(body.books)))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# 6A INDICATOR MAPPING
# ─────────────────────────────────────────────
@app.get("/api/courses/{course_id}/indicatormapping")
def get_indicator_mapping(course_id: str, db: Session = Depends(get_db)):
    m = db.query(models.IndicatorMapping).filter(models.IndicatorMapping.courseId == course_id).first()
    if not m: return {"courseId": course_id, "mappingData": {}}
    data = m.mappingData
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except:
            data = {}
    return {"courseId": m.courseId, "mappingData": data or {}}

class IndicatorMappingBody(BaseModel):
    courseId: str
    mappingData: Optional[dict] = {}

@app.post("/api/indicatormapping/save")
def save_indicator_mapping(body: IndicatorMappingBody, db: Session = Depends(get_db)):
    _ensure_course(db, body.courseId)
    m = db.query(models.IndicatorMapping).filter(models.IndicatorMapping.courseId == body.courseId).first()
    # In SQLAlchemy JSON columns, we can just assign the dict directly.
    # But just in case, we'll store the dict and let SQLAlchemy serialize it.
    if m:
        m.mappingData = body.mappingData
    else:
        db.add(models.IndicatorMapping(courseId=body.courseId, mappingData=body.mappingData))
    db.commit()
    return {"success": True}

# ─────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────
@app.get("/api/health")
def health():
    gemini_key = os.getenv("GEMINI_API_KEY")
    return {"database": "sqlite (real)", "ai_engine": "gemini-2.5-flash",
            "ai_status": "configured" if gemini_key else "missing_key", "version": "2.0.0"}

# ─────────────────────────────────────────────
# AGENTIC AI ENDPOINTS
# ─────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str; context: str = ""

@app.post("/api/chat")
def api_chat(req: ChatRequest):
    return {"reply": chat_with_advisor(req.message, req.context)}

class SyllabusRequest(BaseModel):
    text: str

@app.post("/api/extract-syllabus")
def api_extract_syllabus(req: SyllabusRequest):
    return {"success": True, "data": extract_syllabus(req.text)}

class PhilosophyRequest(BaseModel):
    courseName: str; deptVision: str; deptMission: str

@app.post("/api/philosophy")
def api_philosophy(req: PhilosophyRequest):
    return {"success": True, "data": generate_teaching_philosophy(req.courseName, req.deptVision, req.deptMission)}

class BloomsRequest(BaseModel):
    cos: list

@app.post("/api/analyze-blooms")
def api_analyze_blooms(req: BloomsRequest):
    return {"success": True, "data": analyze_blooms(req.cos)}

class CoGenerationRequest(BaseModel):
    syllabus: str

@app.post("/api/generate-cos")
def api_generate_cos(req: CoGenerationRequest):
    return {"success": True, "data": generate_cos_from_syllabus(req.syllabus)}

from typing import Optional
class CoPoRequest(BaseModel):
    cos: list
    pos: list
    pso_defs: Optional[dict] = None

@app.post("/api/auto-map-copo")
def api_auto_map_copo(req: CoPoRequest):
    try:
        data = auto_map_copo(req.cos, req.pos, req.pso_defs)
        return {"success": True, "data": data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}

@app.delete("/api/auto-map-copo/clear-cache")
def api_clear_copo_cache():
    """Clear the CO-PO mapping cache so next click generates a fresh AI mapping."""
    from agents.ai_logic import _COPO_CACHE
    count = len(_COPO_CACHE)
    _COPO_CACHE.clear()
    return {"success": True, "message": f"Cleared {count} cached CO-PO mapping(s)."}

class Analyze6ARequest(BaseModel):
    cos: list[dict]
    indicators: list[dict]
    target_mapping: Optional[dict] = None

@app.post("/api/analyze-6a")
def api_analyze_6a(req: Analyze6ARequest):
    try:
        data = analyze_6a_matrix(req.cos, req.indicators, req.target_mapping)
        return {"success": True, "data": data}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e)}


class AssignmentRequest(BaseModel):
    topic: str; level: str; num: int; marks: int

@app.post("/api/generate-assignment")
def api_generate_assignment(req: AssignmentRequest):
    return {"success": True, "data": generate_assignment(req.topic, req.level, req.num, req.marks)}

class GradeRequest(BaseModel):
    text: str
    rubrics: list
    maxMarks: int
    question: str = ""


@app.post("/api/grade-upload")
async def api_grade_upload(
    rubrics: str = Form(...),
    maxMarks: int = Form(...),
    question: str = Form(""),
    file: UploadFile = File(...)
):
    import io
    text = ""
    contents = await file.read()
    fname = file.filename.lower()
    
    if fname.endswith('.pdf'):
        try:
            # 1. Try PyMuPDF (fitz) first - most robust for weird encodings
            import fitz
            doc = fitz.open(stream=contents, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
        except Exception:
            try:
                # 2. Try pdfplumber
                import pdfplumber
                with pdfplumber.open(io.BytesIO(contents)) as pdf:
                    text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            except Exception:
                try:
                    # 3. Fallback to PyPDF2
                    import PyPDF2
                    reader = PyPDF2.PdfReader(io.BytesIO(contents))
                    text = "\n".join(page.extract_text() or "" for page in reader.pages)
                except Exception as e:
                    raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")
    elif fname.endswith('.docx'):
        try:
            import docx
            doc = docx.Document(io.BytesIO(contents))
            text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read DOCX: {e}")
    elif fname.endswith('.doc'):
        raise HTTPException(status_code=400, detail="Old .doc format not supported. Please convert to .docx or .pdf")
    else:
        text = contents.decode('utf-8', errors='ignore')
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the uploaded file. Please check the file.")
    
    rubrics_list = [r.strip() for r in rubrics.split('\n') if r.strip()]
    return {"success": True, "data": grade_submission(text, rubrics_list, maxMarks, question)}

@app.post("/api/grade")
def api_grade(req: GradeRequest):
    return {"success": True, "data": grade_submission(req.text, req.rubrics, req.maxMarks, req.question)}

class RemedialRequest(BaseModel):
    student: str; weakCOs: list

@app.post("/api/remedial")
def api_remedial(req: RemedialRequest):
    return {"success": True, "data": generate_remedial_plan(req.student, req.weakCOs)}


# ─────────────────────────────────────────────
# ASSIGNMENT QUESTION EXTRACTOR (PDF/DOCX Upload)
# ─────────────────────────────────────────────
@app.post("/api/extract-assignment-questions")
async def api_extract_assignment_questions(
    file: UploadFile = File(...),
    cos_context: str = Form("")
):
    import io
    text = ""
    contents = await file.read()
    fname = file.filename.lower()

    if fname.endswith('.pdf'):
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(contents))
            text = "\n".join(page.extract_text() for page in reader.pages if page.extract_text())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")
    elif fname.endswith('.docx'):
        try:
            import docx
            doc = docx.Document(io.BytesIO(contents))
            text = "\n".join(para.text for para in doc.paragraphs if para.text.strip())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read DOCX: {e}")
    elif fname.endswith('.doc'):
        raise HTTPException(status_code=400, detail="Old .doc format not supported. Please convert to .docx or .pdf")
    else:
        text = contents.decode('utf-8', errors='ignore')

    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the file. Ensure it is not a scanned image PDF.")

    result = extract_assignment_questions(text, cos_context)
    return {"success": True, "data": result}


# ─────────────────────────────────────────────
# NEW AGENTIC AI ENDPOINTS
# ─────────────────────────────────────────────

class AgentChatRequest(BaseModel):
    message: str
    session_id: str = "default"

@app.post("/api/chat-agent")
def api_chat_agent(req: AgentChatRequest, db: Session = Depends(get_db)):
    """
    True ReAct tool-calling chatbot agent.
    Queries live DB data when asked about courses, attainment, or students.
    Maintains conversation memory per session_id.
    """
    # Build live DB context for the agent's tools
    courses = db.query(models.Course).all()
    cos = db.query(models.CourseOutcome).all()
    students = db.query(models.Student).all()

    db_context = {
        "courses": [course_to_dict(c) for c in courses],
        "cos": [co_to_dict(co) for co in cos],
        "students": [student_to_dict(s) for s in students],
        "attainment": {},  # will be populated per course on demand by tool
        "marks_summary": {}
    }

    reply = chat_with_advisor_agent(
        query=req.message,
        db_context=db_context,
        session_id=req.session_id
    )
    return {"reply": reply}


@app.delete("/api/chat-agent/memory/{session_id}")
def api_clear_chat_memory(session_id: str):
    """Clear conversation memory for a session (e.g., on page refresh)."""
    clear_memory(session_id)
    return {"success": True, "message": f"Memory cleared for session '{session_id}'"}


@app.get("/api/attainment-agent/{course_id}")
def api_attainment_agent(course_id: str, db: Session = Depends(get_db)):
    """
    Python-first CO attainment calculator with AI interpretation.
    Calculates attainment using the exact NBA formula, then has AI interpret
    the numbers and recommend corrective actions.
    """
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    students = db.query(models.Student).filter(models.Student.courseId == course_id).all()
    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == course_id).all()
    ia_questions = db.query(models.IAQuestion).filter(models.IAQuestion.courseId == course_id).all()
    marks_ia = db.query(models.MarksIA).filter(models.MarksIA.courseId == course_id).all()
    marks_mse = db.query(models.MarksMSE).filter(models.MarksMSE.courseId == course_id).all()
    marks_ese = db.query(models.MarksESE).filter(models.MarksESE.courseId == course_id).all()
    surveys = db.query(models.Survey).filter(models.Survey.courseId == course_id).all()
    po_mappings = db.query(models.PoMapping).filter(models.PoMapping.courseId == course_id).all()

    students_data = [student_to_dict(s) for s in students]
    ia_qs_data = [
        {"qNo": q.qNo, "coNo": q.coNo, "maxMarks": q.maxMarks, "assessmentNo": q.assessmentNo,
         "assessmentType": q.assessmentType}
        for q in ia_questions
    ]
    marks_ia_data = [{"prn": m.prn, "qNo": m.qNo, "assessmentNo": m.assessmentNo, "marks": m.marks} for m in marks_ia]
    marks_mse_data = [{"prn": m.prn, "qNo": m.qNo, "marks": m.marks} for m in marks_mse]
    marks_ese_data = [{"prn": m.prn, "qNo": m.qNo, "marks": m.marks} for m in marks_ese]
    surveys_data = [{"prn": s.prn, "co": s.co, "score": s.score} for s in surveys]
    pomap_data = [{"coNo": p.coNo, "po": p.po, "val": p.val} for p in po_mappings]
    cos_data = [co_to_dict(co) for co in cos]
    course_data = course_to_dict(course)

    # Step 1: Python calculation (deterministic, accurate: Direct + Indirect + Implicit PO)
    attainment = calculate_co_attainment_python(
        students=students_data,
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data,
        marks_mse=marks_mse_data,
        surveys=surveys_data,
        po_mappings=pomap_data
    )

    # Step 2: AI interpretation of the numbers
    interpretation = interpret_attainment(attainment, course.name)

    return {
        "success": True,
        "data": {
            "attainment": attainment,
            "interpretation": interpretation,
            "course": course_data
        }
    }


class NBAReportRequest(BaseModel):
    course_id: str

@app.post("/api/nba-report")
def api_nba_report(req: NBAReportRequest, db: Session = Depends(get_db)):
    """
    Generate a complete NBA course assessment report.
    Pulls all course data and generates a Markdown report ready for submission.
    """
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == req.course_id).all()
    po_mappings = db.query(models.PoMapping).filter(models.PoMapping.courseId == req.course_id).all()
    students = db.query(models.Student).filter(models.Student.courseId == req.course_id).all()
    ia_questions = db.query(models.IAQuestion).filter(models.IAQuestion.courseId == req.course_id).all()
    marks_ia = db.query(models.MarksIA).filter(models.MarksIA.courseId == req.course_id).all()
    marks_ese = db.query(models.MarksESE).filter(models.MarksESE.courseId == req.course_id).all()

    # Build CO-PO mapping dict
    copo_dict = {}
    for pm in po_mappings:
        co_key = f"CO{pm.coNo}"
        if co_key not in copo_dict:
            copo_dict[co_key] = {}
        copo_dict[co_key][pm.po] = pm.val

    # Calculate attainment
    cos_data = [co_to_dict(co) for co in cos]
    course_data = course_to_dict(course)
    ia_qs_data = [{"qNo": q.qNo, "coNo": q.coNo, "maxMarks": q.maxMarks, "assessmentNo": q.assessmentNo} for q in ia_questions]
    marks_ia_data = [{"prn": m.prn, "qNo": m.qNo, "assessmentNo": m.assessmentNo, "marks": m.marks} for m in marks_ia]
    marks_ese_data = [{"prn": m.prn, "qNo": m.qNo, "marks": m.marks} for m in marks_ese]

    attainment = calculate_co_attainment_python(
        students=[student_to_dict(s) for s in students],
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data
    )

    report_md = generate_nba_report(
        course=course_data,
        cos=cos_data,
        attainment=attainment,
        copo_mapping=copo_dict
    )

    return {"success": True, "data": {"report": report_md, "attainment": attainment}}


@app.post("/api/curriculum-gap-plan")
def api_curriculum_gap_plan(req: NBAReportRequest, db: Session = Depends(get_db)):
    """
    Generate NBA Table III: Content Beyond Syllabus & Innovative Gap-Bridging Action Plan (Paper 5 JEET 2026).
    """
    course = db.query(models.Course).filter(models.Course.id == req.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == req.course_id).all()
    po_mappings = db.query(models.PoMapping).filter(models.PoMapping.courseId == req.course_id).all()
    students = db.query(models.Student).filter(models.Student.courseId == req.course_id).all()
    ia_questions = db.query(models.IAQuestion).filter(models.IAQuestion.courseId == req.course_id).all()
    marks_ia = db.query(models.MarksIA).filter(models.MarksIA.courseId == req.course_id).all()
    marks_mse = db.query(models.MarksMSE).filter(models.MarksMSE.courseId == req.course_id).all()
    marks_ese = db.query(models.MarksESE).filter(models.MarksESE.courseId == req.course_id).all()
    surveys = db.query(models.Survey).filter(models.Survey.courseId == req.course_id).all()

    copo_dict = {}
    for pm in po_mappings:
        co_key = f"CO{pm.coNo}"
        if co_key not in copo_dict:
            copo_dict[co_key] = {}
        copo_dict[co_key][pm.po] = pm.val

    cos_data = [co_to_dict(co) for co in cos]
    course_data = course_to_dict(course)
    students_data = [student_to_dict(s) for s in students]
    ia_qs_data = [{"qNo": q.qNo, "coNo": q.coNo, "maxMarks": q.maxMarks, "assessmentNo": q.assessmentNo, "assessmentType": q.assessmentType} for q in ia_questions]
    marks_ia_data = [{"prn": m.prn, "qNo": m.qNo, "assessmentNo": m.assessmentNo, "marks": m.marks} for m in marks_ia]
    marks_mse_data = [{"prn": m.prn, "qNo": m.qNo, "marks": m.marks} for m in marks_mse]
    marks_ese_data = [{"prn": m.prn, "qNo": m.qNo, "marks": m.marks} for m in marks_ese]
    surveys_data = [{"prn": s.prn, "co": s.co, "score": s.score} for s in surveys]
    pomap_data = [{"coNo": p.coNo, "po": p.po, "val": p.val} for p in po_mappings]

    attainment = calculate_co_attainment_python(
        students=students_data,
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data,
        marks_mse=marks_mse_data,
        surveys=surveys_data,
        po_mappings=pomap_data
    )

    report_md = generate_curriculum_gap_plan(course.name, cos_data, copo_dict, attainment)
    return {"success": True, "data": {"report": report_md, "attainment": attainment}}


# ─────────────────────────────────────────────
# SERVE FRONTEND STATIC FILES
# ─────────────────────────────────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Middleware to disable caching on all HTML and JS files
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        path = request.url.path
        if path.endswith(('.html', '.js', '.css')) or path == '/':
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response

app.add_middleware(NoCacheMiddleware)

# Serve frontend files from the ../frontend directory
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
if os.path.isdir(FRONTEND_DIR):
    # Serve index/login page at root
    @app.get("/", include_in_schema=False)
    async def serve_root():
        index_path = os.path.join(FRONTEND_DIR, 'login.html')
        if os.path.exists(index_path):
            return FileResponse(index_path, media_type='text/html')
        return FileResponse(os.path.join(FRONTEND_DIR, 'index.html'), media_type='text/html')

    # Mount the entire frontend directory for static access
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


@app.get('/api/courses/{course_id}/pomapping')
def get_pomapping(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.PoMapping).filter(models.PoMapping.courseId == course_id).all()
    return [{'courseId': r.courseId, 'coNo': r.coNo, 'po': r.po, 'val': r.val, 'justification': r.justification} for r in rows]

@app.get('/api/courses/{course_id}/indicatormapping')
def get_indicatormapping(course_id: str, db: Session = Depends(get_db)):
    row = db.query(models.IndicatorMapping).filter(models.IndicatorMapping.courseId == course_id).first()
    if row:
        return {'courseId': row.courseId, 'mappingData': row.mappingData}
    return {}

@app.get('/api/courses/{course_id}/marks/ia')
def get_marks_ia(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksIA).filter(models.MarksIA.courseId == course_id).all()
    return rows

@app.get('/api/courses/{course_id}/marks/mse')
def get_marks_mse(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksMSE).filter(models.MarksMSE.courseId == course_id).all()
    return rows

@app.get('/api/courses/{course_id}/marks/ese')
def get_marks_ese(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.MarksESE).filter(models.MarksESE.courseId == course_id).all()
    return rows

@app.get('/api/courses/{course_id}/assignments')
def get_assignments(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Assignment).filter(models.Assignment.courseId == course_id).all()
    return rows

@app.get('/api/courses/{course_id}/surveys')
def get_course_surveys(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Survey).filter(models.Survey.courseId == course_id).all()
    return [{'courseId': r.courseId, 'prn': r.prn, 'coNo': r.co, 'score': r.score} for r in rows]

@app.get('/api/courses/{course_id}/remedial')
def get_course_remedial(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Remedial).filter(models.Remedial.courseId == course_id).all()
    return [{'courseId': r.courseId, 'prn': r.prn, 'remedialDone': r.remedialDone, 'retestScores': r.retestScores} for r in rows]

@app.post('/api/remedial/save')
def save_remedial(data: dict, db: Session = Depends(get_db)):
    # data is a list of remedial objects, but in api.js it might be a single object or list.
    # We will just accept it if it's hitting this endpoint. Let's make it generic.
    pass

@app.get('/api/courses/{course_id}/targets')
def get_course_targets(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.Target).filter(models.Target.courseId == course_id).all()
    return [{'courseId': r.courseId, 'assessId': r.assessId, **(r.targetData or {})} for r in rows]


# ── ACTION PLANS ──
class ActionPlanBody(BaseModel):
    courseId: str
    coNo: int
    targetAttainment: float
    actualAttainment: float
    gap: float
    actionProposed: str
    academicYear: Optional[str] = "2025-26"

@app.get("/api/courses/{course_id}/actionplans")
def get_action_plans(course_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.ActionPlan).filter(models.ActionPlan.courseId == course_id).all()
    return [{
        "id": r.id, "courseId": r.courseId, "coNo": r.coNo,
        "targetAttainment": r.targetAttainment, "actualAttainment": r.actualAttainment,
        "gap": r.gap, "actionProposed": r.actionProposed,
        "actionTaken": r.actionTaken, "academicYear": r.academicYear
    } for r in rows]

@app.post("/api/actionplans")
def save_action_plan(body: ActionPlanBody, db: Session = Depends(get_db)):
    plan = db.query(models.ActionPlan).filter(
        models.ActionPlan.courseId == body.courseId, 
        models.ActionPlan.coNo == body.coNo
    ).first()
    
    if plan:
        plan.targetAttainment = body.targetAttainment
        plan.actualAttainment = body.actualAttainment
        plan.gap = body.gap
        plan.actionProposed = body.actionProposed
        plan.academicYear = body.academicYear
    else:
        plan = models.ActionPlan(
            courseId=body.courseId, coNo=body.coNo,
            targetAttainment=body.targetAttainment,
            actualAttainment=body.actualAttainment,
            gap=body.gap, actionProposed=body.actionProposed,
            academicYear=body.academicYear
        )
        db.add(plan)
    db.commit()
    return {"success": True, "id": plan.id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
