/* ============================================================
   OBE SYSTEM â€” Data Layer (localStorage CRUD + Institutional OBE Data)
   All data operations go through this module.
   ============================================================ */

const COMPETENCY_INDICATORS = [{"po": "PO1", "comp_id": "1.1", "comp_text": "Demonstrate competence in mathematical modelling", "indicator": "Apply the knowledge of Computer Science and  Engineering"}, {"po": "PO1", "comp_id": "1.1", "comp_text": "Demonstrate competence in mathematical modelling", "indicator": "Apply the concepts of probability, statistics and queuing theory in modeling of computer-based system, data and network protocols"}, {"po": "PO1", "comp_id": "1.2", "comp_text": "Demonstrate competence in basic sciences", "indicator": "Apply laws of natural science to an engineering problem"}, {"po": "PO1", "comp_id": "1.3", "comp_text": "Demonstrate competence in engineering fundamentals", "indicator": "Apply engineering fundamentals"}, {"po": "PO1", "comp_id": "1.4", "comp_text": "Demonstrate competence in specialized engineering  knowledge to the program", "indicator": "Apply theory and principles of computer science and engineering to solve an engineering problem"}, {"po": "PO2", "comp_id": "2.1", "comp_text": "Demonstrate an ability to identify and formulate complex engineering problem", "indicator": "Evaluate problem statements and identifies objectives"}, {"po": "PO2", "comp_id": "2.1", "comp_text": "Demonstrate an ability to identify and formulate complex engineering problem", "indicator": "Identify processes/modules/algorithms of a computer-based system and parameters to solve a problem"}, {"po": "PO2", "comp_id": "2.1", "comp_text": "Demonstrate an ability to identify and formulate complex engineering problem", "indicator": "Identify mathematical algorithmic knowledge that applies to a given problem"}, {"po": "PO2", "comp_id": "2.2", "comp_text": "2.2 Demonstrate an ability to formulate a solution plan and methodology for an engineering problem", "indicator": "Reframe the computer-based system into interconnected subsystems"}, {"po": "PO2", "comp_id": "2.2", "comp_text": "2.2 Demonstrate an ability to formulate a solution plan and methodology for an engineering problem", "indicator": "Identify functionalities and computing resources."}, {"po": "PO2", "comp_id": "2.2", "comp_text": "2.2 Demonstrate an ability to formulate a solution plan and methodology for an engineering problem", "indicator": "Identify existing solution/methods to solve the problem, including forming justified approximations and assumptions"}, {"po": "PO2", "comp_id": "2.2", "comp_text": "2.2 Demonstrate an ability to formulate a solution plan and methodology for an engineering problem", "indicator": "Compare and contrast alternative solution/methods to select the best methods"}, {"po": "PO2", "comp_id": "2.2", "comp_text": "2.2 Demonstrate an ability to formulate a solution plan and methodology for an engineering problem", "indicator": "Compare and contrast alternative solution processes to select the best process."}, {"po": "PO2", "comp_id": "2.3", "comp_text": "2.3 Demonstrate an ability to formulate and interpret a model", "indicator": "Able to apply computer engineering principles to formulate modules of a system with required applicability and performance."}, {"po": "PO2", "comp_id": "2.3", "comp_text": "2.3 Demonstrate an ability to formulate and interpret a model", "indicator": "Identify design constraints for required performance criteria."}, {"po": "PO2", "comp_id": "2.4", "comp_text": "Demonstrate an ability to execute a solution process and analyze  results", "indicator": "Apply engineering mathematics to implement solution"}, {"po": "PO2", "comp_id": "2.4", "comp_text": "Demonstrate an ability to execute a solution process and analyze  results", "indicator": "Analyze and interpret the results using contemporary tools."}, {"po": "PO2", "comp_id": "2.4", "comp_text": "Demonstrate an ability to execute a solution process and analyze  results", "indicator": "Identify the limitations of the solution and sources/causes."}, {"po": "PO2", "comp_id": "2.4", "comp_text": "Demonstrate an ability to execute a solution process and analyze  results", "indicator": "Arrive at conclusions with respect to the objectives."}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Recognize that need analysis is key to good problem definition"}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Able to identify and document system requirements from stakeholders."}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Ability to review state of the art literature to synthesize requirements."}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Extract engineering requirements from relevant engineering codes and standards defined by ISO/IEC/IEEE."}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Explore and synthesize engineering requirements considering health, safety, risks, environment, cultural and societal issues"}, {"po": "PO3", "comp_id": "3.1", "comp_text": "Demonstrate an ability todefine a comples open ended problem in engineering terms", "indicator": "Determine design, objectives, functional requirements and arrive at specifications"}, {"po": "PO3", "comp_id": "3.2", "comp_text": "Demonstrate an ability to generate diverse set of alternative design solutions", "indicator": "Ability to explore design alternatives."}, {"po": "PO3", "comp_id": "3.2", "comp_text": "Demonstrate an ability to generate diverse set of alternative design solutions", "indicator": "Build models/prototypes to develop diverse set of design solutions"}, {"po": "PO3", "comp_id": "3.2", "comp_text": "Demonstrate an ability to generate diverse set of alternative design solutions", "indicator": "Identify suitable criteria for evaluation of alternate design solutions"}, {"po": "PO3", "comp_id": "3.3", "comp_text": "Demonstrate an ability to select an optimal design scheme for further development", "indicator": "Ability to perform systematic evaluation of the degree to which several design concepts meet the criteria."}, {"po": "PO3", "comp_id": "3.3", "comp_text": "Demonstrate an ability to select an optimal design scheme for further development", "indicator": "Consult with domain experts and stakeholders to select candidate engineering design solution for further development"}, {"po": "PO3", "comp_id": "3.4", "comp_text": "Demonstrate an ability to advance an engineering design to a defined end state", "indicator": "Refine a conceptual design into a detailed design within the existing constraints (of the resources)"}, {"po": "PO3", "comp_id": "3.4", "comp_text": "Demonstrate an ability to advance an engineering design to a defined end state", "indicator": "Generate information through appropriate tests to improve or revise design"}, {"po": "PO4", "comp_id": "4.1", "comp_text": "Demonstrate an ability to conduct investigations of a technical issues consistant with their level of knowledge and understanding", "indicator": "Define a problem for purpose of investigation, its scope and importance"}, {"po": "PO4", "comp_id": "4.1", "comp_text": "Demonstrate an ability to conduct investigations of a technical issues consistant with their level of knowledge and understanding", "indicator": "Able to choose appropriate procedure/algorithm, dataset and test cases"}, {"po": "PO4", "comp_id": "4.1", "comp_text": "Demonstrate an ability to conduct investigations of a technical issues consistant with their level of knowledge and understanding", "indicator": "Apply appropriate hardware/software tools to conduct the experiment"}, {"po": "PO4", "comp_id": "4.2", "comp_text": "Demonstrate an ability to design experiments to solve open ended problem", "indicator": "Establish a relationship between measured data and underlying physical principles"}, {"po": "PO4", "comp_id": "4.2", "comp_text": "Demonstrate an ability to design experiments to solve open ended problem", "indicator": "Understand the importance of statistical design of experiments and choose an appropriate experimental design plan based on the study objectives"}, {"po": "PO4", "comp_id": "4.2", "comp_text": "Demonstrate an ability to design experiments to solve open ended problem", "indicator": "Use appropriate procedures, tools and techniques to collect and analyze data"}, {"po": "PO4", "comp_id": "4.3", "comp_text": "Demonstrate an ability to analyze data and reach a valid conclusion", "indicator": "Critically analyze data for trends and correlations, stating possible errors and limitations"}, {"po": "PO4", "comp_id": "4.3", "comp_text": "Demonstrate an ability to analyze data and reach a valid conclusion", "indicator": "Represent data (in tabular and/or graphical forms) so as to facilitate analysis and explanation of the data, and drawing of conclusions"}, {"po": "PO4", "comp_id": "4.3", "comp_text": "Demonstrate an ability to analyze data and reach a valid conclusion", "indicator": "Synthesize information and knowledge about the problem from the raw data to reach appropriate conclusions"}, {"po": "PO5", "comp_id": "5.1", "comp_text": "Demonstrate an ability to identify/create modern engineering tools, techniques and resources", "indicator": "Identify modern engineering tools techniques and resources for engineering activities"}, {"po": "PO5", "comp_id": "5.1", "comp_text": "Demonstrate an ability to identify/create modern engineering tools, techniques and resources", "indicator": "Create/adapt/modify/extend tools and techniques to solve engineering problems"}, {"po": "PO5", "comp_id": "5.2", "comp_text": "Demonstrate an ability to select and apply disciplinespecific tools, techniques and resources", "indicator": "Identify the strengths and limitations of tools for (i) acquiring information (ii) modeling and simulating (iii) monitoring system performance, and (iv) creating engineering designs"}, {"po": "PO5", "comp_id": "5.2", "comp_text": "Demonstrate an ability to select and apply disciplinespecific tools, techniques and resources", "indicator": "Demonstrate proficiency in using discipline specific tools"}, {"po": "PO5", "comp_id": "5.3", "comp_text": "Demonstrate an ability to evaluate the suitability and limitations of tools used to slve an engineering problem", "indicator": "Discuss limitations and validate tools, techniques and resources"}, {"po": "PO5", "comp_id": "5.3", "comp_text": "Demonstrate an ability to evaluate the suitability and limitations of tools used to slve an engineering problem", "indicator": "Verify the credibility of results from tool use with reference to the accuracy and limitations, and the assumptions inherent in their use."}, {"po": "PO6", "comp_id": "6.1", "comp_text": "Demonstrate an ability to describe engineering roles in a broader context, pertaining to environment, health, safety, legal and public welfare.", "indicator": "Identify and describe various engineering roles; particularly as pertains to protection of the public and public interest at global, regional and local level."}, {"po": "PO6", "comp_id": "6.2", "comp_text": "Demonstrate an understanding of professional engineering regulations, legislation and standards", "indicator": "Interpret legislation, regulations, codes, and standards relevant to professional engineering practice and explain its contribution to the protection of the public."}, {"po": "PO7", "comp_id": "7.1", "comp_text": "Demonstrate an understanding of the impact of engineering and industrial practices on social, environmental and in economic contexts.", "indicator": "Identify risks/impacts in the life-cycle of an engineering product or activity"}, {"po": "PO7", "comp_id": "7.1", "comp_text": "Demonstrate an understanding of the impact of engineering and industrial practices on social, environmental and in economic contexts.", "indicator": "Understand the relationship between the technical, socioeconomic and environmental dimensions of sustainability"}, {"po": "PO7", "comp_id": "7.2", "comp_text": "Demonstratr an ability to apply principles of sustainable design and development", "indicator": "Describe management techniques for sustainable development"}, {"po": "PO7", "comp_id": "7.2", "comp_text": "Demonstratr an ability to apply principles of sustainable design and development", "indicator": "Apply principles of preventive engineering and sustainable development to an engineering activity or product relevant to the discipline"}, {"po": "PO8", "comp_id": "8.1", "comp_text": "Demonstrate an ability to recognize ethical dilemmas", "indicator": "Identify situations of unethical professional conduct and propose ethical alternatives"}, {"po": "PO8", "comp_id": "8.2", "comp_text": "Demonstrate an ability to apply the code of Ethics", "indicator": "Identify tenets of code of ethics given by the professional bodies like IEEE."}, {"po": "PO8", "comp_id": "8.2", "comp_text": "Demonstrate an ability to apply the code of Ethics", "indicator": "Examine and apply moral & ethical principles to known case studies"}, {"po": "PO9", "comp_id": "9.1", "comp_text": "Demonstrate an ability to form a team and define a role for each member", "indicator": "Recognize a variety of working and learning preferences; appreciate the value of diversity on a team"}, {"po": "PO9", "comp_id": "9.1", "comp_text": "Demonstrate an ability to form a team and define a role for each member", "indicator": "Implement the norms of practice (e.g. rules, roles, charters, agendas etc.) of effective team work, to accomplish a goal"}, {"po": "PO9", "comp_id": "9.2", "comp_text": "Demonstrate effective individual and team operations- communication, problem solving, conflict resolving, and leadership skills", "indicator": "Demonstrate effective communication, problem solving, conflict resolution and leadership skills"}, {"po": "PO9", "comp_id": "9.2", "comp_text": "Demonstrate effective individual and team operations- communication, problem solving, conflict resolving, and leadership skills", "indicator": "Treat other team members respectfully"}, {"po": "PO9", "comp_id": "9.2", "comp_text": "Demonstrate effective individual and team operations- communication, problem solving, conflict resolving, and leadership skills", "indicator": "Listen to other members"}, {"po": "PO9", "comp_id": "9.2", "comp_text": "Demonstrate effective individual and team operations- communication, problem solving, conflict resolving, and leadership skills", "indicator": "Maintain composure in difficult situations"}, {"po": "PO9", "comp_id": "9.3", "comp_text": "Demonstrate success in a team based project", "indicator": "Present results as a team, with smooth integration of contributions from all individual efforts"}, {"po": "PO10", "comp_id": "10.1", "comp_text": "Demonstrate an ability to comprehend technical literature and document project work", "indicator": "Read, understand and interpret technical and non-technical information"}, {"po": "PO10", "comp_id": "10.1", "comp_text": "Demonstrate an ability to comprehend technical literature and document project work", "indicator": "Produce clear, well-constructed, and well-supported written engineering documents"}, {"po": "PO10", "comp_id": "10.1", "comp_text": "Demonstrate an ability to comprehend technical literature and document project work", "indicator": "Create flow in a document or presentation- a logical progression of ideas so that the main point is clear"}, {"po": "PO10", "comp_id": "10.2", "comp_text": "Demonstrate competance in listening, speaking, and presentation", "indicator": "Listen to and comprehend information, instructions, and viewpoints of others"}, {"po": "PO10", "comp_id": "10.2", "comp_text": "Demonstrate competance in listening, speaking, and presentation", "indicator": "Deliver effective oral presentations to technical and nontechnical audiences"}, {"po": "PO11", "comp_id": "11.1", "comp_text": "Demonstrate an ability to evaluate the economics and financial performance of an engineering activity", "indicator": "Describe various economic and financial costs/benefits of an engineering activity"}, {"po": "PO11", "comp_id": "11.1", "comp_text": "Demonstrate an ability to evaluate the economics and financial performance of an engineering activity", "indicator": "Analyze different forms of financial statements to evaluate the financial status of an engineering project"}, {"po": "PO11", "comp_id": "11.2", "comp_text": "Demonstrate an ability to compare and contrast the costs/benefits of alternate proposals for an engineering activity", "indicator": "Analyze and select the most appropriate proposal based on economic and financial considerations"}, {"po": "PO11", "comp_id": "11.3", "comp_text": "Demonstrate an ability to plan/manage an engineering activity within time and budget constraints", "indicator": "Identify the tasks required to complete an engineering activity and the resources required to complete the tasks"}, {"po": "PO11", "comp_id": "11.3", "comp_text": "Demonstrate an ability to plan/manage an engineering activity within time and budget constraints", "indicator": "Use project management tools to schedule an engineering project so it is completed on time and on budget"}, {"po": "PO12", "comp_id": "12.1", "comp_text": "Demonstrate an ability to identify gaps in knowledge and a strategy to close these gaps", "indicator": "Describe the rationale for requirement for continuing professional development"}, {"po": "PO12", "comp_id": "12.1", "comp_text": "Demonstrate an ability to identify gaps in knowledge and a strategy to close these gaps", "indicator": "Identify deficiencies or gaps in knowledge and demonstrate an ability to source information to close this gap"}, {"po": "PO12", "comp_id": "12.2", "comp_text": "Demonstrate an ability toidentify changing trends in engineering knowledge and practice", "indicator": "Identify historic points of technological advance in engineering that required practitioners to seek education in order to stay current"}, {"po": "PO12", "comp_id": "12.2", "comp_text": "Demonstrate an ability toidentify changing trends in engineering knowledge and practice", "indicator": "Recognize the need and be able to clearly explain why it is vitally important to keep current regarding new developments in your field."}, {"po": "PO12", "comp_id": "12.3", "comp_text": "Demonstrate an ability to identify and access sources for new information", "indicator": "Source and comprehend technical literature and other credible sources of information"}, {"po": "PO12", "comp_id": "12.3", "comp_text": "Demonstrate an ability to identify and access sources for new information", "indicator": "Analyze sourced technical and popular information for feasibility, viability, sustainability etc."}, {"po": "PO12", "comp_id": "13.1", "comp_text": "Identify the root causes of a given real-world problem.", "indicator": "Describe the significance of understanding the problem specification to interpret it accurately."}, {"po": "PO12", "comp_id": "13.1", "comp_text": "Identify the root causes of a given real-world problem.", "indicator": "Plan a structured process for building the logic."}, {"po": "PO12", "comp_id": "13.2", "comp_text": "Design efficient system for addressing feasible solutions", "indicator": "Describe the main components of the problem statement and identify some key outcomes."}, {"po": "PO12", "comp_id": "13.2", "comp_text": "Design efficient system for addressing feasible solutions", "indicator": "Identify key issues and outcomes hierarchy."}, {"po": "PO12", "comp_id": "13.3", "comp_text": "Demonstrate the ability to address practical challenges within a given problem statement.", "indicator": "Identify practical challenges within the problem statement."}, {"po": "PO12", "comp_id": "13.3", "comp_text": "Demonstrate the ability to address practical challenges within a given problem statement.", "indicator": "Analyze practical challenges in-depth and propose potential solutions within the problem statement."}, {"po": "PO12", "comp_id": "14.1", "comp_text": "Demonstrate the ability to analyze complex problems and identify key requirements.", "indicator": "Decompose the complex problems into smaller, manageble components."}, {"po": "PO12", "comp_id": "14.1", "comp_text": "Demonstrate the ability to analyze complex problems and identify key requirements.", "indicator": "Generate requirement documents using appropriate tools."}, {"po": "PO12", "comp_id": "14.2", "comp_text": "Demonstrate the ability to develop a structured, domain-specific problem-solving approach.", "indicator": "Choose problem-solving methods and tools tailored to the specific domain and problem characteristics."}, {"po": "PO12", "comp_id": "14.2", "comp_text": "Demonstrate the ability to develop a structured, domain-specific problem-solving approach.", "indicator": "Select appropriate algorithms, design patterns, modeling languages, and simulations for effective problem-solving."}, {"po": "PO12", "comp_id": "15.1", "comp_text": "Demonstrate proficiency in evolving technologies, applying skills to solve real-world problems.", "indicator": "Recognize their own multiple identities, experiences, and biases, and understand how these affect their ability to lead."}, {"po": "PO12", "comp_id": "15.1", "comp_text": "Demonstrate proficiency in evolving technologies, applying skills to solve real-world problems.", "indicator": "Apply acquired knowledge and skills in diverse domains through practical projects and real-world scenarios."}, {"po": "PO12", "comp_id": "15.2", "comp_text": "Demonstrate professional growth through learning, ethics, cultural awareness, and effective communication.", "indicator": "Able to exhibit ethical decision-making in engineering, adhering to professional codes and standards."}, {"po": "PO12", "comp_id": "15.2", "comp_text": "Demonstrate professional growth through learning, ethics, cultural awareness, and effective communication.", "indicator": "Presents technical information with human conduct, ethics,confidence, and persuasiveness in various formats, such as meetings, seminars, or conferences, showcasing expertise and professionalism."}];

const DB = (() => {

  /* â”€â”€ Keys â”€â”€ */
  const KEYS = {
    departments : 'obe_departments',
    users       : 'obe_users',
    courses     : 'obe_courses',
    cos         : 'obe_cos',
    poMapping   : 'obe_po_mapping',
    students    : 'obe_students',
    assessments : 'obe_assessments',
    marksUnified: 'obe_marks_unified',
    survey      : 'obe_survey',
    submissions : 'obe_submissions',
    config      : 'obe_config',
    remedial    : 'obe_remedial',
    gaps        : 'obe_gaps',
    courseAudit : 'obe_course_audit',
    auditLogs : 'obe_audit_logs',
    syllabus    : 'obe_syllabus',
    indicatorMapping: 'obe_indicator_mapping',
    initialized : 'obe_initialized_v2',
  };

  /* â”€â”€ Generic CRUD â”€â”€ */
  function get(key)       { try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
  function getObj(key)    { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch(e){ return {}; } }
  function set(key, val)  { localStorage.setItem(key, JSON.stringify(val)); }
  function uid()          { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

  /* Initialize DB with empty values (real data comes from API) */
  function init() {
    if (localStorage.getItem(KEYS.initialized)) return;
    set(KEYS.departments, []);
    set(KEYS.users,       []);
    set(KEYS.courses,     []);
    set(KEYS.cos,         []);
    set(KEYS.poMapping,   {});
    set(KEYS.students,    []);
    set(KEYS.marksIA,     []);
    set(KEYS.marksMSE,    []);
    set(KEYS.marksESE,    []);
    set(KEYS.marksAssign, []);
    set(KEYS.survey,      []);
    set(KEYS.assignments, []);
    set(KEYS.submissions, []);
    set(KEYS.config,      { academicYear: '2025-26', instituteVision: '', instituteMission: '' });
    set(KEYS.syllabus,    []);
    set(KEYS.assessments, []);
    set(KEYS.marksUnified, []);
    set(KEYS.remedial, []);
    set(KEYS.gaps, []);
    set(KEYS.courseAudit, []);
    if(!get(KEYS.auditLogs)) set(KEYS.auditLogs, []);
    set(KEYS.indicatorMapping, {});
    localStorage.setItem(KEYS.initialized, '1');
  }
  }

  /* â”€â”€ Departments â”€â”€ */
  const departments = {
    all()       { return get(KEYS.departments); },
    byId(id)    { return departments.all().find(d=>d.id===id); },
    add(d)      { const all=departments.all(); d.id=uid(); all.push(d); set(KEYS.departments,all); return d; },
    update(d)   { const all=departments.all().map(x=>x.id===d.id?d:x); set(KEYS.departments,all); return d; },
    delete(id)  { set(KEYS.departments, departments.all().filter(d=>d.id!==id)); },
  };

  /* â”€â”€ Users â”€â”€ */
  const users = {
    all()              { return get(KEYS.users); },
    byId(id)           { return users.all().find(u=>u.id===id); },
    byEmail(email)     { return users.all().find(u=>u.email===email); },
    byRole(role)       { return users.all().filter(u=>u.role===role); },
    byDept(deptId)     { return users.all().filter(u=>u.deptId===deptId); },
    authenticate(email,pw){ return users.all().find(u=>u.email===email&&u.password===pw); },
    add(u)             { const all=users.all(); u.id=uid(); all.push(u); set(KEYS.users,all); return u; },
    update(u)          { const all=users.all().map(x=>x.id===u.id?u:x); set(KEYS.users,all); return u; },
    delete(id)         { set(KEYS.users, users.all().filter(u=>u.id!==id)); },
  };

  /* â”€â”€ Courses â”€â”€ */
  const courses = {
    all()            { return get(KEYS.courses); },
    get()            { return get(KEYS.courses); }, // alias for all()
    byId(id)         { return courses.all().find(c=>c.id===id); },
    byFaculty(fid)   { 
      const u = users.byId(fid);
      if (u && u.role === 'hod') return courses.byDept(u.deptId);
      return courses.all().filter(c=>c.facultyId===fid || (c.facultyIds && c.facultyIds.includes(fid))); 
    },
    byDept(did)      { 
      return courses.all().filter(c=>c.deptId===did); 
    },
    add(c)           { const all=courses.all(); c.id=uid(); all.push(c); set(KEYS.courses,all); return c; },
    update(c)        { const all=courses.all().map(x=>x.id===c.id?c:x); set(KEYS.courses,all); return c; },
    delete(id)       { set(KEYS.courses, courses.all().filter(c=>c.id!==id)); },
  };

  /* â”€â”€ Course Outcomes â”€â”€ */
  const cos = {
    all()              { return get(KEYS.cos); },
    byCourse(cid)      { 
      const raw = cos.all().filter(c => c.courseId === cid);
      const seen = new Set();
      const unique = raw.filter(c => {
        const n = parseInt(c.no) || 1;
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      }).sort((a,b) => (a.no || 1) - (b.no || 1));

      if (!unique.length) {
        const defaultCOs = [
          { id: `co-${cid}-1`, courseId: cid, no: 1, code: 'CO1', text: 'Understand core domain concepts and fundamental principles.', bloomsLevel: 'L3', blooms: 'L3', studentThreshold: 60 },
          { id: `co-${cid}-2`, courseId: cid, no: 2, code: 'CO2', text: 'Apply analytical techniques and algorithmic approaches.', bloomsLevel: 'L3', blooms: 'L3', studentThreshold: 60 },
          { id: `co-${cid}-3`, courseId: cid, no: 3, code: 'CO3', text: 'Analyze engineering problems and design efficient solutions.', bloomsLevel: 'L4', blooms: 'L4', studentThreshold: 60 },
          { id: `co-${cid}-4`, courseId: cid, no: 4, code: 'CO4', text: 'Evaluate system performance against benchmark metrics.', bloomsLevel: 'L5', blooms: 'L5', studentThreshold: 60 },
          { id: `co-${cid}-5`, courseId: cid, no: 5, code: 'CO5', text: 'Design and synthesize innovative real-world components.', bloomsLevel: 'L6', blooms: 'L6', studentThreshold: 60 },
          { id: `co-${cid}-6`, courseId: cid, no: 6, code: 'CO6', text: 'Formulate and defend end-to-end practical implementations.', bloomsLevel: 'L6', blooms: 'L6', studentThreshold: 60 }
        ];
        return defaultCOs;
      }

      return unique.map(c => ({
        ...c,
        code: c.code || `CO${c.no || 1}`,
        text: (c.text && c.text.trim()) ? c.text : `Master and apply core competencies for CO${c.no || 1}`,
        bloomsLevel: c.bloomsLevel || c.blooms || 'L3',
        blooms: c.bloomsLevel || c.blooms || 'L3',
        studentThreshold: c.studentThreshold || 60
      }));
    },
    byId(id)           { return cos.all().find(c=>c.id===id); },
    add(c)             { const all=cos.all(); c.id=uid(); all.push(c); set(KEYS.cos,all); return c; },
    update(c)          { const all=cos.all().map(x=>x.id===c.id?c:x); set(KEYS.cos,all); return c; },
    saveAll(cid, list) { const others=cos.all().filter(c=>c.courseId!==cid); set(KEYS.cos,[...others,...list]); },
    delete(id)         { set(KEYS.cos, cos.all().filter(c=>c.id!==id)); },
  };

  /* â”€â”€ PO Mapping â”€â”€ */
  const poMapping = {
    byCourse(cid)      { return get(KEYS.poMapping).filter(m=>m.courseId===cid); },
    getValue(cid,coNo,po) {
      const m=get(KEYS.poMapping).find(x=>x.courseId===cid&&String(x.coNo)===String(coNo)&&x.po===po);
      return m ? m.val : 0;
    },
    getJustification(cid,coNo,po) {
      const m=get(KEYS.poMapping).find(x=>x.courseId===cid&&String(x.coNo)===String(coNo)&&x.po===po);
      return m ? (m.justification || '') : '';
    },
    setValue(cid,coNo,po,val,justification='') {
      let all=get(KEYS.poMapping);
      const idx=all.findIndex(x=>x.courseId===cid&&String(x.coNo)===String(coNo)&&x.po===po);
      if(idx>=0) {
        all[idx].val = val;
        all[idx].justification = justification;
      } else {
        all.push({courseId:cid,coNo:Number(coNo),po,val,justification});
      }
      set(KEYS.poMapping,all);
    },
    saveMatrix(cid, matrix) {
      let all=get(KEYS.poMapping).filter(m=>m.courseId!==cid);
      all=[...all,...matrix]; set(KEYS.poMapping,all);
    },
  };

  /* â”€â”€ Students â”€â”€ */
  const students = {
    all()              { return get(KEYS.students); },
    byCourse(cid)      { return students.all().filter(s=>s.courseId===cid); },
    byPRN(cid,prn)     { return students.all().find(s=>s.courseId===cid&&s.prn===prn); },
    add(s)             { const all=students.all(); s.id=uid(); all.push(s); set(KEYS.students,all); return s; },
    update(s)          { const all=students.all().map(x=>x.id===s.id?s:x); set(KEYS.students,all); return s; },
    saveAll(cid,list)  { const others=students.all().filter(s=>s.courseId!==cid); set(KEYS.students,[...others,...list]); },
    delete(id)         { set(KEYS.students, students.all().filter(s=>s.id!==id)); },
  };

  /* â”€â”€ Marks (Unified) â”€â”€ */
  const marks = {
    get(cid) { return get(KEYS.marksUnified).filter(m=>m.courseId===cid); },
    set(cid, prn, assessId, qNo, v) {
      let all = get(KEYS.marksUnified);
      const idx = all.findIndex(m=>m.courseId===cid && m.prn===prn && m.assessId===assessId && m.qNo===qNo);
      if(idx>=0) all[idx].marks = v;
      else all.push({courseId:cid, prn, assessId, qNo, marks:v});
      set(KEYS.marksUnified, all);
    },
    saveAll(cid, list) { 
      const others = get(KEYS.marksUnified).filter(m=>m.courseId!==cid); 
      set(KEYS.marksUnified, [...others, ...list]); 
    },
    save(cid, list) {
      marks.saveAll(cid, list);
    }
  };

  /* â”€â”€ Survey â”€â”€ */
  const survey = {
    byCourse(cid)         { return get(KEYS.survey).filter(s=>s.courseId===cid); },
    getScore(cid,prn,co)  { const s=get(KEYS.survey).find(x=>x.courseId===cid&&x.prn===prn&&String(x.co)===String(co)); return s?s.score:null; },
    setScore(cid,prn,co,score) {
      let all=get(KEYS.survey);
      const idx=all.findIndex(x=>x.courseId===cid&&x.prn===prn&&String(x.co)===String(co));
      if(idx>=0)all[idx].score=score; else all.push({courseId:cid,prn,co,score});
      set(KEYS.survey,all);
    },
    saveAll(cid,list)     { const others=get(KEYS.survey).filter(s=>s.courseId!==cid); set(KEYS.survey,[...others,...list]); },
  };

  /* â”€â”€ Assessments (Unified) â”€â”€ */
  const assessments = {
    all()              { return get(KEYS.assessments); },
    byCourse(cid) {
      if (!cid) return [];
      let found = assessments.all().filter(a=>a.courseId===cid);
      if (!found || found.length === 0) {
        const standard = [
          {
            id: `asgn-${cid}-ia1`,
            courseId: cid,
            type: 'ia',
            no: 1,
            title: 'IA 1',
            maxMarks: 20,
            questions: [
              { qNo: 1, desc: 'Question 1', bloomsLevel: 'L3', coNo: 1, maxMarks: 10 },
              { qNo: 2, desc: 'Question 2', bloomsLevel: 'L3', coNo: 2, maxMarks: 10 }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: `asgn-${cid}-ia2`,
            courseId: cid,
            type: 'ia',
            no: 2,
            title: 'IA 2',
            maxMarks: 20,
            questions: [
              { qNo: 1, desc: 'Question 1', bloomsLevel: 'L4', coNo: 3, maxMarks: 10 },
              { qNo: 2, desc: 'Question 2', bloomsLevel: 'L4', coNo: 4, maxMarks: 10 }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: `asgn-${cid}-mse`,
            courseId: cid,
            type: 'mse',
            no: 1,
            title: 'MSE',
            maxMarks: 30,
            questions: [
              { qNo: 1, desc: 'Question 1', bloomsLevel: 'L3', coNo: 1, maxMarks: 10 },
              { qNo: 2, desc: 'Question 2', bloomsLevel: 'L3', coNo: 2, maxMarks: 10 },
              { qNo: 3, desc: 'Question 3', bloomsLevel: 'L4', coNo: 3, maxMarks: 10 }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: `asgn-${cid}-ese`,
            courseId: cid,
            type: 'ese',
            no: 1,
            title: 'ESE',
            maxMarks: 60,
            questions: [
              { qNo: 1, desc: 'Q1 (CO1)', bloomsLevel: 'L3', coNo: 1, maxMarks: 10 },
              { qNo: 2, desc: 'Q2 (CO2)', bloomsLevel: 'L3', coNo: 2, maxMarks: 10 },
              { qNo: 3, desc: 'Q3 (CO3)', bloomsLevel: 'L4', coNo: 3, maxMarks: 10 },
              { qNo: 4, desc: 'Q4 (CO4)', bloomsLevel: 'L4', coNo: 4, maxMarks: 10 },
              { qNo: 5, desc: 'Q5 (CO5)', bloomsLevel: 'L5', coNo: 5, maxMarks: 10 },
              { qNo: 6, desc: 'Q6 (CO6)', bloomsLevel: 'L6', coNo: 6, maxMarks: 10 }
            ],
            createdAt: new Date().toISOString()
          },
          {
            id: `asgn-${cid}-asgn1`,
            courseId: cid,
            type: 'assignment',
            no: 1,
            title: 'Assignment 1',
            maxMarks: 25,
            questions: [
              { qNo: 1, desc: 'Practical / Problem Solving Assignment', bloomsLevel: 'L3', coNo: 1, maxMarks: 25 }
            ],
            createdAt: new Date().toISOString()
          }
        ];
        const all = assessments.all();
        all.push(...standard);
        set(KEYS.assessments, all);
        found = standard;
      }
      return found.sort((a,b) => {
        const order = { 'IA 1': 1, 'IA 2': 2, 'MSE': 3, 'ESE': 4, 'Assignment 1': 5 };
        return (order[a.title] || 99) - (order[b.title] || 99);
      });
    },
    byId(id)           { return assessments.all().find(a=>a.id===id); },
    add(a)             { const all=assessments.all(); a.id=uid(); a.createdAt=new Date().toISOString(); all.push(a); set(KEYS.assessments,all); return a; },
    update(a)          { const all=assessments.all().map(x=>x.id===a.id?a:x); set(KEYS.assessments,all); return a; },
    delete(id)         { set(KEYS.assessments, assessments.all().filter(a=>a.id!==id)); },
  };

  /* â”€â”€ Submissions â”€â”€ */
  const submissions = {
    all()              { return get(KEYS.submissions); },
    byAssessId(aid)    { return submissions.all().filter(s=>s.assessId===aid); },
    byStudent(prn)     { return submissions.all().filter(s=>s.prn===prn); },
    add(s)             { const all=submissions.all(); s.id=uid(); s.submittedAt=new Date().toISOString(); all.push(s); set(KEYS.submissions,all); return s; },
    update(s)          { const all=submissions.all().map(x=>x.id===s.id?s:x); set(KEYS.submissions,all); return s; },
  };
  /* â”€â”€ Config â”€â”€ */
  const config = {
    get()           { return getObj(KEYS.config); },
    set(cfg)        { set(KEYS.config, cfg); },
    update(patch)   { const cfg={...config.get(),...patch}; set(KEYS.config,cfg); return cfg; },
    getIAQuestions(cid, type) {
      const all = config.get().iaQuestions || [];
      return all.filter(q => q.courseId === cid && q.assessmentType === type);
    },
    saveIAQuestions(cid, type, list) {
      let cfg = config.get();
      let all = cfg.iaQuestions || [];
      all = all.filter(q => !(q.courseId === cid && q.assessmentType === type));
      all.push(...list);
      cfg.iaQuestions = all;
      config.set(cfg);
    }
  };

  /* â”€â”€ Reset (for dev) â”€â”€ */
  function reset() {
    Object.values(KEYS).forEach(k=>localStorage.removeItem(k));
    init();
  }

  const indicatorMapping = {
    get: (courseId) => {
      const data = getObj(KEYS.indicatorMapping) || {};
      return data[courseId] || {};
    },
    byCourse: (courseId) => {
      const data = getObj(KEYS.indicatorMapping) || {};
      return data[courseId] || {};
    },
    save: (courseId, mappingObj) => {
      const data = getObj(KEYS.indicatorMapping) || {};
      data[courseId] = mappingObj;
      set(KEYS.indicatorMapping, data);
    }
  };

  const remedial = {
    all() { return get(KEYS.remedial); },
    byCourse(cid) { return remedial.all().filter(r => r.courseId === cid); },
    get(cid, prn) { return remedial.all().find(r => r.courseId === cid && r.prn === prn); },
    save(cid, prn, data) {
      let all = remedial.all();
      const idx = all.findIndex(r => r.courseId === cid && r.prn === prn);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...data };
      } else {
        all.push({ courseId: cid, prn, ...data });
      }
      set(KEYS.remedial, all);
    }
  };

  const gaps = {
    all() { return get(KEYS.gaps); },
    byDept(did) { return gaps.all().filter(g => g.deptId === did); },
    add(gapObj) { const all = gaps.all(); all.push({ id: uid(), ...gapObj }); set(KEYS.gaps, all); },
    delete(id) { set(KEYS.gaps, gaps.all().filter(g => g.id !== id)); }
  };

    const auditLogs = {
    all() { return get(KEYS.auditLogs) || []; },
    add(log) { 
      let all = auditLogs.all();
      all.unshift({ id: uid(), timestamp: Date.now(), ...log });
      if(all.length > 500) all.length = 500; // Keep last 500
      set(KEYS.auditLogs, all);
    }
  };

  const courseAudit = {
    all() { return get(KEYS.courseAudit); },
    byCourse(cid) { return courseAudit.all().find(a => a.courseId === cid); },
    save(cid, data) {
      let all = courseAudit.all();
      const idx = all.findIndex(a => a.courseId === cid);
      if (idx >= 0) all[idx] = { ...all[idx], ...data };
      else all.push({ courseId: cid, ...data });
      set(KEYS.courseAudit, all);
    }
  };

  const syllabus = {
    all() { return get(KEYS.syllabus); },
    byCourse(cid) { return syllabus.all().find(s => s.courseId === cid) || { courseId: cid, modules: [], books: [] }; },
    save(cid, data) {
      let all = syllabus.all();
      const idx = all.findIndex(s => s.courseId === cid);
      if (idx >= 0) all[idx] = { ...all[idx], ...data };
      else all.push({ courseId: cid, ...data });
      set(KEYS.syllabus, all);
    }
  };

  const actionPlans = {
    all() { return get('obe_action_plans'); },
    getPlan(courseId, coNo) { return actionPlans.all().find(p => p.courseId === courseId && String(p.coNo) === String(coNo)); },
    savePlan(plan) {
      let all = actionPlans.all();
      const idx = all.findIndex(p => p.courseId === plan.courseId && String(p.coNo) === String(plan.coNo));
      if (idx >= 0) all[idx] = { ...all[idx], ...plan };
      else all.push(plan);
      set('obe_action_plans', all);
    }
  };

  /* â”€â”€ Public API â”€â”€ */

  /* ?? Outcomes */
  const outcomes = {
    all() { return get('obe_outcomes') || []; },
    byPattern(pid) { return outcomes.all().filter(o => o.patternId === pid); },
    getPOList(pid=null) { 
      let all = outcomes.all().filter(o => o.type === 'PO');
      if(pid) all = all.filter(o => o.patternId === pid);
      if(all.length === 0) return Array.from({length:12}, (_,i)=>PO);
      return all.map(o => o.code);
    },
    getPSOList(pid=null) { 
      let all = outcomes.all().filter(o => o.type === 'PSO');
      if(pid) all = all.filter(o => o.patternId === pid);
      if(all.length === 0) return Array.from({length:3}, (_,i)=>PSO);
      return all.map(o => o.code);
    }
  };

  /* ?? Patterns */
  const patterns = {
    all() { return get('obe_patterns') || []; }
  };

  return { init, reset, uid, departments, users, courses, cos, poMapping, indicatorMapping, remedial, students, marks, survey, assessments, assignments: assessments, submissions, config, gaps, courseAudit, auditLogs, syllabus, actionPlans, KEYS };

})();

// Auto-initialize on load
DB.init();

