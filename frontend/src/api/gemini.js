const GROQ_API_KEY = "";
const GEMINI_API_KEY = "";

const GROQ_MODELS = [
  "groq/compound-mini",
  "groq/compound",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
];

const CANDIDATE_MODELS = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-pro"
];

async function callGeminiApi(prompt) {
  // 1. Try Groq API first (Llama 3.3 70B & fast inference)
  if (GROQ_API_KEY) {
    for (const modelName of GROQ_MODELS) {
      try {
        const url = "https://api.groq.com/openai/v1/chat/completions";
        const requestBody = {
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2500
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (text && text.trim()) {
            console.log(`Groq API generated response using model: ${modelName}`);
            return text.trim();
          }
        }
      } catch (err) {
        console.warn(`Groq model ${modelName} error:`, err.message);
      }
    }
  }

  // 2. Fallback to Gemini models
  for (const modelName of GEMINI_API_KEY ? CANDIDATE_MODELS : []) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim()) {
          console.log(`Google Gemini API generated response using model: ${modelName}`);
          return text.trim();
        }
      }
    } catch (err) {
      console.warn(`Google Gemini model ${modelName} error:`, err.message);
    }
  }
  return null;
}

export async function generateSyllabusWithAI(courseTitle, category = "TCM One Information Tech", duration = "20 Days", courseDescription = "") {
  const daysMatch = (duration || "").match(/(\d+)\s*(days?|weeks?|months?)/i);
  let totalDays = 20;
  if (daysMatch) {
    const val = parseInt(daysMatch[1], 10);
    const unit = daysMatch[2].toLowerCase();
    totalDays = unit.startsWith("week") ? val * 7 : unit.startsWith("month") ? val * 30 : val;
  }
  totalDays = Math.min(Math.max(totalDays, 5), 45);

  const titleLower = (courseTitle || "").toLowerCase();

  const prompt = `You are TCM One AI acting as Lead Curriculum Architect & Senior Staff Engineer at TCM One Academy.
Design a STEP-BY-STEP, RESEARCH-GRADE, DEEP DAY-BY-DAY CURRICULUM for a course strictly based on its title, description, category, and total duration.

Course Title: "${courseTitle}"
Course Description: "${courseDescription || "Comprehensive practical course covering hands-on industry mastery."}"
Category: "${category}"
Total Duration: "${totalDays} Days" (${duration})

CRITICAL QUALITY INSTRUCTIONS FOR STEP-BY-STEP CURRICULUM:
1. Generate EXACTLY ${totalDays} Step-by-Step Day modules matching the course duration ("Day 1:", "Day 2:", ..., "Day ${totalDays}:").
2. Tailor every module and lesson specifically to the provided Course Title ("${courseTitle}") and Course Description ("${courseDescription}").
3. Include clear step-by-step progression:
   - Early Days: Core foundations, concepts, environment setup, syntax & fundamentals outlined in the description.
   - Middle Days: Intermediate practical building, APIs, frameworks, architectures, and state management.
   - Advanced Days: Advanced features, optimization, security, live project lab, testing, and deployment.
4. Each day module MUST contain 3 IN-DEPTH, PRACTICAL LESSONS with concrete subtopics and hands-on coding labs!

Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "modules": [
    {
      "id": "m1",
      "title": "Day 1: [Step-by-Step Topic Title based on course description]",
      "lessons": [
        "Lesson 1.1: [Specific concept/syntax subtopic]",
        "Lesson 1.2: [Practical implementation subtopic]",
        "Lesson 1.3: Hands-on Lab: [Specific practical building exercise]"
      ]
    }
  ]
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);
      if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
        return parsed.modules;
      }
    }
  } catch (error) {
    console.warn("Groq AI Syllabus Generation failed, using dynamic research fallback:", error);
  }

  // Deep Domain-Specific Research Fallback Curriculums
  let researchTemplates = [];

  if (titleLower.includes("mern") || titleLower.includes("full stack") || titleLower.includes("web") || titleLower.includes("frontend") || titleLower.includes("backend")) {
    researchTemplates = [
      {
        title: "HTML5 Foundations & Semantic Web Structure",
        lessons: [
          "Lesson 1: Semantic Tags (<header>, <nav>, <main>, <article>, <section>, <footer>) & Page Layouts",
          "Lesson 2: HTML Forms, Input Types (email, date, color, select, textarea) & Native Validations",
          "Lesson 3: Hands-on Lab: Building an Accessible Semantic Web Document with Form Controls"
        ]
      },
      {
        title: "HTML5 Advanced Media, Audio/Video & Accessibility",
        lessons: [
          "Lesson 1: Embedding Media with <audio>, <video>, <canvas>, SVG & iFrames",
          "Lesson 2: Web Accessibility (WCAG, ARIA Roles, Screen Reader Support & Tab Indexing)",
          "Lesson 3: Hands-on Lab: Creating a Responsive Multi-Media Dashboard Page"
        ]
      },
      {
        title: "CSS3 Fundamentals, Box Model & Typography",
        lessons: [
          "Lesson 1: CSS Selectors (Element, Class, ID, Attribute, Pseudo-classes :hover, :nth-child)",
          "Lesson 2: CSS Box Model (margin, padding, border, content, box-sizing: border-box)",
          "Lesson 3: Hands-on Lab: Designing Modern Typographic Cards & Custom Utility Classes"
        ]
      },
      {
        title: "CSS Flexbox Layout System & Navigation Design",
        lessons: [
          "Lesson 1: Flex Container Properties (display: flex, flex-direction, justify-content, align-items)",
          "Lesson 2: Flex Item Mechanics (flex-grow, flex-shrink, flex-basis, align-self)",
          "Lesson 3: Hands-on Lab: Building a Fully Responsive Header Bar & Flexbox Product Grid"
        ]
      },
      {
        title: "CSS Grid Architecture & Responsive Media Queries",
        lessons: [
          "Lesson 1: Grid Grid Layout (grid-template-columns, grid-template-rows, gap, grid-area)",
          "Lesson 2: Responsive Breakpoints with Media Queries (@media max-width: 768px, 1024px)",
          "Lesson 3: Hands-on Lab: Constructing a Fluid Multi-Column Dashboard Layout for Mobile & Web"
        ]
      },
      {
        title: "CSS Frameworks: Bootstrap 5 & Component Library Integration",
        lessons: [
          "Lesson 1: Bootstrap 5 Grid System (container, row, col-md-6, col-lg-4) & Spacing Utilities",
          "Lesson 2: Bootstrap UI Components (Navbar, Cards, Modals, Badges, Buttons, Forms & Tooltips)",
          "Lesson 3: Hands-on Lab: Rapid Prototyping an Admin Dashboard with Bootstrap 5"
        ]
      },
      {
        title: "Modern CSS Utilities: Tailwind CSS Setup & Custom Variables",
        lessons: [
          "Lesson 1: Tailwind CSS Utility-First Styling (Flex, Grid, Padding, Dark Mode Variant)",
          "Lesson 2: Custom CSS Variables (var(--primary)) & Dark/Light Theme Switching",
          "Lesson 3: Hands-on Lab: Building a Sleek Glassmorphism SaaS Hero Section with Tailwind"
        ]
      },
      {
        title: "Modern JavaScript (ES6+) Syntax & Core Logic",
        lessons: [
          "Lesson 1: Variable Scoping (const vs let vs var), Template Literals & Arrow Functions",
          "Lesson 2: Object & Array Destructuring, Spread Operator (...), Rest Parameters & Default Values",
          "Lesson 3: Hands-on Lab: Writing Modular Utility Functions & Object Manipulations"
        ]
      },
      {
        title: "DOM Manipulation & Interactive Event Handling",
        lessons: [
          "Lesson 1: Document Object Model Selection (document.querySelector, querySelectorAll)",
          "Lesson 2: Event Listeners (click, submit, keydown), Event Bubbling & Delegation",
          "Lesson 3: Hands-on Lab: Building an Interactive Dynamic Todo App with LocalStorage Sync"
        ]
      },
      {
        title: "Asynchronous JavaScript, Promises & Fetch API",
        lessons: [
          "Lesson 1: Callbacks, Event Loop, Microtask Queue & JavaScript Promises",
          "Lesson 2: Async/Await Syntax, Fetch API (GET/POST Requests) & Error Handling (try/catch)",
          "Lesson 3: Hands-on Lab: Building a Live Weather & News Aggregator Widget via Public APIs"
        ]
      },
      {
        title: "Advanced JavaScript Array Methods & Functional Logic",
        lessons: [
          "Lesson 1: Functional Iterators (map(), filter(), reduce(), find(), every(), some())",
          "Lesson 2: Closures, Lexical Scope, Higher-Order Functions & Pure Functions",
          "Lesson 3: Hands-on Lab: Filtering, Sorting & Aggregating Complex JSON Data Arrays"
        ]
      },
      {
        title: "React.js Core Architecture & JSX Templating",
        lessons: [
          "Lesson 1: Virtual DOM vs Real DOM, React Reconciliation & Component Hierarchy",
          "Lesson 2: Functional Components, JSX Syntax Rules, Props & Conditional Rendering",
          "Lesson 3: Hands-on Lab: Initializing a React Vite App & Modular Component Library"
        ]
      },
      {
        title: "React Hooks Deep Dive: useState & useEffect",
        lessons: [
          "Lesson 1: Local Component State Management with useState Hook & Immutable Updates",
          "Lesson 2: Side Effects & Lifecycle Management with useEffect Hook & Dependency Arrays",
          "Lesson 3: Hands-on Lab: Fetching Live API Data, Loading Spinners & Error State Handling"
        ]
      },
      {
        title: "Advanced React Hooks & Performance Tuning",
        lessons: [
          "Lesson 1: DOM References with useRef Hook & Storing Mutable Non-render Values",
          "Lesson 2: Memoization & Performance Optimization with useMemo & useCallback Hooks",
          "Lesson 3: Hands-on Lab: Building a High-Performance Search Filter Component"
        ]
      },
      {
        title: "React State Architecture: Context API & Global State",
        lessons: [
          "Lesson 1: React Context API (createContext, useContext) & Provider Pattern Setup",
          "Lesson 2: Global State vs Local State (Auth State, Theme State, Cart State Management)",
          "Lesson 3: Hands-on Lab: Implementing a Dark/Light Theme Switcher & Global User Context"
        ]
      },
      {
        title: "Single Page Application Routing: React Router v6",
        lessons: [
          "Lesson 1: BrowserRouter, Routes, Route, Link & NavLink Active Styles",
          "Lesson 2: Dynamic URL Parameters (useParams), Programmatic Navigation (useNavigate) & Protected Routes",
          "Lesson 3: Hands-on Lab: Building Multi-page E-Commerce Navigation with Shopping Cart"
        ]
      },
      {
        title: "Node.js Core Runtime & Express.js Server Architecture",
        lessons: [
          "Lesson 1: Node.js Non-Blocking I/O, Event Loop, CommonJS vs ES Modules (import/export)",
          "Lesson 2: Express.js App Setup, HTTP Server Initialization & Basic Route Handlers",
          "Lesson 3: Hands-on Lab: Building a Basic Node.js Express REST API Server"
        ]
      },
      {
        title: "Express RESTful API Design & Custom Middleware",
        lessons: [
          "Lesson 1: REST API Standards (GET, POST, PUT, DELETE), Status Codes & Response Payloads",
          "Lesson 2: Express Middleware (express.json(), CORS, Custom Logger, Global Error Handler)",
          "Lesson 3: Hands-on Lab: Building a RESTful API Endpoints for Resource Management"
        ]
      },
      {
        title: "Backend Security, JWT Authentication & Password Hashing",
        lessons: [
          "Lesson 1: Password Encryption using bcryptjs Hashing & Salt Rounds",
          "Lesson 2: JSON Web Tokens (JWT) Generation (jwt.sign()), Bearer Auth Middleware & Payload Verification",
          "Lesson 3: Hands-on Lab: Implementing Complete User Signup, Login & Protected Route Auth"
        ]
      },
      {
        title: "Database Engineering: MongoDB & Mongoose Schemas",
        lessons: [
          "Lesson 1: NoSQL Document Database Concepts & MongoDB Atlas Cloud Cluster Configuration",
          "Lesson 2: Mongoose Models, Schemas, Field Types (String, Number, Date, ObjectId) & Validations",
          "Lesson 3: Hands-on Lab: Connecting Express Server to MongoDB & Defining Schema Models"
        ]
      },
      {
        title: "Mongoose CRUD Operations & Relational Population",
        lessons: [
          "Lesson 1: Mongoose Queries (find(), findOne(), findByIdAndUpdate(), deleteOne())",
          "Lesson 2: Document Relationships & Relational Joins using Mongoose .populate()",
          "Lesson 3: Hands-on Lab: Creating User-Post Relational Data Models with Population"
        ]
      },
      {
        title: "Mongoose Aggregation Pipelines & Query Indexing",
        lessons: [
          "Lesson 1: Mongoose Aggregation Pipeline Stages ($match, $group, $sort, $project, $unwind)",
          "Lesson 2: MongoDB Database Indexing for High-Speed Read Performance & Unique Constraints",
          "Lesson 3: Hands-on Lab: Building Analytics Aggregation Queries for User Statistics"
        ]
      },
      {
        title: "File Uploads, Cloud Storage & Multer Integration",
        lessons: [
          "Lesson 1: Multipart Form Data Handling with Multer Backend Middleware",
          "Lesson 2: Uploading Images & Assets to Cloudinary / AWS S3 & Storing Hosted URLs in MongoDB",
          "Lesson 3: Hands-on Lab: Building User Profile Picture Upload Feature in React & Express"
        ]
      },
      {
        title: "Full Stack MERN Capstone Integration & Deployment",
        lessons: [
          "Lesson 1: Connecting React Frontend Axios Client with Express Backend APIs",
          "Lesson 2: Production Environment Variables (.env), CORS Setup & Deployment to Vercel/Render",
          "Lesson 3: Hands-on Lab: Deploying Production-Ready Full Stack MERN Application Live"
        ]
      }
    ];
  } else if (titleLower.includes("python") || titleLower.includes("dsa") || titleLower.includes("data structure") || titleLower.includes("algorithm")) {
    researchTemplates = [
      {
        title: "Python Syntax & Foundations",
        lessons: [
          "Lesson 1: Python Data Types (int, float, str, bool, list, dict, set, tuple) & Input/Output",
          "Lesson 2: Control Flow (if-elif-else, match-case, for/while loops, break/continue)",
          "Lesson 3: Hands-on Lab: Building Command-Line Utilities & Logic Calculators in Python"
        ]
      },
      {
        title: "Python Functions & Modular Programming",
        lessons: [
          "Lesson 1: Functions (*args, **kwargs, lambda expressions, map(), filter(), zip())",
          "Lesson 2: Python Modules, Packages, File I/O (open(), read(), write(), json parsing)",
          "Lesson 3: Hands-on Lab: Building File Parser & Data Transformation Scripts"
        ]
      },
      {
        title: "Object-Oriented Programming (OOP) in Python",
        lessons: [
          "Lesson 1: Classes, Objects, __init__ Constructor, Instance vs Class Attributes",
          "Lesson 2: Inheritance, Method Overriding, Encapsulation, Polymorphism & Abstract Base Classes",
          "Lesson 3: Hands-on Lab: Designing Object-Oriented Banking System Architecture"
        ]
      },
      {
        title: "Data Structures: Dynamic Arrays & String Manipulation",
        lessons: [
          "Lesson 1: Array Mechanics, Memory Allocation, Time & Space Complexity (Big O Notation)",
          "Lesson 2: String Slicing, Pattern Matching, Two Pointers Technique & Sliding Window Patterns",
          "Lesson 3: Hands-on Lab: Solving LeetCode Array Problems (Two Sum, Container With Most Water)"
        ]
      },
      {
        title: "Data Structures: Linked Lists (Singly & Doubly)",
        lessons: [
          "Lesson 1: Singly Linked List Node Architecture, Insertion, Deletion & Traversal",
          "Lesson 2: Doubly Linked Lists & Fast & Slow Pointers (Cycle Detection, Middle of Linked List)",
          "Lesson 3: Hands-on Lab: Implementing Linked List Reversal & Merge Two Sorted Lists"
        ]
      },
      {
        title: "Data Structures: Stacks, Queues & Monotonic Stack",
        lessons: [
          "Lesson 1: Stack LIFO Operations (Array & Linked List implementation, Valid Parentheses)",
          "Lesson 2: Queue FIFO Operations, Deque, Circular Queue & Monotonic Stack Pattern",
          "Lesson 3: Hands-on Lab: Implementing Min-Stack & Next Greater Element Algorithms"
        ]
      },
      {
        title: "Data Structures: Hash Tables & Hash Maps",
        lessons: [
          "Lesson 1: Hashing Mechanics, Hash Functions, Collision Resolution (Chaining vs Open Addressing)",
          "Lesson 2: Frequency Maps, Prefix Sum Arrays & Subarray Sum Equals K Pattern",
          "Lesson 3: Hands-on Lab: Solving Group Anagrams & Longest Consecutive Sequence"
        ]
      },
      {
        title: "Algorithms: Sorting & Searching Algorithms",
        lessons: [
          "Lesson 1: Binary Search on Sorted Arrays & Search Space Division",
          "Lesson 2: Sorting Algorithms (Bubble, Insertion, MergeSort, QuickSort, Space/Time Analysis)",
          "Lesson 3: Hands-on Lab: Implementing Custom QuickSort & Search in Rotated Sorted Array"
        ]
      },
      {
        title: "Data Structures: Binary Trees & Binary Search Trees (BST)",
        lessons: [
          "Lesson 1: Binary Tree Node Architecture, Depth-First Traversals (In-order, Pre-order, Post-order)",
          "Lesson 2: Level-Order Traversal (BFS), Binary Search Tree Insertion, Deletion & Search",
          "Lesson 3: Hands-on Lab: Validating BST, Lowest Common Ancestor & Tree Diameter"
        ]
      },
      {
        title: "Data Structures: Graphs & Graph Traversal Algorithms",
        lessons: [
          "Lesson 1: Graph Representation (Adjacency Matrix & Adjacency List)",
          "Lesson 2: Graph Traversal: Breadth-First Search (BFS) & Depth-First Search (DFS)",
          "Lesson 3: Hands-on Lab: Cycle Detection in Directed/Undirected Graphs & Connected Components"
        ]
      },
      {
        title: "Advanced Algorithms: Graph Shortest Path & Topological Sort",
        lessons: [
          "Lesson 1: Dijkstra's Algorithm for Shortest Path in Weighted Graphs",
          "Lesson 2: Topological Sort (Kahn's Algorithm BFS & DFS Course Schedule Pattern)",
          "Lesson 3: Hands-on Lab: Solving Course Schedule & Network Delay Time Problems"
        ]
      },
      {
        title: "Dynamic Programming (DP): Recursion & Memoization",
        lessons: [
          "Lesson 1: Recursion Trees, Overlapping Subproblems & Optimal Substructure",
          "Lesson 2: Top-Down DP with Memoization vs Bottom-Up DP with Tabulation",
          "Lesson 3: Hands-on Lab: Solving Climbing Stairs, Coin Change & House Robber Problems"
        ]
      }
    ];
  } else if (titleLower.includes("ai") || titleLower.includes("machine learning") || titleLower.includes("data science")) {
    researchTemplates = [
      {
        title: "Python for Data Science: NumPy Multidimensional Arrays",
        lessons: [
          "Lesson 1: NumPy ndarrays, Vectorized Operations, Broadcasting & Array Slicing",
          "Lesson 2: Matrix Operations, Linear Algebra Math (Dot Product, Matrix Inversion, Eigenvalues)",
          "Lesson 3: Hands-on Lab: High-Speed Mathematical Computations on Numeric Datasets"
        ]
      },
      {
        title: "Data Wrangling & Analysis with Pandas DataFrames",
        lessons: [
          "Lesson 1: Pandas Series & DataFrames, Loading CSV/Excel/JSON Data, Indexing & Filtering",
          "Lesson 2: Data Cleaning: Handling Missing Values (Imputation), Deduplication, GroupBy & Merging",
          "Lesson 3: Hands-on Lab: Cleaning Real-world Messy E-Commerce & Financial Datasets"
        ]
      },
      {
        title: "Exploratory Data Analysis (EDA) & Visualization",
        lessons: [
          "Lesson 1: Matplotlib & Seaborn Visualizations (Histograms, Scatter Plots, Box Plots, Heatmaps)",
          "Lesson 2: Feature Engineering, Correlation Matrices, Outlier Detection & Normalization (StandardScaler)",
          "Lesson 3: Hands-on Lab: Performing Comprehensive EDA on Housing Price Prediction Dataset"
        ]
      },
      {
        title: "Supervised Learning: Regression Algorithms",
        lessons: [
          "Lesson 1: Simple & Multiple Linear Regression, Cost Function (MSE), Gradient Descent Math",
          "Lesson 2: Polynomial Regression, Overfitting vs Underfitting, Ridge & Lasso Regularization",
          "Lesson 3: Hands-on Lab: Building & Evaluating Real Estate Price Prediction Model in Scikit-Learn"
        ]
      },
      {
        title: "Supervised Learning: Classification Algorithms",
        lessons: [
          "Lesson 1: Logistic Regression, Decision Boundaries, Sigmoid Activation, Confusion Matrix & ROC-AUC",
          "Lesson 2: Decision Trees, Random Forest Ensembles, Hyperparameter Tuning (GridSearchCV)",
          "Lesson 3: Hands-on Lab: Constructing Customer Churn Classification System"
        ]
      },
      {
        title: "Unsupervised Learning: Clustering & Dimensionality Reduction",
        lessons: [
          "Lesson 1: K-Means Clustering, Elbow Method, Silhouette Score & Hierarchical Clustering",
          "Lesson 2: Principal Component Analysis (PCA) for Dimensionality Reduction & Variance Retention",
          "Lesson 3: Hands-on Lab: Segmenting E-commerce Customers with K-Means & PCA"
        ]
      },
      {
        title: "Deep Learning Foundations: Artificial Neural Networks (ANN)",
        lessons: [
          "Lesson 1: Perceptrons, Multi-Layer Perceptron (MLP), Activation Functions (ReLU, Sigmoid, Softmax)",
          "Lesson 2: Forward Propagation, Cross-Entropy Loss, Backpropagation Math & Optimizer Tuning (Adam)",
          "Lesson 3: Hands-on Lab: Training Deep Neural Network in PyTorch / TensorFlow"
        ]
      },
      {
        title: "Computer Vision: Convolutional Neural Networks (CNN)",
        lessons: [
          "Lesson 1: Image Tensors, Convolutional Layers, Pooling Layers (MaxPool) & Feature Maps",
          "Lesson 2: Transfer Learning using Pre-trained Architectures (ResNet, VGG16, MobileNet)",
          "Lesson 3: Hands-on Lab: Building Medical Image Classifier for Disease Detection"
        ]
      },
      {
        title: "Natural Language Processing (NLP) & Text Embeddings",
        lessons: [
          "Lesson 1: Text Preprocessing: Tokenization, Stopword Removal, Lemmatization, TF-IDF & Word2Vec",
          "Lesson 2: Recurrent Neural Networks (RNN), LSTMs & Sequence Modeling",
          "Lesson 3: Hands-on Lab: Building Sentiment Analysis Model for Product Reviews"
        ]
      },
      {
        title: "Generative AI: Transformers, LLMs & RAG Architecture",
        lessons: [
          "Lesson 1: Transformer Architecture, Self-Attention Mechanism & Encoder-Decoder Models",
          "Lesson 2: Retrieval-Augmented Generation (RAG), Vector Databases (FAISS/Pinecone) & LangChain",
          "Lesson 3: Hands-on Lab: Building Enterprise AI Chatbot querying Private Documents"
        ]
      }
    ];
  }

  const fallbackModules = [];
  const templateCount = researchTemplates.length;

  for (let d = 1; d <= totalDays; d++) {
    let tItem = null;
    if (templateCount > 0) {
      tItem = researchTemplates[(d - 1) % templateCount];
    }

    if (tItem) {
      fallbackModules.push({
        id: `m_${d}_${Date.now()}`,
        title: `Day ${d}: ${tItem.title}`,
        lessons: tItem.lessons.map((l) => (l.startsWith("Lesson") ? l : `Lesson ${d}: ${l}`))
      });
    } else {
      fallbackModules.push({
        id: `day_${d}_${Date.now()}`,
        title: `Day ${d}: Advanced ${courseTitle} Practical Module ${d}`,
        lessons: [
          `Lesson ${d}.1: Deep Dive into Core Technical Architecture & Syntax for ${courseTitle}`,
          `Lesson ${d}.2: Hands-on Code Implementation, Debugging & Performance Optimization`,
          `Lesson ${d}.3: Live Hands-on Lab: Building Production Component for Day ${d}`
        ]
      });
    }
  }

  return fallbackModules;
}

export async function generateCourseOverviewInsightsWithAI(courseTitle, category = "TCM One Academy", level = "All Levels") {
  const prompt = `You are Google Gemini AI acting as Lead Career Counselor & Industry Analyst at TCM One Academy. Provide highly accurate, professional career and salary insights for a course titled "${courseTitle}" in category "${category}" for level "${level}".

Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "whyLearn": [
    "High Market Demand: Huge requirement for skilled ${courseTitle} professionals across IT, Tech & Product companies.",
    "Lucrative Salary & Growth: Offers high entry-level compensation with rapid annual appraisal rates.",
    "Practical Industry Skills: Hands-on mastery of modern tools, frameworks, and real-world project development."
  ],
  "salaryInsights": {
    "avgSalary": "₹6.5 LPA – ₹18.0 LPA",
    "hiringCompanies": ["TCS", "Google", "Amazon", "Infosys", "Top Startups"],
    "growthRate": "+28% YoY Industry Demand",
    "careerRoles": ["Software Developer", "Full Stack Engineer", "System Architect"]
  }
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed && parsed.whyLearn && parsed.salaryInsights) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Google Gemini Overview Insights failed, using fallback:", error);
  }

  return {
    whyLearn: [
      `High Industry Demand: Companies actively seek skilled ${courseTitle} engineers with portfolio projects.`,
      `Lucrative Salary Packages: Starting packages range from ₹6.5 LPA up to ₹18 LPA for skilled professionals.`,
      `Hands-on Portfolio Building: Build production-grade projects to showcase directly to recruiters.`
    ],
    salaryInsights: {
      avgSalary: "₹6.5 LPA – ₹18.0 LPA",
      hiringCompanies: ["Google", "TCS", "Amazon", "Infosys", "Tech Startups"],
      growthRate: "+28% YoY Demand",
      careerRoles: [`${courseTitle} Engineer`, "Software Architect", "Technical Specialist"]
    }
  };
}

export async function generateMcqQuizWithGemini(topic, courseTitle = "TCM One Course") {
  const prompt = `You are TCM One AI acting as Lead Examiner at TCM One Academy. Generate EXACTLY 10 multiple-choice questions (MCQs) for a student practice test on the topic "${topic}" of the course "${courseTitle}".

CRITICAL REQUIREMENTS:
1. Generate EXACTLY 10 questions. Each question must have 4 options: ["A", "B", "C", "D"].
2. Provide the 0-indexed correct option index ("correctIndex": 0, 1, 2, or 3) and a brief clear explanation ("explanation": "string").

Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "quizTitle": "10-MCQ Daily Quiz: ${topic}",
  "questions": [
    {
      "id": "q1",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Explanation for option A."
    }
  ]
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions;
      }
    }
  } catch (error) {
    console.warn("Google Gemini Quiz Generation failed, using structured 10 MCQs fallback:", error);
  }

  // Dynamic 10 MCQs Fallback
  return Array.from({ length: 10 }, (_, i) => ({
    id: `q_${i + 1}`,
    question: `Question ${i + 1}: What is the core practical requirement of ${topic} in ${courseTitle}?`,
    options: [
      `Modular Architecture & Practical Best Practices for ${topic}`,
      `Legacy synchronous execution without state guards`,
      `Depreciated standard with high execution latency`,
      `Single-threaded fallback without validation`
    ],
    correctIndex: 0,
    explanation: `Option A is correct. ${topic} requires modern modular architecture and real-time execution in ${courseTitle}.`
  }));
}

export async function generateRoadmapChatResponseWithGroq(chatMessages = [], currentPrompt = "", targetGoal = "", budget = "") {
  const prompt = `You are TCM One AI, Senior Career Advisor and Learning Strategist at TCM One Academy.
Your job is to interactively guide a student to build their ideal tech career roadmap using ONLY official courses, services, and pricing available in the TCM One App.

System Knowledge about TCM One Academy App Courses & Pricing:
- Full Stack Web Development (MERN / React / Node.js): ₹4,999 (3 Months)
- AI & Machine Learning Masterclass (Python / PyTorch / LLMs): ₹5,999 (3 Months)
- Mobile App Development (React Native / Expo / iOS & Android): ₹3,999 (2 Months)
- Python & Data Structures & Algorithms (DSA): ₹2,999 (2 Months)
- NEET & JEE Rank Booster Exam Prep: ₹3,499 (3 Months)

System Knowledge about TCM One App Premium Services:
- TCM One Verified Pro Membership: ₹499/month or ₹2,999/year
- Featured Profile: Verified student badge & recruiter highlight
- Real Domain Project: Live hosted project, domain certificate & review
- ATS Resume Builder: AI ATS resume builder & PDF export
- Cloud Lab Access: On-demand cloud coding lab environment

Chat Conversation History:
${chatMessages.map((m) => `${m.sender.toUpperCase()}: ${m.text}`).join("\n")}

User Message: "${currentPrompt}"
Selected Domain / Goal: "${targetGoal}"
Expected Budget: "${budget}"

Instructions:
1. DO NOT use any emojis in your response. Keep text clean and professional.
2. Provide a concise, structured response (under 200 words).
3. Recommend specific TCM One App courses and premium features matching their budget.
4. Include a 3-Month Month-by-Month roadmap (Month 1, Month 2, Month 3).`;

  try {
    const response = await callGeminiApi(prompt);
    if (response && response.trim()) {
      return response.trim().replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    }
  } catch (error) {
    console.warn("Groq AI Roadmap chat response error:", error);
  }

  return "Thank you for sharing your learning goals. Based on your target field, we recommend starting with our Full Stack Web Development Masterclass (₹4,999) or AI Masterclass (₹5,999) available directly in the app.";
}

export async function generateInteractiveAiRoadmapAndChat(chatHistory = [], userMessage = "") {
  const safeHistory = Array.isArray(chatHistory) ? chatHistory : [];
  const historyText = safeHistory
    .map((m) => `${(m?.sender || "user").toUpperCase()}: ${m?.text || ""}`)
    .filter(Boolean)
    .join("\n");

  const cleanUserMsg = (userMessage || "").trim();

  const prompt = `You are Phlappy AI, the official Senior AI Learning Architect & Career Counselor at TCM One Academy (Decoding The Mind).
IMPORTANT IDENTITY RULE: You must ONLY identify yourself as "Phlappy AI". Never mention "Groq", "Llama", "Google Gemini", "ChatGPT", or any third-party provider name.

STRICT DATA ACCURACY RULE:
You MUST ONLY recommend courses, plans, features, and pricing that ACTUALLY EXIST in the TCM One Academy App as specified in the System Knowledge below. DO NOT invent fake prices, fake courses, or fake subscription tiers!

System Knowledge about TCM One Academy App Available Courses & Pricing:
- Full Stack Web Development (MERN, React, Node.js): ₹4,999 (3 Months Live Batch)
- AI & Machine Learning Masterclass (Python, PyTorch, LLMs): ₹5,999 (3 Months Live Batch)
- Mobile App Development (React Native, Expo, iOS/Android): ₹3,999 (2 Months Live Batch)
- Python & Data Structures Algorithms (DSA): ₹2,999 (2 Months Live Batch)
- NEET & JEE Rank Booster Exam Prep: ₹3,499 (3 Months Live Batch)

IMPORTANT: On TCM One, users only purchase individual live courses. DO NOT recommend any premium subscriptions or Pro membership packages.

Chat History:
${historyText}

New Student Message: "${cleanUserMsg}"

FORMATTING RULES:
1. DO NOT use any emojis in your response. Keep text clean and professional.
2. Keep responses concise, structured, and easy to read.
3. For general inquiries, provide:
   - SUMMARY & GOAL
   - MONTHLY OVERVIEW (Month 1, Month 2, Month 3)
   - RECOMMENDED APP COURSES & PRICING
   - AVAILABLE PRO FEATURES
4. Only output a detailed day-by-day syllabus when the student explicitly asks for "day by day", "daily schedule", or "day 1 to 30".`;

  try {
    const text = await callGeminiApi(prompt);
    if (text && text.trim()) {
      return text.trim()
        .replace(/Groq\s*AI/gi, "Phlappy AI")
        .replace(/Llama\s*\d*(\.\d*)?/gi, "Phlappy AI")
        .replace(/Gemini\s*AI/gi, "Phlappy AI")
        .replace(/Last\s*Class\s*AI/gi, "Phlappy AI")
        .replace(/Nexus\s*AI/gi, "Phlappy AI")
        .replace(/Oveta\s*AI/gi, "Phlappy AI")
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "");
    }
  } catch (err) {
    console.warn("Phlappy AI Roadmap Chat Generation error:", err);
  }

  // Smart structured fallback if network fails
  if (/python|dsa|data\s*structure/i.test(cleanUserMsg)) {
    return "📌 SUMMARY & GOAL\nMaster Python programming fundamentals, object-oriented concepts, and core Data Structures & Algorithms to crack top technical coding interviews.\n\n🗓️ MONTHLY OVERVIEW\n- Month 1: Python Syntax, Functions, Control Flow & Object-Oriented Programming\n- Month 2: Arrays, Linked Lists, Stacks, Queues, Recursion & Sorting Algorithms\n- Month 3: Trees, Graphs, Dynamic Programming & Mock Technical Coding Interviews\n\n🎓 RECOMMENDED APP COURSE & PRICING\n- Python & Data Structures Algorithms (DSA): ₹2,999 (2 Months Live Batch)\n\n⚡ AVAILABLE PRO FEATURES\n- TCM One Verified Pro Membership: ₹499/month (Includes Cloud Lab Access & Real Project Certificate)";
  } else if (/ai|machine|data\s*science/i.test(cleanUserMsg)) {
    return "📌 SUMMARY & GOAL\nBuild production-grade Artificial Intelligence and Machine Learning models using PyTorch, Transformers, LLMs, and RAG architectures.\n\n🗓️ MONTHLY OVERVIEW\n- Month 1: Python for Data Science, NumPy, Pandas, Data Visualization & Scikit-Learn\n- Month 2: Supervised & Unsupervised ML, Neural Networks, PyTorch & Computer Vision\n- Month 3: Natural Language Processing (NLP), LLM Fine-Tuning & RAG Enterprise App\n\n🎓 RECOMMENDED APP COURSE & PRICING\n- AI & Machine Learning Masterclass: ₹5,999 (3 Months Live Batch)\n\n⚡ AVAILABLE PRO FEATURES\n- TCM One Verified Pro Membership: ₹499/month (Includes Cloud Lab Access & ATS Resume Builder)";
  }

  return "📌 SUMMARY & GOAL\nMaster Full Stack Web Development using modern MERN Stack architecture (MongoDB, Express, React.js, Node.js).\n\n🗓️ MONTHLY OVERVIEW\n- Month 1: HTML5, Modern CSS Flexbox/Grid, Responsive Design & Modern JavaScript (ES6+)\n- Month 2: React.js Component Architecture, Hooks, State Management & Tailwind CSS\n- Month 3: Node.js REST API Development, MongoDB Database & Production Cloud Deployment\n\n🎓 RECOMMENDED APP COURSE & PRICING\n- Full Stack Web Development (MERN): ₹4,999 (3 Months Live Batch)\n\n⚡ AVAILABLE PRO FEATURES\n- TCM One Verified Pro Membership: ₹499/month (Includes Real Domain Project Hosting & ATS Resume Builder)";
}

export async function generateAiExamQuestionsForSkills(skillsList = [], targetDomain = "Coding & IT") {
  const skillsStr = Array.isArray(skillsList) && skillsList.length > 0
    ? skillsList.join(", ")
    : "General " + targetDomain;

  const prompt = `You are TCM One AI, Chief Technical Examiner at TCM One Academy.
Generate EXACTLY 10 high-quality, professional multiple-choice questions (MCQs) for an AI Skill Examination & Interview Test.
The student has added the following profile skills: "${skillsStr}" under domain "${targetDomain}".

STRICT FORMAT & QUALITY RULES:
1. Generate EXACTLY 10 MCQs specifically testing the skills: ${skillsStr}.
2. Each question MUST have:
   - "id": unique string (e.g. "ai_q1")
   - "skillTag": the specific skill being tested (e.g. "Python" or "React")
   - "question": clear, challenging technical or conceptual interview question
   - "snippet": optional short code snippet, formula, or case study (string or "")
   - "options": array of 4 distinct choices ["A", "B", "C", "D"]
   - "correctIndex": integer index (0, 1, 2, or 3) of the correct answer
   - "hint": brief helpful hint for the student
3. Return ONLY raw valid JSON (no markdown fences, no backticks, no conversational text):
{
  "questions": [
    {
      "id": "q1",
      "skillTag": "Python",
      "question": "What is the primary difference between a list and a tuple in Python?",
      "snippet": "a = (1, 2, 3)",
      "options": [
        "Tuples are immutable while lists are mutable",
        "Lists cannot hold mixed data types",
        "Tuples do not support indexing",
        "Lists use less memory than tuples"
      ],
      "correctIndex": 0,
      "hint": "Tuples cannot be modified after creation."
    }
  ]
}`;

  try {
    const rawContent = await callGeminiApi(prompt);
    if (rawContent) {
      const cleanedJson = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanedJson);
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length >= 5) {
        return parsed.questions;
      }
    }
  } catch (error) {
    console.warn("AI Skill Exam Question Generation error:", error);
  }

  // Dynamic 10 MCQs Fallback for user skills
  const firstSkill = (skillsList[0] || targetDomain).trim();
  return Array.from({ length: 10 }, (_, i) => {
    const currentSkill = skillsList[i % skillsList.length] || firstSkill;
    return {
      id: `ai_q_${i + 1}`,
      skillTag: currentSkill,
      question: `[${currentSkill} Assessment Q${i + 1}] What is a fundamental core principle of ${currentSkill} when designing scalable production systems?`,
      snippet: `// ${currentSkill} Core Practice\n// Standard execution pattern for ${currentSkill}`,
      options: [
        `Optimal modular design, clean state management, and memory efficiency in ${currentSkill}`,
        `Unrestricted global variable mutations without type safety`,
        `Depreciated synchronous execution blocking event loop`,
        `Hardcoding configuration constants directly in component renders`
      ],
      correctIndex: 0,
      hint: `${currentSkill} requires clean modular structure, memory optimization, and reliable state isolation.`
    };
  });
}
