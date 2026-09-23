import requests
url = 'http://127.0.0.1:8000/api/cos/saveall'
data = {
    'courseId': 'TEST3',
    'cos': [
        {'id': 'CO1', 'no': 1, 'code': 'CO1', 'text': 'My typed text', 'bloomsLevel': 'L3', 'assessedThrough': ['ia'], 'studentThreshold': None, 'levels': {'1': None, '2': None, '3': None}, 'surveyQuestion': None}
    ]
}
r = requests.post(url, json=data)
print('Save:', r.status_code, r.text)

from sqlalchemy import create_engine, text
engine = create_engine('sqlite:///backend/obe.db')
with engine.connect() as conn:
    res = list(conn.execute(text("SELECT * FROM course_outcomes WHERE courseId='TEST3'")))
    print('DB Count:', len(res))
    if len(res) > 0:
        print('DB Row:', res[0])
