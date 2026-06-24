/**
 * DSA Round — Problem Bank
 *
 * 5 problems covering core DSA paradigms:
 *   1. dsa-1  — House Robber II                    → Dynamic Programming
 *   2. dsa-2  — Longest Increasing Path in Matrix  → DP + DFS / BFS / Topological Sort
 *   3. dsa-3  — Capacity to Ship Packages          → Binary Search on Answer
 *   4. dsa-4  — Max Consecutive Ones III           → Sliding Window / Two Pointers
 *   5. dsa-5  — Shortest Subarray with Sum ≥ K     → Prefix Sum + Monotonic Deque
 *
 * Fields per question (see DSAQuestion in question-types.ts):
 *   id                     – unique identifier
 *   role                   – "common"
 *   roundType              – "dsa"
 *   topic                  – algorithm paradigm tag
 *   question               – full problem statement shown to the candidate
 *   answerKeywords         – key concepts for AI scoring
 *   expectedAnswer         – full reference solution description
 *   sampleTestCases        – 1-2 visible test cases with explanation
 *   constraints            – problem constraints
 *   hiddenTestCases        – automated judge test cases (not shown to candidate)
 *   edgeTestCases          – boundary / corner-case inputs
 *   expectedTimeComplexity – e.g. "O(n)"
 *   expectedSpaceComplexity– e.g. "O(1)"
 *   expectedApproach       – list of expected DS / Algo paradigm names
 */

import type { DSAQuestion } from "./question-types";

export const DSA_QUESTIONS: DSAQuestion[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // 1) House Robber II  (dsa-1)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "dsa-1",
    role: "common",
    roundType: "dsa",
    topic: "Dynamic Programming",
    question:
      "You are a professional robber planning to rob houses along a street. " +
      "Each house has a certain amount of money stashed. All houses at this place are arranged in a circle. " +
      "That means the first house is the neighbor of the last one. " +
      "Meanwhile, adjacent houses have a security system connected, and it will automatically contact the police " +
      "if two adjacent houses were broken into on the same night.\n\n" +
      "Given an integer array nums representing the amount of money of each house, " +
      "return the maximum amount of money you can rob tonight without alerting the police.\n\n" +
      "Input format for code:\n" +
      "First line: n\n" +
      "Second line: n space-separated integers for nums\n" +
      "Print one integer: the maximum amount.",
    answerKeywords: [
      "dynamic programming",
      "DP",
      "circular",
      "two passes",
      "exclude first",
      "exclude last",
      "house robber",
      "linear DP",
    ],
    expectedAnswer:
      "Run two separate linear DP passes on the array: " +
      "one that considers houses 0..n-2 (excluding the last) and one that considers houses 1..n-1 (excluding the first). " +
      "Return the maximum of the two results. " +
      "At each step keep track of the best profit when including or skipping the current house.",

    sampleTestCases: [
      {
        input: "nums = [2, 3, 2]",
        stdin: "3\n2 3 2\n",
        expectedOutput: "3",
        explanation:
          "You cannot rob house 1 (money = 2) and then rob house 3 (money = 2) " +
          "because they are adjacent (circular). The best option is to rob only house 2 (money = 3).",
      },
    ],

    constraints: [
      "1 <= nums.length <= 10^5",
      "1 <= nums[i] <= 10^5",
    ],

    hiddenTestCases: [
      {
        input: "nums = [1, 2, 3]",
        stdin: "3\n1 2 3\n",
        expectedOutput: "3",
      },
      {
        input: "nums = [4, 1, 2, 7, 5, 3, 1]",
        stdin: "7\n4 1 2 7 5 3 1\n",
        expectedOutput: "14",
      },
    ],

    edgeTestCases: [
      {
        input: "nums = [1, 2]",
        stdin: "2\n1 2\n",
        expectedOutput: "2",
        explanation:
          "Only two houses. Robbing both would trigger the alarm (they are adjacent in a circle of 2). " +
          "Rob the higher-value house (money = 2).",
      },
    ],

    expectedTimeComplexity: "O(n)",
    expectedSpaceComplexity: "O(1)",
    expectedApproach: ["Dynamic Programming", "Linear DP", "Array"],
    expectedAlgorithms: ["Dynamic Programming", "Linear DP"],
    expectedDataStructures: ["Array"],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2) Longest Increasing Path in a Matrix  (dsa-2)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "dsa-2",
    role: "common",
    roundType: "dsa",
    topic: "Dynamic Programming / Graph Traversal",
    question:
      "Given an m x n integers matrix, return the length of the longest increasing path in the matrix.\n\n" +
      "From each cell, you can either move in four directions: left, right, up, or down. " +
      "You may not move diagonally or move outside the boundary (i.e., wrap-around is not allowed).\n\n" +
      "Input format for code:\n" +
      "First line: m n\n" +
      "Next m lines: n space-separated integers for the matrix\n" +
      "Print one integer: the longest increasing path length.",
    answerKeywords: [
      "DFS",
      "BFS",
      "memoization",
      "dynamic programming",
      "topological sort",
      "longest increasing path",
      "matrix",
      "graph",
      "cache",
    ],
    expectedAnswer:
      "Use DFS with memoization: for each cell, recursively explore all four neighbors that have a strictly greater value. " +
      "Cache (memoize) the result for each cell to avoid recomputation. " +
      "Alternatively use Kahn's algorithm (BFS topological sort) by treating each cell as a node with edges to neighbors with greater values, " +
      "then process cells level by level. Return the maximum path length found across all starting cells.",

    sampleTestCases: [
      {
        input: "matrix = [[9,9,4],[6,6,8],[2,1,1]]",
        stdin: "3 3\n9 9 4\n6 6 8\n2 1 1\n",
        expectedOutput: "4",
        explanation:
          "The longest increasing path is [1, 2, 6, 9], traversing cells (2,1) → (2,0) → (1,0) → (0,0).",
      },
    ],

    constraints: [
      "m == matrix.length",
      "n == matrix[i].length",
      "1 <= m, n <= 200",
      "0 <= matrix[i][j] <= 2^31 - 1",
    ],

    hiddenTestCases: [
      {
        input: "matrix = [[3,4,5],[3,2,6],[2,2,1]]",
        stdin: "3 3\n3 4 5\n3 2 6\n2 2 1\n",
        expectedOutput: "4",
      },
      {
        input: "matrix = [[1,2,3],[6,5,4],[7,8,9]]",
        stdin: "3 3\n1 2 3\n6 5 4\n7 8 9\n",
        expectedOutput: "9",
      },
    ],

    edgeTestCases: [
      {
        input: "matrix = [[1]]",
        stdin: "1 1\n1\n",
        expectedOutput: "1",
        explanation: "Single cell — the path length is 1.",
      },
    ],

    expectedTimeComplexity: "O(m * n)",
    expectedSpaceComplexity: "O(m * n)",
    expectedApproach: [
      "Dynamic Programming",
      "Depth First Search",
      "Memoization",
      "Matrix",
    ],
    expectedAlgorithms: ["Dynamic Programming", "Depth First Search", "Memoization"],
    expectedDataStructures: ["Matrix"],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 3) Capacity to Ship Packages Within D Days  (dsa-3)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "dsa-3",
    role: "common",
    roundType: "dsa",
    topic: "Binary Search on Answer",
    question:
      "A conveyor belt has packages that must be shipped from one port to another within days days.\n\n" +
      "The i-th package on the conveyor belt has a weight of weights[i]. " +
      "Each day, we load the ship with packages on the conveyor belt (in the order given by weights). " +
      "We may not load more weight than the maximum weight capacity of the ship.\n\n" +
      "Return the least weight capacity of the ship that will result in all the packages " +
      "on the conveyor belt being shipped within days days.\n\n" +
      "Input format for code:\n" +
      "First line: n\n" +
      "Second line: n space-separated integers for weights\n" +
      "Third line: days\n" +
      "Print one integer: the minimum capacity.",
    answerKeywords: [
      "binary search",
      "binary search on answer",
      "BSOA",
      "greedy",
      "feasibility check",
      "capacity",
      "lower bound",
      "upper bound",
    ],
    expectedAnswer:
      "Binary search on the answer space [max(weights), sum(weights)]. " +
      "For a given candidate capacity, greedily simulate loading: accumulate weights until adding the next package would exceed the capacity, then start a new day. " +
      "If the total days needed is <= days, the capacity is feasible. " +
      "Find the minimum feasible capacity with binary search.",

    sampleTestCases: [
      {
        input: "weights = [1,2,3,4,5,6,7,8,9,10], days = 5",
        stdin: "10\n1 2 3 4 5 6 7 8 9 10\n5\n",
        expectedOutput: "15",
        explanation:
          "A ship capacity of 15 allows shipping in 5 days: " +
          "Day 1: [1,2,3,4,5], Day 2: [6,7], Day 3: [8], Day 4: [9], Day 5: [10].",
      },
    ],

    constraints: [
      "1 <= days <= weights.length <= 5 * 10^4",
      "1 <= weights[i] <= 500",
    ],

    hiddenTestCases: [
      {
        input: "weights = [7,2,5,10,8], days = 2",
        stdin: "5\n7 2 5 10 8\n2\n",
        expectedOutput: "18",
      },
      {
        input: "weights = [1,2,3,1,1,1,10], days = 5",
        stdin: "7\n1 2 3 1 1 1 10\n5\n",
        expectedOutput: "10",
      },
    ],

    edgeTestCases: [
      {
        input: "weights = [10], days = 1",
        stdin: "1\n10\n1\n",
        expectedOutput: "10",
        explanation:
          "Single package, single day — the minimum capacity equals the package weight.",
      },
    ],

    expectedTimeComplexity: "O(n * log(sum of weights))",
    expectedSpaceComplexity: "O(1)",
    expectedApproach: [
      "Binary Search",
      "Binary Search on Answer",
      "Greedy",
      "Array",
    ],
    expectedAlgorithms: ["Binary Search", "Binary Search on Answer", "Greedy"],
    expectedDataStructures: ["Array"],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 4) Max Consecutive Ones III  (dsa-4)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "dsa-4",
    role: "common",
    roundType: "dsa",
    topic: "Sliding Window",
    question:
      "Given a binary array nums and an integer k, return the maximum number of consecutive 1's in the array " +
      "if you can flip at most k 0's.\n\n" +
      "Input format for code:\n" +
      "First line: n\n" +
      "Second line: n space-separated integers for nums\n" +
      "Third line: k\n" +
      "Print one integer: the maximum length.",
    answerKeywords: [
      "sliding window",
      "two pointers",
      "window",
      "left pointer",
      "right pointer",
      "zero count",
      "shrink",
      "expand",
    ],
    expectedAnswer:
      "Maintain a sliding window [left, right]. Expand right unconditionally. " +
      "Track the count of 0's inside the window. " +
      "When the zero count exceeds k, shrink the window from the left until the zero count is at most k again. " +
      "The answer is the maximum window size observed.",

    sampleTestCases: [
      {
        input: "nums = [1,1,1,0,0,0,1,1,1,1,0], k = 2",
        stdin: "11\n1 1 1 0 0 0 1 1 1 1 0\n2\n",
        expectedOutput: "6",
        explanation:
          "Flip the two 0's at indices 5 and 10 (bolded): [1,1,1,0,0,**1**,1,1,1,1,**1**]. " +
          "The longest window of consecutive 1's has length 6.",
      },
    ],

    constraints: [
      "1 <= nums.length <= 10^5",
      "nums[i] is either 0 or 1",
      "0 <= k <= nums.length",
    ],

    hiddenTestCases: [
      {
        input: "nums = [0,0,1,1,1,0,0,1,1,1,1,0,0], k = 2",
        stdin: "13\n0 0 1 1 1 0 0 1 1 1 1 0 0\n2\n",
        expectedOutput: "9",
      },
      {
        input: "nums = [0,1,1,0,1,0,1,1,1,0,1,1,0,0,1], k = 2",
        stdin: "15\n0 1 1 0 1 0 1 1 1 0 1 1 0 0 1\n2\n",
        expectedOutput: "7",
      },
    ],

    edgeTestCases: [
      {
        input: "nums = [0], k = 1",
        stdin: "1\n0\n1\n",
        expectedOutput: "1",
        explanation:
          "Single element which is 0. We can flip it (k = 1), giving a window of length 1.",
      },
    ],

    expectedTimeComplexity: "O(n)",
    expectedSpaceComplexity: "O(1)",
    expectedApproach: ["Sliding Window", "Two Pointers", "Array"],
    expectedAlgorithms: ["Sliding Window", "Two Pointers"],
    expectedDataStructures: ["Array"],
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 5) Shortest Subarray with Sum at Least K  (dsa-5)
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: "dsa-5",
    role: "common",
    roundType: "dsa",
    topic: "Prefix Sum / Monotonic Deque",
    question:
      "Given an integer array nums and an integer k, return the length of the shortest non-empty subarray of nums " +
      "with a sum of at least k. If there is no such subarray, return -1.\n\n" +
      "A subarray is a contiguous part of an array.\n\n" +
      "Input format for code:\n" +
      "First line: n\n" +
      "Second line: n space-separated integers for nums\n" +
      "Third line: k\n" +
      "Print one integer: the shortest length, or -1.",
    answerKeywords: [
      "prefix sum",
      "monotonic deque",
      "deque",
      "sliding window",
      "negative numbers",
      "shortest subarray",
      "monotone",
    ],
    expectedAnswer:
      "Compute the prefix sum array. " +
      "Use a monotonic (non-decreasing) deque of prefix-sum indices. " +
      "For each index i, while the front of the deque gives a prefix sum such that prefix[i] - prefix[deque.front()] >= k, " +
      "update the minimum length and pop from the front. " +
      "Then, while the back of the deque has a prefix sum >= prefix[i], pop from the back (maintaining the monotone property). " +
      "Push i onto the deque. Return the minimum length found, or -1 if none.",

    sampleTestCases: [
      {
        input: "nums = [2, -1, 2], k = 3",
        stdin: "3\n2 -1 2\n3\n",
        expectedOutput: "3",
        explanation:
          "The only subarray with sum >= 3 is the entire array [2,-1,2] with sum 3, length 3.",
      },
    ],

    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^5 <= nums[i] <= 10^5",
      "1 <= k <= 10^9",
    ],

    hiddenTestCases: [
      {
        input: "nums = [17,-10,20,-5,3,1,2,8], k = 25",
        stdin: "8\n17 -10 20 -5 3 1 2 8\n25\n",
        expectedOutput: "2",
      },
      {
        input: "nums = [84,-37,32,40,95], k = 167",
        stdin: "5\n84 -37 32 40 95\n167\n",
        expectedOutput: "3",
      },
    ],

    edgeTestCases: [
      {
        input: "nums = [5], k = 10",
        stdin: "1\n5\n10\n",
        expectedOutput: "-1",
        explanation:
          "The only subarray is [5] with sum 5 < 10, so no valid subarray exists.",
      },
    ],

    expectedTimeComplexity: "O(n)",
    expectedSpaceComplexity: "O(n)",
    expectedApproach: [
      "Prefix Sum",
      "Deque",
      "Monotonic Deque",
      "Array",
    ],
    expectedAlgorithms: ["Prefix Sum", "Monotonic Deque"],
    expectedDataStructures: ["Deque", "Array"],
  },
];
