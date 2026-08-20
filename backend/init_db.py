import json
from database import engine, SessionLocal
import models

# Drop all and recreate so new tables appear cleanly
models.Base.metadata.drop_all(bind=engine)
models.Base.metadata.create_all(bind=engine)

def seed_db():
    db = SessionLocal()

    # ── Config ──
    db.add(models.Config(
        id=1, academicYear="2025-26", aiEnabled=True, aiCallsUsed=0, maxAICalls=50,
        instituteVision="To be the most preferred Autonomous Technological University in the country, known for delivering quality engineering education to produce industry ready, society conscious, and research oriented engineers.",
        instituteMission="Providing quality technical education through well-qualified, dedicated faculty and state-of-the-art infrastructure; fostering values, ethics and social responsibility."
    ))

    # ── Departments ──
    departments = [
        models.Department(id="dept-ds",  name="Data Science",           code="DS",  hod="Dr. A. Mehta",       vision="To be a center of excellence in Data Science.",              mission="To foster innovation and problem-solving through data-centric approaches."),
        models.Department(id="dept-cs",  name="Computer Engineering",   code="CS",  hod="Dr. V. C. Wangikar", vision="To create globally competent computer professionals.",        mission="To empower students with robust computational skills and ethical practices."),
        models.Department(id="dept-ai",  name="AI & Machine Learning",  code="AI",  hod="Dr. R. Sharma",      vision="To lead the future of artificial intelligence research.",     mission="Pioneering intelligent solutions for future challenges."),
        models.Department(id="dept-it",  name="Information Technology", code="IT",  hod="Dr. P. Kulkarni",    vision="To innovate in IT solutions and services.",                   mission="Bridging the gap between technology and business needs."),
    ]
    db.add_all(departments)

    # ── Users ──
    users = [
        models.User(id="usr-admin", name="System Administrator", email="admin@mitaoe.ac.in",      password="admin123",   role="admin",   deptId=None,      avatar="A"),
        models.User(id="usr-vw",    name="Vaishali Wangikar",    email="vwangikar@mitaoe.ac.in",  password="faculty123", role="faculty", deptId="dept-cs", avatar="V"),
        models.User(id="usr-am",    name="Prof. A. Mehta",       email="ametha@mitaoe.ac.in",     password="faculty123", role="faculty", deptId="dept-ds", avatar="A"),
        models.User(id="usr-rs",    name="Prof. R. Sharma",      email="rsharma@mitaoe.ac.in",    password="faculty123", role="faculty", deptId="dept-ai", avatar="R"),
        models.User(id="usr-hod1",  name="Dr. V. C. Wangikar",  email="hod.cs@mitaoe.ac.in",     password="hod123",     role="hod",     deptId="dept-cs", avatar="H"),
        models.User(id="usr-hod2",  name="Dr. A. Mehta (HOD)",  email="hod.ds@mitaoe.ac.in",     password="hod123",     role="hod",     deptId="dept-ds", avatar="H"),
        models.User(id="stu-001",   name="Rakshe Veer Tushar",  email="student@mitaoe.ac.in",     password="student123", role="student", deptId="dept-cs"),
        models.User(id="stu-002",   name="Narote Sanket Satish",email="narote@student.mitaoe.ac.in", password="student123", role="student", deptId="dept-cs"),
        models.User(id="stu-004",   name="Om Sutar",            email="om.sutar@mitaoe.ac.in",    password="student123", role="student", deptId="dept-cs"),
    ]
    db.add_all(users)

    # ── Courses ──
    courses = [
        models.Course(
            id="crs-eda", code="230331T", name="Exploratory Data Analysis", shortName="EDA",
            deptId="dept-cs", facultyId="usr-vw", semester="V", year="2025-26",
            division="A", batch="A1, A2", klass="TY BTech",
            champion="Dr. V. C. Wangikar", champDate="2025-07-21",
            lecturesPerWeek=3, totalStudents=26,
            teachingPhilosophy="Foster Curiosity and Inquiry, Emphasize the Iterative Nature of EDA, Develop Critical Thinking Skills, Balance Theory with Practice, Promote Data Storytelling.",
            status="active", ia=30, mse=20, ese=50, attLevel1=65, attLevel2=75, attLevel3=85, directWeight=80, indirectWeight=20
        ),
        models.Course(
            id="crs-ml", code="230332T", name="Machine Learning", shortName="ML",
            deptId="dept-cs", facultyId="usr-vw", semester="V", year="2025-26",
            division="A", batch="A1", klass="TY BTech",
            champion="Dr. V. C. Wangikar", champDate="2025-07-21",
            lecturesPerWeek=3, totalStudents=26,
            teachingPhilosophy="Blend theory with hands-on ML implementation.",
            status="active", ia=30, mse=20, ese=50, attLevel1=65, attLevel2=75, attLevel3=85, directWeight=80, indirectWeight=20
        ),
        models.Course(
            id="crs-dw", code="230333T", name="Data Warehousing & Mining", shortName="DWM",
            deptId="dept-ds", facultyId="usr-am", semester="V", year="2025-26",
            division="A", batch="A1", klass="TY BTech",
            champion="Dr. A. Mehta", champDate="2025-07-21",
            lecturesPerWeek=3, totalStudents=26,
            teachingPhilosophy="Practical data engineering skills.",
            status="active", ia=30, mse=20, ese=50, attLevel1=65, attLevel2=75, attLevel3=85, directWeight=80, indirectWeight=20
        ),
    ]
    db.add_all(courses)

    # ── Course Outcomes ──
    cos = [
        # EDA
        models.CourseOutcome(id="co-1",    courseId="crs-eda", no=1, code="CO1", text="Select the efficient data warehouse architecture for the given case study.", bloomsLevel="L3", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-2",    courseId="crs-eda", no=2, code="CO2", text="Develop a data mart using different modeling techniques for given applications and present it in a group.", bloomsLevel="L3", assessedThrough="ia,ese"),
        models.CourseOutcome(id="co-3",    courseId="crs-eda", no=3, code="CO3", text="Analyze the prediction by hypothesis testing using data analysis tools.", bloomsLevel="L4", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-4",    courseId="crs-eda", no=4, code="CO4", text="Construct a model for providing predictions on given datasets by identifying trends and detecting outliers on real-time application using available tools and technology.", bloomsLevel="L4", assessedThrough="ia,mse,ese"),
        # ML
        models.CourseOutcome(id="co-ml-1", courseId="crs-ml",  no=1, code="CO1", text="Apply supervised learning algorithms to solve classification and regression problems.", bloomsLevel="L3", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-ml-2", courseId="crs-ml",  no=2, code="CO2", text="Implement unsupervised learning techniques for clustering and dimensionality reduction.", bloomsLevel="L3", assessedThrough="ia,ese"),
        models.CourseOutcome(id="co-ml-3", courseId="crs-ml",  no=3, code="CO3", text="Evaluate model performance using appropriate metrics and cross-validation.", bloomsLevel="L4", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-ml-4", courseId="crs-ml",  no=4, code="CO4", text="Design and implement neural network architectures for real-world applications.", bloomsLevel="L5", assessedThrough="ia,ese"),
        # DWM
        models.CourseOutcome(id="co-dw-1", courseId="crs-dw",  no=1, code="CO1", text="Understand data warehousing concepts and OLAP tools.", bloomsLevel="L2", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-dw-2", courseId="crs-dw",  no=2, code="CO2", text="Apply data mining techniques such as classification and association rule mining.", bloomsLevel="L3", assessedThrough="ia,ese"),
        models.CourseOutcome(id="co-dw-3", courseId="crs-dw",  no=3, code="CO3", text="Analyze clustering algorithms on large volume data.", bloomsLevel="L4", assessedThrough="ia,mse,ese"),
        models.CourseOutcome(id="co-dw-4", courseId="crs-dw",  no=4, code="CO4", text="Evaluate web mining and spatial mining applications.", bloomsLevel="L4", assessedThrough="ia,ese"),
    ]
    db.add_all(cos)

    # ── PO Mapping ──
    po_data = []
    for c_id in ["crs-eda", "crs-ml", "crs-dw"]:
        po_data.extend([
            (c_id, 1, "PO1", 2), (c_id, 1, "PO2", 3), (c_id, 1, "PO3", 3), (c_id, 1, "PO4", 1), (c_id, 1, "PO5", 1), (c_id, 1, "PO11", 1), (c_id, 1, "PSO1", 2), (c_id, 1, "PSO3", 1),
            (c_id, 2, "PO1", 2), (c_id, 2, "PO2", 3), (c_id, 2, "PO3", 3), (c_id, 2, "PO4", 1), (c_id, 2, "PO5", 3), (c_id, 2, "PO11", 1), (c_id, 2, "PSO1", 3), (c_id, 2, "PSO2", 1), (c_id, 2, "PSO3", 2),
            (c_id, 3, "PO1", 3), (c_id, 3, "PO2", 3), (c_id, 3, "PO3", 3), (c_id, 3, "PO4", 2), (c_id, 3, "PO5", 3), (c_id, 3, "PO7", 1), (c_id, 3, "PO11", 1), (c_id, 3, "PSO1", 3), (c_id, 3, "PSO2", 3), (c_id, 3, "PSO3", 3),
            (c_id, 4, "PO1", 3), (c_id, 4, "PO2", 3), (c_id, 4, "PO3", 3), (c_id, 4, "PO4", 2), (c_id, 4, "PO5", 3), (c_id, 4, "PO7", 1), (c_id, 4, "PO11", 1), (c_id, 4, "PSO1", 3), (c_id, 4, "PSO2", 3), (c_id, 4, "PSO3", 3),
        ])
    db.add_all([models.PoMapping(courseId=c, coNo=n, po=p, val=v) for c,n,p,v in po_data])

    # ── Students ──
    student_templates = [
        ("202201040001", "Rakshe Veer Tushar", 3, "slow"),
        ("202201040003", "Narote Sanket Satish", 8, "advanced"),
        ("202201040004", "Bolaj Samarth Hanmant", 7, "advanced"),
        ("202201040005", "Sarode Lokesh Vasudev", 6, "average"),
        ("202201040006", "Thorat Harshada Subhash", 7, "advanced"),
        ("202201040007", "Kulkarni Parth Dipak", 5, "average"),
        ("202201040008", "Pawar Aniket Suraj", 6, "average"),
        ("202201040009", "Maske Prashik Ghansham", 4, "average"),
        ("202201040010", "Om Sutar", 8, "advanced"),
        ("202201040011", "Vemula Ramani Bhumaiah", 7, "advanced"),
        ("202201040012", "Gite Abhijeet Shantilal", 5, "average"),
        ("202201040013", "Dasari Essak Mahesh", 6, "average"),
        ("202201040014", "Raut Krishna Bhimrao", 3, "slow"),
        ("202201040015", "Shinde Vaibhav Ajay", 7, "advanced"),
        ("202201040016", "Ghodake Vipul Vijaykumar", 5, "average"),
        ("202201040017", "Pendam Tejas Pradip", 8, "advanced"),
        ("202201040019", "Bingi Vidya Balganesh", 6, "average"),
        ("202201040020", "Divekar Swarup Arjun", 4, "average"),
        ("202201040021", "Amrik Bhadra", 7, "advanced"),
        ("202201040022", "Chavan Snehal Suraj", 5, "average"),
        ("202201040023", "Pande Aniruddha Pradip", 6, "average"),
        ("202201040024", "Popalghat Amol Santosh", 7, "advanced"),
        ("202201040025", "Lohkare Girish Gokul", 4, "average"),
        ("202201040026", "Darade Tejashri Krushna", 8, "advanced"),
        ("202201040027", "Jadhav Vaibhav Satish", 5, "average"),
        ("202201040029", "Sumit Kedar", 3, "slow"),
    ]
    students = []
    for c_id in ["crs-eda", "crs-ml", "crs-dw"]:
        for idx, (prn, name, score, ltype) in enumerate(student_templates):
            students.append(models.Student(id=f"{c_id}-s{idx+1:02d}", courseId=c_id, prn=prn, name=name, preSurveyScore=score, learnerType=ltype))
    db.add_all(students)

    # ── IA Questions ──
    ia_questions = []
    for c_id in ["crs-eda", "crs-ml", "crs-dw"]:
        ia_questions.extend([
            models.IAQuestion(courseId=c_id, assessmentType="ia",  assessmentNo=1, qNo=1, desc="Identify and justify appropriate architecture.", bloomsLevel="L5", coNo=1, maxMarks=3),
            models.IAQuestion(courseId=c_id, assessmentType="ia",  assessmentNo=1, qNo=2, desc="Apply dimensional modelling techniques.", bloomsLevel="L5", coNo=2, maxMarks=3),
            models.IAQuestion(courseId=c_id, assessmentType="mse", assessmentNo=1, qNo=1, desc="Explain OLAP operations with suitable examples.", bloomsLevel="L3", coNo=1, maxMarks=6),
            models.IAQuestion(courseId=c_id, assessmentType="mse", assessmentNo=1, qNo=2, desc="Apply hypothesis testing on given dataset.", bloomsLevel="L4", coNo=3, maxMarks=7),
            models.IAQuestion(courseId=c_id, assessmentType="mse", assessmentNo=1, qNo=3, desc="Describe types of data preprocessing techniques.", bloomsLevel="L2", coNo=3, maxMarks=7),
        ])
    db.add_all(ia_questions)

    # ── Marks ──
    marks_objects = []
    for c_id in ["crs-eda", "crs-ml", "crs-dw"]:
        for s_idx, (prn, name, _, _) in enumerate(student_templates):
            m1 = (s_idx % 3) + 1  # 1 to 3
            m2 = (s_idx % 3) + 1
            m3 = (s_idx % 4) + 4  # 4 to 7
            m4 = (s_idx % 4) + 4
            # IA (Q1: CO1, Q2: CO2)
            marks_objects.append(models.MarksIA(courseId=c_id, assessmentNo=1, qNo=1, prn=prn, marks=m1))
            marks_objects.append(models.MarksIA(courseId=c_id, assessmentNo=1, qNo=2, prn=prn, marks=m2))
            # MSE (Q1: CO1, Q2: CO3, Q3: CO4)
            marks_objects.append(models.MarksMSE(courseId=c_id, qNo=1, prn=prn, marks=m1*2))
            marks_objects.append(models.MarksMSE(courseId=c_id, qNo=2, prn=prn, marks=m3))
            marks_objects.append(models.MarksMSE(courseId=c_id, qNo=3, prn=prn, marks=m4))
            # ESE (Q1: CO1, Q2: CO2, Q3: CO3, Q4: CO4)
            marks_objects.append(models.MarksESE(courseId=c_id, qNo=1, prn=prn, marks=m1*3))
            marks_objects.append(models.MarksESE(courseId=c_id, qNo=2, prn=prn, marks=m2*3))
            marks_objects.append(models.MarksESE(courseId=c_id, qNo=3, prn=prn, marks=m3*2))
            marks_objects.append(models.MarksESE(courseId=c_id, qNo=4, prn=prn, marks=m4*2))
    db.add_all(marks_objects)

    # ── Assignments ──
    assignments = [
        models.Assignment(
            id="asgn-1", courseId="crs-eda", title="Data Warehouse Architecture & Dimensional Modelling",
            topic="Data Warehouse & Dimensional Modelling", level="L3", coNo=1, maxMarks=10,
            questions=json.dumps([
                {"qNo": 1, "text": "For CARGO shipper application, identify and justify appropriate Data Warehouse architecture. [5 Marks]", "coNo": 1, "marks": 5},
                {"qNo": 2, "text": "For CARGO shipper application, apply dimensional modelling: i) Identify 4 dimensions ii) Identify 2 Measures iii) Select type with justification iv) Draw the model [5 Marks]", "coNo": 2, "marks": 5}
            ]),
            createdAt="2025-08-01"
        ),
        models.Assignment(
            id="asgn-2", courseId="crs-eda", title="Hypothesis Testing & Regression Methods",
            topic="Hypothesis Testing & Regression", level="L4", coNo=3, maxMarks=10,
            questions=json.dumps([
                {"qNo": 1, "text": "Apply t-test to determine if there is a significant difference between two sample means. [5 Marks]", "coNo": 3, "marks": 5},
                {"qNo": 2, "text": "Build a linear regression model to predict housing prices. Report R², MSE, and interpret coefficients. [5 Marks]", "coNo": 4, "marks": 5}
            ]),
            createdAt="2025-08-15"
        ),
        models.Assignment(
            id="asgn-ml-1", courseId="crs-ml", title="Supervised Learning Algorithms Implementation",
            topic="Classification & Regression", level="L3", coNo=1, maxMarks=10,
            questions=json.dumps([
                {"qNo": 1, "text": "Implement Decision Tree Classifier on Iris Dataset and calculate accuracy, precision, recall. [5 Marks]", "coNo": 1, "marks": 5},
                {"qNo": 2, "text": "Implement K-Means clustering algorithm on customer segmentation data. [5 Marks]", "coNo": 2, "marks": 5}
            ]),
            createdAt="2025-08-10"
        ),
        models.Assignment(
            id="asgn-dw-1", courseId="crs-dw", title="Data Warehousing Schema Design",
            topic="OLAP & Schema Design", level="L2", coNo=1, maxMarks=10,
            questions=json.dumps([
                {"qNo": 1, "text": "Design Star Schema and Snowflake Schema for Retail E-commerce system. [5 Marks]", "coNo": 1, "marks": 5},
                {"qNo": 2, "text": "Apply Apriori Algorithm for Market Basket Analysis on given transaction data. [5 Marks]", "coNo": 2, "marks": 5}
            ]),
            createdAt="2025-08-12"
        ),
    ]
    db.add_all(assignments)

    # ── Survey Scores ──
    surveys = []
    for c_id in ["crs-eda", "crs-ml", "crs-dw"]:
        for prn, _, _, _ in student_templates:
            for co_no in range(1, 5):
                surveys.append(models.Survey(courseId=c_id, prn=prn, co=str(co_no), score=4))
    db.add_all(surveys)

    db.commit()
    db.close()
    print("Database fully seeded with ALL demo data for ALL courses!")

if __name__ == "__main__":
    seed_db()
