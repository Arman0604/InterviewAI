export const INTERVIEW_ROLES = [
  {
    id: "software-engineer",
    label: "Software Engineer",
    icon: "💻",
    description: "General SWE: DSA, system design, problem solving",
    topics: ["Data Structures", "Algorithms", "System Design", "OOP", "Problem Solving"],
  },
  {
    id: "ai-ml-engineer",
    label: "AI/ML Engineer",
    icon: "🤖",
    description: "Machine learning, deep learning, MLOps",
    topics: ["Machine Learning", "Deep Learning", "Python", "TensorFlow/PyTorch", "MLOps", "Statistics"],
  },
  {
    id: "system-design-architect",
    label: "System Design Architect",
    icon: "🏗️",
    description: "High-level architecture, scalability, microservices",
    topics: ["Scalability", "Microservices", "Caching", "Databases", "Resiliency", "System Design"],
  },
  {
    id: "online-assessment",
    label: "General Aptitude",
    icon: "📝",
    description: "Aptitude MCQ test: Quantitative, Verbal, Logical & Non-Verbal Reasoning",
    topics: ["Quantitative", "Verbal Ability", "Logical Reasoning", "Non-Verbal Reasoning"],
  },
] as const;

export type RoleId = (typeof INTERVIEW_ROLES)[number]["id"];

export function getRoleById(id: string) {
  return INTERVIEW_ROLES.find((r) => r.id === id);
}
