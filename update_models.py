import json
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\models.py', 'r', encoding='utf-8') as f:
    content = f.read()

action_plan_code = '''
class ActionPlan(Base):
    __tablename__ = 'action_plans'
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey('courses.id', ondelete='CASCADE'))
    coNo = Column(Integer)
    targetAttainment = Column(Float)
    actualAttainment = Column(Float)
    gap = Column(Float)
    actionProposed = Column(Text)
    actionTaken = Column(Boolean, default=False)
    academicYear = Column(String)
'''

content = content + '\\n' + action_plan_code

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\backend\\models.py', 'w', encoding='utf-8') as f:
    f.write(content)
