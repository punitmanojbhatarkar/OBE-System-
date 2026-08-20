"""
Fix the CO-PO AI prompt in ai_logic.py to produce 100% correct NBA-standard mapping.
Based on thorough audit of official Applied Mathematics syllabus (2301259T).
"""

file_path = 'C:/Users/LOQ/OneDrive/Desktop/AI_OBE_System/backend/agents/ai_logic.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the full template string for auto_map_copo and replace it
start_marker = 'template = """You are an ULTRA-STRICT, conservative OBE curriculum auditor specifically evaluating for MITAOE\'s 11-PO System. Your job is to output a 100% accurate, precise, and realistic CO-PO correlation matrix.'
end_marker = '"""\n    prompt = PromptTemplate.from_template(template)\n    chain = prompt | llm\n    res = chain.invoke({\"cos\":'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx == -1:
    print("ERROR: Could not find template start marker!")
    exit(1)
if end_idx == -1:
    print("ERROR: Could not find template end marker!")
    exit(1)

print(f"Found template at positions {start_idx} to {end_idx}")

new_template = '''template = """You are an expert NBA OBE curriculum analyst for an Indian engineering college (MITAOE). Your task is to generate a 100% accurate CO-PO Correlation Matrix following official NBA GAPC V4.0 guidelines.

COURSE OUTCOMES (COs):
{cos}

PROGRAM SPECIFIC OUTCOMES (PSO) DEFINITIONS:
{pso_defs}

=== NBA OFFICIAL CORRELATION SCALE ===
A correlation value represents how much a CO contributes to achieving that PO/PSO:
- 3 (HIGH): The CO directly, substantially, and explicitly addresses the core intent of this PO. Reserved for the MOST CENTRAL and DIRECT relationships.
- 2 (MEDIUM): The CO moderately and clearly contributes to this PO, but is not its primary focus.
- 1 (LOW): The CO has a slight/indirect/tangential connection to this PO.
- 0 (NONE): No meaningful connection. USE THIS LIBERALLY. Do NOT invent connections.

=== STRICT PO-BY-PO RULES ===

PO1 (Engineering Knowledge - Apply math/science/engineering fundamentals):
- Assign 3 if the CO is FUNDAMENTALLY about applying core mathematics, statistics, or engineering science.
- Assign 2 if math/science is moderately involved.
- Almost never 0 for a math or science course.

PO2 (Problem Analysis - Analyze/formulate/identify complex engineering problems):
- Assign 3 ONLY if the CO explicitly involves ANALYZING data, FORMULATING models, or IDENTIFYING and SOLVING complex problems.
- Assign 2 if the CO involves structured analysis but not complete problem solving.
- Assign 1 if analysis is only implicit.
- Assign 0 if the CO is purely about applying known formulas/techniques without analytical thinking.

PO3 (Design/Development - Design solutions/systems/components):
- Assign >0 ONLY if the CO explicitly says "Design", "Develop", "Create", or "Build" a system or architecture.
- Pure mathematical analysis, data interpretation, or tool usage = 0.
- Implementing/using existing techniques is NOT design.

PO4 (Investigations - Research methods, experiments, data interpretation):
- Assign >0 ONLY if the CO involves hypothesis testing, experimental design, data collection/interpretation, or research methodology.
- Applying known statistical methods to pre-given data does NOT automatically qualify.
- Hypothesis testing (like z-test, chi-square) CAN be assigned 1 as it has investigative nature.

PO5 (Engineering Tool Usage - Modern tools, software, Python, MATLAB):
- Assign 3 ONLY if the CO EXPLICITLY mentions using a specific tool or software (e.g., Python, MATLAB, libraries).
- Assign 2 if tools are strongly implied as the primary medium.
- Assign 1 if tools are implied but not central.
- Assign 0 if the CO is purely theoretical with no tool mention.

PO6 (Engineer and The World - Societal, health, safety, legal, cultural impacts):
- Assign >0 ONLY if the CO explicitly addresses real-world societal impact, health, safety, legal, or cultural/ethical implications.
- Using data from "real-world datasets" does NOT count.
- Assign 0 for all purely technical/mathematical COs.

PO7 (Ethics - Professional ethics and values):
- Strictly 0 unless professional ethics, data ethics, or fairness is EXPLICITLY mentioned in the CO text.

PO8 (Teamwork - Individual and collaborative team work):
- Strictly 0 unless the CO explicitly mentions group work, team projects, or collaborative activities.

PO9 (Communication - Communicate effectively, present, document):
- Strictly 0 unless the CO explicitly mentions presenting, reporting, writing, or communicating results.

PO10 (Project Management and Finance - Management, cost, planning):
- Strictly 0 unless the CO explicitly mentions project management, scheduling, cost, or finance.

PO11 (Life-Long Learning - Adapt, learn independently, critical thinking):
- Assign 1-2 if the CO builds foundational skills (math, statistics, tools) that clearly support life-long and independent learning.
- Assign 2 if the CO explicitly promotes choosing/selecting appropriate methods independently.
- Assign 1 for general foundational learning.
- Assign 0 if the CO is too narrowly applied with no transferable skill.

=== PSO RULES ===
PSO scoring requires BOTH relevance AND significance:
- PSO1 (Domain-Specific Knowledge in Data Science & Analytics): Assign 3 if the CO is a CORE data science knowledge component (linear algebra, probability, statistics, ML). Assign 2 if relevant but indirect. Assign 1 if only tangentially related.
- PSO2 (Industry-Readiness through practical projects and tool proficiency): Assign 3 ONLY if the CO explicitly uses tools (Python) or builds practical/implementable models for real-world use. Assign 2 for model building/regression that has direct industry application. Assign 1 for theoretical foundations that support industry work.
- PSO3 (Research Aptitude and scientific reasoning): Assign 3 if the CO involves statistical inference, hypothesis testing, or research-level thinking. Assign 2 for advanced analysis with research application. Assign 1 for applied topics with slight research relevance.

=== IMPORTANT REMINDERS ===
- Be SPARSE. A typical CO maps strongly to only 2-4 POs. A matrix full of non-zeros is a RED FLAG.
- Do NOT reward a CO just because it is at a high Bloom's level (L5/L6). Bloom's level determines DEPTH, not breadth of PO mapping.
- Read each CO word-by-word. If a word like "Python", "Design", "teamwork" is not there, do not assign value for PO5, PO3, PO8.
- POs 6, 7, 8, 9, 10 should almost always be 0 for mathematics/data science courses unless explicitly mentioned.

JSON OUTPUT:
Output valid JSON ONLY. Provide exactly PO1 through PO11 and PSO1 through PSO3 for every CO.
{{
  "mapping": {{
    "1": {{"PO1": 3, "PO2": 2, "PO3": 0, "PO4": 0, "PO5": 0, "PO6": 0, "PO7": 0, "PO8": 0, "PO9": 0, "PO10": 0, "PO11": 1, "PSO1": 3, "PSO2": 1, "PSO3": 1}},
    "2": {{"PO1": 3, "PO2": 2, "PO3": 0, "PO4": 0, "PO5": 0, "PO6": 0, "PO7": 0, "PO8": 0, "PO9": 0, "PO10": 0, "PO11": 1, "PSO1": 3, "PSO2": 1, "PSO3": 2}}
  }}
}}
"""'''

content = content[:start_idx] + new_template + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("DONE! AI prompt rewritten successfully.")
