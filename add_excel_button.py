import re

with open('frontend/faculty/attainment.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the select box and add the button next to it
select_pattern = re.compile(r'(<button id="calcBtn" class="btn btn-primary" onclick="window\.calculateAttainment\(\)">Calculate Attainment</button>)')
new_button = r'\1\n          <button id="exportBtn" class="btn btn-success" style="display:none;" onclick="exportExcel()">⬇ Export Excel</button>'

if select_pattern.search(content):
    content = select_pattern.sub(new_button, content)
    print("Added export button HTML")
else:
    # try another spot
    calc_btn_pattern = re.compile(r'(<button class="btn btn-primary" onclick="calculateAttainment\(\)">Calculate Attainment</button>)')
    if calc_btn_pattern.search(content):
        content = calc_btn_pattern.sub(r'\1\n          <button id="exportBtn" class="btn btn-success" style="display:none;" onclick="exportExcel()">⬇ Export Excel</button>', content)
        print("Added export button HTML (alt)")

# Find window.calculateAttainment or similar function to show the button
show_btn_script = '''
    async function exportExcel() {
      const courseId = document.getElementById('courseSelect').value;
      if (!courseId) return;
      try {
        const res = await window.apiFetch('/api/courses/'+courseId+'/attainment-server');
        const res2 = await fetch('http://127.0.0.1:8080/api/courses/'+courseId+'/export-excel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(res)
        });
        if(res2.ok) {
            const blob = await res2.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Attainment_${courseId}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } else {
            alert("Export failed");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to export.");
      }
    }
'''

if 'async function exportExcel' not in content:
    content = content.replace('</script>\n</body>', show_btn_script + '\n</script>\n</body>')
    print("Added export JS script")

# Also, in calculateAttainment, unhide the exportBtn
calc_func_pattern = re.compile(r'(function calculateAttainment\(\)\s*\{.*?const courseId = document\.getElementById\(\'courseSelect\'\)\.value;.*?if \(!courseId\) return alert\("Please select a course"\);)', re.DOTALL)
if calc_func_pattern.search(content):
    content = calc_func_pattern.sub(r'\1\n    document.getElementById("exportBtn").style.display = "inline-block";', content)
    print("Added unhide logic")


with open('frontend/faculty/attainment.html', 'w', encoding='utf-8') as f:
    f.write(content)
