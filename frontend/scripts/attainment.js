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

  /* ── Attainment level from % (NBA SAR Criterion 3 Standard) ── */
  function getLevelFromPct(pct, levels) {
    if (pct === null || pct === undefined) return null;
    const l3 = (levels && levels[3] !== undefined) ? Number(levels[3]) : 70;
    const l2 = (levels && levels[2] !== undefined) ? Number(levels[2]) : 60;
    const l1 = (levels && levels[1] !== undefined) ? Number(levels[1]) : 50;
    if (pct >= l3) return 3;
    if (pct >= l2) return 2;
    if (pct >= l1) return 1;
    return 0;
  }

  /* ── Level badge HTML ── */
  function levelBadge(level) {
    const classes = ['att-0','att-1','att-2','att-3'];
    const labels  = ['Not Attained','Level 1','Level 2','Level 3'];
    return `<span class="badge ${classes[level]}">${labels[level]}</span>`;
  }

  /* ── Get deduplicated active COs ── */
  function getCleanCOs(courseId) {
    const rawCOs = DB.cos.byCourse(courseId).filter(c => c && (c.text || c.code));
    const seen = new Set();
    const clean = rawCOs.filter(c => {
      const num = parseInt(c.no) || 1;
      if (seen.has(num)) return false;
      seen.add(num);
      return true;
    }).sort((a, b) => (a.no || 1) - (b.no || 1));
    if (!clean.length) {
      return [1, 2, 3, 4, 5, 6].map(n => ({
        id: `co-${courseId}-${n}`,
        courseId,
        no: n,
        code: `CO${n}`,
        text: `Course Outcome ${n}`,
        blooms: 'L3',
        bloomsLevel: 'L3',
        studentThreshold: 60
      }));
    }
    return clean;
  }

  /* ── Universal Marks Aggregator per Assessment Type ──
     Handles Question Blueprint Mapping AND Direct CO-Wise Marks Entry
  ── */
  function getMarksByTypeAndCO(courseId, type) {
    const assessments = DB.assessments.byCourse(courseId).filter(a => {
      const t = (a.type || '').toLowerCase();
      const cat = (a.category || '').toLowerCase();
      if (type === 'ia') return t === 'ia' || cat === 'ia';
      if (type === 'mse') return t === 'mse' || cat === 'mse';
      if (type === 'ese') return t === 'ese' || cat === 'ese';
      if (type === 'assignment' || type === 'ca') {
        return t === 'assignment' || t === 'ca' || cat === 'assignment' || cat === 'ca' || t === 'quiz' || t === 'project' || t === 'lab';
      }
      return t === type;
    });

    const allMarks = DB.marks.get(courseId);
    const students = DB.students.byCourse(courseId);
    const cos = getCleanCOs(courseId);

    const result = {};
    students.forEach(s => { result[s.prn] = {}; });

    assessments.forEach(asgn => {
      const maxTotal = parseFloat(asgn.maxMarks) || (type === 'mse' ? 30 : (type === 'ese' ? 60 : 20));
      const targetWeightage = parseFloat(asgn.weightage) || (type === 'mse' ? 30 : (type === 'ese' ? 60 : (type === 'ia' ? 20 : (type === 'ca' ? 25 : maxTotal))));
      const scaleFactor = (targetWeightage && maxTotal && maxTotal > 0) ? (targetWeightage / maxTotal) : 1.0;
      const hasQuestions = asgn.questions && asgn.questions.length > 0;

      // Determine applicable target COs for this assessment
      let targetCOs = cos;
      if (hasQuestions) {
        const qCoNos = new Set(asgn.questions.map(q => parseInt(q.coNo)).filter(Boolean));
        if (qCoNos.size > 0) {
          targetCOs = cos.filter(c => qCoNos.has(c.no));
        }
      } else if (asgn.coNos && asgn.coNos.length > 0) {
        const cSet = new Set(asgn.coNos.map(n => parseInt(n)));
        targetCOs = cos.filter(c => cSet.has(c.no));
      } else if (type === 'ia') {
        if (asgn.no === 1) targetCOs = cos.filter(c => c.no <= 2);
        else if (asgn.no === 2) targetCOs = cos.filter(c => c.no >= 3 && c.no <= 4);
        else targetCOs = cos.filter(c => c.no >= 5);
        if (!targetCOs.length) targetCOs = cos.slice(0, 2);
      } else if (type === 'mse') {
        targetCOs = cos.filter(c => c.no <= 3);
        if (!targetCOs.length) targetCOs = cos.slice(0, 3);
      }
      const coDirectMax = (maxTotal / (targetCOs.length || 1)) * scaleFactor;

      students.forEach(s => {
        targetCOs.forEach(co => {
          const coNo = co.no;
          if (!result[s.prn][coNo]) result[s.prn][coNo] = { earned: 0, max: 0, items: [] };

          if (hasQuestions) {
            const mappedQuestions = asgn.questions.filter(q => parseInt(q.coNo) === coNo);
            mappedQuestions.forEach(q => {
              const qMark = allMarks.find(m => m.prn === s.prn && m.assessId === asgn.id && m.qNo === q.qNo);
              const qMax = parseFloat(q.maxMarks || q.marks || 10);
              if (qMark && qMark.marks !== null && qMark.marks !== undefined) {
                const scaledEarned = (parseFloat(qMark.marks) || 0) * scaleFactor;
                const scaledMax = qMax * scaleFactor;
                result[s.prn][coNo].earned += scaledEarned;
                result[s.prn][coNo].max += scaledMax;
                result[s.prn][coNo].items.push({
                  title: `${asgn.title || 'Exam'} - Q${q.qNo}`,
                  rawEarned: parseFloat(qMark.marks) || 0,
                  rawMax: qMax,
                  scaledEarned,
                  scaledMax
                });
              }
            });
          } else {
            const directMark = allMarks.find(m => m.prn === s.prn && m.assessId === asgn.id && m.qNo === coNo);
            if (directMark && directMark.marks !== null && directMark.marks !== undefined) {
              const scaledEarned = (parseFloat(directMark.marks) || 0) * scaleFactor;
              const scaledMax = coDirectMax;
              result[s.prn][coNo].earned += scaledEarned;
              result[s.prn][coNo].max += scaledMax;
              result[s.prn][coNo].items.push({
                title: asgn.title || 'Assessment',
                rawEarned: parseFloat(directMark.marks) || 0,
                rawMax: maxTotal / (targetCOs.length || 1),
                scaledEarned,
                scaledMax
              });
            }
          }
        });
      });
    });

    return result;
  }

  function getIAMarksByCO(courseId) { return getMarksByTypeAndCO(courseId, 'ia'); }
  function getMSEMarksByCO(courseId) { return getMarksByTypeAndCO(courseId, 'mse'); }
  function getAssignMarksByCO(courseId) { return getMarksByTypeAndCO(courseId, 'assignment'); }
  function getESEMarksByCO(courseId) { return getMarksByTypeAndCO(courseId, 'ese'); }

  /* ── Calculate CO Direct Attainment ── */
  function calcCODirect(courseId, customOptions = {}) {
    const course = DB.courses.byId(courseId) || {};
    const cos = getCleanCOs(courseId);
    const students = DB.students.byCourse(courseId);
    const levels = customOptions.levels || course.attainmentLevels || { 1: 60, 2: 70, 3: 80 };

    if (!students.length) return [];

    const iaByPRN = getIAMarksByCO(courseId);
    const mseByPRN = getMSEMarksByCO(courseId);
    const caByPRN = getAssignMarksByCO(courseId);
    const eseByPRN = getESEMarksByCO(courseId);

    const cieWeight = parseFloat(course.directCieWeight) || 50;
    const eseWeight = parseFloat(course.directEseWeight) || 50;

    return cos.map(co => {
      const coNo = co.no;
      const coThreshold = (customOptions.threshold !== undefined && customOptions.threshold !== null)
        ? Number(customOptions.threshold)
        : ((co.studentThreshold !== undefined && co.studentThreshold !== null && co.studentThreshold !== '')
            ? Number(co.studentThreshold)
            : (course.passingThreshold ? Number(course.passingThreshold) : 60));

      const coLevels = {
        1: (co.levels && co.levels[1] !== undefined && co.levels[1] !== null) ? Number(co.levels[1]) : levels[1],
        2: (co.levels && co.levels[2] !== undefined && co.levels[2] !== null) ? Number(co.levels[2]) : levels[2],
        3: (co.levels && co.levels[3] !== undefined && co.levels[3] !== null) ? Number(co.levels[3]) : levels[3]
      };

      let iaTotal = 0, iaPassed = 0, iaEarnedSum = 0, iaMaxSum = 0;
      let mseTotal = 0, msePassed = 0, mseEarnedSum = 0, mseMaxSum = 0;
      let caTotal = 0, caPassed = 0, caEarnedSum = 0, caMaxSum = 0;
      let cieTotal = 0, ciePassed = 0, cieEarnedSum = 0, cieMaxSum = 0;
      let eseTotal = 0, esePassed = 0, eseEarnedSum = 0, eseMaxSum = 0;

      students.forEach(s => {
        const rem = DB.remedial.get(courseId, s.prn);
        const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null ? Number(rem.retestScores[coNo]) : null;
        const retestPassed = retestScore !== null && retestScore >= coThreshold;

        // 1. IA
        const ia = iaByPRN[s.prn]?.[coNo];
        if (ia && ia.max > 0) {
          iaTotal++;
          iaEarnedSum += ia.earned;
          iaMaxSum += ia.max;
          const pct = (ia.earned / ia.max) * 100;
          if (pct >= coThreshold || retestPassed) iaPassed++;
        }

        // 2. MSE
        const mse = mseByPRN[s.prn]?.[coNo];
        if (mse && mse.max > 0) {
          mseTotal++;
          mseEarnedSum += mse.earned;
          mseMaxSum += mse.max;
          const pct = (mse.earned / mse.max) * 100;
          if (pct >= coThreshold || retestPassed) msePassed++;
        }

        // 3. CA / Assignment
        const ca = caByPRN[s.prn]?.[coNo];
        if (ca && ca.max > 0) {
          caTotal++;
          caEarnedSum += ca.earned;
          caMaxSum += ca.max;
          const pct = (ca.earned / ca.max) * 100;
          if (pct >= coThreshold || retestPassed) caPassed++;
        }

        // 4. Combined CIE (All internals)
        const sCieEarned = (ia ? ia.earned : 0) + (mse ? mse.earned : 0) + (ca ? ca.earned : 0);
        const sCieMax = (ia ? ia.max : 0) + (mse ? mse.max : 0) + (ca ? ca.max : 0);
        if (sCieMax > 0) {
          cieTotal++;
          cieEarnedSum += sCieEarned;
          cieMaxSum += sCieMax;
          const sCiePct = (sCieEarned / sCieMax) * 100;
          if (sCiePct >= coThreshold || retestPassed) ciePassed++;
        }

        // 5. ESE
        const ese = eseByPRN[s.prn]?.[coNo];
        if (ese && ese.max > 0) {
          eseTotal++;
          eseEarnedSum += ese.earned;
          eseMaxSum += ese.max;
          const pct = (ese.earned / ese.max) * 100;
          if (pct >= coThreshold || retestPassed) esePassed++;
        }
      });

      // Calculate component percentages and NBA levels
      const iaPct = iaTotal > 0 ? Math.round((iaPassed / iaTotal) * 100) : null;
      const iaAvgScorePct = iaMaxSum > 0 ? parseFloat(((iaEarnedSum / iaMaxSum) * 100).toFixed(1)) : null;
      const iaLevel = iaPct !== null ? getLevelFromPct(iaPct, coLevels) : null;

      const msePct = mseTotal > 0 ? Math.round((msePassed / mseTotal) * 100) : null;
      const mseAvgScorePct = mseMaxSum > 0 ? parseFloat(((mseEarnedSum / mseMaxSum) * 100).toFixed(1)) : null;
      const mseLevel = msePct !== null ? getLevelFromPct(msePct, coLevels) : null;

      const caPct = caTotal > 0 ? Math.round((caPassed / caTotal) * 100) : null;
      const caAvgScorePct = caMaxSum > 0 ? parseFloat(((caEarnedSum / caMaxSum) * 100).toFixed(1)) : null;
      const caLevel = caPct !== null ? getLevelFromPct(caPct, coLevels) : null;

      const ciePct = cieTotal > 0 ? Math.round((ciePassed / cieTotal) * 100) : null;
      const cieAvgScorePct = cieMaxSum > 0 ? parseFloat(((cieEarnedSum / cieMaxSum) * 100).toFixed(1)) : null;
      const cieLevel = ciePct !== null ? getLevelFromPct(ciePct, coLevels) : null;

      const esePct = eseTotal > 0 ? Math.round((esePassed / eseTotal) * 100) : null;
      const eseAvgScorePct = eseMaxSum > 0 ? parseFloat(((eseEarnedSum / eseMaxSum) * 100).toFixed(1)) : null;
      const eseLevel = esePct !== null ? getLevelFromPct(esePct, coLevels) : null;

      // Direct Attainment Level (NBA Sheet 14A Formula)
      let directLevel = null;
      let isInterimOnly = false;
      let directFormulaExplanation = '';

      if (cieLevel !== null && eseLevel !== null) {
        const totalW = cieWeight + eseWeight;
        directLevel = parseFloat((((cieLevel * cieWeight) + (eseLevel * eseWeight)) / totalW).toFixed(2));
        directFormulaExplanation = `(${cieWeight}% × CIE Level ${cieLevel}) + (${eseWeight}% × ESE Level ${eseLevel}) = ${directLevel}`;
      } else if (cieLevel !== null) {
        directLevel = parseFloat(cieLevel.toFixed(2));
        isInterimOnly = true;
        directFormulaExplanation = `Interim CIE Level (${cieLevel}) — End-Semester Examination pending`;
      } else if (eseLevel !== null) {
        directLevel = parseFloat(eseLevel.toFixed(2));
        directFormulaExplanation = `Direct ESE Level (${eseLevel})`;
      }

      const validDirectPcts = [ciePct, esePct].filter(x => x !== null);
      const directPct = validDirectPcts.length ? Math.round(validDirectPcts.reduce((a, b) => a + b, 0) / validDirectPcts.length) : null;

      return {
        co,
        coNo,
        coCode: co.code,
        coText: co.text || `Course Outcome ${coNo}`,
        bloomsLevel: co.blooms || co.bloomsLevel || 'L3',
        targetScorePct: coThreshold,

        // IA
        iaTotal,
        iaPassed,
        iaPct,
        iaAvgScorePct,
        iaLevel,

        // MSE
        mseTotal,
        msePassed,
        msePct,
        mseAvgScorePct,
        mseLevel,

        // CA
        caTotal,
        caPassed,
        caPct,
        caAvgScorePct,
        caLevel,

        // CIE Combined
        cieTotal,
        ciePassed,
        ciePct,
        cieAvgScorePct,
        cieLevel,

        // ESE
        eseTotal,
        esePassed,
        esePct,
        eseAvgScorePct,
        eseLevel,

        // Direct
        isInterimOnly,
        directPct,
        directLevel,
        directFormulaExplanation
      };
    });
  }

  /* ── Get Student-by-Student Audit Breakdown for a specific CO ── */
  function getCOStudentBreakdown(courseId, coNo, customOptions = {}) {
    const course = DB.courses.byId(courseId) || {};
    const cos = getCleanCOs(courseId);
    const targetCO = cos.find(c => c.no === parseInt(coNo)) || { no: coNo, code: `CO${coNo}`, text: `Course Outcome ${coNo}` };
    const students = DB.students.byCourse(courseId);
    const levels = customOptions.levels || course.attainmentLevels || { 1: 60, 2: 70, 3: 80 };

    const coThreshold = (customOptions.threshold !== undefined && customOptions.threshold !== null)
      ? Number(customOptions.threshold)
      : ((targetCO.studentThreshold !== undefined && targetCO.studentThreshold !== null && targetCO.studentThreshold !== '')
          ? Number(targetCO.studentThreshold)
          : (course.passingThreshold ? Number(course.passingThreshold) : 60));

    const iaByPRN = getIAMarksByCO(courseId);
    const mseByPRN = getMSEMarksByCO(courseId);
    const caByPRN = getAssignMarksByCO(courseId);
    const eseByPRN = getESEMarksByCO(courseId);

    const studentLedger = [];
    let appearedCount = 0;
    let attainedCount = 0;
    let totalScoreSum = 0;
    let totalMaxSum = 0;

    students.forEach(s => {
      const ia = iaByPRN[s.prn]?.[coNo] || { earned: 0, max: 0, items: [] };
      const mse = mseByPRN[s.prn]?.[coNo] || { earned: 0, max: 0, items: [] };
      const ca = caByPRN[s.prn]?.[coNo] || { earned: 0, max: 0, items: [] };
      const ese = eseByPRN[s.prn]?.[coNo] || { earned: 0, max: 0, items: [] };

      const totalEarned = ia.earned + mse.earned + ca.earned + ese.earned;
      const totalMax = ia.max + mse.max + ca.max + ese.max;

      const rem = DB.remedial.get(courseId, s.prn);
      const retestScore = rem && rem.retestScores && rem.retestScores[coNo] !== undefined && rem.retestScores[coNo] !== null ? Number(rem.retestScores[coNo]) : null;
      const retestPassed = retestScore !== null && retestScore >= coThreshold;

      const hasAppeared = totalMax > 0;
      const pct = hasAppeared ? parseFloat(((totalEarned / totalMax) * 100).toFixed(1)) : null;
      const isAttained = hasAppeared && (pct >= coThreshold || retestPassed);

      if (hasAppeared) {
        appearedCount++;
        totalScoreSum += totalEarned;
        totalMaxSum += totalMax;
        if (isAttained) attainedCount++;
      }

      studentLedger.push({
        prn: s.prn,
        name: s.name,
        rollNo: s.rollNo || s.seatNo || s.prn.slice(-3),
        hasAppeared,
        ia: { earned: parseFloat(ia.earned.toFixed(1)), max: parseFloat(ia.max.toFixed(1)), pct: ia.max > 0 ? Math.round((ia.earned/ia.max)*100) : null },
        mse: { earned: parseFloat(mse.earned.toFixed(1)), max: parseFloat(mse.max.toFixed(1)), pct: mse.max > 0 ? Math.round((mse.earned/mse.max)*100) : null },
        ca: { earned: parseFloat(ca.earned.toFixed(1)), max: parseFloat(ca.max.toFixed(1)), pct: ca.max > 0 ? Math.round((ca.earned/ca.max)*100) : null },
        ese: { earned: parseFloat(ese.earned.toFixed(1)), max: parseFloat(ese.max.toFixed(1)), pct: ese.max > 0 ? Math.round((ese.earned/ese.max)*100) : null },
        totalEarned: parseFloat(totalEarned.toFixed(1)),
        totalMax: parseFloat(totalMax.toFixed(1)),
        scorePct: pct,
        retestScore,
        retestPassed,
        attained: isAttained,
        statusText: hasAppeared ? (isAttained ? `Attained (${pct}% ≥ ${coThreshold}%)` : `Not Met (${pct}% < ${coThreshold}%)`) : 'Not Appeared'
      });
    });

    const cohortAttainmentPct = appearedCount > 0 ? Math.round((attainedCount / appearedCount) * 100) : 0;
    const classAvgScorePct = totalMaxSum > 0 ? parseFloat(((totalScoreSum / totalMaxSum) * 100).toFixed(1)) : 0;
    const nbaLevel = getLevelFromPct(cohortAttainmentPct, levels);

    return {
      co: targetCO,
      coNo,
      coCode: targetCO.code,
      coText: targetCO.text || `Course Outcome ${coNo}`,
      coThreshold,
      totalStudents: students.length,
      appearedCount,
      attainedCount,
      cohortAttainmentPct,
      classAvgScorePct,
      totalScoreSum: parseFloat(totalScoreSum.toFixed(1)),
      totalMaxSum: parseFloat(totalMaxSum.toFixed(1)),
      nbaLevel,
      levels,
      students: studentLedger
    };
  }

  /* ── Calculate CO Indirect Attainment (Exit Survey) ── */
  function calcCOIndirect(courseId) {
    const course = DB.courses.byId(courseId) || {};
    const cos = getCleanCOs(courseId);
    const students = DB.students.byCourse(courseId);
    const levels = course.attainmentLevels || { 1: 65, 2: 75, 3: 85 };
    const maxScore = 5;

    return cos.map(co => {
      const coNo = co.no;
      const coThreshold = (co.studentThreshold !== undefined && co.studentThreshold !== null && co.studentThreshold !== '') ? Number(co.studentThreshold) : 60;
      const coLevels = {
        1: (co.levels && co.levels[1] !== undefined && co.levels[1] !== null) ? Number(co.levels[1]) : levels[1],
        2: (co.levels && co.levels[2] !== undefined && co.levels[2] !== null) ? Number(co.levels[2]) : levels[2],
        3: (co.levels && co.levels[3] !== undefined && co.levels[3] !== null) ? Number(co.levels[3]) : levels[3]
      };

      let count = 0, total = 0, sumScore = 0;
      students.forEach(s => {
        const score = DB.survey.getScore(courseId, s.prn, coNo);
        if (score !== null && score !== undefined && score !== '') {
          const num = parseFloat(score);
          if (!isNaN(num)) {
            total++;
            sumScore += num;
            if ((num / maxScore) * 100 >= coThreshold) count++;
          }
        }
      });

      const pct = total > 0 ? Math.round((count / total) * 100) : null;
      const avgScore = total > 0 ? Math.round((sumScore / total) * 20) : null; // out of 100%
      const level = pct !== null ? getLevelFromPct(pct, coLevels) : null;

      return {
        coNo,
        coCode: co.code,
        coText: co.text || `Course Outcome ${coNo}`,
        surveyAvgPct: pct !== null ? pct : avgScore,
        surveyPct: pct,
        indirectLevel: level !== null ? level : (avgScore !== null ? getLevelFromPct(avgScore, coLevels) : null)
      };
    });
  }

  /* ── Calculate Final CO Attainment (Direct + Indirect weighted) ── */
  function calcCOFinal(courseId, customOptions = {}) {
    const course = DB.courses.byId(courseId) || {};
    const directW = (course.directWeight || 80) / 100;
    const indirectW = (course.indirectWeight || 20) / 100;
    const targetCQI = parseFloat(course.targetLevel) || 2.0;

    const directData = calcCODirect(courseId, customOptions);
    const indirectData = calcCOIndirect(courseId);

    return directData.map((d, i) => {
      const ind = indirectData[i] || {};
      const dLvl = d.directLevel;
      const iLvl = ind.indirectLevel;

      let finalLevel = null;
      if (dLvl !== null || iLvl !== null) {
        const w1 = dLvl !== null ? dLvl * directW : 0;
        const w2 = iLvl !== null ? iLvl * indirectW : 0;
        const wt = (dLvl !== null ? directW : 0) + (iLvl !== null ? indirectW : 0);
        finalLevel = wt > 0 ? ((w1 + w2) / wt) : null;
      }

      return {
        ...d,
        coText: d.coText,
        bloomsLevel: d.bloomsLevel,
        targetScorePct: d.targetScorePct,
        surveyAvgPct: ind.surveyAvgPct,
        indirectLevel: iLvl,
        finalLevel: finalLevel !== null ? parseFloat(finalLevel.toFixed(2)) : null,
        attained: finalLevel !== null && finalLevel >= targetCQI,
        directWeight: course.directWeight || 80,
        indirectWeight: course.indirectWeight || 20,
      };
    });
  }

  /* ── Calculate PO Attainment ──
     For each PO: weighted sum of CO attainment × CO-PO mapping value
     PO_att = sum(CO_final_level × mapping_val) / sum(mapping_val)
  ── */
  function calcPOAttainment(courseId, customOptions = {}) {
    const finalCOs = calcCOFinal(courseId, customOptions);
    const levels   = DB.courses.byId(courseId)?.attainmentLevels || { 1:65, 2:75, 3:85 };

    const activePOs = (typeof DB !== 'undefined' && DB.getPOList) ? DB.getPOList() : PO_LIST;
    const activePSOs = (typeof DB !== 'undefined' && DB.getPSOList) ? DB.getPSOList() : PSO_LIST;
    const targetOutcomes = [...activePOs, ...activePSOs];

    const poResult = {};
    targetOutcomes.forEach(po => {
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
        score      : attainment !== null ? parseFloat(attainment.toFixed(2)) : 0,
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
     const activePOs = (typeof DB !== 'undefined' && DB.getPOList) ? DB.getPOList() : PO_LIST;
     const activePSOs = (typeof DB !== 'undefined' && DB.getPSOList) ? DB.getPSOList() : PSO_LIST;
     const targetOutcomes = [...activePOs, ...activePSOs];

     targetOutcomes.forEach(po => {
        let weightedSum=0, totalWeight=0;
        studentCOs.forEach(co => {
           const mapVal = DB.poMapping.getValue(courseId, co.coNo, po);
           if (mapVal > 0) {
              weightedSum += co.level * mapVal;
              totalWeight += mapVal;
           }
        });
        const attainment = totalWeight > 0 ? weightedSum/totalWeight : null;
        poResult[po] = {
           rawScore: attainment,
           score: attainment !== null ? parseFloat(attainment.toFixed(2)) : 0
        };
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
    getStudentTotals, getDashboardStats, getIAMarksByCO, getAssignMarksByCO, getAtRiskStudents,
    getCOStudentBreakdown,
  };
})();
