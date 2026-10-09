import re

with open('backend/main.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

target = '''    attainment = calculate_co_attainment_python(
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
    )'''

replacement = '''    attainment = calculate_co_attainment_python(
        students=[student_to_dict(s) for s in students],
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data
    )

    historical_records = db.query(models.HistoricalReport).filter(models.HistoricalReport.courseId == req.course_id).all()
    import json
    historical_data = [{"academicYear": h.academicYear, "reportData": json.loads(h.reportData)} for h in historical_records]

    report_md = generate_nba_report(
        course=course_data,
        cos=cos_data,
        attainment=attainment,
        copo_mapping=copo_dict,
        historical_data=historical_data
    )'''

if target in content:
    content = content.replace(target, replacement)
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully in api_nba_report")
else:
    print("Target not found for api_nba_report!")

target_gap = '''    attainment = calculate_co_attainment_python(
        students=[student_to_dict(s) for s in students],
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data
    )

    gap_plan_md = generate_curriculum_gap_plan(
        course=course_data,
        cos=cos_data,
        attainment=attainment,
        copo_mapping=copo_dict,
        surveys=survey_data
    )'''

replacement_gap = '''    attainment = calculate_co_attainment_python(
        students=[student_to_dict(s) for s in students],
        ia_questions=ia_qs_data,
        marks_ia=marks_ia_data,
        marks_ese=marks_ese_data,
        cos=cos_data,
        course=course_data
    )

    historical_records = db.query(models.HistoricalReport).filter(models.HistoricalReport.courseId == req.course_id).all()
    import json
    historical_data = [{"academicYear": h.academicYear, "reportData": json.loads(h.reportData)} for h in historical_records]

    gap_plan_md = generate_curriculum_gap_plan(
        course=course_data,
        cos=cos_data,
        attainment=attainment,
        copo_mapping=copo_dict,
        surveys=survey_data,
        historical_data=historical_data
    )'''

if target_gap in content:
    content = content.replace(target_gap, replacement_gap)
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced successfully in api_curriculum_gap_plan")
else:
    print("Target not found for api_curriculum_gap_plan!")

