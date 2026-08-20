/* ============================================================
   ATTAINMENT.JS — CO & PO Calculation Engine
   Matches exact formula from EDA_2025-26.xlsm (Sheet 14A)
   ============================================================ */

const Attainment = (() => {

  const PO_LIST  = ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12'];
  const PSO_LIST = ['PSO1','PSO2','PSO3'];
  const ALL_POS  = [...PO_LIST, ...PSO_LIST];

  /* ── Blooms level label ── */
  function bloomsLabel(level) {
    const map = { L1:'Remember',L2:'Understand',L3:'Apply',L4:'Analyze',L5:'Evaluate',L6:'Create' };
    return map[level] || level;
  }

  /* ── Attainment level from % ── */
  function getLevelFromPct(pct, levels) {
    // levels = {1: 65, 2: 75, 3: 85}
    if (pct >= (levels[3] || 85)) return 3;
    if (pct >= (levels[2] || 75)) return 2;
    if (pct >= (levels[1] || 65)) return 1;
    return 0;
  }

  /* ── Level badge HTML ── */
  function levelBadge(level) {
    const classes = ['att-0','att-1','att-2','att-3'];
    const labels  = ['Not Attained','Level 1','Level 2','Level 3'];
    return `<span class="badge ${classes[level]}">${labels[level]}</span>`;
  }

  /* ── Get all IA marks for a course, aggregated per student per CO ──
     Returns: { [prn]: { co1: totalMarks, co2: totalMarks, ... } }
  ── */
  function getIAMarksByCO(courseId) {
    const qStructs = DB.assessments.byCourse(courseId).filter(a=>a.type==='ia');
    const allMarks = DB.marks.get(courseId);
    const students = DB.students.byCourse(courseId);

    const result = {};
    students.forEach(s => { result[s.prn] = {}; });

    qStructs.forEach(struct => {
      (struct.questions||[]).forEach(q => {
        const coNo = q.coNo;
        students.forEach(s => {
          const m = allMarks.find(x=>x.prn===s.prn&&x.assessId===struct.id&&x.qNo===q.qNo);
          const v = m ? m.marks : 0;
          if (!result[s.prn][coNo]) result[s.prn][coNo] = { earned:0, max:0 };
          result[s.prn][coNo].earned += (parseFloat(v)||0);
          result[s.prn][coNo].max   += (parseFloat(q.marks)||0);
        });
      });
    });
    return result;
  }

  /* ── Get MSE marks aggregated by CO ── */
  function getMSEMarksByCO(courseId) {
    const qStructs = DB.assessments.byCourse(courseId).filter(a=>a.type==='mse');
    const allMarks = DB.marks.get(courseId);
    const students = DB.students.byCourse(courseId);

    const result = {};
    students.forEach(s => { result[s.prn] = {}; });

    qStructs.forEach(struct => {
      (struct.questions||[]).forEach(q => {
        const coNo = q.coNo;
        students.forEach(s => {
          const m = allMarks.find(x=>x.prn===s.prn&&x.assessId===struct.id&&x.qNo===q.qNo);
          const v = m ? m.marks : 0;
          if (!result[s.prn][coNo]) result[s.prn][coNo] = { earned:0, max:0 };
          result[s.prn][coNo].earned += (parseFloat(v)||0);
          result[s.prn][coNo].max   += (parseFloat(q.marks)||0);
        });
      });
    });
    return result;
  }

  /* ── Get Assignment marks aggregated by CO ── */
  function getAssignMarksByCO(courseId) {
    const asgns = DB.assessments.byCourse(courseId).filter(a=>a.type==='assignment');
    const allMarks = DB.marks.get(courseId);
    const students = DB.students.byCourse(courseId);

    const result = {};
    students.forEach(s => { result[s.prn] = {}; });

    asgns.forEach(asgn => {
      (asgn.questions || []).forEach(q => {
        const coNo = q.coNo;
        students.forEach(s => {
          const m = allMarks.find(x=>x.prn===s.prn&&x.assessId===asgn.id&&x.qNo===q.qNo);
          const v = m ? m.marks : 0;
          if (!result[s.prn][coNo]) result[s.prn][coNo] = { earned:0, max:0 };
          result[s.prn][coNo].earned += (parseFloat(v)||0);
          result[s.prn][coNo].max   += (parseFloat(q.marks) || 0);
        });
      });
    });
    return result;
  }

  /* ── Calculate CO Direct Attainment ──
     Formula (from Excel Sheet 14A):
     - For each CO, find students who scored ≥ threshold % of total marks
     - % students attaining = (count ≥ threshold / total students) × 100
     - Map that % to attainment level (1/2/3)
  ── */
  function calcCODirect(courseId) {
    const course   = DB.courses.byId(courseId);
    const cos      = DB.cos.byCourse(courseId).filter(c=>c.text);
    const students = DB.students.byCourse(courseId);
    const levels   = course.attainmentLevels || { 1:65, 2:75, 3:85 };

    if (!students.length) return [];

    const iaByPRN  = getIAMarksByCO(courseId);
    const mseByPRN = getMSEMarksByCO(courseId);
    const assignByPRN = getAssignMarksByCO(courseId);

    const result = cos.map(co => {
      const coNo = co.no;
      const coThreshold = (co.studentThreshold !== undefined && co.studentThreshold !== null && co.studentThreshold !== '') ? Number(co.studentThreshold) : 60;
      const coLevels = {
        1: (co.levels && co.levels[1] !== undefined && co.levels[1] !== null && co.levels[1] !== '') ? Number(co.levels[1]) : levels[1],
        2: (co.levels && co.levels[2] !== undefined && co.levels[2] !== null && co.levels[2] !== '') ? Number(co.levels[2]) : levels[2],
        3: (co.levels && co.levels[3] !== undefined && co.levels[3] !== null && co.levels[3] !== '') ? Number(co.levels[3]) : levels[3]
      };

      let iaStudents=0, iaTotal=0;
      let mseStudents=0, mseTotal=0;
      let cieStudents=0, cieTotal=0;

      students.forEach(s => {
        const rem = DB.remedial.get(courseId, s.prn);
        const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null && rem.retestScores[coNo] !== '' ? Number(rem.retestScores[coNo]) : null;
        const retestPassed = retestScore !== null && retestScore >= coThreshold;

        let cieEarned = 0, cieMax = 0;

        // IA contribution
        const ia = iaByPRN[s.prn]?.[coNo];
        if (ia && ia.max > 0) {
          iaTotal++;
          cieEarned += ia.earned;
          cieMax += ia.max;
          const pct = (ia.earned / ia.max) * 100;
          if (pct >= coThreshold || retestPassed) iaStudents++;
        }
        // MSE contribution
        const mse = mseByPRN[s.prn]?.[coNo];
        if (mse && mse.max > 0) {
          mseTotal++;
          cieEarned += mse.earned;
          cieMax += mse.max;
          const pct = (mse.earned / mse.max) * 100;
          if (pct >= coThreshold || retestPassed) mseStudents++;
        }
        // Assignment contribution
        const asgn = assignByPRN[s.prn]?.[coNo];
        if (asgn && asgn.max > 0) {
          cieEarned += asgn.earned;
          cieMax += asgn.max;
          // Note: We don't individually increment a 'students passing assignments' counter 
          // because it strictly combines into the overall CIE (Continuous Internal Eval)
        }
        
        // Combined CIE contribution
        if (cieMax > 0) {
          cieTotal++;
          const ciePctStudent = (cieEarned / cieMax) * 100;
          if (ciePctStudent >= coThreshold || retestPassed) cieStudents++;
        }
      });

      const iaPct  = iaTotal  > 0 ? (iaStudents / iaTotal) * 100   : null;
      const msePct = mseTotal > 0 ? (mseStudents / mseTotal) * 100  : null;
      
      // True Mathematical CIE Percentage (Combined Internal Evaluation)
      const ciePct = cieTotal > 0 ? (cieStudents / cieTotal) * 100 : null;

      const cieLevel = ciePct !== null ? getLevelFromPct(ciePct, coLevels) : null;

      // ESE
      const eseMarks = DB.marks.get(courseId);
      const eseByPRN = {};
      students.forEach(s => { eseByPRN[s.prn] = null; });
      // Simple: collect all ESE marks for this CO (based on question mapping)
      const eseQStructs = DB.assessments.byCourse(courseId).filter(a=>a.type==='ese');
      let eseStu=0, eseTotal=0;
      eseQStructs.forEach(struct => {
        (struct.questions||[]).filter(q=>q.coNo===coNo).forEach(q => {
          students.forEach(s => {
            const m = eseMarks.find(x=>x.prn===s.prn&&x.assessId===struct.id&&x.qNo===q.qNo);
            const v = m ? m.marks : 0;
            if (!eseByPRN[s.prn]) eseByPRN[s.prn] = { earned:0, max:0 };
            eseByPRN[s.prn].earned += (parseFloat(v)||0);
            eseByPRN[s.prn].max   += (parseFloat(q.marks)||0);
          });
        });
      });
      students.forEach(s => {
        const rem = DB.remedial.get(courseId, s.prn);
        const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null && rem.retestScores[coNo] !== '' ? Number(rem.retestScores[coNo]) : null;
        const retestPassed = retestScore !== null && retestScore >= coThreshold;

        const ese = eseByPRN[s.prn];
        if (ese && ese.max > 0) {
          eseTotal++;
          const pct = (ese.earned / ese.max) * 100;
          if (pct >= coThreshold || retestPassed) eseStu++;
        }
      });
      const esePct  = eseTotal > 0 ? (eseStu / eseTotal) * 100 : null;
      const eseLevel = esePct !== null ? getLevelFromPct(esePct, coLevels) : null;

      // Average attainment (direct)
      const parts = [cieLevel, eseLevel].filter(x=>x !== null);
      const avgDirect = parts.length ? parts.reduce((a,b)=>a+b,0)/parts.length : null;

      return {
        co, coNo, coCode: co.code,
        iaPct, msePct, ciePct, cieLevel,
        esePct, eseLevel,
        directPct : ciePct !== null || esePct !== null ? ((ciePct||0)+(esePct||0))/(([ciePct,esePct].filter(x=>x!==null).length)||1) : null,
        directLevel: avgDirect !== null ? Math.round(avgDirect) : null,
      };
    });
    return result;
  }

  /* ── Calculate CO Indirect Attainment (from Exit Survey) ──
     Formula: % students scoring ≥ 60% of max (5) per CO
  ── */
  function calcCOIndirect(courseId) {
    const course   = DB.courses.byId(courseId);
    const cos      = DB.cos.byCourse(courseId).filter(c=>c.text);
    const students = DB.students.byCourse(courseId);
    const levels   = course.attainmentLevels || { 1:65, 2:75, 3:85 };
    const maxScore  = 5;

    const result = cos.map(co => {
      const coNo = co.no;
      const coThreshold = (co.studentThreshold !== undefined && co.studentThreshold !== null && co.studentThreshold !== '') ? Number(co.studentThreshold) : 60;
      const coLevels = {
        1: (co.levels && co.levels[1] !== undefined && co.levels[1] !== null && co.levels[1] !== '') ? Number(co.levels[1]) : levels[1],
        2: (co.levels && co.levels[2] !== undefined && co.levels[2] !== null && co.levels[2] !== '') ? Number(co.levels[2]) : levels[2],
        3: (co.levels && co.levels[3] !== undefined && co.levels[3] !== null && co.levels[3] !== '') ? Number(co.levels[3]) : levels[3]
      };

      let count=0, total=0;
      students.forEach(s => {
        const rem = DB.remedial.get(courseId, s.prn);
        const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null && rem.retestScores[coNo] !== '' ? Number(rem.retestScores[coNo]) : null;
        const retestPassed = retestScore !== null && retestScore >= coThreshold;

        const score = DB.survey.getScore(courseId, s.prn, coNo);
        if (score !== null && score !== undefined) {
          total++;
          if (((score / maxScore) * 100 >= coThreshold) || retestPassed) count++;
        }
      });
      const pct   = total > 0 ? (count / total) * 100 : null;
      const level = pct !== null ? getLevelFromPct(pct, coLevels) : null;
      return { coNo, coCode: co.code, surveyPct: pct, indirectLevel: level };
    });
    return result;
  }

  /* ── Calculate Final CO Attainment (Direct + Indirect weighted) ── */
  function calcCOFinal(courseId) {
    const course    = DB.courses.byId(courseId);
    const directW   = (course.directWeight   || 80) / 100;
    const indirectW = (course.indirectWeight || 20) / 100;
    const levels    = course.attainmentLevels || { 1:65, 2:75, 3:85 };

    const directData   = calcCODirect(courseId);
    const indirectData = calcCOIndirect(courseId);

    return directData.map((d, i) => {
      const ind = indirectData[i] || {};
      const dLvl = d.directLevel   || 0;
      const iLvl = ind.indirectLevel || 0;

      let finalLevel = null;
      if (d.directLevel !== null || ind.indirectLevel !== null) {
        const w1 = d.directLevel !== null   ? dLvl * directW   : 0;
        const w2 = ind.indirectLevel !== null ? iLvl * indirectW : 0;
        const wt = (d.directLevel!==null?directW:0) + (ind.indirectLevel!==null?indirectW:0);
        finalLevel = wt > 0 ? Math.round((w1 + w2) / wt) : null;
      }

      return {
        ...d,
        surveyPct      : ind.surveyPct,
        indirectLevel  : ind.indirectLevel,
        finalLevel,
        directWeight   : course.directWeight  || 80,
        indirectWeight : course.indirectWeight || 20,
      };
    });
  }

  /* ── Calculate PO Attainment ──
     For each PO: weighted sum of CO attainment × CO-PO mapping value
     PO_att = sum(CO_final_level × mapping_val) / sum(mapping_val)
  ── */
  function calcPOAttainment(courseId) {
    const finalCOs = calcCOFinal(courseId);
    const levels   = DB.courses.byId(courseId)?.attainmentLevels || { 1:65, 2:75, 3:85 };

    const poResult = {};
    ALL_POS.forEach(po => {
      let weightedSum = 0, totalWeight = 0;
      finalCOs.forEach(co => {
        const mapVal = DB.poMapping.getValue(courseId, co.coNo, po);
        if (mapVal > 0 && co.finalLevel !== null) {
          weightedSum += co.finalLevel * mapVal;
          totalWeight += mapVal;
        }
      });
      const attainment = totalWeight > 0 ? weightedSum / totalWeight : null;
      poResult[po] = {
        po,
        weightedAvg: attainment,
        level      : attainment !== null ? getLevelFromPct((attainment / 3) * 100, levels) : null,
        rawScore   : attainment, // 0-3 scale
      };
    });
    return poResult;
  }

  /* ── Calculate Personal CO Attainment ── */
  function calcStudentCOAttainment(courseId, prn) {
     const ia = getIAMarksByCO(courseId)[prn] || {};
     const mse = getMSEMarksByCO(courseId)[prn] || {};
     const eseMarks = DB.marks.get(courseId).filter(m => m.prn === prn);
     const eseQStructs = DB.assessments.byCourse(courseId).filter(a=>a.type==='ese');
     const cos = DB.cos.byCourse(courseId).filter(c=>c.text);
     
     return cos.map(co => {
         let earned=0, max=0;
         if (ia[co.no]) { earned+=ia[co.no].earned; max+=ia[co.no].max; }
         if (mse[co.no]) { earned+=mse[co.no].earned; max+=mse[co.no].max; }
         eseQStructs.forEach(struct => {
            struct.questions.filter(q=>q.coNo===co.no).forEach(q => {
                const m = eseMarks.find(x => x.qNo===q.qNo);
                if (m) earned+=m.marks;
                max+=q.maxMarks;
            });
         });
         
         const pct = max > 0 ? (earned/max)*100 : 0;
         const course = DB.courses.byId(courseId) || {};
         const levels = course.attainmentLevels || { 1:65, 2:75, 3:85 };
         const level = getLevelFromPct(pct, levels);
         return { coNo: co.no, level };
     });
  }

  /* ── Calculate Personal PO Attainment ── */
  function calcStudentPOAttainment(courseId, prn) {
     const studentCOs = calcStudentCOAttainment(courseId, prn);
     const poResult = {};
     ALL_POS.forEach(po => {
        let weightedSum=0, totalWeight=0;
        studentCOs.forEach(co => {
           const mapVal = DB.poMapping.getValue(courseId, co.coNo, po);
           if (mapVal > 0) {
              weightedSum += co.level * mapVal;
              totalWeight += mapVal;
           }
        });
        const attainment = totalWeight > 0 ? weightedSum/totalWeight : null;
        poResult[po] = { rawScore: attainment };
     });
     return poResult;
  }

  /* ── Get student total marks per assessment ── */
  function getStudentTotals(courseId, type) {
    const students = DB.students.byCourse(courseId);
    const qStructs = DB.assessments.byCourse(courseId).filter(a=>a.type===type);
    const allMarks = DB.marks.get(courseId).filter(m => qStructs.some(a => a.id === m.assessId));

    const maxMarks = qStructs.reduce((sum, s) =>
      sum + (s.questions||[]).reduce((s2, q) => s2 + (parseFloat(q.marks)||0), 0), 0);

    return students.map(s => {
      const total = allMarks.filter(m => m.prn === s.prn)
                            .reduce((sum, m) => sum + (m.marks||0), 0);
      const pct   = maxMarks > 0 ? Math.round((total / maxMarks) * 100 * 10) / 10 : 0;
      return { ...s, total, maxMarks, pct, passed: pct >= 60 };
    });
  }

  /* ── Summary stats for dashboard ── */
  function getDashboardStats(facultyId) {
    const courses = DB.courses.byFaculty(facultyId);
    const stats = { totalCourses: courses.length, avgCO: 0, avgPO: 0, attained:0 };
    let coSum = 0, coCount = 0, poSum = 0, poCount = 0;

    courses.forEach(c => {
      const finals = calcCOFinal(c.id);
      finals.forEach(co => {
        if (co.finalLevel !== null) { coSum += co.finalLevel; coCount++; if(co.finalLevel>=2)stats.attained++; }
      });
      const poData = calcPOAttainment(c.id);
      Object.values(poData).forEach(po => {
        if (po.rawScore !== null) { poSum += po.rawScore; poCount++; }
      });
    });

    stats.avgCO = coCount > 0 ? Math.round((coSum / coCount) * 10) / 10 : 0;
    stats.avgPO = poCount > 0 ? Math.round((poSum / poCount) * 100) / 100 : 0;
    return stats;
  }

  /* ── Get students at risk (failing to meet threshold in any CO) ── */
  function getAtRiskStudents(courseId, threshold = 60) {
    const students = DB.students.byCourse(courseId);
    const cos = DB.cos.byCourse(courseId).filter(c=>c.text);
    if (!students.length || !cos.length) return [];

    const iaByPRN  = getIAMarksByCO(courseId);
    const mseByPRN = getMSEMarksByCO(courseId);
    const eseMarks = DB.marks.get(courseId);
    const eseQStructs = DB.assessments.byCourse(courseId).filter(a=>a.type==='ese');

    const result = [];

    students.forEach(s => {
      const weakCOs = [];
      cos.forEach(co => {
        const coNo = co.no;
        let earned = 0;
        let max = 0;

        // IA
        const ia = iaByPRN[s.prn]?.[coNo];
        if (ia && ia.max > 0) {
          earned += ia.earned;
          max += ia.max;
        }

        // MSE
        const mse = mseByPRN[s.prn]?.[coNo];
        if (mse && mse.max > 0) {
          earned += mse.earned;
          max += mse.max;
        }

        // ESE
        eseQStructs.forEach(struct => {
          struct.questions.filter(q => q.coNo === coNo).forEach(q => {
            const m = eseMarks.find(x => x.prn === s.prn && x.qNo === q.qNo);
            const v = m ? m.marks : 0;
            earned += v;
            max += q.maxMarks;
          });
        });

        if (max > 0) {
          const pct = (earned / max) * 100;
          const coThreshold = (co.studentThreshold !== undefined && co.studentThreshold !== null && co.studentThreshold !== '') ? Number(co.studentThreshold) : threshold;
          if (pct < coThreshold) {
            const rem = DB.remedial.get(courseId, s.prn);
            const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null && rem.retestScores[coNo] !== '' ? Number(rem.retestScores[coNo]) : null;
            const isResolved = retestScore !== null && retestScore >= coThreshold;

            weakCOs.push({
              no: coNo,
              code: co.code,
              pct: Math.round(pct),
              resolved: isResolved,
              retestScore: retestScore,
              remedialDone: rem ? !!rem.remedialDone : false
            });
          }
        }
      });

      if (weakCOs.length > 0) {
        result.push({
          student: s,
          weakCOs
        });
      }
    });

    return result;
  }

  return {
    PO_LIST, PSO_LIST, ALL_POS,
    bloomsLabel, getLevelFromPct, levelBadge,
    calcCODirect, calcCOIndirect, calcCOFinal, calcPOAttainment, calcStudentPOAttainment,
    getStudentTotals, getDashboardStats, getIAMarksByCO, getAtRiskStudents,
  };
})();
