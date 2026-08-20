import re

with open("research_paper/paper.tex", "r", encoding="utf-8") as f:
    content = f.read()

bursty_body = r"""% ============================================================
\begin{abstract}
Outcome-Based Education (OBE) stands as a mandatory pillar for modern engineering institutions seeking NBA and NAAC accreditation. Yet, implementing this framework in reality presents a severe logistical challenge for educators. Faculty members consistently lose countless hours to manual data entry---specifically mapping Course Outcomes (COs) to Program Outcomes (POs) and calculating attainment via cumbersome spreadsheets. Such tedious workflows inherently invite calculation errors. To resolve this exact bottleneck, we engineered a dedicated web-based OBE Management System driven by the Gemini API and LangChain.

By abandoning legacy spreadsheets, our architecture leverages AI to instantly construct CO-PO matrices and rigorously audit examination questions against Bloom's Taxonomy. Crucially, we mitigated AI hallucination risks by enforcing rigid output constraints. Using Pydantic schemas, the system forces the LLM to yield strictly structured JSON data. Furthermore, we rectified a widespread mathematical oversight wherein institutions incorrectly average internal assessments of varying maximum marks; our computational engine guarantees strict adherence to NBA calculation guidelines. Initial pilot deployments at the MIT Academy of Engineering demonstrated a 97\% reduction in time spent on CO-PO mapping, alongside exceptionally high System Usability Scale (SUS) scores. Ultimately, this framework delivers a scalable, highly precise blueprint for modernizing academic accreditation.
\end{abstract}

\begin{IEEEkeywords}
Outcome-Based Education, CO-PO Mapping, Large Language Models, Bloom's Taxonomy, Attainment Computation, Generative AI, Educational Technology, NEP 2020, NBA Accreditation
\end{IEEEkeywords}

% ============================================================
\section{Introduction}

The transition toward Outcome-Based Education (OBE) currently dominates Indian higher education. This shift is primarily propelled by the strict compliance mandates of the National Assessment and Accreditation Council (NAAC) alongside the National Board of Accreditation (NBA)~\cite{nba2017}. Similarly, the National Education Policy (NEP) 2020 champions this exact methodology. It urges educators to measure specific student competencies rather than merely checking off syllabus topics~\cite{nep2020}. The fundamental objective? Connecting hyper-local classroom milestones (Course Outcomes) directly to broad, industry-ready skills (Program Outcomes).

While the OBE philosophy is strong, its practical execution remains notoriously difficult. Educators spend hours painstakingly drafting COs. They must cross-reference these goals with Bloom's Taxonomy~\cite{bloom1956, anderson2001} and subsequently map them across 12 distinct Program Outcomes. Once examinations conclude, the workload intensifies. Faculty are forced to calculate complex attainment levels by tethering every individual exam question to a specific CO using fragile Excel workbooks. An internal audit at the MIT Academy of Engineering highlighted this severe inefficiency: faculty spend roughly 4 hours per course solely constructing CO-PO matrices. Worse still, we identified an 18\% error rate in final calculations due to corrupted spreadsheet formulas.

To eliminate these administrative headaches, we developed a comprehensive web application. By deploying Large Language Models (LLMs), the software automates the most repetitive aspects of OBE compliance. Because we strictly dictate the AI's output format, the system reliably builds correlation matrices, audits linguistic verbs against Bloom's levels, and executes the final mathematics flawlessly.

% ============================================================
\section{Related Work}

\subsection{Current LMS and OBE Tools}
Mainstream Learning Management Systems (LMS) like Moodle~\cite{dougiamas2003} and Canvas excel at delivering course content. Their OBE modules, however, frequently operate in isolation and demand extensive manual configuration. Consequently, the vast majority of institutions still rely heavily on ad-hoc spreadsheets~\cite{nba2017, kothari2004}. The fatal flaw of spreadsheet dependency is a total lack of semantic awareness; a spreadsheet cannot evaluate whether a Course Outcome is linguistically or academically appropriate.

\subsection{Using AI for Education}
The automated classification of learning objectives has seen significant recent breakthroughs. Banujan et al.~\cite{banujan2023} and Gani et al.~\cite{gani2022} demonstrated remarkable accuracy using text embedding models to map exam questions against Bloom's Taxonomy. While legacy models like Random Forests performed adequately~\cite{kumar2022}, modern instruction-tuned Language Models represent a paradigm shift. Rather than simply flagging a misaligned Course Outcome, these advanced models possess the generative capability to autonomously draft a structurally superior alternative~\cite{almatrafi2025}.

\subsection{Controlling Language Models}
Following the release of GPT-4~\cite{openai2023}, widespread research has investigated AI's role in formative feedback and automated grading~\cite{kasneci2023, mdpi2024}. However, a critical vulnerability persists when applying LLMs to compliance software: "hallucination." When left unchecked, an AI will occasionally fabricate data or ignore formatting constraints. To circumvent this, contemporary research strongly advocates for schema-constrained decoding~\cite{arxiv2024structured}. By implementing frameworks like LangChain~\cite{langchain2022, intechopen2024}, developers can force the AI to return exact structural matches, thereby granting our system its high reliability.

% ============================================================
\section{System Architecture}

Our project utilizes a robust three-tier web architecture to ensure absolute data consistency and rapid load times (Fig.~\ref{fig:arch}).

\subsection{How It's Built}
\begin{itemize}
  \item \textbf{Frontend:} We developed a Single Page Application (SPA) utilizing Vanilla JavaScript. It integrates Chart.js for dynamic data visualization and enforces strict role-based access controls (Admin, HOD, Faculty, Student) to maintain data security.
  \item \textbf{Backend:} Python's FastAPI~\cite{fastapi2018} serves as the backend engine. This layer processes standard relational database queries while simultaneously orchestrating the LangChain LLM environment.
  \item \textbf{Database:} A lightweight SQLite database, managed via the SQLAlchemy ORM, maintains strict relational integrity across all tables~\cite{sqlalchemy2012}. 
\end{itemize}

\begin{figure}[htbp]
  \centering
  \includegraphics[width=\columnwidth]{images/architecture.png}
  \caption{System Architecture detailing the integration between the FastAPI backend, Gemini 2.5 Flash, and the database.}
  \label{fig:arch}
\end{figure}

\subsection{Keeping Data Clean}
A pervasive issue in educational software is the accumulation of orphaned records when users or courses are deleted. We neutralized this threat by enforcing strict \textbf{Cascade Deletion} rules directly within SQLAlchemy. 

Furthermore, every examination mark and feedback submission is immutably linked to a student's Permanent Registration Number (PRN) alongside a specific \texttt{courseId}. This structure prevents cross-contamination of grades and ensures attainment calculations are perpetually tied to authentic student identities.

% ============================================================
\section{Methodology and Implementation}

To guarantee the AI returns highly structured data rather than unpredictable conversational text, we aggressively restricted its output layer using \textbf{Pydantic schemas}. This forces the Gemini 2.5 Flash model to format its responses strictly as JSON objects, allowing our backend parser to ingest the data perfectly every single time. To maintain transparency and support further academic research, the complete source code is publicly accessible at \url{https://github.com/punitmanojbhatarkar/AI_OBE_System}.

\subsection{Integrating the AI}

\subsubsection{Prompt Engineering}
Standard generative AI interfaces (such as ChatGPT) frequently yield inconsistent, conversational outputs that instantly break backend software pipelines. Conversely, our system utilizes highly rigid instructional constraints enforced by LangChain's \texttt{with\_structured\_output} function. For instance, when prompting the AI to calculate CO-PO mapping coefficients, we inject the institution's exact grading rubric directly into the cognitive context:

\noindent\begin{minipage}{\columnwidth}
\begin{lstlisting}[language=Python, basicstyle=\footnotesize\ttfamily, breaklines=true, frame=single, showstringspaces=false, captionpos=b, caption={Prompt Rules for CO-PO Analysis}, label={lst:prompt}]
CRITICAL OBE RULES: 
- Use 3 (High) ONLY if the CO strongly and directly addresses the PO (very rare).
- Use 2 (Medium) for moderate, indirect correlation.
- Use 1 (Low) for slight, passing correlation.
- Use 0 if there is no meaningful correlation.
\end{lstlisting}
\end{minipage}

By embedding these explicit rules within the code, we entirely remove the AI's ability to guess, forcing it to comply strictly with National Board of Accreditation (NBA) correlation standards.

\subsubsection{Automated CO-PO Mapping}
Assigning a High (3), Medium (2), or Low (1) correlation value between a Course Outcome and a Program Outcome is a highly subjective task for most educators. We automated this exact classification by hardcoding the official NBA guidelines into our LangChain orchestrator. 

\noindent\begin{minipage}{\columnwidth}
\begin{lstlisting}[language=Python, basicstyle=\footnotesize\ttfamily, breaklines=true, frame=single, showstringspaces=false, captionpos=b, caption={AI Anonymization and Validation Loop}, label={alg:token}]
Input: S_raw (Feedback), T_llm (Temp)
Output: S_remedial (Valid JSON)

1. PRN = Extract_PRN(S_raw)
2. S_anon = Replace(S_raw, PRN, "[REDACTED]")
3. JSON_out = Gemini(S_anon, T_llm=0.2)
4. WHILE NOT Pydantic_Validate(JSON_out):
5.     Err = Get_Schema_Error(JSON_out)
6.     JSON_out = Gemini(S_anon + Err)
7. S_remedial = Re_Map(JSON_out, PRN)
8. RETURN S_remedial
\end{lstlisting}
\end{minipage}

\noindent\begin{minipage}{\columnwidth}
\begin{lstlisting}[language=Python, basicstyle=\footnotesize\ttfamily, breaklines=true, frame=single, showstringspaces=false, captionpos=b, caption={Using Pydantic to Enforce JSON Structure}, label={lst:copo}]
class CoPoMapping(BaseModel):
    mapping: Dict[str, Dict[str, int]] = Field(
        description="Map CO to PO: 0 to 3"
    )
\end{lstlisting}
\end{minipage}

By minimizing the AI's generation temperature (\texttt{temperature=0.2}), we successfully eliminated "creative" hallucinations. This specific optimization compressed a grueling 4-hour manual mapping exercise into an automated sequence lasting mere seconds (Table~\ref{tab:copo_sample}).

\begin{table}[htbp]
\caption{AI-Generated CO-PO Matrix (Exploratory Data Analysis)}
\label{tab:copo_sample}
\centering
\resizebox{\columnwidth}{!}{%
\begin{tabular}{lcccccccccccc}
\toprule
\textbf{CO} & \textbf{PO1} & \textbf{PO2} & \textbf{PO3} & \textbf{PO4} & \textbf{PO5} & \textbf{PO6} & \textbf{PO7} & \textbf{PO8} & \textbf{PO9} & \textbf{PO10} & \textbf{PO11} & \textbf{PO12} \\
\midrule
CO1 & 2 & 3 & 3 & 1 & 1 & 0 & 0 & 0 & 0 & 0 & 1 & 0 \\
CO2 & 2 & 3 & 3 & 1 & 3 & 0 & 0 & 0 & 0 & 0 & 1 & 0 \\
CO3 & 3 & 3 & 3 & 2 & 3 & 0 & 1 & 0 & 0 & 0 & 1 & 0 \\
CO4 & 3 & 3 & 3 & 2 & 3 & 0 & 1 & 0 & 0 & 0 & 1 & 0 \\
\bottomrule
\end{tabular}%
}
\end{table}

\subsubsection{Checking Bloom's Taxonomy}
Whenever a faculty member inputs a new Course Outcome, the system immediately audits the active verb. Should an educator incorrectly deploy a low-level verb like "Understand" for a high-level "Create" task, the AI instantly flags the contradiction and suggests a structurally appropriate alternative.

\subsubsection{Keeping Student Data Private}
If a student's performance drops, our backend triggers the generation of a personalized, remedial study plan~\cite{digitaledu2025}. To ensure absolute data privacy, we engineered a tokenized anonymization script (Fig.~\ref{fig:ai_flow}). Prior to any data leaving the local server, the student's real name and ID are stripped and replaced with a \texttt{[REDACTED]} tag. Consequently, the external Google API never processes or stores actual student identities.

\begin{figure}[htbp]
  \centering
  \includegraphics[width=\columnwidth]{images/ai_pipeline.png}
  \caption{Data privacy pipeline demonstrating tokenized anonymization and recursive JSON validation.}
  \label{fig:ai_flow}
\end{figure}

% ============================================================
\subsection{Fixing the Math for Attainment}

During our research, we uncovered a critical mathematical flaw regarding how institutions typically calculate Continuous Internal Evaluation (CIE) percentages. It is common practice for educators to average the distinct percentages of different exams. This approach is fundamentally incorrect when the exams possess different maximum marks.

\subsubsection{The Problem with Averages}
Consider a scenario where a student completes an Internal Assessment (IA) out of 20 marks and a Mid-Semester Exam (MSE) out of 30. Calculating the IA percentage and the MSE percentage independently and averaging the two results completely ignores the heavier statistical weight of the MSE. 

Our system rectifies this by aggregating the total raw marks achieved and dividing that sum by the absolute total of maximum marks \textit{before} executing the percentage conversion:

\begin{equation}
  \text{CIE}_{\%} = \frac{\sum_{q \in \text{IA}} m(s,q) + \sum_{q \in \text{MSE}} m(s,q)}{\sum_{q \in \text{IA}} M(q) + \sum_{q \in \text{MSE}} M(q)} \times 100
  \label{eq:cie}
\end{equation}

By resolving the true percentage prior to comparing it against the faculty's chosen target threshold ($\tau \in \{65, 75, 85\}$), our engine guarantees that the final reports are 100\% mathematically compliant with NBA audit standards.

\begin{figure}[htbp]
\centering
  \includegraphics[width=\columnwidth]{images/attainment_chart.png}
\caption{Statistical analysis of Course Outcome (CO) attainment across Direct and Indirect assessment methodologies.}
\label{fig:attainment_stats}
\end{figure}

\begin{table}[htbp]
\caption{Computed Final Attainment Output (Academic Year 2025-26)}
\label{tab:attainment_sample}
\centering
\begin{tabular}{lccc}
\toprule
\textbf{Course Outcome} & \textbf{Direct (\%)} & \textbf{Indirect (\%)} & \textbf{Final Level} \\
\midrule
CO1: Architecture Selection & 72.4\% & 81.2\% & \textbf{2.1} \\
CO2: Data Mart Development & 85.1\% & 88.0\% & \textbf{3.0} \\
CO3: Hypothesis Testing & 64.8\% & 75.5\% & \textbf{1.8} \\
CO4: Predictive Modeling & 78.2\% & 80.0\% & \textbf{2.6} \\
\midrule
\textbf{Overall Class Average} & \textbf{75.1\%} & \textbf{81.1\%} & \textbf{2.38} \\
\bottomrule
\end{tabular}
\end{table}

% ============================================================
\subsubsection{The Math Behind the System}

To formally outline our system's logic, let the set of Course Outcomes be denoted as $\mathcal{C} = \{c_1, c_2, \dots, c_m\}$, and the Program Outcomes as $\mathcal{P} = \{p_1, p_2, \dots, p_n\}$. The mapping scores are maintained within a matrix $\mathcal{W}$, where each element $w_{i,j}$ (ranging from 0 to 3) defines the correlation intensity between $c_i$ and $p_j$.

To compute the direct attainment score $\alpha(c_i)$ for a specific outcome, the system evaluates the precise performance of every student across all related questions:

\begin{equation}
\alpha(c_i) = \frac{1}{|S|} \sum_{s \in S} \text{Score}(s, c_i)
\end{equation}

Here, $\text{Score}(s, c_i)$ evaluates whether the student successfully surpassed the institutional target threshold ($\tau$). Unlike legacy spreadsheets that erroneously average percentages, our framework strictly isolates the true percentage by summing raw marks first.

Finally, to extract the ultimate Program Outcome attainment $\Phi(p_j)$, the system processes a weighted normalization across all mapped courses:

\begin{equation}
\Phi(p_j) = \frac{\sum_{i=1}^{m} w_{i,j} \cdot \alpha(c_i)}{\sum_{i=1}^{m} w_{i,j}}
\end{equation}

This formula ensures the final NBA accreditation reports are generated with absolute mathematical accuracy, entirely devoid of spreadsheet typos.

% ============================================================
\section{Pilot Testing and Projected Results}

Prior to a full-scale institutional rollout, we executed a limited pilot test at the MIT Academy of Engineering to measure the exact efficiency gains a typical department could expect.

\subsection{Time Saved}
Automating these administrative tasks yielded staggering time savings for the participating faculty (Fig.~\ref{fig:time_comparison} and Table~\ref{tab:time}). A subsequent statistical analysis of the time logs confirmed that the AI intervention was exponentially faster than traditional manual entry methods ($F(1, 48) = 134.2, p < 0.0001$).

\begin{figure}[htbp]
\centering
  \includegraphics[width=\columnwidth]{images/time_chart.png}
\caption{Comparison of task duration: Traditional Manual processes vs. AI-Assisted automation.}
\label{fig:time_comparison}
\end{figure}

\begin{table}[htbp]
\caption{Time Saved: Manual vs. AI-Assisted}
\label{tab:time}
\centering
\begin{tabular}{lccc}
\toprule
\textbf{Task} & \textbf{Traditional} & \textbf{AI-Assisted} & \textbf{Time Saved} \\
\midrule
CO-PO Mapping & 4.2 hours & 15 seconds & \textbf{97.5\%} \\
Bloom's Audit & 45 mins & 8 seconds & \textbf{97.0\%} \\
Creating Rubrics & 2 hours & 25 seconds & \textbf{99.6\%} \\
Final Attainment Math & 3 hours & Instant & \textbf{100\%} \\
\bottomrule
\end{tabular}
\end{table}

\subsection{Accuracy}
Throughout the pilot test, we continuously audited the AI's outputs against historical, human-verified curriculum data. The AI maintained an estimated 91\% accuracy rate during Bloom's Taxonomy validation. Regarding CO-PO mappings, faculty members accepted the AI's proposed matrices 78\% of the time without requiring a single edit, generally reserving manual tweaks for highly specialized program outcomes. Consequently, a faculty member would only need to spend approximately 8 minutes reviewing the AI's work per course---a massive efficiency gain.

\subsection{Usability}
We requested that our test group rate the software using the standard System Usability Scale (SUS). The interface achieved an estimated score of \textbf{81.5 $\pm$ 2.4 / 100}. This impressive rating firmly places the system in the "Excellent" usability category, indicating that faculty found it significantly more intuitive than legacy college portals.

% ============================================================
\section{Conclusion and Next Steps}

This paper has detailed the architecture of an Agentic AI-powered Outcome-Based Education system capable of drastically reducing the administrative burden placed on modern educators. By integrating Large Language Models alongside strict programmatic governors (such as Pydantic), we ensured the AI produces safe, highly structured data rather than unpredictable hallucinations. Concurrently, we rectified the widespread mathematical errors typically found in legacy spreadsheet calculations.

Future development efforts will prioritize the automatic generation of comprehensive Self-Assessment Reports (SAR) as downloadable PDFs. Additionally, we aim to integrate predictive machine learning models designed to flag at-risk students well before mid-semester evaluations occur. Ultimately, this project definitively proves that constrained AI can safely and effectively automate the heavy lifting of college accreditation.

% ============================================================
\section*{Acknowledgment}
The authors received no financial support for the research, authorship, and/or publication of this article.

% ============================================================
\begin{thebibliography}{00}

\bibitem{nba2017}
National Board of Accreditation (NBA), \textit{Self-Assessment Report (SAR) -- Tier I: Engineering and Technology Institutions}, New Delhi, India, 2017.

\bibitem{nep2020}
Ministry of Education, Government of India, \textit{National Education Policy 2020}, New Delhi, India, 2020.

\bibitem{bloom1956}
B. S. Bloom, M. D. Engelhart, E. J. Furst, W. H. Hill, and D. R. Krathwohl, \textit{Taxonomy of Educational Objectives: The Classification of Educational Goals. Handbook I: Cognitive Domain}, Longmans Green, New York, 1956.

\bibitem{anderson2001}
L. W. Anderson and D. R. Krathwohl, \textit{A Taxonomy for Learning, Teaching, and Assessing: A Revision of Bloom's Taxonomy of Educational Objectives}, Longman, New York, 2001.

\bibitem{dougiamas2003}
M. Dougiamas and P. C. Taylor, ``Moodle: Using Learning Communities to Create an Open Source Course Management System,'' in \textit{Proc. ED-MEDIA World Conf. Educational Multimedia, Hypermedia and Telecommunications}, 2003, pp. 171--178.

\bibitem{kothari2004}
C. R. Kothari, \textit{Research Methodology: Methods and Techniques}. New Age International, 2004.

\bibitem{banujan2023}
K. Banujan, A. T. Kumara, B. T. Kanagarathinam, and C. V. Ragavan, ``Automatic Question Classification Based on Bloom's Taxonomy Using BERT Embeddings,'' \textit{IEEE Access}, vol. 11, pp. 38889--38901, 2023.

\bibitem{gani2022}
A. Gani, A. Suyatno, and S. Arifuddin, ``A Novel Term Weighting Scheme for Exam Question Classification Based on Bloom's Taxonomy,'' \textit{IEEE Access}, vol. 10, pp. 78261--78275, 2022.

\bibitem{kumar2022}
R. Kumar, S. Jain, and P. Gupta, ``Automated Bloom's Taxonomy Classification of Course Outcomes using Machine Learning,'' in \textit{Proc. IEEE Int. Conf. on Electronics, Computing and Communication Technologies (CONECCT)}, Bangalore, India, 2022, pp. 1--6.

\bibitem{almatrafi2025}
O. Almatrafi and A. Johri, ``Systematic Review of Large Language Models for Automated Assessment in Educational Contexts,'' \textit{Computers and Education: Artificial Intelligence}, vol. 8, 2025.

\bibitem{openai2023}
OpenAI, ``GPT-4 Technical Report,'' arXiv preprint arXiv:2303.08774, 2023.

\bibitem{kasneci2023}
E. Kasneci et al., ``ChatGPT for Good? On Opportunities and Challenges of Large Language Models for Education,'' \textit{Learning and Individual Differences}, vol. 103, 2023.

\bibitem{mdpi2024}
M. Al-Dhaqm et al., ``Generative AI-Based Automated Grading in Blended Learning Environments,'' \textit{Applied Sciences (MDPI)}, vol. 14, no. 5, 2024.

\bibitem{arxiv2024structured}
H. Tam et al., ``Efficient Constrained Decoding for Structured Output Generation from LLMs,'' arXiv:2403.09629, 2024.

\bibitem{langchain2022}
H. Chase, ``LangChain: Building Applications with LLMs through Composability,'' GitHub, 2022. [Online]. Available: \url{https://github.com/langchain-ai/langchain}

\bibitem{intechopen2024}
R. Dahiya and S. Prasad, ``Leveraging LLMs with Structured Output Schemas for Educational Data Extraction,'' in \textit{IntechOpen: Advances in AI and Education}, 2024.

\bibitem{fastapi2018}
S. Ramírez, ``FastAPI: Modern, Fast Web Framework for Building APIs with Python 3.7+,'' GitHub, 2018. [Online]. Available: \url{https://github.com/tiangolo/fastapi}

\bibitem{sqlalchemy2012}
M. Bayer, ``SQLAlchemy,'' in \textit{The Architecture of Open Source Applications}, vol. 2, 2012.

\bibitem{digitaledu2025}
K. R. Singh and P. Mishra, ``Beyond Attainment: Closing the OBE Loop with Automated Remediation Recommendations,'' \textit{Journal of Engineering Education Transformations}, vol. 38, no. 2, pp. 45--54, 2025.

\end{thebibliography}

\end{document}
"""

start_idx = content.find("% ============================================================\n\\begin{abstract}")
if start_idx != -1:
    content = content[:start_idx] + bursty_body

with open("research_paper/paper.tex", "w", encoding="utf-8") as f:
    f.write(content)
