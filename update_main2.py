import re

with open('backend/main.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

target = '''    report_md = generate_curriculum_gap_plan(course.name, cos_data, copo_dict, attainment)
    return {"success": True, "data": {"report": report_md, "attainment": attainment}}'''

replacement = '''    historical_records = db.query(models.HistoricalReport).filter(models.HistoricalReport.courseId == req.course_id).all()
    import json
    historical_data = [{"academicYear": h.academicYear, "reportData": json.loads(h.reportData)} for h in historical_records]

    report_md = generate_curriculum_gap_plan(course.name, cos_data, copo_dict, attainment, historical_data=historical_data)
    return {"success": True, "data": {"report": report_md, "attainment": attainment}}'''

if target in content:
    content = content.replace(target, replacement)
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated api_curriculum_gap_plan in main.py")
else:
    print("Target not found in main.py for api_curriculum_gap_plan")
