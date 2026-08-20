import os

file_path = 'C:/Users/LOQ/OneDrive/Desktop/AI_OBE_System/backend/agents/ai_logic.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "SCALING (STRICT BLOOM'S RULE):"
end_marker = "JSON OUTPUT:"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

new_rules = """CORRELATION SCALING (BASED ON CONTRIBUTION/RELEVANCE):
  - 3 (High): The CO directly and substantially addresses the core intent of the PO. (e.g., A mathematics CO in a math course gets a 3 for PO1).
  - 2 (Medium): The CO moderately addresses the PO.
  - 1 (Low): The CO only tangentially touches the PO.
  - 0: No meaningful connection. Avoid over-mapping! Do not map a CO to a PO unless there is a clear, explicit connection.
  
  SPECIFIC PO RULES:
  - PO1 (Engineering Knowledge): Core math, science, or engineering fundamentals. If the CO is fundamentally about learning/applying these concepts, it strongly maps (3).
  - PO2 (Problem Analysis): Mapping requires explicitly analyzing, formulating, or identifying complex problems.
  - PO3 (Design/Development): Only >0 if the CO explicitly involves "Design", "Develop", or "Create" architectures/systems. Pure math/analysis is 0 here.
  - PO4 (Investigations): Only >0 if "Research", "Investigate", or "Conduct Experiments".
  - PO5 (Modern Tools): Only >0 if modern tools/software (like Python, IDEs) are explicitly used or strongly implied.
  - PO6 (The Engineer and The World): 0 unless the CO explicitly addresses societal, health, safety, legal, or cultural impacts.
  - PO7 (Ethics): Strictly 0 unless ethics or professional values are explicitly mentioned.
  - PO8 (Team Work): Strictly 0 unless teamwork/group projects are explicitly mentioned.
  - PO9 (Communication): Strictly 0 unless writing/presenting/documenting is explicitly mentioned.
  - PO10 (Project Management): Strictly 0 unless finance, cost, or project management is mentioned.
  - PO11 (Life-Long Learning): 1-2 if it encourages foundational skills that enable independent learning.
  - PSOs: You MUST read the specific text definition of each PSO. 
    1. Relevance check: If the CO is NOT explicitly related to the PSO text, assign 0.
    2. Contribution check: Assign 3 ONLY if the CO heavily and directly targets the PSO's core domain. Assign 1 or 2 for moderate/slight relevance. Do NOT assign 3 to every PSO just because they are broadly in the same field.
  
  """

content = content[:start_idx] + new_rules + content[end_idx:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done!')
