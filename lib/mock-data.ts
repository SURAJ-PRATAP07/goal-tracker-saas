// Mock Users Data
export const users = [
  {
    id: "1",
    name: "John Smith",
    email: "john.smith@company.com",
    role: "employee" as const,
    department: "Engineering",
    manager: "Sarah Johnson",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "manager" as const,
    department: "Engineering",
    manager: "Michael Chen",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "3",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "admin" as const,
    department: "HR",
    manager: null,
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "4",
    name: "Emily Davis",
    email: "emily.davis@company.com",
    role: "employee" as const,
    department: "Marketing",
    manager: "Sarah Johnson",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "5",
    name: "Robert Wilson",
    email: "robert.wilson@company.com",
    role: "employee" as const,
    department: "Sales",
    manager: "Sarah Johnson",
    avatar: "/placeholder-user.jpg",
    status: "inactive" as const,
  },
  {
    id: "6",
    name: "Jennifer Lee",
    email: "jennifer.lee@company.com",
    role: "employee" as const,
    department: "Engineering",
    manager: "Sarah Johnson",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "7",
    name: "David Brown",
    email: "david.brown@company.com",
    role: "manager" as const,
    department: "Sales",
    manager: "Michael Chen",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
  {
    id: "8",
    name: "Lisa Anderson",
    email: "lisa.anderson@company.com",
    role: "employee" as const,
    department: "Finance",
    manager: "David Brown",
    avatar: "/placeholder-user.jpg",
    status: "active" as const,
  },
];

// Mock Goals Data
export const goals = [
  {
    id: "g1",
    userId: "1",
    title: "Increase Code Coverage",
    description: "Improve unit test coverage across all microservices",
    thrustArea: "Quality",
    uomType: "Percentage" as const,
    target: 85,
    achievement: 72,
    weightage: 25,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g2",
    userId: "1",
    title: "Complete API Documentation",
    description: "Document all REST APIs with OpenAPI specifications",
    thrustArea: "Documentation",
    uomType: "Numeric" as const,
    target: 50,
    achievement: 35,
    weightage: 20,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g3",
    userId: "1",
    title: "Reduce Bug Count",
    description: "Decrease critical bugs in production by 50%",
    thrustArea: "Quality",
    uomType: "Percentage" as const,
    target: 50,
    achievement: 60,
    weightage: 30,
    deadline: "2024-06-30",
    status: "completed" as const,
    quarter: "Q2",
  },
  {
    id: "g4",
    userId: "1",
    title: "Performance Optimization",
    description: "Optimize page load time to under 2 seconds",
    thrustArea: "Performance",
    uomType: "Timeline" as const,
    target: 2,
    achievement: 2.5,
    weightage: 25,
    deadline: "2024-06-30",
    status: "not-started" as const,
    quarter: "Q2",
  },
  {
    id: "g5",
    userId: "4",
    title: "Launch Marketing Campaign",
    description: "Execute Q2 digital marketing campaign",
    thrustArea: "Marketing",
    uomType: "Numeric" as const,
    target: 3,
    achievement: 2,
    weightage: 40,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g6",
    userId: "4",
    title: "Increase Social Media Engagement",
    description: "Grow social media engagement by 30%",
    thrustArea: "Marketing",
    uomType: "Percentage" as const,
    target: 30,
    achievement: 25,
    weightage: 30,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g7",
    userId: "4",
    title: "Content Creation",
    description: "Create 20 blog posts for the quarter",
    thrustArea: "Content",
    uomType: "Numeric" as const,
    target: 20,
    achievement: 15,
    weightage: 30,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g8",
    userId: "6",
    title: "Feature Development",
    description: "Complete 5 new features for the platform",
    thrustArea: "Development",
    uomType: "Numeric" as const,
    target: 5,
    achievement: 3,
    weightage: 50,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g9",
    userId: "6",
    title: "Code Review Participation",
    description: "Complete 30 code reviews per quarter",
    thrustArea: "Collaboration",
    uomType: "Numeric" as const,
    target: 30,
    achievement: 28,
    weightage: 25,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
  {
    id: "g10",
    userId: "6",
    title: "Technical Learning",
    description: "Complete 2 technical certifications",
    thrustArea: "Learning",
    uomType: "Numeric" as const,
    target: 2,
    achievement: 1,
    weightage: 25,
    deadline: "2024-06-30",
    status: "on-track" as const,
    quarter: "Q2",
  },
];

// Mock Pending Approvals
export const pendingApprovals = [
  {
    id: "pa1",
    employeeId: "1",
    employeeName: "John Smith",
    department: "Engineering",
    submittedDate: "2024-04-15",
    goals: goals.filter((g) => g.userId === "1"),
    status: "pending" as const,
  },
  {
    id: "pa2",
    employeeId: "4",
    employeeName: "Emily Davis",
    department: "Marketing",
    submittedDate: "2024-04-16",
    goals: goals.filter((g) => g.userId === "4"),
    status: "pending" as const,
  },
  {
    id: "pa3",
    employeeId: "6",
    employeeName: "Jennifer Lee",
    department: "Engineering",
    submittedDate: "2024-04-17",
    goals: goals.filter((g) => g.userId === "6"),
    status: "pending" as const,
  },
];

// Mock Quarterly Progress
export const quarterlyProgress = [
  { quarter: "Q1", planned: 100, actual: 92, completion: 92 },
  { quarter: "Q2", planned: 100, actual: 78, completion: 78 },
  { quarter: "Q3", planned: 100, actual: 0, completion: 0 },
  { quarter: "Q4", planned: 100, actual: 0, completion: 0 },
];

// Mock Team Progress (for managers)
export const teamProgress = [
  {
    id: "1",
    name: "John Smith",
    department: "Engineering",
    goalsCompleted: 3,
    totalGoals: 4,
    quarterlyStatus: "On Track",
    pendingItems: 1,
    lastUpdate: "2024-04-18",
    progress: 75,
  },
  {
    id: "4",
    name: "Emily Davis",
    department: "Marketing",
    goalsCompleted: 2,
    totalGoals: 3,
    quarterlyStatus: "On Track",
    pendingItems: 0,
    lastUpdate: "2024-04-17",
    progress: 67,
  },
  {
    id: "6",
    name: "Jennifer Lee",
    department: "Engineering",
    goalsCompleted: 1,
    totalGoals: 3,
    quarterlyStatus: "At Risk",
    pendingItems: 2,
    lastUpdate: "2024-04-16",
    progress: 55,
  },
  {
    id: "8",
    name: "Lisa Anderson",
    department: "Finance",
    goalsCompleted: 4,
    totalGoals: 4,
    quarterlyStatus: "Completed",
    pendingItems: 0,
    lastUpdate: "2024-04-18",
    progress: 100,
  },
];

// Mock Department Performance
export const departmentPerformance = [
  { department: "Engineering", completion: 78, employees: 12 },
  { department: "Marketing", completion: 85, employees: 8 },
  { department: "Sales", completion: 72, employees: 15 },
  { department: "Finance", completion: 90, employees: 6 },
  { department: "HR", completion: 88, employees: 5 },
];

// Mock Audit Logs
export const auditLogs = [
  {
    id: "al1",
    userId: "1",
    userName: "John Smith",
    action: "Goal Created",
    oldValue: null,
    newValue: "Increase Code Coverage - 85%",
    timestamp: "2024-04-18T10:30:00Z",
    status: "success" as const,
  },
  {
    id: "al2",
    userId: "2",
    userName: "Sarah Johnson",
    action: "Goal Approved",
    oldValue: "Pending",
    newValue: "Approved",
    timestamp: "2024-04-18T11:15:00Z",
    status: "success" as const,
  },
  {
    id: "al3",
    userId: "4",
    userName: "Emily Davis",
    action: "Check-in Submitted",
    oldValue: "Q1 Progress: 60%",
    newValue: "Q2 Progress: 75%",
    timestamp: "2024-04-17T14:22:00Z",
    status: "success" as const,
  },
  {
    id: "al4",
    userId: "3",
    userName: "Michael Chen",
    action: "User Role Updated",
    oldValue: "Employee",
    newValue: "Manager",
    timestamp: "2024-04-17T09:45:00Z",
    status: "warning" as const,
  },
  {
    id: "al5",
    userId: "6",
    userName: "Jennifer Lee",
    action: "Goal Updated",
    oldValue: "Target: 4",
    newValue: "Target: 5",
    timestamp: "2024-04-16T16:30:00Z",
    status: "success" as const,
  },
  {
    id: "al6",
    userId: "2",
    userName: "Sarah Johnson",
    action: "Goal Rejected",
    oldValue: "Pending",
    newValue: "Rejected - Needs revision",
    timestamp: "2024-04-16T11:00:00Z",
    status: "error" as const,
  },
  {
    id: "al7",
    userId: "5",
    userName: "Robert Wilson",
    action: "Account Deactivated",
    oldValue: "Active",
    newValue: "Inactive",
    timestamp: "2024-04-15T08:00:00Z",
    status: "warning" as const,
  },
  {
    id: "al8",
    userId: "7",
    userName: "David Brown",
    action: "Report Generated",
    oldValue: null,
    newValue: "Q1 Department Summary",
    timestamp: "2024-04-14T17:30:00Z",
    status: "success" as const,
  },
];

// Mock Check-ins
export const checkIns = [
  {
    id: "ci1",
    goalId: "g1",
    quarter: "Q2",
    plannedTarget: 85,
    actualAchievement: 72,
    status: "on-track" as const,
    progress: 85,
    comments: "Good progress, on track to meet target",
  },
  {
    id: "ci2",
    goalId: "g2",
    quarter: "Q2",
    plannedTarget: 50,
    actualAchievement: 35,
    status: "on-track" as const,
    progress: 70,
    comments: "Documented 35 APIs, remaining 15 in progress",
  },
  {
    id: "ci3",
    goalId: "g3",
    quarter: "Q2",
    plannedTarget: 50,
    actualAchievement: 60,
    status: "completed" as const,
    progress: 100,
    comments: "Exceeded target - reduced bugs by 60%",
  },
  {
    id: "ci4",
    goalId: "g4",
    quarter: "Q2",
    plannedTarget: 2,
    actualAchievement: 2.5,
    status: "not-started" as const,
    progress: 0,
    comments: "Will start optimization in next sprint",
  },
];

// Mock Reports Data
export const reportData = {
  plannedVsActual: [
    { month: "Jan", planned: 100, actual: 95 },
    { month: "Feb", planned: 100, actual: 88 },
    { month: "Mar", planned: 100, actual: 92 },
    { month: "Apr", planned: 100, actual: 78 },
    { month: "May", planned: 100, actual: 85 },
    { month: "Jun", planned: 100, actual: 0 },
  ],
  quarterlyCompletion: [
    { quarter: "Q1 2023", completion: 87 },
    { quarter: "Q2 2023", completion: 91 },
    { quarter: "Q3 2023", completion: 84 },
    { quarter: "Q4 2023", completion: 89 },
    { quarter: "Q1 2024", completion: 92 },
    { quarter: "Q2 2024", completion: 78 },
  ],
  employeePerformance: [
    { name: "John Smith", score: 85, goals: 4 },
    { name: "Emily Davis", score: 78, goals: 3 },
    { name: "Jennifer Lee", score: 72, goals: 3 },
    { name: "Lisa Anderson", score: 95, goals: 4 },
    { name: "Robert Wilson", score: 68, goals: 3 },
  ],
};

// UoM Options
export const uomOptions = [
  { value: "Numeric", label: "Numeric" },
  { value: "Percentage", label: "Percentage" },
  { value: "Timeline", label: "Timeline" },
  { value: "Zero-based", label: "Zero-based" },
];

// Thrust Area Options
export const thrustAreaOptions = [
  { value: "Quality", label: "Quality" },
  { value: "Performance", label: "Performance" },
  { value: "Documentation", label: "Documentation" },
  { value: "Development", label: "Development" },
  { value: "Marketing", label: "Marketing" },
  { value: "Content", label: "Content" },
  { value: "Collaboration", label: "Collaboration" },
  { value: "Learning", label: "Learning" },
  { value: "Innovation", label: "Innovation" },
  { value: "Customer Success", label: "Customer Success" },
];

// Status Options
export const statusOptions = [
  { value: "not-started", label: "Not Started" },
  { value: "on-track", label: "On Track" },
  { value: "completed", label: "Completed" },
];

// Types
export type UserRole = "employee" | "manager" | "admin";
export type GoalStatus = "not-started" | "on-track" | "completed";
export type UoMType = "Numeric" | "Percentage" | "Timeline" | "Zero-based";
export type UserStatus = "active" | "inactive";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "rework";
export type AuditStatus = "success" | "warning" | "error";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  manager: string | null;
  avatar: string;
  status: UserStatus;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  thrustArea: string;
  uomType: UoMType;
  target: number;
  achievement: number;
  weightage: number;
  deadline: string;
  status: GoalStatus;
  quarter: string;
}
