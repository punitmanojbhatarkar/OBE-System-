import json

# Update data.js
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\scripts\\data.js', 'r', encoding='utf-8') as f:
    data_content = f.read()

action_plan_data_code = '''
  const actionPlans = {
    byCourse(cid) { return get('obe_action_plans').filter(a => a.courseId === cid); },
    getPlan(cid, coNo) { return get('obe_action_plans').find(a => a.courseId === cid && a.coNo === parseInt(coNo)); },
    savePlan(plan) {
      let all = get('obe_action_plans');
      const idx = all.findIndex(a => a.courseId === plan.courseId && a.coNo === plan.coNo);
      if (idx >= 0) all[idx] = plan;
      else all.push(plan);
      set('obe_action_plans', all);
    }
  };
'''

if 'obe_action_plans' not in data_content:
    data_content = data_content.replace("    set(k, []);", "    set(k, []);\\n  if(!localStorage.getItem('obe_action_plans')) set('obe_action_plans', []);")
    data_content = data_content.replace('const DB = {', action_plan_data_code + '\\n  const DB = {\\n    actionPlans,')

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\scripts\\data.js', 'w', encoding='utf-8') as f:
    f.write(data_content)


# Update api.js
with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\scripts\\api.js', 'r', encoding='utf-8') as f:
    api_content = f.read()

action_plan_api_fetch = '''
      let allActionPlans = [];
      for (const c of courses) {
        try {
          const plans = await apiFetch(/api/courses//actionplans);
          allActionPlans = allActionPlans.concat(plans);
        } catch (err) {
          console.warn(Failed to fetch action plans for course :, err);
        }
      }
      localStorage.setItem('obe_action_plans', JSON.stringify(allActionPlans));
'''

action_plan_api_save = '''
  // ── Action Plans ──
  const _apSave = DB.actionPlans.savePlan.bind(DB.actionPlans);
  DB.actionPlans.savePlan = function(plan) {
    _apSave(plan);
    apiFetch('/api/actionplans', { method: 'POST', body: plan })
      .catch(e => console.warn('[API] action plan save failed', e));
  };
'''

if 'actionplans' not in api_content:
    api_content = api_content.replace("      overlay.msg('Loading students…');", action_plan_api_fetch + "\\n      overlay.msg('Loading students…');")
    api_content = api_content + '\\n' + action_plan_api_save

with open('C:\\Users\\LOQ\\OneDrive\\Desktop\\AI_OBE_System\\frontend\\scripts\\api.js', 'w', encoding='utf-8') as f:
    f.write(api_content)
