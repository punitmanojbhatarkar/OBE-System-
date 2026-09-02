import json
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\main.py', 'r', encoding='utf-8') as f:
    content = f.read()

api_code = '''
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
'''

content = content + '\\n' + api_code

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\main.py', 'w', encoding='utf-8') as f:
    f.write(content)
