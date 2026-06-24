/**
 * Technical Round – Software Engineer
 * 35 questions across: OS, DBMS, OOP, Computer Networks, Programming Languages
 * Each question stores: id, topic, question text, answerKeywords (for scoring), expectedAnswer (derived)
 */
import type { InterviewQuestion } from "./question-types";

export const SE_TECHNICAL_QUESTIONS: InterviewQuestion[] = [
  // ─────────────────────────────────────────────────────
  // OPERATING SYSTEM (10 questions)
  // ─────────────────────────────────────────────────────
  {
    id: "se-tech-os-1",
    role: "software-engineer",
    roundType: "technical",
    topic: "Processes",
    question: "Tell me, what are the different states of processes?",
    answerKeywords: ["New", "Ready", "Running", "Blocked", "Exit"],
    expectedAnswer:
      "A process goes through five states: New (being created), Ready (waiting to be assigned to CPU), Running (currently being executed), Blocked (waiting for an event or I/O), and Exit (finished execution).",
  },
  {
    id: "se-tech-os-2",
    role: "software-engineer",
    roundType: "technical",
    topic: "Threads",
    question:
      "Explain me what is thread and also tell me benefits of multithreading.",
    answerKeywords: [
      "Better CPU Utilization or concurrency",
      "Parallelism or parallel processes",
      "Resource Sharing",
      "Light-weight process",
    ],
    expectedAnswer:
      "A thread is a single sequence stream within a process, also called a light-weight process. Benefits of multithreading: Better CPU Utilization or concurrency, Parallelism or parallel processes, Resource Sharing, and it is a light-weight process.",
  },
  {
    id: "se-tech-os-3",
    role: "software-engineer",
    roundType: "technical",
    topic: "Thrashing",
    question: "Explain me what is Thrashing?",
    answerKeywords: ["more time or excessive time", "page or pages", "swapping", "RAM or disk"],
    expectedAnswer:
      "Thrashing is a condition where a process spends more or excessive time swapping pages between RAM and disk rather than executing useful work, causing severe performance degradation.",
  },
  {
    id: "se-tech-os-4",
    role: "software-engineer",
    roundType: "technical",
    topic: "Kernel",
    question: "Explain me what is kernel?",
    answerKeywords: [
      "core component",
      "Operating System",
      "intermediary",
      "user or application",
      "hardware",
      "interacts with hardware",
    ],
    expectedAnswer:
      "The kernel is the core component of the Operating System. It acts as an intermediary between the user or application and the hardware, directly interacts with hardware resources, and manages CPU, memory, and device I/O.",
  },
  {
    id: "se-tech-os-5",
    role: "software-engineer",
    roundType: "technical",
    topic: "Deadlock",
    question:
      "Explain me what is deadlock and also tell me necessary conditions of deadlock?",
    answerKeywords: [
      "processes",
      "block or stuck",
      "waiting",
      "mutual exclusion",
      "hold and wait",
      "no preemption",
      "circular wait",
    ],
    expectedAnswer:
      "Deadlock is a situation where processes are block or stuck waiting for each other indefinitely. The four necessary conditions (Coffman conditions) are: mutual exclusion, hold and wait, no preemption, and circular wait.",
  },
  {
    id: "se-tech-os-6",
    role: "software-engineer",
    roundType: "technical",
    topic: "CPU Scheduling Algorithm",
    question:
      "Explain round robin scheduling algorithm in context of operating system.",
    answerKeywords: ["ready queue", "time quantum or time quanta", "cyclic order"],
    expectedAnswer:
      "Round Robin is a CPU scheduling algorithm where each process in the ready queue is given a fixed time quanta or time quantum. After the time expires, the process is moved to the back of the queue and the next process is served. Processes are executed in cyclic order.",
  },
  {
    id: "se-tech-os-7",
    role: "software-engineer",
    roundType: "technical",
    topic: "Deadlock",
    question: "Explain me Banker's algorithm?",
    answerKeywords: ["deadlock", "avoidance", "giving or granting or providing", "resources"],
    expectedAnswer:
      "Banker's algorithm is a deadlock avoidance algorithm. Before giving or granting or providing resources to a process, it checks whether doing so will keep the system in a safe state, thereby avoiding deadlock.",
  },
  {
    id: "se-tech-os-8",
    role: "software-engineer",
    roundType: "technical",
    topic: "Inter Process Communication",
    question: "Explain me IPC in operating system.",
    answerKeywords: [
      "Inter Process Communication",
      "processes",
      "communicate",
      "sharing data",
    ],
    expectedAnswer:
      "IPC stands for Inter Process Communication. It is a mechanism that allows processes to communicate with each other and exchange data by sharing data through shared memory, message passing, pipes, or sockets.",
  },
  {
    id: "se-tech-os-9",
    role: "software-engineer",
    roundType: "technical",
    topic: "Semaphore",
    question: "Explain me some drawbacks of semaphore.",
    answerKeywords: ["error", "deadlock", "starvation"],
    expectedAnswer:
      "Drawbacks of semaphore: they are error-prone (incorrect use of wait/signal can corrupt the system), improper use can cause deadlock where processes wait indefinitely, and some processes may suffer starvation if they never get to use the semaphore.",
  },
  {
    id: "se-tech-os-10",
    role: "software-engineer",
    roundType: "technical",
    topic: "Fragmentation",
    question:
      "Explain me what is Fragmentation and its types in operating system.",
    answerKeywords: [
      "memory",
      "waste or wastage",
      "internal fragmentation",
      "external fragmentation",
    ],
    expectedAnswer:
      "Fragmentation refers to memory waste or wastage in a system. Internal fragmentation occurs when allocated memory is slightly larger than the requested memory, wasting space inside a partition. External fragmentation occurs when free memory is scattered across the disk and cannot accommodate a large request even though total free memory is sufficient.",
  },

  // ─────────────────────────────────────────────────────
  // DATABASE MANAGEMENT SYSTEM (10 questions)
  // ─────────────────────────────────────────────────────
  {
    id: "se-tech-dbms-1",
    role: "software-engineer",
    roundType: "technical",
    topic: "DBMS Basics",
    question: "Tell me advantages of using DBMS.",
    answerKeywords: [
      "Data integrity",
      "Data security",
      "reduce redundancy",
      "backup",
      "recovery",
    ],
    expectedAnswer:
      "Advantages of DBMS: Data integrity (ensures accuracy and consistency), Data security (protects data from unauthorized access), reduces redundancy (avoids duplicate data storage), and provides backup and recovery mechanisms.",
  },
  {
    id: "se-tech-dbms-2",
    role: "software-engineer",
    roundType: "technical",
    topic: "MySQL",
    question:
      "Now tell me, what is primary key in dbms and give me one example of it?",
    answerKeywords: ["unique or uniquely", "column or columns", "cannot be null"],
    expectedAnswer:
      "A primary key uniquely identifies each row in a table. The column or columns that form the primary key cannot be null. Example: Student_ID in a Students table uniquely identifies every student record.",
  },
  {
    id: "se-tech-dbms-3",
    role: "software-engineer",
    roundType: "technical",
    topic: "Normalization",
    question: "Can you explain, what is candidate key in dbms?",
    answerKeywords: ["unique or uniquely", "minimum or minimal", "row"],
    expectedAnswer:
      "A candidate key is a minimal set of columns that can uniquely identify each row in a table. Every table can have multiple candidate keys, and one of them is chosen as the primary key.",
  },
  {
    id: "se-tech-dbms-4",
    role: "software-engineer",
    roundType: "technical",
    topic: "ER Diagram",
    question: "Can you list different types of relations in dbms?",
    answerKeywords: [
      "One to One",
      "One to many",
      "Many to one",
      "Many to many",
    ],
    expectedAnswer:
      "Types of relations in DBMS: One to One (one entity relates to exactly one other), One to many (one entity relates to multiple), Many to one (multiple relate to one), and Many to many (multiple entities on both sides relate to multiple on the other).",
  },
  {
    id: "se-tech-dbms-5",
    role: "software-engineer",
    roundType: "technical",
    topic: "MySQL",
    question:
      "Now explain me what is join in SQL and also explain different types of join.",
    answerKeywords: [
      "combine",
      "row",
      "inner join",
      "left join",
      "right join",
      "full outer join",
    ],
    expectedAnswer:
      "A JOIN is used to combine rows from two or more tables based on a related column. Types: inner join (matching rows only), left join (all left table rows + matching right), right join (all right table rows + matching left), full outer join (all rows from both tables).",
  },
  {
    id: "se-tech-dbms-6",
    role: "software-engineer",
    roundType: "technical",
    topic: "Indexing",
    question: "Can you explain indexing in context of dbms?",
    answerKeywords: ["fast or faster or speed", "data", "retrieval or fetch"],
    expectedAnswer:
      "Indexing is a data structure technique that makes data retrieval faster or speeds up fetching of records from a database. It creates a pointer-based structure on a column so the database engine can quickly locate rows without scanning the whole table.",
  },
  {
    id: "se-tech-dbms-7",
    role: "software-engineer",
    roundType: "technical",
    topic: "Normalization",
    question:
      "What do you mean by normalization in dbms and also explain me condition of 3NF.",
    answerKeywords: [
      "remove duplicate data or duplicacy or duplication",
      "data consistency",
      "2NF",
      "no transitive dependency",
      "non-prime attribute",
      "primary key",
    ],
    expectedAnswer:
      "Normalization is the process of organizing data to remove duplicate data or duplicacy and ensure data consistency. For 3NF: the table must already be in 2NF, and there should be no transitive dependency — every non-prime attribute depends only on the primary key, not on another non-prime attribute.",
  },
  {
    id: "se-tech-dbms-8",
    role: "software-engineer",
    roundType: "technical",
    topic: "ACID Properties",
    question: "Can you explain me ACID properties.",
    answerKeywords: ["Atomicity", "Consistency", "Isolation", "Durability"],
    expectedAnswer:
      "ACID properties ensure reliable database transactions: Atomicity (all operations in a transaction succeed or all fail), Consistency (database remains in a valid state before and after), Isolation (concurrent transactions do not interfere with each other), Durability (committed transactions persist even after failures).",
  },
  {
    id: "se-tech-dbms-9",
    role: "software-engineer",
    roundType: "technical",
    topic: "DBMS Basic",
    question: "Can you explain me difference between SQL and no SQL.",
    answerKeywords: [
      "relational",
      "non relational",
      "tables",
      "documents",
      "MySQL",
      "PostgreSQL",
      "MongoDB",
    ],
    expectedAnswer:
      "SQL databases are relational and store data in structured tables (e.g., MySQL, PostgreSQL). NoSQL databases are non-relational and store data as documents, key-value pairs, or graphs (e.g., MongoDB). SQL enforces a schema; NoSQL is schema-flexible.",
  },
  {
    id: "se-tech-dbms-10",
    role: "software-engineer",
    roundType: "technical",
    topic: "ER Diagram",
    question: "Explain me why we use ER diagram in dbms?",
    answerKeywords: [
      "represent or representation",
      "entities",
      "attributes",
      "relationship or relationships or relations",
    ],
    expectedAnswer:
      "We use ER diagram for visual representation of a database schema. It represents entities (real-world objects), their attributes (properties), and the relationships or relations between them, making it easier to design and understand the database structure.",
  },

  // ─────────────────────────────────────────────────────
  // OBJECT ORIENTED PROGRAMMING (5 questions)
  // ─────────────────────────────────────────────────────
  {
    id: "se-tech-oop-1",
    role: "software-engineer",
    roundType: "technical",
    topic: "OOP",
    question: "Can you list four pillars of OOPS?",
    answerKeywords: [
      "Abstraction",
      "Encapsulation",
      "Polymorphism",
      "Inheritance",
    ],
    expectedAnswer:
      "The four pillars of Object-Oriented Programming are: Abstraction (hiding complexity), Encapsulation (binding data and methods together), Polymorphism (one interface, many forms), and Inheritance (deriving new classes from existing ones).",
  },
  {
    id: "se-tech-oop-2",
    role: "software-engineer",
    roundType: "technical",
    topic: "OOP",
    question: "Can you differentiate between class and structure.",
    answerKeywords: ["private", "public"],
    expectedAnswer:
      "The key difference: in a class, members are private by default, meaning they are hidden from outside access unless explicitly made public. In a structure, members are public by default, meaning they are accessible from anywhere.",
  },
  {
    id: "se-tech-oop-3",
    role: "software-engineer",
    roundType: "technical",
    topic: "OOP",
    question: "Now tell me the properties of constructor.",
    answerKeywords: [
      "Name is same as the class name",
      "no return type",
      "Cannot be inherited",
      "Cannot be virtual",
    ],
    expectedAnswer:
      "Properties of a constructor: its name is same as the class name, it has no return type (not even void), it cannot be inherited by derived classes, and it cannot be declared virtual.",
  },
  {
    id: "se-tech-oop-4",
    role: "software-engineer",
    roundType: "technical",
    topic: "OOP",
    question: "What is an abstract class?",
    answerKeywords: [
      "pure virtual function",
      "cannot be instantiated or interface",
    ],
    expectedAnswer:
      "An abstract class is a class that has at least one pure virtual function. It cannot be instantiated directly and acts as an interface or blueprint for derived classes that must provide concrete implementations of the pure virtual functions.",
  },
  {
    id: "se-tech-oop-5",
    role: "software-engineer",
    roundType: "technical",
    topic: "OOP",
    question: "Can you explain me difference between class and interface?",
    answerKeywords: [
      "implements or extends or implement or extend",
      "constructors",
      "multiple inheritance",
    ],
    expectedAnswer:
      "A class can implement or extend an interface. Interfaces cannot have constructors, while classes can. Interfaces support multiple inheritance (a class can implement multiple interfaces), whereas a class typically supports single inheritance.",
  },

  // ─────────────────────────────────────────────────────
  // COMPUTER NETWORKS (5 questions)
  // ─────────────────────────────────────────────────────
  {
    id: "se-tech-cn-1",
    role: "software-engineer",
    roundType: "technical",
    topic: "OSI Model",
    question: "Now tell me all the layers of OSI model.",
    answerKeywords: [
      "physical layer",
      "data link layer",
      "network layer",
      "transport layer",
      "session layer",
      "presentation layer",
      "application layer",
    ],
    expectedAnswer:
      "The OSI model has 7 layers from bottom to top: 1. Physical layer, 2. Data link layer, 3. Network layer, 4. Transport layer, 5. Session layer, 6. Presentation layer, 7. Application layer.",
  },
  {
    id: "se-tech-cn-2",
    role: "software-engineer",
    roundType: "technical",
    topic: "Transport Layer",
    question: "Now tell me types of port number with their range.",
    answerKeywords: [
      "well known ports",
      "registered ports",
      "dynamic ports or private ports",
    ],
    expectedAnswer:
      "Port numbers are classified as: Well known ports (0–1023) reserved for standard protocols like HTTP, FTP; Registered ports (1024–49151) assigned to specific applications; Dynamic or private ports (49152–65535) used temporarily by client applications.",
  },
  {
    id: "se-tech-cn-3",
    role: "software-engineer",
    roundType: "technical",
    topic: "Data Link Layer",
    question: "What do you mean by piggybacking.",
    answerKeywords: ["sender waits", "acknowledgment"],
    expectedAnswer:
      "Piggybacking is a technique in the data link layer where the sender waits to attach the acknowledgment for a received frame onto the next outgoing data frame, rather than sending a separate acknowledgment packet.",
  },
  {
    id: "se-tech-cn-4",
    role: "software-engineer",
    roundType: "technical",
    topic: "IP Address",
    question:
      "If we already have ipv4 protocol then why we need ipv6? What do you think?",
    answerKeywords: ["limited address space", "bigger address"],
    expectedAnswer:
      "IPv4 has a limited address space of only about 4.3 billion addresses (32-bit). With the explosion of internet-connected devices, IPv4 addresses are exhausted. IPv6 provides a much bigger address space (128-bit), supporting an astronomically larger number of unique addresses.",
  },
  {
    id: "se-tech-cn-5",
    role: "software-engineer",
    roundType: "technical",
    topic: "Network Security",
    question: "Explain me the roles of firewall.",
    answerKeywords: [
      "Traffic filtering",
      "incoming",
      "outgoing traffic",
      "protection",
      "monitoring",
    ],
    expectedAnswer:
      "A firewall performs traffic filtering by monitoring and controlling incoming and outgoing network traffic based on predefined rules. It provides protection against unauthorized access and cyberattacks, and monitors network activity to detect and block suspicious behavior.",
  },

  // ─────────────────────────────────────────────────────
  // PROGRAMMING LANGUAGES (5 questions)
  // ─────────────────────────────────────────────────────
  {
    id: "se-tech-pl-1",
    role: "software-engineer",
    roundType: "technical",
    topic: "Python",
    question: "Define lambda function in python.",
    answerKeywords: ["anonymous function", "no name", "expression"],
    expectedAnswer:
      "A lambda function is an anonymous function with no name defined using the lambda keyword. It can take any number of arguments but can only have one expression. It is useful for short, throwaway functions.",
  },
  {
    id: "se-tech-pl-2",
    role: "software-engineer",
    roundType: "technical",
    topic: "JavaScript",
    question: "What do you mean by promise in javascript?",
    answerKeywords: ["object", "resolve", "reject", "asynchronous"],
    expectedAnswer:
      "A Promise is an object in JavaScript that represents the eventual completion or failure of an asynchronous operation. It can be in one of three states: pending, resolved (fulfilled), or rejected. It is used to handle asynchronous code more cleanly than callbacks.",
  },
  {
    id: "se-tech-pl-3",
    role: "software-engineer",
    roundType: "technical",
    topic: "Memory Management",
    question: "Explain me difference between static and dynamic memory.",
    answerKeywords: [
      "before program execution",
      "size is fixed",
      "size can change or flexible",
      "stack",
      "heap",
    ],
    expectedAnswer:
      "Static memory is allocated before program execution and its size is fixed; it is stored on the stack. Dynamic memory is allocated at runtime and its size can change or is flexible; it is stored on the heap. Dynamic memory gives more control but requires manual management (malloc/free in C).",
  },
  {
    id: "se-tech-pl-4",
    role: "software-engineer",
    roundType: "technical",
    topic: "Data Structure",
    question: "Tell me when to prefer DFS and when to prefer BFS.",
    answerKeywords: [
      "deep",
      "explore all the possibilities",
      "backtracking",
      "level by level",
      "shortest path or shortest distance",
    ],
    expectedAnswer:
      "Prefer DFS when you need to go deep into branches, explore all the possibilities, or use backtracking (e.g., maze solving, cycle detection). Prefer BFS when you need level by level traversal or need to find the shortest path or shortest distance in an unweighted graph.",
  },
  {
    id: "se-tech-pl-5",
    role: "software-engineer",
    roundType: "technical",
    topic: "Data Structure",
    question: "Now explain Hash collision.",
    answerKeywords: ["same", "hash value", "index"],
    expectedAnswer:
      "Hash collision occurs when two different keys produce the same hash value, causing them to map to the same index in the hash table. It is resolved using chaining (linked list at each bucket) or open addressing (linear/quadratic probing to find the next empty slot).",
  },
];
