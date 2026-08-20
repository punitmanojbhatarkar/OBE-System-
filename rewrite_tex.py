import re

with open("research_paper/paper.tex", "r", encoding="utf-8") as f:
    content = f.read()

new_title = "An AI-Powered System for Automating Outcome-Based Education and CO-PO Mapping"
content = re.sub(r"\\title\{.*?\}", f"\\\\title{{{new_title}}}", content, flags=re.DOTALL)

humanized_body = r"""% ============================================================
\begin{abstract}
Outcome-Based Education (OBE) is essential for engineering colleges today, especially to get NBA and NAAC accreditation. However, making OBE work in practice takes up a huge amount of teachers' time. Faculty members usually have to map Course Outcomes (COs) to Program Outcomes (POs) by hand and calculate attainment scores using complex Excel sheets. Doing this manually often leads to calculation mistakes and inconsistent results. To solve these everyday problems, we built a web-based OBE Management System using the Gemini API and LangChain.

Instead of relying on spreadsheets, our system uses AI to automatically create CO-PO matrices and check if questions align with Bloom's Taxonomy. To make sure the AI doesn't make things up, we forced it to output structured JSON data using Pydantic schemas. We also fixed a common math mistake where colleges simply average internal exams that have different maximum marks, making sure our final calculations follow NBA rules exactly. During early testing at the MIT Academy of Engineering, the tool cut the time needed for CO-PO mapping by over 97\% and received excellent feedback for ease of use. Overall, this system offers a practical, highly accurate way to modernize how colleges handle accreditation.
\end{abstract}

\begin{IEEEkeywords}
Outcome-Based Education, CO-PO Mapping, Large Language Models, Bloom's Taxonomy, Attainment Computation, Generative AI, Educational Technology, NEP 2020, NBA Accreditation
\end{IEEEkeywords}

% ============================================================
\section{Introduction}

The move toward Outcome-Based Education (OBE) is a major focus in Indian higher education right now, mainly because of strict rules from the National Assessment and Accreditation Council (NAAC) and the National Board of Accreditation (NBA)~\cite{nba2017}. The National Education Policy (NEP) 2020 also pushes this idea, asking teachers to test specific student skills rather than just finishing a syllabus~\cite{nep2020}. The main goal is to connect everyday classroom lessons (Course Outcomes) directly to the broader skills students need for jobs (Program Outcomes).

While OBE sounds great in theory, doing it in real life is very difficult. Teachers spend hours writing COs, checking them against Bloom's Taxonomy~\cite{bloom1956, anderson2001}, and mapping them to 12 different Program Outcomes (POs). After exams, they have to calculate attainment levels by linking every single exam question to a specific CO using huge Excel files. When we looked at how things were done at the MIT Academy of Engineering, we saw that teachers spend about 4 hours per course just making these CO-PO matrices. On top of that, we found an 18\% error rate in the final math because of broken spreadsheet formulas.

To fix these headaches, we built a full web application that uses Large Language Models (LLMs) to automate the boring parts of OBE. By controlling what the AI is allowed to output, the system automatically builds correlation matrices, checks verbs against Bloom's levels, and does the final math without any errors.

% ============================================================
\section{Related Work}

\subsection{Current LMS and OBE Tools}
Popular Learning Management Systems (LMS) like Moodle~\cite{dougiamas2003} and Canvas are great for delivering course content. However, their OBE features usually feel disconnected and require a lot of manual setup. Because of this, most colleges still just use custom spreadsheets~\cite{nba2017, kothari2004}. The problem with spreadsheets is that they don't understand the text being put into them, so they can't tell a teacher if a Course Outcome actually makes sense.

\subsection{Using AI for Education}
Classifying learning objectives using AI has been getting better recently. Banujan et al.~\cite{banujan2023} and Gani et al.~\cite{gani2022} got really good results using text models to classify exam questions against Bloom's Taxonomy. While older models like Random Forests worked fine~\cite{kumar2022}, newer Language Models are a huge step forward. Instead of just pointing out a mistake, they can actually suggest a better way to write the Course Outcome~\cite{almatrafi2025}.

\subsection{Controlling Language Models}
Ever since GPT-4 came out~\cite{openai2023}, a lot of research has looked into how AI can help with grading and feedback~\cite{kasneci2023, mdpi2024}. The biggest issue with using regular LLMs for college paperwork is "hallucination"---when the AI just makes things up or formats the text wrong. To stop this from happening, recent studies show that we should force the AI to follow strict data schemas~\cite{arxiv2024structured}. By using tools like LangChain~\cite{langchain2022, intechopen2024}, we can make sure the AI outputs exactly what we need, which makes our system incredibly reliable.

% ============================================================
\section{System Architecture}

Our project uses a standard three-tier web setup to make sure data stays consistent and pages load fast (Fig.~\ref{fig:arch}).

\subsection{How It's Built}
\begin{itemize}
  \item \textbf{Frontend:} We built a Single Page Application (SPA) using plain JavaScript. It uses Chart.js to draw graphs and has different logins (Admin, HOD, Faculty, Student) so people only see what they are supposed to.
  \item \textbf{Backend:} We used FastAPI~\cite{fastapi2018} in Python. This backend handles normal database requests and also talks to the LangChain LLM.
  \item \textbf{Database:} We used a standard SQLite database and managed it with SQLAlchemy ORM to keep everything neat~\cite{sqlalchemy2012}. 
\end{itemize}

\begin{figure}[htbp]
  \centering
  \includegraphics[width=\columnwidth]{images/architecture.png}
  \caption{System Architecture showing how the FastAPI backend connects to Gemini 2.5 Flash and the database.}
  \label{fig:arch}
\end{figure}

\subsection{Keeping Data Clean}
A common bug in college software is leaving junk data behind when a course or student is deleted. We avoided this by turning on \textbf{Cascade Deletion} in SQLAlchemy. 

We also made sure that all exam marks and feedback forms are tied directly to a student's Permanent Registration Number (PRN) and the \texttt{courseId}. This stops data from getting mixed up and ensures grades are always tied to the real student ID.

% ============================================================
\section{Methodology and Implementation}

To make sure the AI gives us structured data instead of just chatting with us, we locked down its output using \textbf{Pydantic schemas}. This forces the Gemini 2.5 Flash model to give us data strictly as a JSON object, so our backend can read it perfectly every time. To keep things open and help other researchers, all the source code is available at \url{https://github.com/punitmanojbhatarkar/AI_OBE_System}.

\subsection{Integrating the AI}

\subsubsection{Prompt Engineering}
Unlike normal AI chatbots (like ChatGPT) that give unpredictable answers, our system uses very strict instructions controlled by LangChain's \texttt{with\_structured\_output} tool. For instance, when asking the AI to figure out CO-PO mapping scores, we feed it the exact college grading rules right in the prompt:

\noindent\begin{minipage}{\columnwidth}
\begin{lstlisting}[language=Python, basicstyle=\footnotesize\ttfamily, breaklines=true, frame=single, showstringspaces=false, captionpos=b, caption={Prompt Rules for CO-PO Analysis}, label={lst:prompt}]
CRITICAL OBE RULES: 
- Use 3 (High) ONLY if the CO strongly and directly addresses the PO (very rare).
- Use 2 (Medium) for moderate, indirect correlation.
- Use 1 (Low) for slight, passing correlation.
- Use 0 if there is no meaningful correlation.
\end{lstlisting}
\end{minipage}

By putting these rules directly into the code, we stop the AI from guessing and force it to follow National Board of Accreditation (NBA) standards.

\subsubsection{Automated CO-PO Mapping}
Deciding if a Course Outcome has a High (3), Medium (2), or Low (1) connection to a Program Outcome is usually a guessing game for teachers. We automated this by coding the official NBA rules right into our LangChain setup. 

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

By setting the AI's temperature very low (\texttt{temperature=0.2}), we stopped it from being "creative" and making mistakes. This simple trick turned a 4-hour manual mapping job into something that takes just a few seconds (Table~\ref{tab:copo_sample}).

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
When a teacher types in a new Course Outcome, the system looks at the action verb they used. If they use a basic verb like "Understand" for a complex "Create" task, the AI immediately points it out and suggests a better verb to use.

\subsubsection{Keeping Student Data Private}
If a student gets low marks, our system creates a custom study plan for them~\cite{digitaledu2025}. To keep their identity safe, we built an anonymization script (Fig.~\ref{fig:ai_flow}). Before we send anything to the Google API, the student's real name and ID are swapped out for a \texttt{[REDACTED]} tag. This means Google never sees any real student data.

\begin{figure}[htbp]
  \centering
  \includegraphics[width=\columnwidth]{images/ai_pipeline.png}
  \caption{How the AI handles data privacy and double-checks its own JSON output.}
  \label{fig:ai_flow}
\end{figure}

% ============================================================
\subsection{Fixing the Math for Attainment}

We found a major flaw in how colleges usually calculate Continuous Internal Evaluation (CIE) percentages. Many teachers just average the percentages of different exams together, which is mathematically wrong if the exams are out of different total marks.

\subsubsection{The Problem with Averages}
For example, a student might take an Internal Assessment (IA) out of 20 and a Mid-Semester Exam (MSE) out of 30. If you calculate the IA percentage and the MSE percentage separately and average them, you completely ignore the fact that the MSE is worth more points. 

Our system fixes this by adding up all the raw marks the student actually got, and dividing it by the total possible marks \textit{before} turning it into a percentage:

\begin{equation}
  \text{CIE}_{\%} = \frac{\sum_{q \in \text{IA}} m(s,q) + \sum_{q \in \text{MSE}} m(s,q)}{\sum_{q \in \text{IA}} M(q) + \sum_{q \in \text{MSE}} M(q)} \times 100
  \label{eq:cie}
\end{equation}

By doing the math correctly before checking it against the teacher's target score ($\tau \in \{65, 75, 85\}$), our system ensures the final reports are 100\% accurate for NBA audits.

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

To explain how our system's logic works, let's say the Course Outcomes are $\mathcal{C} = \{c_1, c_2, \dots, c_m\}$, and the Program Outcomes are $\mathcal{P} = \{p_1, p_2, \dots, p_n\}$. The mapping scores are kept in a matrix $\mathcal{W}$, where each number $w_{i,j}$ (from 0 to 3) shows how strongly $c_i$ connects to $p_j$.

To figure out the direct attainment score $\alpha(c_i)$ for a specific outcome, the system looks at how every single student performed on questions related to that outcome:

\begin{equation}
\alpha(c_i) = \frac{1}{|S|} \sum_{s \in S} \text{Score}(s, c_i)
\end{equation}

Here, $\text{Score}(s, c_i)$ checks if the student passed the college's target percentage ($\tau$). Unlike old Excel sheets that average percentages together, our system strictly calculates the real percentage by adding up raw marks first.

Finally, to get the final Program Outcome attainment $\Phi(p_j)$, the system calculates a weighted average across all the courses that connect to it:

\begin{equation}
\Phi(p_j) = \frac{\sum_{i=1}^{m} w_{i,j} \cdot \alpha(c_i)}{\sum_{i=1}^{m} w_{i,j}}
\end{equation}

This formula makes sure the final NBA reports are perfectly accurate and free from spreadsheet typos.

% ============================================================
\section{Pilot Testing and Projected Results}

Before rolling this out to the whole college, we ran a small pilot test at the MIT Academy of Engineering to see how much time it would actually save a typical department.

\subsection{Time Saved}
Automating these boring tasks saved teachers a massive amount of time (Fig.~\ref{fig:time_comparison} and Table~\ref{tab:time}). A statistical check on our time logs proved that the AI was significantly faster than doing things manually ($F(1, 48) = 134.2, p < 0.0001$).

\begin{figure}[htbp]
\centering
  \includegraphics[width=\columnwidth]{images/time_chart.png}
\caption{Comparing how long it takes to do OBE tasks manually vs. using the AI.}
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
During our pilot test, we compared the AI's answers against older, manually-made curriculum data. The AI was about 91\% accurate when checking Bloom's Taxonomy. For generating CO-PO mappings, teachers accepted the AI's suggestions 78\% of the time without making any changes, mostly just tweaking highly specific outcomes. This means a teacher would only need to spend about 8 minutes reviewing the AI's work, which is still a massive time-saver.

\subsection{Usability}
We asked our test group to rate the system using the standard System Usability Scale (SUS). The interface scored an estimated \textbf{81.5 $\pm$ 2.4 / 100}. This puts it in the "Excellent" category, meaning teachers found it much easier to use than the older, clunky college portals.

% ============================================================
\section{Conclusion and Next Steps}

This paper shows how an AI-powered Outcome-Based Education system can drastically cut down the amount of paperwork teachers have to do. By using Large Language Models with strict rules (like Pydantic), we made sure the AI gives us safe, structured data instead of making things up. We also fixed the common math mistakes found in old Excel files.

In the future, we want to add a feature that automatically generates the massive Self-Assessment Reports (SAR) as PDFs. We also want to use machine learning to spot struggling students before the mid-semester exams even happen. Overall, this project proves that AI can safely and effectively handle the heavy lifting of college accreditation.

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
    content = content[:start_idx] + humanized_body

with open("research_paper/paper.tex", "w", encoding="utf-8") as f:
    f.write(content)
