from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, Text, JSON, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)  # admin, faculty, hod, student
    deptId = Column(String, nullable=True)
    avatar = Column(String, nullable=True)

class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    code = Column(String)
    hod = Column(String, nullable=True)
    vision = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)


class CurriculumPattern(Base):
    __tablename__ = "curriculum_patterns"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)  # e.g., "2019 Pattern"
    year = Column(String)
    departmentId = Column(String, ForeignKey("departments.id"), nullable=True)
    department = relationship("Department")
    patternId = Column(String, ForeignKey("curriculum_patterns.id"), nullable=True)
    academicYear = Column(String, nullable=True)
    pattern = relationship("CurriculumPattern")

class ProgramOutcome(Base):
    __tablename__ = "program_outcomes"
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    code = Column(String)  # e.g., "PO1", "PSO1"
    description = Column(Text)
    type = Column(String)  # "PO" or "PSO"
    departmentId = Column(String, ForeignKey("departments.id"), nullable=True) # Null for standard POs
    patternId = Column(String, ForeignKey("curriculum_patterns.id", ondelete="CASCADE"), nullable=True)
    department = relationship("Department")
    patternId = Column(String, ForeignKey("curriculum_patterns.id"), nullable=True)
    academicYear = Column(String, nullable=True)
    pattern = relationship("CurriculumPattern")
    pattern = relationship("CurriculumPattern")

class Course(Base):

    __tablename__ = "courses"
    id = Column(String, primary_key=True, index=True)
    code = Column(String, index=True)
    name = Column(String)
    shortName = Column(String, nullable=True)
    deptId = Column(String, ForeignKey("departments.id"), nullable=True)
    facultyId = Column(String, ForeignKey("users.id"), nullable=True)
    semester = Column(String, nullable=True)
    year = Column(String, nullable=True)
    division = Column(String, nullable=True)
    batch = Column(String, nullable=True)
    klass = Column(String, nullable=True)   # "class" is reserved word
    champion = Column(String, nullable=True)
    champDate = Column(String, nullable=True)
    lecturesPerWeek = Column(Integer, nullable=True)
    totalStudents = Column(Integer, nullable=True)
    teachingPhilosophy = Column(Text, nullable=True)
    status = Column(String, default="active")
    # Exam scheme stored as JSON columns
    ia = Column(Integer, default=30)
    mse = Column(Integer, default=20)
    ese = Column(Integer, default=50)
    coThreshold = Column(Integer, default=60)
    attLevel1 = Column(Integer, default=65)
    attLevel2 = Column(Integer, default=75)
    attLevel3 = Column(Integer, default=85)
    directWeight = Column(Integer, default=80)
    indirectWeight = Column(Integer, default=20)
    faculty = relationship("User")
    department = relationship("Department")
    patternId = Column(String, ForeignKey("curriculum_patterns.id"), nullable=True)
    academicYear = Column(String, nullable=True)
    pattern = relationship("CurriculumPattern")

class CourseOutcome(Base):
    __tablename__ = "course_outcomes"
    id = Column(String, primary_key=True, index=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"))
    no = Column(Integer)
    code = Column(String)
    text = Column(Text, nullable=True)
    bloomsLevel = Column(String, nullable=True)
    assessedThrough = Column(String, nullable=True)  # comma-sep string
    course = relationship("Course")

class PoMapping(Base):
    __tablename__ = "po_mapping"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"))
    coNo = Column(Integer)
    po = Column(String)
    val = Column(Integer)
    course = relationship("Course")

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, index=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"))
    prn = Column(String, index=True)
    name = Column(String)
    preSurveyScore = Column(Integer, nullable=True)
    learnerType = Column(String, nullable=True)
    course = relationship("Course")
    
    __table_args__ = (UniqueConstraint('courseId', 'prn', name='_course_prn_uc'),)

class IAQuestion(Base):
    __tablename__ = "ia_questions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"))
    assessmentType = Column(String)  # ia, mse
    assessmentNo = Column(Integer)
    qNo = Column(Integer)
    desc = Column(Text)
    bloomsLevel = Column(String, nullable=True)
    coNo = Column(Integer)
    maxMarks = Column(Integer)

class MarksIA(Base):
    __tablename__ = "marks_ia"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String)
    prn = Column(String)
    assessmentNo = Column(Integer)
    qNo = Column(Integer)
    marks = Column(Float, default=0)
    
    __table_args__ = (ForeignKeyConstraint(['courseId', 'prn'], ['students.courseId', 'students.prn'], ondelete='CASCADE'),)

class MarksMSE(Base):
    __tablename__ = "marks_mse"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String)
    prn = Column(String)
    qNo = Column(Integer)
    marks = Column(Float, default=0)

    __table_args__ = (ForeignKeyConstraint(['courseId', 'prn'], ['students.courseId', 'students.prn'], ondelete='CASCADE'),)

class MarksESE(Base):
    __tablename__ = "marks_ese"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String)
    prn = Column(String)
    qNo = Column(Integer)
    marks = Column(Float, default=0)

    __table_args__ = (ForeignKeyConstraint(['courseId', 'prn'], ['students.courseId', 'students.prn'], ondelete='CASCADE'),)

class Survey(Base):
    __tablename__ = "survey"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String)
    prn = Column(String)
    co = Column(String)
    score = Column(Integer)

    __table_args__ = (ForeignKeyConstraint(['courseId', 'prn'], ['students.courseId', 'students.prn'], ondelete='CASCADE'),)

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(String, primary_key=True, index=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"))
    type = Column(String, default="assignment")          # assignment, ia, mse, ese, question_paper
    no = Column(Integer, default=1)
    title = Column(String)
    description = Column(Text, nullable=True)
    topic = Column(String, nullable=True)
    level = Column(String, nullable=True)
    dueDate = Column(String, nullable=True)
    rbtLevel = Column(String, nullable=True)
    coNo = Column(Integer, nullable=True)               # legacy single CO
    coNos = Column(Text, nullable=True)                 # JSON list of CO numbers
    maxMarks = Column(Integer, nullable=True)
    questions = Column(Text, nullable=True)             # JSON string
    rubrics = Column(Text, nullable=True)               # JSON string
    aiGenerated = Column(Boolean, default=False)
    createdAt = Column(String, nullable=True)

class Config(Base):
    __tablename__ = "config"
    id = Column(Integer, primary_key=True, default=1)
    academicYear = Column(String, default="2025-26")
    aiEnabled = Column(Boolean, default=True)
    aiModel = Column(String, nullable=True)
    aiApiKey = Column(String, nullable=True)
    aiCallsUsed = Column(Integer, default=0)
    maxAICalls = Column(Integer, default=50)
    instituteVision = Column(Text, nullable=True)
    instituteMission = Column(Text, nullable=True)
    attainmentDefaultLevels = Column(JSON, nullable=True)
    directWeight = Column(Integer, nullable=True)
    indirectWeight = Column(Integer, nullable=True)
    collegeFullName = Column(String, nullable=True)

class Syllabus(Base):
    __tablename__ = "syllabus"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    modules = Column(Text, nullable=True)   # JSON string
    books = Column(Text, nullable=True)     # JSON string

class IndicatorMapping(Base):
    __tablename__ = "indicator_mapping"
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    mappingData = Column(JSON, nullable=True)


class Remedial(Base):
    __tablename__ = 'remedial'
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey('courses.id', ondelete='CASCADE'))
    prn = Column(String)
    remedialDone = Column(Boolean, default=False)
    retestScores = Column(JSON, nullable=True)
    
    __table_args__ = (UniqueConstraint('courseId', 'prn', name='_remedial_course_prn_uc'),)

class Target(Base):
    __tablename__ = 'targets'
    id = Column(Integer, primary_key=True, autoincrement=True)
    courseId = Column(String, ForeignKey('courses.id', ondelete='CASCADE'))
    assessId = Column(String)
    targetData = Column(JSON, nullable=True)
    
    __table_args__ = (UniqueConstraint('courseId', 'assessId', name='_targets_course_assess_uc'),)

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, index=True)
    action = Column(String)
    details = Column(String)
    timestamp = Column(String)


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
