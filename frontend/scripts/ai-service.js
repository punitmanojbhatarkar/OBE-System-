/* ============================================================
   AI-SERVICE.JS — Production AI Service for Intelligent Grading & Analytics
   Integrates securely with the Python FastAPI backend and Gemini LLM models.
   
   ============================================================ */

const AI = (() => {

  async function callBackend(endpoint, payload, timeoutMs = 7000) {
    const isLocal = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const apiBase = typeof window !== 'undefined' && window.API_BASE !== undefined ? window.API_BASE : (isLocal ? 'http://127.0.0.1:8080' : 'https://obe-system-backend-t0ri.onrender.com');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${apiBase}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Backend Error: ${res.statusText}`);
      const data = await res.json();
      if (data.success === false) throw new Error(`Backend Error: ${data.error}`);
      return data.data;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  async function generateAssignment({ coText, rbtLevel, topic, numQuestions=2, maxMarks=10 }) {
    const data = await callBackend('generate-assignment', { topic, level: rbtLevel, num: numQuestions, marks: maxMarks });
    return {
      questions: data.questions,
      rubrics: data.rubrics,
      generatedAt: new Date().toISOString(),
      model: 'Gemini-1.5-Pro',
      note: 'AI Generated Content. Ready for review.',
    };
  }

  /* ============================================================
     CurriculumIntelligence: Intelligent Syllabus & Unit Parser Engine
     Recognizes UNIT 1, UNIT 1 & 2, Module 3, multi-topic inputs, and case studies,
     cross-referencing actual DB syllabus modules and Course Outcomes (COs).
     ============================================================ */
  const CurriculumIntelligence = {
    courseKnowledge: {
      'crs-dl': {
        name: 'Deep Learning and Large Language Models (LLM)',
        modules: [
          {
            no: 1,
            coNo: 1,
            title: 'Foundations of Deep Learning & Optimization',
            topics: ['Biological vs Artificial Neuron', 'Perceptron & Multi-Layer Perceptron (MLP)', 'Activation Functions (Sigmoid, Tanh, ReLU, LeakyReLU, GELU)', 'Loss Functions (Cross-Entropy, Focal Loss, MSE)', 'Gradient Descent Variants (Batch, Mini-batch, SGD)', 'Backpropagation Algorithm & Chain Rule Derivation', 'Vanishing & Exploding Gradients', 'Weight Initialization (He, Xavier/Glorot)', 'Optimizers (Momentum, RMSProp, Adam, AdamW)'],
            questions: [
              { text: "[Unit 1: Foundations & Loss Optimization] A deep feedforward neural network training on high-dimensional tabular data experiences severe vanishing gradients and oscillating loss. Derive the mathematical formulation of backpropagation for a 3-layer MLP with cross-entropy loss. Analyze how replacing Sigmoid activations with LeakyReLU and applying the AdamW optimizer with cosine learning rate scheduling mathematically stabilizes weight updates.", rbt: "L4", coNo: 1 },
              { text: "[Unit 1: Numerical Gradient & Loss Formulation] Consider a medical diagnosis classification scenario with a severe 95:5 class imbalance ratio. Formulate the mathematical equation of Focal Loss with focusing parameter gamma and balancing factor alpha. Given a sample prediction probability p_t = 0.85 for easy samples and p_t = 0.15 for hard anomalies, compute the respective loss contributions and explain how this formulation prevents easy negatives from dominating gradient updates.", rbt: "L3", coNo: 1 },
              { text: "[Unit 1: Vanishing Gradients & Weight Initialization Case Study] An autonomous robotics system requires training a 16-layer fully connected network. Analyze why standard random Gaussian initialization causes activation variance to collapse or explode exponentially. Derive the mathematical basis of He (Kaiming) and Xavier (Glorot) initialization, demonstrating how each preserves signal variance across forward passes and backward error flows.", rbt: "L4", coNo: 1 },
              { text: "[Unit 1: Non-Convex Optimization & Generalization Critique] Critique the convergence dynamics of Stochastic Gradient Descent (SGD with Nesterov Momentum) versus Adaptive Moment Estimation (Adam) when traversing non-convex loss surfaces with sharp saddle points. Justify which optimizer guarantees superior out-of-distribution generalization in mission-critical deployments.", rbt: "L5", coNo: 1 }
            ]
          },
          {
            no: 2,
            coNo: 2,
            title: 'Convolutional Neural Networks (CNN) & Computer Vision',
            topics: ['Convolution Operation & 2D Cross-Correlation', 'Strides, Padding & Feature Map Dimensions', 'Pooling Operations (Max, Average, Global)', 'Receptive Field Calculation', 'Classic CNNs (LeNet, AlexNet, VGG)', 'Residual Networks (ResNet) & Skip Connections', 'EfficientNet & Depthwise Separable Convolutions', 'Transfer Learning & Fine-Tuning Strategies', 'Data Augmentation & Regularization'],
            questions: [
              { text: "[Unit 2: Spatial Feature Maps & Parameter Calculation] An image of spatial dimensions 224x224x3 is fed into a convolutional layer with 64 filters of kernel size 7x7, stride 2, and padding 3, followed by a 3x3 max-pooling layer with stride 2. Compute the exact output feature map dimensions, the effective receptive field of the resulting units, and the total trainable parameters including bias terms.", rbt: "L4", coNo: 2 },
              { text: "[Unit 2: Deep Residual Architectures & Industrial Case Study] Design an industrial vision inspection system for detecting micro-fractures in aerospace alloy manufacturing. Formulate the mathematical formulation of the ResNet residual block H(x) = F(x) + x. Prove mathematically why identity shortcut connections allow gradient backpropagation without degradation even as network depth exceeds 100 layers.", rbt: "L6", coNo: 2 },
              { text: "[Unit 2: Transfer Learning & Domain Adaptation] A healthcare startup has only 1,500 labeled retinal fundus scans. Formulate an end-to-end transfer learning strategy using a pre-trained ResNet-50 backbone. Specify the layer freezing methodology, discriminative learning rates, and data augmentation pipeline required to avoid catastrophic forgetting and severe overfitting.", rbt: "L3", coNo: 2 },
              { text: "[Unit 2: Efficient Convolutions for Edge Deployment] Compare Depthwise Separable Convolutions (MobileNet) with standard 2D convolutions. Derive the theoretical reduction in floating-point operations (FLOPs) and parameter count. Evaluate the operational latency and memory trade-offs when deploying onto edge IoT devices.", rbt: "L5", coNo: 2 }
            ]
          },
          {
            no: 3,
            coNo: 3,
            title: 'Sequence Modeling, RNNs & Attention Foundations',
            topics: ['Sequential Data & Recurrent Neural Networks (RNN)', 'Backpropagation Through Time (BPTT)', 'Vanishing & Exploding Gradients in Sequences', 'Long Short-Term Memory (LSTM) Architecture', 'Gated Recurrent Unit (GRU)', 'Sequence-to-Sequence (Seq2Seq) Architectures', 'Encoder-Decoder Paradigms', 'Bahdanau & Luong Attention Mechanisms'],
            questions: [
              { text: "[Unit 3: Recurrent Cell Gating & Vanishing Gradient Analysis] Diagram the internal architecture of a Long Short-Term Memory (LSTM) cell. Write the mathematical equations governing the Forget Gate, Input Gate, Candidate Memory, Cell State update, and Output Gate. Analyze how the constant error carousel mathematically eliminates vanishing gradients over 100+ time steps compared to Vanilla RNNs.", rbt: "L4", coNo: 3 },
              { text: "[Unit 3: Sequence-to-Sequence Machine Translation Case Study] Design a real-time Seq2Seq translation pipeline for translating high-throughput technical documents. Formulate the Bahdanau Additive Attention mechanism, showing how alignment scores, attention weights, and context vectors are computed at each decoder step. Contrast its computational complexity with Luong Multiplicative Attention.", rbt: "L6", coNo: 3 },
              { text: "[Unit 3: Gated Recurrent Unit vs LSTM Empirical Trade-offs] Differentiate the structural differences between Gated Recurrent Units (GRU) and standard LSTMs. Given a real-time speech transcription constraint of <50ms inference latency, evaluate which architecture provides the optimal trade-off between memory footprint and sequence modeling fidelity.", rbt: "L5", coNo: 3 }
            ]
          },
          {
            no: 4,
            coNo: 4,
            title: 'Transformers & Multi-Head Self-Attention Architectures',
            topics: ['Transformer Architectural Blueprint', 'Scaled Dot-Product Attention', 'Multi-Head Attention Mechanism', 'Positional Encodings (Sinusoidal & Rotary RoPE)', 'Feedforward Sub-Layers & LayerNorm (Pre-LN vs Post-LN)', 'Encoder-only Models (BERT, RoBERTa)', 'Decoder-only Models (GPT Series)', 'Encoder-Decoder Models (T5, BART)'],
            questions: [
              { text: "[Unit 4: Scaled Dot-Product & Multi-Head Attention Derivation] Derive the mathematical formula for Scaled Dot-Product Attention: Attention(Q, K, V) = softmax(Q K^T / sqrt(d_k)) V. Prove why the scaling factor 1/sqrt(d_k) is mandatory for large projection dimensions to prevent gradient saturation in the softmax operator. Contrast Multi-Head Attention with single-head attention in terms of representation subspaces.", rbt: "L4", coNo: 4 },
              { text: "[Unit 4: Positional Encodings & Attention Linearity Critique] Formulate the mathematical basis of Sinusoidal Positional Embeddings and Rotary Position Embedding (RoPE). Analyze how RoPE enables relative position modeling through complex multiplication. Critique the quadratic computational and memory complexity O(N^2) of standard self-attention for sequence lengths exceeding 32k tokens.", rbt: "L5", coNo: 4 },
              { text: "[Unit 4: Paradigm Comparison Case Study] Evaluate the fundamental architectural differences between Autoencoding (BERT), Autoregressive (GPT), and Sequence-to-Sequence (T5) architectures. Formulate an engineering rubric to select the optimal model family for: (a) Automated code vulnerability discovery, (b) Zero-shot dialogue generation, and (c) Multilingual summarization.", rbt: "L5", coNo: 4 }
            ]
          },
          {
            no: 5,
            coNo: 5,
            title: 'Large Language Models (LLM) & In-Context Learning',
            topics: ['Autoregressive Pre-training & Next Token Prediction', 'Subword Tokenization (BPE, WordPiece, SentencePiece)', 'Prompt Engineering (Zero-Shot, Few-Shot, CoT, ReAct)', 'Retrieval-Augmented Generation (RAG)', 'Dense Vector Embeddings & Vector Databases (FAISS, Chroma, Milvus)', 'Hallucination Detection & Grounding Mechanisms'],
            questions: [
              { text: "[Unit 5: Enterprise Retrieval-Augmented Generation (RAG) Architecture] Design an enterprise-grade Retrieval-Augmented Generation (RAG) system capable of indexing 1,000,000 confidential internal engineering blueprints. Detail the hierarchical document chunking strategy, dense bi-encoder vs cross-encoder reranking, vector indexing (HNSW), and automated semantic hallucination guardrails.", rbt: "L6", coNo: 5 },
              { text: "[Unit 5: Prompt Engineering & Autonomous Agent Formulation] Formulate advanced prompt pipelines integrating Chain-of-Thought (CoT), Tree-of-Thoughts (ToT), and the ReAct framework for an autonomous software bug resolution agent. Provide concrete system prompts, tool-calling execution loops, and schema validation fallbacks.", rbt: "L4", coNo: 5 },
              { text: "[Unit 5: Tokenization Dynamics & Out-of-Vocabulary Analysis] Explain the Byte-Pair Encoding (BPE) tokenization algorithm with a step-by-step example on a domain corpus. Analyze how tokenization artifacts introduce vulnerabilities such as prompt injection susceptibility and computational inefficiencies in mathematical calculation.", rbt: "L3", coNo: 5 }
            ]
          },
          {
            no: 6,
            coNo: 6,
            title: 'Efficient LLM Adaptation, Quantization & Alignment',
            topics: ['Parameter-Efficient Fine-Tuning (PEFT)', 'Low-Rank Adaptation (LoRA & QLoRA)', 'Model Quantization (INT8, INT4, AWQ, GPTQ)', 'Alignment Techniques (RLHF, DPO, PPO)', 'Inference Acceleration (KV Caching, FlashAttention, vLLM)', 'Evaluation Benchmarks (MMLU, GSM8K, MT-Bench) & Ethical Safety'],
            questions: [
              { text: "[Unit 6: LoRA Rank-Decomposition & Memory Calculations] A 7B parameter LLM (hidden dimension d=4096) must be fine-tuned on a single consumer GPU with 16GB VRAM. Formulate the Low-Rank Adaptation (LoRA) weight update W = W_0 + (alpha/r) * B * A with rank r=16 applied to query and value projection matrices. Calculate the exact parameter reduction ratio and explain how QLoRA 4-bit NormalFloat (NF4) quantization enables this workload.", rbt: "L3", coNo: 6 },
              { text: "[Unit 6: Alignment Dynamics & Direct Preference Optimization (DPO)] Contrast Reinforcement Learning from Human Feedback (RLHF with PPO) with Direct Preference Optimization (DPO). Derive the closed-form DPO objective from the Bradley-Terry preference model, proving why DPO eliminates the instability of training a separate reward model.", rbt: "L5", coNo: 6 },
              { text: "[Unit 6: High-Throughput Inference Engineering Case Study] Design a scalable low-latency LLM serving cluster serving 500 concurrent requests/second. Architect the integration of PagedAttention (vLLM), continuous batching, Key-Value (KV) cache quantization, and speculative decoding. Quantify the throughput increase and latency reduction.", rbt: "L6", coNo: 6 }
            ]
          }
        ]
      },
      'crs-eda': {
        name: 'Exploratory Data Analysis and Visualization',
        modules: [
          {
            no: 1,
            coNo: 1,
            title: 'Data Cleansing, Preprocessing & Quality Engineering',
            topics: ['Missing Value Imputation', 'Outlier Detection (IQR, Z-Score, Isolation Forest)', 'Feature Scaling (MinMax, Standard, Robust Scaler)', 'Categorical Encodings (One-Hot, Target, Binary)', 'Data Integrity & Transformation Pipelines'],
            questions: [
              { text: "[Unit 1: Data Cleansing & Robust Imputation Case Study] A smart IoT energy grid streaming dataset contains 15% missing sensor telemetry, high kurtosis, and extreme voltage spikes. Formulate a complete preprocessing pipeline. Compare Robust Scaling with Min-Max normalization in the presence of heavy-tailed distributions and justify your imputation choices.", rbt: "L4", coNo: 1 },
              { text: "[Unit 1: Outlier Detection Mathematical Formulation] Given an empirical financial transactions dataset, derive the mathematical boundary conditions for Interquartile Range (IQR) outlier fences and Isolation Forest path length anomaly scoring. Calculate upper and lower thresholds for a sample series and identify anomalous transactions.", rbt: "L3", coNo: 1 }
            ]
          },
          {
            no: 2,
            coNo: 2,
            title: 'Descriptive, Inferential Statistics & Hypothesis Testing',
            topics: ['Measures of Central Tendency & Dispersion', 'Probability Distributions & Central Limit Theorem', 'Correlation vs Causation (Pearson, Spearman, Kendall)', 'Hypothesis Testing (t-test, Z-test, ANOVA, Chi-Square)', 'P-Value Interpretation & Type I/II Errors'],
            questions: [
              { text: "[Unit 2: Statistical Hypothesis Testing Experiment Design] Formulate an A/B testing experiment to validate whether an algorithmic search redesign yields statistically significant conversion improvement. Specify null and alternate hypotheses, perform Two-Sample t-test and Chi-Square independence test, and interpret Type I vs Type II error trade-offs at alpha = 0.01.", rbt: "L4", coNo: 2 },
              { text: "[Unit 2: Multivariate Correlation Analysis & Multi-collinearity] Analyze an industrial dataset exhibiting severe multi-collinearity among predictor variables. Compute Pearson and Spearman rank correlation coefficients. Evaluate the Variance Inflation Factor (VIF) and outline remedial strategies.", rbt: "L4", coNo: 2 }
            ]
          },
          {
            no: 3,
            coNo: 3,
            title: 'Dimensionality Reduction & Manifold Learning',
            topics: ['Curse of Dimensionality', 'Principal Component Analysis (PCA)', 'Singular Value Decomposition (SVD)', 'Eigenvalues & Explained Variance Ratio', 't-SNE vs UMAP for Non-linear Manifolds', 'Feature Selection (RFE, LASSO L1, Mutual Info)'],
            questions: [
              { text: "[Unit 3: Principal Component Analysis Mathematical Derivation] Derive the mathematical steps of Principal Component Analysis (PCA) starting from the data covariance matrix. Prove that the first principal component aligns with the eigenvector possessing the largest eigenvalue. Calculate the cumulative explained variance for a given 4x4 covariance matrix.", rbt: "L4", coNo: 3 },
              { text: "[Unit 3: Non-Linear Dimensionality Reduction Critique] Contrast linear PCA with non-linear manifold projection techniques (t-SNE and UMAP). Critically evaluate how each method preserves local neighborhood topologies versus global manifold geometry when visualizing high-dimensional single-cell genomic data.", rbt: "L5", coNo: 3 }
            ]
          },
          {
            no: 4,
            coNo: 4,
            title: 'Multivariate Visualization & Visual Analytics',
            topics: ['Visual Encodings & Gestalt Principles', 'Bivariate & Trivariate Visualizations', 'Heatmaps & Hierarchical Dendrograms', 'Distribution Plots (Violin, Ridge, KDE)', 'Interactive Analytical Dashboards'],
            questions: [
              { text: "[Unit 4: Visual Analytics & Multi-Attribute Dashboard Architecture] Design an executive monitoring dashboard for tracking real-time hospital patient admissions, resource utilization, and mortality indicators. Specify the visual encoding channels (color, position, size, shape), chart choices (KDE, violin, faceted scatter), and interactive filtering mechanisms adhering to Shneiderman's Information Seeking Mantra.", rbt: "L6", coNo: 4 }
            ]
          },
          {
            no: 5,
            coNo: 5,
            title: 'Time Series Exploration & Signal Decomposition',
            topics: ['Temporal Data Characteristics', 'Trend, Seasonality & Residual Decomposition', 'Stationarity & Augmented Dickey-Fuller (ADF) Test', 'Autocorrelation (ACF) & Partial Autocorrelation (PACF)', 'Moving Averages & Exponential Smoothing'],
            questions: [
              { text: "[Unit 5: Time Series Decomposition & Stationarity Validation] Formulate a time-series exploration framework for e-commerce traffic with seasonal demand shocks. Apply additive vs multiplicative decomposition. State the Augmented Dickey-Fuller (ADF) test equations and interpret ACF/PACF correlograms to determine optimal lag parameters.", rbt: "L4", coNo: 5 }
            ]
          },
          {
            no: 6,
            coNo: 6,
            title: 'Domain Analytics & Real-World Case Studies',
            topics: ['Healthcare Analytics Case Study', 'Financial Fraud Analytics', 'Customer Churn & Behavioral Clustering', 'Ethics, Data Privacy & Differential Privacy'],
            questions: [
              { text: "[Unit 6: End-to-End Enterprise Fraud Detection Case Study] Develop a comprehensive exploratory analytics report investigating anomalous credit card transactions. Synthesize feature engineering, unsupervised clustering, and class-imbalance remedies into an actionable risk assessment framework for regulatory compliance.", rbt: "L6", coNo: 6 }
            ]
          }
        ]
      }
    },

    parseCurriculumTopic(inputStr, courseId, courseName) {
      const raw = (inputStr || '').trim();
      if (!raw) {
        return {
          isUnitQuery: false,
          matchedUnits: [],
          topicsList: [],
          isCaseStudy: false,
          summaryHtml: '',
          questionPool: []
        };
      }

      const roman = { 'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
      const isCaseStudy = /(?:case\s*study|real[- ]world|scenario|industry|practical|application)/i.test(raw);
      const matchedUnitsSet = new Set();

      // Check range: Unit 1-3 or Units 1 to 3
      const rangeMatch = raw.match(/(?:units?|modules?|chapters?)\s*([0-9ivx]+)\s*(?:-|to)\s*([0-9ivx]+)/i);
      if (rangeMatch) {
        let start = parseInt(rangeMatch[1], 10);
        if (isNaN(start)) start = roman[rangeMatch[1].toUpperCase()] || 1;
        let end = parseInt(rangeMatch[2], 10);
        if (isNaN(end)) end = roman[rangeMatch[2].toUpperCase()] || start;
        for (let u = Math.min(start, end); u <= Math.max(start, end); u++) {
          if (u >= 1 && u <= 10) matchedUnitsSet.add(u);
        }
      }

      // Check multiple with & or and or commas: "Unit 1 & 2", "Unit 1, 2, 3", "UNIT 1 and 2"
      const multiMatch = raw.match(/(?:units?|modules?|chapters?)\s*([0-9ivx]+(?:\s*(?:,|&|and)\s*[0-9ivx]+)+)/i);
      if (multiMatch) {
        const parts = multiMatch[1].split(/[,&]|and/i);
        parts.forEach(p => {
          const clean = p.trim();
          let num = parseInt(clean, 10);
          if (isNaN(num)) num = roman[clean.toUpperCase()];
          if (num && num >= 1 && num <= 10) matchedUnitsSet.add(num);
        });
      }

      // Check single unit: "UNIT 1", "Module 2", "Unit IV"
      if (matchedUnitsSet.size === 0) {
        const singleMatch = raw.match(/(?:unit|module|chapter|mod)\s*([0-9ivx]+)/i);
        if (singleMatch) {
          let num = parseInt(singleMatch[1], 10);
          if (isNaN(num)) num = roman[singleMatch[1].toUpperCase()];
          if (num && num >= 1 && num <= 10) matchedUnitsSet.add(num);
        }
      }

      // Check for standalone "u1", "u1&u2", "unit1", "unit2"
      if (matchedUnitsSet.size === 0) {
        const uPrefix = raw.match(/\bu([1-6])\b/gi);
        if (uPrefix) {
          uPrefix.forEach(u => matchedUnitsSet.add(parseInt(u.replace(/u/i, ''))));
        }
      }

      const matchedUnits = Array.from(matchedUnitsSet).sort((a, b) => a - b);
      const isUnitQuery = matchedUnits.length > 0;

      // Detect multiple topics if not unit query
      let topicsList = [];
      if (raw.includes(',') || raw.includes(';') || raw.includes('+')) {
        topicsList = raw.split(/[,;+]/).map(t => t.trim()).filter(t => t.length > 1);
      } else if (!isUnitQuery) {
        topicsList = [raw];
      }

      // Resolve syllabus data
      const dbSyllabus = (typeof DB !== 'undefined' && DB.syllabus && courseId) ? DB.syllabus.byCourse(courseId) : null;
      const dbCOs = (typeof DB !== 'undefined' && DB.cos && courseId) ? DB.cos.byCourse(courseId) : [];

      const cLower = (courseName || '').toLowerCase();
      let courseKB = null;
      if (courseId && CurriculumIntelligence.courseKnowledge[courseId]) {
        courseKB = CurriculumIntelligence.courseKnowledge[courseId];
      } else if (cLower.includes('deep learning') || cLower.includes('llm') || cLower.includes('neural')) {
        courseKB = CurriculumIntelligence.courseKnowledge['crs-dl'];
      } else if (cLower.includes('exploratory') || cLower.includes('data analysis') || cLower.includes('eda')) {
        courseKB = CurriculumIntelligence.courseKnowledge['crs-eda'];
      }

      const unitDetails = [];
      const questionPool = [];

      if (isUnitQuery) {
        matchedUnits.forEach(uNo => {
          const dbMod = dbSyllabus && dbSyllabus.modules ? dbSyllabus.modules.find(m => Number(m.no) === uNo) : null;
          const kbMod = courseKB && courseKB.modules ? courseKB.modules.find(m => Number(m.no) === uNo) : null;
          const coNo = (dbMod && dbMod.coNo) ? dbMod.coNo : (kbMod && kbMod.coNo ? kbMod.coNo : uNo);
          const coObj = dbCOs.find(c => Number(c.no || c.coNo) === Number(coNo));

          const title = dbMod?.title || kbMod?.title || `Unit ${uNo} Curriculum Module`;
          const desc = dbMod?.description || (kbMod ? kbMod.topics.join(', ') : `Comprehensive domain principles for Unit ${uNo}`);
          const topics = kbMod ? kbMod.topics : (desc.split(/[,;.\n]+/).map(s=>s.trim()).filter(Boolean));

          unitDetails.push({
            unitNo: uNo,
            coNo,
            coText: coObj?.text || `Master and analyze concepts of Unit ${uNo}`,
            title,
            description: desc,
            topics
          });

          if (kbMod && kbMod.questions) {
            kbMod.questions.forEach(q => questionPool.push({ ...q, unitNo: uNo, coNo }));
          } else {
            questionPool.push({
              text: `[Unit ${uNo}: ${title} Analytical Case Study] Analyze the core theoretical foundations and computational constraints of ${title}. Differentiate the primary architectural methodologies and evaluate their performance in real-world engineering applications.`,
              rbt: 'L4',
              coNo,
              unitNo: uNo
            });
            questionPool.push({
              text: `[Unit ${uNo}: ${title} Problem Formulation] Formulate an end-to-end computational framework to address optimization and scalability bottlenecks in ${title}. Compute theoretical time-space complexity and justify your engineering trade-offs.`,
              rbt: 'L3',
              coNo,
              unitNo: uNo
            });
            questionPool.push({
              text: `[Unit ${uNo}: ${title} Architectural Design] Design an industrial-grade system architecture implementing ${title} under strict latency and fault-tolerance constraints. Present architectural schematics and critique edge cases.`,
              rbt: 'L6',
              coNo,
              unitNo: uNo
            });
          }
        });
      }

      // Visual feedback HTML
      let summaryHtml = '';
      if (isUnitQuery) {
        const unitPills = unitDetails.map(u => `<span style="display:inline-flex;align-items:center;gap:4px;background:#e0e7ff;color:#3730a3;font-weight:700;padding:3px 9px;border-radius:12px;font-size:11.5px;border:1px solid #c7d2fe;">Unit ${u.unitNo}: ${u.title} (➔ CO${u.coNo})</span>`).join(' ');
        const topicsSnippet = unitDetails.map(u => u.topics.slice(0, 4).join(', ')).join(' | ');

        summaryHtml = `
          <div style="background:var(--surface-2,#f8fafc);border:1px solid var(--border,#cbd5e1);border-left:4px solid #4f46e5;padding:10px 14px;border-radius:8px;font-size:12px;line-height:1.5;box-shadow:0 2px 8px rgba(79,70,229,0.06);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:var(--text-primary,#1e293b);">
                <span style="color:#4f46e5;font-size:14px;">🎯</span> <span>Syllabus Intelligence: Detected ${matchedUnits.length === 1 ? 'Unit ' + matchedUnits[0] : 'Units ' + matchedUnits.join(' & ')}</span>
              </div>
              ${isCaseStudy ? '<span style="background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">Scenario & Case Study Mode</span>' : ''}
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;">
              ${unitPills}
            </div>
            <div style="font-size:11.5px;color:var(--text-secondary,#64748b);margin-top:4px;">
              <strong style="color:var(--text-primary,#334155);">Syllabus Topics Covered:</strong> ${topicsSnippet}…
            </div>
            <div style="font-size:11.5px;color:#059669;margin-top:4px;font-weight:600;display:flex;align-items:center;gap:4px;">
              <span>⚡</span> <span>Auto-aligned Question Blueprint Matrix: Questions mapped directly to ${matchedUnits.map(u => 'CO' + (unitDetails.find(d => d.unitNo === u)?.coNo || u)).join(', ')}.</span>
            </div>
          </div>
        `;
      } else if (topicsList.length > 1) {
        summaryHtml = `
          <div style="background:var(--surface-2,#f8fafc);border:1px solid var(--border,#cbd5e1);border-left:4px solid #2563eb;padding:10px 14px;border-radius:8px;font-size:12px;line-height:1.5;">
            <div style="display:flex;align-items:center;gap:6px;font-weight:700;color:var(--text-primary,#1e293b);margin-bottom:6px;">
              <span style="color:#2563eb;font-size:14px;">📚</span> <span>Multi-Topic Formulation Detected (${topicsList.length} distinct topics)</span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;">
              ${topicsList.map(t => `<span style="background:#eff6ff;color:#1d4ed8;padding:2px 8px;border-radius:12px;font-size:11px;border:1px solid #bfdbfe;font-weight:600;">${t}</span>`).join(' ')}
            </div>
            <div style="font-size:11.5px;color:var(--text-secondary,#64748b);margin-top:4px;">
              The AI assessment will formulate distinct, scenario-driven questions corresponding specifically to each topic above.
            </div>
          </div>
        `;
      }

      return {
        rawInput: raw,
        isUnitQuery,
        matchedUnits,
        topicsList,
        isCaseStudy,
        unitDetails,
        summaryHtml,
        questionPool
      };
    }
  };

  if (typeof window !== 'undefined') {
    window.CurriculumIntelligence = CurriculumIntelligence;
  }

  function buildClientSideAssessment({ courseName, assessmentType='assignment', topic='', level='L3', numQuestions=3, maxMarks=20, weightage=null, targetCOs=[], questionBlueprint=null }) {
    const numQ = questionBlueprint && questionBlueprint.length ? questionBlueprint.length : Math.max(1, Math.min(parseInt(numQuestions) || 3, 10));
    const totalM = Math.max(5, parseInt(maxMarks) || 20);

    const parsed = CurriculumIntelligence.parseCurriculumTopic(topic, null, courseName);
    const cleanTopic = topic.trim() || (courseName ? `Core syllabus modules of ${courseName}` : 'Advanced Engineering Computing');

    const typeTitles = {
      'ca': `Continuous Assessment (CA) on ${cleanTopic.slice(0, 32)}`,
      'assignment': `Continuous Assessment (CA) on ${cleanTopic.slice(0, 32)}`,
      'ia': `Internal Assessment Test (IA) – ${cleanTopic.slice(0, 32)}`,
      'mse': `Mid Semester Examination (MSE) – ${courseName || 'Course'}`,
      'ese': `End Semester Examination (ESE) – ${courseName || 'Course'}`
    };
    const title = typeTitles[assessmentType.toLowerCase()] || `Assessment – ${cleanTopic.slice(0, 32)}`;

    const questions = [];
    const rubrics = [];

    // Build question list based on detected units or blueprints
    const baseM = Math.floor(totalM / numQ);
    const remM = totalM % numQ;

    for (let i = 0; i < numQ; i++) {
      const qNo = i + 1;
      const qSpec = (questionBlueprint && questionBlueprint[i]) ? questionBlueprint[i] : null;

      let qText = '';
      let qRbt = qSpec?.rbt || (level === 'Balanced' ? (['L2', 'L3', 'L4', 'L5', 'L6'][i % 5]) : (level || 'L3'));
      let coNo = qSpec?.coNo;
      let qMarks = qSpec?.marks !== undefined ? parseFloat(qSpec.marks) : (baseM + (i === numQ - 1 ? remM : 0));

      if (parsed.isUnitQuery && parsed.questionPool.length > 0) {
        // Distribute questions across the requested units
        const units = parsed.matchedUnits;
        let uIdx = 0;
        if (units.length === 1) {
          uIdx = 0;
        } else if (units.length === 2) {
          uIdx = (i < Math.ceil(numQ / 2)) ? 0 : 1;
        } else {
          uIdx = Math.floor(i / Math.max(1, Math.ceil(numQ / units.length))) % units.length;
        }
        const targetUnit = units[uIdx];
        const unitDetail = parsed.unitDetails.find(d => d.unitNo === targetUnit);
        if (!coNo) coNo = unitDetail ? unitDetail.coNo : targetUnit;

        // Pick matching question for this unit
        const unitQuestions = parsed.questionPool.filter(q => q.unitNo === targetUnit);
        const poolToUse = unitQuestions.length > 0 ? unitQuestions : parsed.questionPool;
        const candidate = poolToUse[i % poolToUse.length];
        qText = candidate.text;
        if (!qSpec?.rbt) qRbt = candidate.rbt || qRbt;
      } else if (parsed.topicsList && parsed.topicsList.length > 1) {
        const targetTopic = parsed.topicsList[i % parsed.topicsList.length];
        if (!coNo) coNo = (targetCOs && targetCOs.length) ? targetCOs[i % targetCOs.length] : ((i % 4) + 1);
        qText = `[Focus Topic: ${targetTopic}] Formulate a comprehensive engineering analysis of ${targetTopic}. Contrast key operational parameters, compute theoretical bounds, and evaluate implementation trade-offs under high-throughput constraints.`;
      } else {
        if (!coNo) coNo = (targetCOs && targetCOs.length) ? targetCOs[i % targetCOs.length] : ((i % 4) + 1);
        qText = `Analyze the fundamental theoretical principles and engineering constraints underlying ${cleanTopic}. Formulate computational models, compute time-space complexity, and evaluate scalability in production environments.`;
      }

      questions.push({
        qNo,
        text: qText,
        marks: qMarks,
        coNo: parseInt(coNo) || 1,
        rbt: qRbt
      });

      rubrics.push({
        criterion: `Q${qNo}: Technical Rigor & Engineering Competence (CO${coNo}, ${qRbt})`,
        exceptional: '90–100%: Comprehensive, mathematically and technically rigorous answer with complete derivation/design, precise notation, and critical analysis.',
        best: '70–89%: Mostly accurate response covering core concepts with minor omissions in edge cases or secondary derivations.',
        average: '50–69%: Partial understanding demonstrated; conceptual grasp present but lacks quantitative depth, correct equations, or thorough explanation.',
        low: '<50%: Superficial or incomplete attempt with fundamental conceptual inaccuracies and absent technical justification.'
      });
    }

    const instructions = [
      '1. All questions are compulsory. Figures to the right indicate full marks allocated.',
      '2. Assume suitable engineering parameters or constraints wherever necessary and state them clearly.',
      '3. Neatly drawn schematic diagrams, mathematical equations, and architectural models carry due weightage.',
      '4. Non-programmable scientific calculators are permitted.'
    ];

    const computedWeightage = weightage !== null && weightage !== undefined ? parseFloat(weightage) : (assessmentType === 'ia' ? 20 : (assessmentType === 'mse' ? 30 : (assessmentType === 'ese' ? 60 : (assessmentType === 'ca' ? 25 : totalM))));

    return {
      title,
      assessmentType,
      maxMarks: totalM,
      weightage: computedWeightage,
      instructions,
      questions,
      rubrics,
      generatedAt: new Date().toISOString(),
      model: 'Autonomous Engineering OBE Generator / Gemini-1.5-Pro',
      note: 'AI Generated OBE-Compliant Question Blueprint. Ready for faculty review.'
    };
  }

  async function generateProfessionalAssessment({ courseName, assessmentType='assignment', topic='', level='L3', numQuestions=3, maxMarks=20, weightage=null, targetCOs=[], questionBlueprint=null }) {
    try {
      const data = await callBackend('generate-professional-assessment', {
        courseName: courseName || '',
        assessmentType: assessmentType || 'assignment',
        topic: topic || '',
        level: level || 'L3',
        num: parseInt(numQuestions) || 3,
        marks: parseInt(maxMarks) || 20,
        weightage: weightage !== null ? parseFloat(weightage) : null,
        targetCOs: targetCOs || [],
        questionBlueprint: questionBlueprint || []
      }, 7000);
      return {
        title: data.title,
        assessmentType: data.assessmentType,
        maxMarks: data.maxMarks || parseInt(maxMarks) || 20,
        weightage: data.weightage !== undefined ? data.weightage : (weightage !== null ? parseFloat(weightage) : 20),
        instructions: data.instructions || [],
        questions: data.questions || [],
        rubrics: data.rubrics || [],
        generatedAt: new Date().toISOString(),
        model: 'Gemini-2.5-Pro / NBA-Evaluator',
        note: 'AI Generated OBE-Compliant Question Blueprint. Ready for faculty review.'
      };
    } catch (err) {
      console.warn('[AI Service] Fast fallback to client-side autonomous domain generator:', err);
      return buildClientSideAssessment({ courseName, assessmentType, topic, level, numQuestions, maxMarks, weightage, targetCOs, questionBlueprint });
    }
  }

  async function gradeSubmission({ submissionText, rubrics, maxMarks }) {
    const data = await callBackend('grade', { text: submissionText, rubrics, maxMarks });
    return {
      ...data,
      gradedAt: new Date().toISOString(),
      model: 'Gemini-1.5-Pro',
      note: 'AI Assessed Grade. Please review and confirm.',
    };
  }

  async function generateTeachingPhilosophy({ courseName, deptVision, deptMission }) {
    return await callBackend('philosophy', { courseName, deptVision: deptVision||'', deptMission: deptMission||'' });
  }

  async function analyzeBlooms(cos) {
    return await callBackend('analyze-blooms', { cos });
  }

  async function autoMapCOPO(cos, pos, psoDefs) {
    return await callBackend('auto-map-copo', { cos, pos, pso_defs: psoDefs });
  }

  async function generateRemedialPlan(studentName, weakCOs) {
    return await callBackend('remedial', { student: studentName, weakCOs });
  }


  async function extractSyllabusFromText(text) {
    return await callBackend('extract-syllabus', { text });
  }

  async function generateCOsFromSyllabus(syllabusText) {
    return await callBackend('generate-cos', { syllabus: syllabusText });
  }

  function getUsageStats() {

    return { used: 0, max: 9999, pct: 0, enabled: true };
  }

  async function callRealAPI(prompt, model='gemini-1.5-pro') {
    return await callBackend('chat', { message: prompt, context: '' });
  }

  return { generateAssignment, generateProfessionalAssessment, gradeSubmission, generateTeachingPhilosophy, analyzeBlooms, autoMapCOPO, generateRemedialPlan, extractSyllabusFromText, generateCOsFromSyllabus, getUsageStats, callRealAPI, curriculum: CurriculumIntelligence, parseCurriculumTopic: CurriculumIntelligence.parseCurriculumTopic };
})();
