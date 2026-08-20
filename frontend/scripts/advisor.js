/* ============================================================
   ADVISOR.JS — Smart OBE Health & Suggestion Engine
   Analyzes course setup, mappings, and data to provide actionable advice.
   ============================================================ */

const Advisor = (() => {

  // Heuristic to check if a course is likely a 1st year course
  function isFirstYearCourse(course) {
    if (!course) return false;
    const code = course.code ? course.code.toUpperCase() : '';
    // If it starts with '1' and has a few letters before it (e.g. CS101, FE101)
    if (/[A-Z]+1\d{2}/.test(code)) return true;
    if (course.year === '1' || course.year === 'First Year' || course.year === 'FY') return true;
    return false;
  }

  function runDiagnostics(courseId) {
    const issues = []; // { type: 'error' | 'warning' | 'info', title, description, actionUrl, actionText }

    const course = DB.courses.byId(courseId);
    if (!course) return issues;

    const students = DB.students.byCourse(courseId);
    const cos = DB.cos.byCourse(courseId).filter(c => c.text);
    const mappings = DB.poMapping.byCourse(courseId);
    const iaMarks = DB.marks.getIA(courseId);
    const mseMarks = DB.marks.getMSE(courseId);
    const eseMarks = DB.marks.getESE(courseId);
    const surveys = DB.survey.byCourse(courseId);
    const assignments = DB.assignments.byCourse(courseId);
    const cfg = DB.config.get();

    // 1. Enrollment Check
    if (students.length === 0) {
      issues.push({
        type: 'warning',
        title: 'No Students Enrolled',
        description: 'You cannot calculate attainment without students.',
        actionUrl: 'students.html',
        actionText: 'Manage Students'
      });
    }

    // 2. CO Definition & 1st Year Complexity
    if (cos.length === 0) {
      issues.push({
        type: 'error',
        title: 'Missing Course Outcomes',
        description: 'No Course Outcomes (COs) defined. You must define COs to begin.',
        actionUrl: 'outcomes.html',
        actionText: 'Setup COs'
      });
    } else {
      if (cos.length < 4) {
        issues.push({
          type: 'info',
          title: 'Few Course Outcomes',
          description: `Only ${cos.length} COs defined. Usually, 4-6 COs are recommended per course.`,
          actionUrl: 'outcomes.html',
          actionText: 'Review COs'
        });
      }

      // 1st year check
      if (isFirstYearCourse(course)) {
        const highLevelCOs = cos.filter(c => ['L4', 'L5', 'L6'].includes(c.bloomsLevel));
        if (highLevelCOs.length > 0) {
          issues.push({
            type: 'warning',
            title: '1st Year Bloom\'s Complexity',
            description: `This appears to be a 1st year course, but you have ${highLevelCOs.length} COs at L4/L5/L6. Foundational courses should typically focus on L1-L3.`,
            actionUrl: 'outcomes.html',
            actionText: 'Review Bloom\'s Levels'
          });
        }
      }
    }

    // 3. CO-PO Mapping Check
    if (cos.length > 0) {
      if (mappings.length === 0) {
        issues.push({
          type: 'error',
          title: 'Missing CO-PO Mapping',
          description: 'Course Outcomes are not mapped to any Program Outcomes.',
          actionUrl: 'co-po-map.html',
          actionText: 'Setup Mapping'
        });
      } else {
        const unmappedCOs = cos.filter(co => {
          const m = mappings.filter(x => x.coNo === co.no && x.val > 0);
          return m.length === 0;
        });
        if (unmappedCOs.length > 0) {
          issues.push({
            type: 'warning',
            title: 'Unmapped COs Detected',
            description: `${unmappedCOs.length} COs are not mapped to any PO/PSO.`,
            actionUrl: 'co-po-map.html',
            actionText: 'Review Mapping'
          });
        }
      }
    }

    // 4. Marks Data
    if (students.length > 0) {
      if (iaMarks.length === 0 && mseMarks.length === 0 && eseMarks.length === 0) {
        issues.push({
          type: 'warning',
          title: 'No Assessment Data',
          description: 'No IA, MSE, or ESE marks have been entered for enrolled students.',
          actionUrl: 'marks.html',
          actionText: 'Enter Marks'
        });
      } else if (iaMarks.length > 0 && eseMarks.length === 0) {
         issues.push({
          type: 'info',
          title: 'Missing ESE Marks',
          description: 'Internal marks are present, but ESE marks are missing. Ensure all assessments are recorded before generating final reports.',
          actionUrl: 'marks.html',
          actionText: 'Enter ESE Marks'
        });
      }
    }

    // 5. Survey Data
    if (students.length > 0 && surveys.length === 0) {
      issues.push({
        type: 'info',
        title: 'Missing Course Exit Survey',
        description: 'No survey feedback collected. Indirect attainment cannot be calculated.',
        actionUrl: 'attainment.html',
        actionText: 'View Attainment'
      });
    }

    // 6. Assignments Coverage
    if (cos.length > 0) {
      if (assignments.length === 0) {
        issues.push({
          type: 'info',
          title: 'No Assignments',
          description: 'Adding assignments linked to COs helps improve continuous evaluation.',
          actionUrl: 'assignments.html',
          actionText: 'Create Assignment'
        });
      }
    }

    // 7. Config & Weighting Imbalance
    const dW = cfg.directWeight || 80;
    const iW = cfg.indirectWeight || 20;
    if (dW + iW !== 100) {
      issues.push({
        type: 'warning',
        title: 'Weight Imbalance',
        description: `Direct (${dW}%) and Indirect (${iW}%) weights do not total 100%.`,
        actionUrl: '../admin/config.html',
        actionText: 'Contact Admin'
      });
    }

    // 8. Attainment Calibration (only if some marks exist)
    if (iaMarks.length > 0 || mseMarks.length > 0 || eseMarks.length > 0) {
      if (window.Attainment) {
        const direct = Attainment.calcCODirect(courseId);
        let totalVal = 0, count = 0;
        for (let k in direct) {
          if (direct[k] !== null) { totalVal += direct[k]; count++; }
        }
        if (count > 0) {
          const avg = totalVal / count;
          if (avg > 2.9) {
            issues.push({
              type: 'info',
              title: 'Attainment Very High',
              description: `Average direct attainment is ${avg.toFixed(2)}/3. Consider raising difficulty or thresholds next semester for continuous improvement.`,
              actionUrl: 'outcomes.html',
              actionText: 'Review Thresholds'
            });
          } else if (avg < 1.0) {
             issues.push({
              type: 'warning',
              title: 'Attainment Very Low',
              description: `Average direct attainment is ${avg.toFixed(2)}/3. Consider reviewing teaching methods, assessment difficulty, or planning remedial actions.`,
              actionUrl: 'attainment.html',
              actionText: 'Plan Remedial'
            });
          }
        }
      }
    }

    // Sort issues by severity (error > warning > info)
    const severityMap = { error: 0, warning: 1, info: 2 };
    issues.sort((a, b) => severityMap[a.type] - severityMap[b.type]);

    return issues;
  }

  function getGlobalDiagnostics(facultyId) {
    const courses = DB.courses.byFaculty(facultyId);
    let allIssues = [];
    courses.forEach(c => {
      const issues = runDiagnostics(c.id);
      issues.forEach(i => i.course = c); // Attach course context
      allIssues = allIssues.concat(issues);
    });
    // Sort globally
    const severityMap = { error: 0, warning: 1, info: 2 };
    allIssues.sort((a, b) => severityMap[a.type] - severityMap[b.type]);
    return allIssues;
  }

  function getDepartmentDiagnostics(deptId) {
    const courses = DB.courses.byDept(deptId);
    let allIssues = [];
    courses.forEach(c => {
      const issues = runDiagnostics(c.id);
      issues.forEach(i => i.course = c);
      allIssues = allIssues.concat(issues);
    });
    const severityMap = { error: 0, warning: 1, info: 2 };
    allIssues.sort((a, b) => severityMap[a.type] - severityMap[b.type]);
    return allIssues;
  }

  return { runDiagnostics, getGlobalDiagnostics, getDepartmentDiagnostics, isFirstYearCourse };

})();

window.Advisor = Advisor;
