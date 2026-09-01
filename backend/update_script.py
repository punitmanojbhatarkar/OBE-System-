import json
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'directWeight: Optional[int] = 80; indirectWeight: Optional[int] = 20',
    'directWeight: Optional[int] = 80; indirectWeight: Optional[int] = 20\n    coThreshold: Optional[int] = 60\n    attainmentLevels: Optional[dict] = None'
)

content = content.replace(
    '"directWeight","indirectWeight"]:',
    '"directWeight","indirectWeight","coThreshold"]:'
)

content = content.replace(
    'if body.examScheme:\n        c.ia = body.examScheme.ia; c.mse = body.examScheme.mse; c.ese = body.examScheme.ese\n    db.commit()',
    'if body.examScheme:\n        c.ia = body.examScheme.ia; c.mse = body.examScheme.mse; c.ese = body.examScheme.ese\n    if body.attainmentLevels:\n        c.attLevel1 = body.attainmentLevels.get("1", c.attLevel1)\n        c.attLevel2 = body.attainmentLevels.get("2", c.attLevel2)\n        c.attLevel3 = body.attainmentLevels.get("3", c.attLevel3)\n    db.commit()'
)

content = content.replace(
    'matrix: list  # [{coNo, po, val}]',
    'matrix: list  # [{coNo, po, val, justification}]'
)

content = content.replace(
    'db.add(models.PoMapping(courseId=body.courseId, coNo=item["coNo"], po=item["po"], val=item["val"]))',
    'db.add(models.PoMapping(courseId=body.courseId, coNo=item["coNo"], po=item["po"], val=item["val"], justification=item.get("justification", "")))'
)

content = content.replace(
    'return [{"courseId":r.courseId,"coNo":r.coNo,"po":r.po,"val":r.val} for r in rows]',
    'return [{"courseId":r.courseId,"coNo":r.coNo,"po":r.po,"val":r.val,"justification":r.justification} for r in rows]'
)

content = content.replace(
    'return [{\'courseId\': r.courseId, \'coNo\': r.coNo, \'po\': r.po, \'val\': r.val} for r in rows]',
    'return [{\'courseId\': r.courseId, \'coNo\': r.coNo, \'po\': r.po, \'val\': r.val, \'justification\': r.justification} for r in rows]'
)

content = content.replace(
    '"examScheme": {"ia": c.ia, "mse": c.mse, "ese": c.ese},\n        "directWeight": c.directWeight,',
    '"examScheme": {"ia": c.ia, "mse": c.mse, "ese": c.ese},\n        "coThreshold": getattr(c, "coThreshold", 60),\n        "attainmentLevels": {1: getattr(c, "attLevel1", 65), 2: getattr(c, "attLevel2", 75), 3: getattr(c, "attLevel3", 85)},\n        "directWeight": c.directWeight,'
)

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\main.py', 'w', encoding='utf-8') as f:
    f.write(content)
