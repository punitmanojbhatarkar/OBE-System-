from sqlalchemy.orm import Session
from sqlalchemy import func
import models
import json

def get_level_from_pct(pct, levels):
    if pct >= levels.get("3", 85): return 3
    if pct >= levels.get("2", 75): return 2
    if pct >= levels.get("1", 65): return 1
    return 0

def calc_co_direct(course_id: str, db: Session):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        return []
    
    # Get attainment levels logic (assuming course.attainmentLevels might exist in a real DB or using defaults)
    levels = {"1": 65, "2": 75, "3": 85} # Default
    
    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == course_id).all()
    students = db.query(models.Student).filter(models.Student.courseId == course_id).all()
    
    if not students or not cos:
        return []
        
    result = []
    
    for co in cos:
        coNo = co.no
        # In a full impl, we'd fetch specific thresholds from CO object if they existed
        coThreshold = course.coThreshold if course.coThreshold else 60
        coLevels = levels
        
        iaStudents, iaTotal = 0, 0
        mseStudents, mseTotal = 0, 0
        cieStudents, cieTotal = 0, 0
        eseStu, eseTotal = 0, 0
        
        for s in students:
            cieEarned, cieMax = 0, 0
            
            # IA calculation for this student & CO
            ia_qs = db.query(models.IAQuestion).filter(
                models.IAQuestion.courseId == course_id,
                models.IAQuestion.assessmentType == 'ia',
                models.IAQuestion.coNo == coNo
            ).all()
            
            ia_earned, ia_max = 0, 0
            for q in ia_qs:
                m = db.query(models.MarksIA).filter(
                    models.MarksIA.courseId == course_id,
                    models.MarksIA.prn == s.prn,
                    models.MarksIA.assessmentNo == q.assessmentNo,
                    models.MarksIA.qNo == q.qNo
                ).first()
                if m:
                    ia_earned += (m.marks or 0)
                ia_max += (q.maxMarks or 0)
                
            if ia_max > 0:
                iaTotal += 1
                cieEarned += ia_earned
                cieMax += ia_max
                if (ia_earned / ia_max) * 100 >= coThreshold:
                    iaStudents += 1

            # MSE calculation
            mse_qs = db.query(models.IAQuestion).filter(
                models.IAQuestion.courseId == course_id,
                models.IAQuestion.assessmentType == 'mse',
                models.IAQuestion.coNo == coNo
            ).all()
            mse_earned, mse_max = 0, 0
            for q in mse_qs:
                m = db.query(models.MarksMSE).filter(
                    models.MarksMSE.courseId == course_id,
                    models.MarksMSE.prn == s.prn,
                    models.MarksMSE.qNo == q.qNo
                ).first()
                if m:
                    mse_earned += (m.marks or 0)
                mse_max += (q.maxMarks or 0)
                
            if mse_max > 0:
                mseTotal += 1
                cieEarned += mse_earned
                cieMax += mse_max
                if (mse_earned / mse_max) * 100 >= coThreshold:
                    mseStudents += 1
                    
            if cieMax > 0:
                cieTotal += 1
                if (cieEarned / cieMax) * 100 >= coThreshold:
                    cieStudents += 1
                    
            # ESE calculation
            ese_qs = db.query(models.IAQuestion).filter(
                models.IAQuestion.courseId == course_id,
                models.IAQuestion.assessmentType == 'ese',
                models.IAQuestion.coNo == coNo
            ).all()
            ese_earned, ese_max = 0, 0
            for q in ese_qs:
                m = db.query(models.MarksESE).filter(
                    models.MarksESE.courseId == course_id,
                    models.MarksESE.prn == s.prn,
                    models.MarksESE.qNo == q.qNo
                ).first()
                if m:
                    ese_earned += (m.marks or 0)
                ese_max += (q.maxMarks or 0)
                
            if ese_max > 0:
                eseTotal += 1
                if (ese_earned / ese_max) * 100 >= coThreshold:
                    eseStu += 1
                    
        # Calculate percentages
        iaPct = (iaStudents / iaTotal * 100) if iaTotal > 0 else None
        msePct = (mseStudents / mseTotal * 100) if mseTotal > 0 else None
        ciePct = (cieStudents / cieTotal * 100) if cieTotal > 0 else None
        cieLevel = get_level_from_pct(ciePct, coLevels) if ciePct is not None else None
        
        esePct = (eseStu / eseTotal * 100) if eseTotal > 0 else None
        eseLevel = get_level_from_pct(esePct, coLevels) if esePct is not None else None
        
        parts = [lvl for lvl in [cieLevel, eseLevel] if lvl is not None]
        avgDirect = sum(parts) / len(parts) if parts else None
        
        result.append({
            "coNo": coNo,
            "coCode": co.code,
            "iaPct": iaPct,
            "msePct": msePct,
            "ciePct": ciePct,
            "cieLevel": cieLevel,
            "esePct": esePct,
            "eseLevel": eseLevel,
            "directPct": ((ciePct or 0) + (esePct or 0)) / (len(parts) or 1) if parts else None,
            "directLevel": round(avgDirect) if avgDirect is not None else None
        })
        
    return result


def calc_co_indirect(course_id: str, db: Session):
    cos = db.query(models.CourseOutcome).filter(models.CourseOutcome.courseId == course_id).all()
    students = db.query(models.Student).filter(models.Student.courseId == course_id).all()
    
    levels = {"1": course.attLevel1 or 65, "2": course.attLevel2 or 75, "3": course.attLevel3 or 85} # Default
    maxScore = 5
    coThreshold = course.coThreshold if course.coThreshold else 60
    
    result = []
    for co in cos:
        count, total = 0, 0
        
        # Get all survey responses for this CO
        surveys = db.query(models.Survey).filter(
            models.Survey.courseId == course_id,
            models.Survey.co == str(co.no)
        ).all()
        
        for survey in surveys:
            if survey.score is not None:
                # Convert survey score (out of 5 typically) to percentage
                pct = (survey.score / maxScore) * 100
                if pct >= coThreshold:
                    count += 1
                total += 1
                
        surveyPct = (count / total * 100) if total > 0 else 0
        indirectLevel = get_level_from_pct(surveyPct, levels) if total > 0 else None
        
        result.append({
            "coNo": co.no,
            "coCode": co.code,
            "surveyPct": surveyPct if total > 0 else None,
            "indirectLevel": indirectLevel
        })
    return result


def calc_co_final(course_id: str, db: Session):
    directData = calc_co_direct(course_id, db)
    indirectData = calc_co_indirect(course_id, db)
    
    directW = 0.8
    indirectW = 0.2
    
    final_result = []
    for i, d in enumerate(directData):
        ind = indirectData[i] if i < len(indirectData) else {}
        dLvl = d.get("directLevel")
        iLvl = ind.get("indirectLevel")
        
        finalLevel = None
        if dLvl is not None or iLvl is not None:
            w1 = (dLvl or 0) * directW if dLvl is not None else 0
            w2 = (iLvl or 0) * indirectW if iLvl is not None else 0
            wt = (directW if dLvl is not None else 0) + (indirectW if iLvl is not None else 0)
            if wt > 0:
                finalLevel = round((w1 + w2) / wt)
                
        final_result.append({
            **d,
            "surveyPct": ind.get("surveyPct"),
            "indirectLevel": iLvl,
            "finalLevel": finalLevel,
            "directWeight": directW * 100,
            "indirectWeight": indirectW * 100
        })
    return final_result


def calc_po_attainment(course_id: str, db: Session):
    final_cos = calc_co_final(course_id, db)
    po_mapping_rows = db.query(models.PoMapping).filter(models.PoMapping.courseId == course_id).all()
    
    levels = {"1": 65, "2": 75, "3": 85} # Default
    ALL_POS = ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12', 'PSO1','PSO2','PSO3']
    
    po_result = {}
    for po in ALL_POS:
        weightedSum, totalWeight = 0, 0
        for co in final_cos:
            map_row = next((r for r in po_mapping_rows if r.coNo == co["coNo"] and r.po == po), None)
            mapVal = map_row.val if map_row and hasattr(map_row, 'val') and map_row.val else 0
            if mapVal > 0 and co.get('finalLevel') is not None:
                weightedSum += co['finalLevel'] * mapVal
                totalWeight += mapVal
                
        attainment = (weightedSum / totalWeight) if totalWeight > 0 else None
        
        po_result[po] = {
            "po": po,
            "weightedAvg": attainment,
            "level": get_level_from_pct((attainment / 3 * 100) if attainment is not None else 0, levels) if attainment is not None else None,
            "rawScore": attainment
        }
        
    return {"cos": final_cos, "pos": po_result}
