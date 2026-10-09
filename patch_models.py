with open('backend/models.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '    val = Column(Integer)\n    course = relationship("Course")',
    '    val = Column(Integer)\n    justification = Column(Text, nullable=True)\n    course = relationship("Course")'
)

with open('backend/models.py', 'w', encoding='utf-8') as f:
    f.write(content)
