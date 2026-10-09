import re

with open('backend/agents/ai_logic.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

target = "def generate_curriculum_gap_plan(course_name: str, cos: list, pomapping: dict, attainment_data: dict = None) -> str:"
replacement = "def generate_curriculum_gap_plan(course_name: str, cos: list, pomapping: dict, attainment_data: dict = None, historical_data: list = None) -> str:"
content = content.replace(target, replacement)

target_template_start = "ATTAINMENT DATA (if available):\n  {attainment_data}\n"
replacement_template_start = "ATTAINMENT DATA (if available):\n  {attainment_data}\n  \n  HISTORICAL DATA (Previous Academic Years):\n  {historical_data}\n"
content = content.replace(target_template_start, replacement_template_start)

target_invoke = "return chain.invoke({\n        \"course_name\": course_name,\n        \"cos\": cos,\n        \"pomapping\": pomapping,\n        \"attainment_data\": attainment_data\n    })"
replacement_invoke = "return chain.invoke({\n        \"course_name\": course_name,\n        \"cos\": cos,\n        \"pomapping\": pomapping,\n        \"attainment_data\": attainment_data,\n        \"historical_data\": historical_data\n    })"
content = content.replace(target_invoke, replacement_invoke)

with open('backend/agents/ai_logic.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated ai_logic.py for generate_curriculum_gap_plan")
