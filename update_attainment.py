import json

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\faculty\\attainment.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Update renderFinal to show Add Action Plan button and fetch targetPct from level 2
update_renderfinal = '''
  function renderFinal(finalData) {
    const tbody = document.getElementById('finalBody');
    tbody.innerHTML = '';
    const summary = document.getElementById('finalSummary');
    let attainedCount = 0;
    
    const courseId = document.getElementById('courseSelect').value;
    const course = DB.courses.byId(courseId);
    const levels = course.attainmentLevels || {1:65,2:75,3:85};

    finalData.forEach(d => {
      const attained = d.finalLevel !== null && d.finalLevel >= 2;
      if (attained) attainedCount++;
      
      const coLevels = d.co.levels || {};
      const targetPct = (coLevels[2] !== undefined && coLevels[2] !== null && coLevels[2] !== '') ? coLevels[2] : (levels[2] || 75);

      let actionPlanBtn = '';
      if (!attained) {
        const existingPlan = DB.actionPlans.getPlan(courseId, d.co.no);
        const btnText = existingPlan ? 'Edit Action Plan' : 'Add Action Plan';
        const btnClass = existingPlan ? 'btn-secondary' : 'btn-primary';
        actionPlanBtn = <button class="btn btn-sm " style="margin-left:8px;font-size:11px;padding:2px 6px;" onclick="openActionPlanModal('', , , )"></button>;
      }

      tbody.insertAdjacentHTML('beforeend', 
        <tr>
          <td><strong></strong></td>
          <td style="max-width:260px;font-size:12px"></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>);
    });
'''

# Replace renderFinal block up to "const course ="
import re
pattern = re.compile(r'  function renderFinal\(finalData\).*?const course = DB\.courses\.byId\(document\.getElementById\(\'courseSelect\'\)\.value\);', re.DOTALL)
content = pattern.sub(update_renderfinal + '\\n    // course is already defined above', content)


# Add global functions for action plan
action_plan_funcs = '''
  window.openActionPlanModal = function(coCode, coNo, targetAttainment, actualAttainment) {
    const courseId = document.getElementById('courseSelect').value;
    const plan = DB.actionPlans.getPlan(courseId, coNo) || { actionProposed: '', academicYear: '2025-26' };
    const gap = targetAttainment - actualAttainment;
    
    const html = 
      <div class="form-group">
        <label class="form-label">Target Level</label>
        <input type="text" class="form-control" value="2 (Target Pct: %)" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Actual Level</label>
        <input type="text" class="form-control" value="" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Gap</label>
        <input type="text" class="form-control" value="" disabled>
      </div>
      <div class="form-group">
        <label class="form-label">Academic Year</label>
        <input type="text" id="ap-year" class="form-control" value="">
      </div>
      <div class="form-group">
        <label class="form-label">Action Proposed (NBA Requirement)</label>
        <textarea id="ap-action" class="form-control" rows="4" placeholder="Describe the corrective actions, pedagogical changes, or extra sessions planned to improve attainment..."></textarea>
      </div>
      <div style="text-align:right; margin-top:16px;">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" onclick="saveActionPlan(, , )">Save Action Plan</button>
      </div>
    ;
    Modal.alert(Action Plan for , html, null);
  };

  window.saveActionPlan = function(coNo, target, actual) {
    const courseId = document.getElementById('courseSelect').value;
    const actionProposed = document.getElementById('ap-action').value.trim();
    const academicYear = document.getElementById('ap-year').value.trim();
    const gap = target - actual;

    if (!actionProposed) {
      Toast.warning('Action proposed is required by NBA.');
      return;
    }

    const plan = {
      courseId, coNo, targetAttainment: target, actualAttainment: actual,
      gap: gap > 0 ? gap : 0, actionProposed, academicYear
    };

    DB.actionPlans.savePlan(plan);
    Modal.close();
    Toast.success('Action Plan saved successfully!');
    calculate(); // Re-render to update the button text
  };
'''

content = content.replace('  function renderFinal(finalData) {', action_plan_funcs + '\\n  function renderFinal(finalData) {')

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\faculty\\attainment.html', 'w', encoding='utf-8') as f:
    f.write(content)
