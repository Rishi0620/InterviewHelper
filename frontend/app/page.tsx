"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/frontend/components/ui/card"
import { Button } from "@/frontend/components/ui/button"
import { Badge } from "@/frontend/components/ui/badge"
import { Separator } from "@/frontend/components/ui/separator"
import { Textarea } from "@/frontend/components/ui/textarea"
import { Play, Pause, RotateCcw, Mic, MicOff, Brain, Wifi, WifiOff, FileText, Search, AlertCircle } from "lucide-react"
import { CodeEditor } from "@/frontend/components/code-editor"
import { TranscriptionPanel } from "@/frontend/components/transcription-panel"
import { FeedbackPanel } from "@/frontend/components/feedback-panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/frontend/components/ui/select"
import { Input } from "@/frontend/components/ui/input"

interface Snapshot {
  id: string
  code: string
  timestamp: number
  language: string
}

interface TranscriptionSegment {
  id: string
  text: string
  timestamp: number
  confidence?: number
}

interface AIFeedback {
  id: string
  timestamp: number
  score: number
  strengths: string[]
  improvements: string[]
  optimizations: string[]
  codeAnalysis: string
  speechAnalysis: string
}

interface LeetCodeProblem {
  id: number
  title: string
  titleSlug: string
  difficulty: "Easy" | "Medium" | "Hard"
  category: string
  tags: string[]
  isPremium: boolean
  acceptance: number
  frequency?: number
}

// Comprehensive fallback dataset with 100+ popular LeetCode problems
const FALLBACK_PROBLEMS: LeetCodeProblem[] = [
  {
    id: 1,
    title: "Two Sum",
    titleSlug: "two-sum",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Hash Table"],
    isPremium: false,
    acceptance: 49.1,
  },
  {
    id: 2,
    title: "Add Two Numbers",
    titleSlug: "add-two-numbers",
    difficulty: "Medium",
    category: "Linked List",
    tags: ["Linked List", "Math", "Recursion"],
    isPremium: false,
    acceptance: 37.8,
  },
  {
    id: 3,
    title: "Longest Substring Without Repeating Characters",
    titleSlug: "longest-substring-without-repeating-characters",
    difficulty: "Medium",
    category: "String",
    tags: ["Hash Table", "String", "Sliding Window"],
    isPremium: false,
    acceptance: 33.8,
  },
  {
    id: 4,
    title: "Median of Two Sorted Arrays",
    titleSlug: "median-of-two-sorted-arrays",
    difficulty: "Hard",
    category: "Array",
    tags: ["Array", "Binary Search", "Divide and Conquer"],
    isPremium: false,
    acceptance: 35.3,
  },
  {
    id: 5,
    title: "Longest Palindromic Substring",
    titleSlug: "longest-palindromic-substring",
    difficulty: "Medium",
    category: "String",
    tags: ["String", "Dynamic Programming"],
    isPremium: false,
    acceptance: 32.8,
  },
  {
    id: 7,
    title: "Reverse Integer",
    titleSlug: "reverse-integer",
    difficulty: "Medium",
    category: "Math",
    tags: ["Math"],
    isPremium: false,
    acceptance: 27.3,
  },
  {
    id: 8,
    title: "String to Integer (atoi)",
    titleSlug: "string-to-integer-atoi",
    difficulty: "Medium",
    category: "String",
    tags: ["String"],
    isPremium: false,
    acceptance: 16.6,
  },
  {
    id: 9,
    title: "Palindrome Number",
    titleSlug: "palindrome-number",
    difficulty: "Easy",
    category: "Math",
    tags: ["Math"],
    isPremium: false,
    acceptance: 52.7,
  },
  {
    id: 10,
    title: "Regular Expression Matching",
    titleSlug: "regular-expression-matching",
    difficulty: "Hard",
    category: "String",
    tags: ["String", "Dynamic Programming", "Recursion"],
    isPremium: false,
    acceptance: 27.9,
  },
  {
    id: 11,
    title: "Container With Most Water",
    titleSlug: "container-with-most-water",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Greedy"],
    isPremium: false,
    acceptance: 54.1,
  },
  {
    id: 12,
    title: "Integer to Roman",
    titleSlug: "integer-to-roman",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "Math", "String"],
    isPremium: false,
    acceptance: 61.5,
  },
  {
    id: 13,
    title: "Roman to Integer",
    titleSlug: "roman-to-integer",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "Math", "String"],
    isPremium: false,
    acceptance: 58.4,
  },
  {
    id: 14,
    title: "Longest Common Prefix",
    titleSlug: "longest-common-prefix",
    difficulty: "Easy",
    category: "String",
    tags: ["String", "Trie"],
    isPremium: false,
    acceptance: 40.1,
  },
  {
    id: 15,
    title: "3Sum",
    titleSlug: "3sum",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Sorting"],
    isPremium: false,
    acceptance: 32.1,
  },
  {
    id: 16,
    title: "3Sum Closest",
    titleSlug: "3sum-closest",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Sorting"],
    isPremium: false,
    acceptance: 46.2,
  },
  {
    id: 17,
    title: "Letter Combinations of a Phone Number",
    titleSlug: "letter-combinations-of-a-phone-number",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Backtracking"],
    isPremium: false,
    acceptance: 57.0,
  },
  {
    id: 18,
    title: "4Sum",
    titleSlug: "4sum",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Sorting"],
    isPremium: false,
    acceptance: 35.3,
  },
  {
    id: 19,
    title: "Remove Nth Node From End of List",
    titleSlug: "remove-nth-node-from-end-of-list",
    difficulty: "Medium",
    category: "Linked List",
    tags: ["Linked List", "Two Pointers"],
    isPremium: false,
    acceptance: 39.0,
  },
  {
    id: 20,
    title: "Valid Parentheses",
    titleSlug: "valid-parentheses",
    difficulty: "Easy",
    category: "String",
    tags: ["String", "Stack"],
    isPremium: false,
    acceptance: 40.7,
  },
  {
    id: 21,
    title: "Merge Two Sorted Lists",
    titleSlug: "merge-two-sorted-lists",
    difficulty: "Easy",
    category: "Linked List",
    tags: ["Linked List", "Recursion"],
    isPremium: false,
    acceptance: 62.4,
  },
  {
    id: 22,
    title: "Generate Parentheses",
    titleSlug: "generate-parentheses",
    difficulty: "Medium",
    category: "String",
    tags: ["String", "Dynamic Programming", "Backtracking"],
    isPremium: false,
    acceptance: 73.2,
  },
  {
    id: 23,
    title: "Merge k Sorted Lists",
    titleSlug: "merge-k-sorted-lists",
    difficulty: "Hard",
    category: "Linked List",
    tags: ["Linked List", "Divide and Conquer", "Heap (Priority Queue)", "Merge Sort"],
    isPremium: false,
    acceptance: 47.1,
  },
  {
    id: 24,
    title: "Swap Nodes in Pairs",
    titleSlug: "swap-nodes-in-pairs",
    difficulty: "Medium",
    category: "Linked List",
    tags: ["Linked List", "Recursion"],
    isPremium: false,
    acceptance: 60.4,
  },
  {
    id: 25,
    title: "Reverse Nodes in k-Group",
    titleSlug: "reverse-nodes-in-k-group",
    difficulty: "Hard",
    category: "Linked List",
    tags: ["Linked List", "Recursion"],
    isPremium: false,
    acceptance: 53.8,
  },
  {
    id: 26,
    title: "Remove Duplicates from Sorted Array",
    titleSlug: "remove-duplicates-from-sorted-array",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Two Pointers"],
    isPremium: false,
    acceptance: 51.0,
  },
  {
    id: 27,
    title: "Remove Element",
    titleSlug: "remove-element",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Two Pointers"],
    isPremium: false,
    acceptance: 52.9,
  },
  {
    id: 28,
    title: "Find the Index of the First Occurrence in a String",
    titleSlug: "find-the-index-of-the-first-occurrence-in-a-string",
    difficulty: "Easy",
    category: "Two Pointers",
    tags: ["Two Pointers", "String", "String Matching"],
    isPremium: false,
    acceptance: 38.1,
  },
  {
    id: 33,
    title: "Search in Rotated Sorted Array",
    titleSlug: "search-in-rotated-sorted-array",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 38.9,
  },
  {
    id: 34,
    title: "Find First and Last Position of Element in Sorted Array",
    titleSlug: "find-first-and-last-position-of-element-in-sorted-array",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 42.3,
  },
  {
    id: 35,
    title: "Search Insert Position",
    titleSlug: "search-insert-position",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 42.1,
  },
  {
    id: 36,
    title: "Valid Sudoku",
    titleSlug: "valid-sudoku",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Hash Table", "Matrix"],
    isPremium: false,
    acceptance: 59.1,
  },
  {
    id: 39,
    title: "Combination Sum",
    titleSlug: "combination-sum",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Backtracking"],
    isPremium: false,
    acceptance: 69.2,
  },
  {
    id: 42,
    title: "Trapping Rain Water",
    titleSlug: "trapping-rain-water",
    difficulty: "Hard",
    category: "Array",
    tags: ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Monotonic Stack"],
    isPremium: false,
    acceptance: 59.5,
  },
  {
    id: 46,
    title: "Permutations",
    titleSlug: "permutations",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Backtracking"],
    isPremium: false,
    acceptance: 75.9,
  },
  {
    id: 48,
    title: "Rotate Image",
    titleSlug: "rotate-image",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Math", "Matrix"],
    isPremium: false,
    acceptance: 71.9,
  },
  {
    id: 49,
    title: "Group Anagrams",
    titleSlug: "group-anagrams",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Hash Table", "String", "Sorting"],
    isPremium: false,
    acceptance: 67.0,
  },
  {
    id: 53,
    title: "Maximum Subarray",
    titleSlug: "maximum-subarray",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Divide and Conquer", "Dynamic Programming"],
    isPremium: false,
    acceptance: 50.1,
  },
  {
    id: 54,
    title: "Spiral Matrix",
    titleSlug: "spiral-matrix",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Matrix", "Simulation"],
    isPremium: false,
    acceptance: 48.0,
  },
  {
    id: 55,
    title: "Jump Game",
    titleSlug: "jump-game",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    isPremium: false,
    acceptance: 38.5,
  },
  {
    id: 56,
    title: "Merge Intervals",
    titleSlug: "merge-intervals",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Sorting"],
    isPremium: false,
    acceptance: 46.8,
  },
  {
    id: 62,
    title: "Unique Paths",
    titleSlug: "unique-paths",
    difficulty: "Medium",
    category: "Math",
    tags: ["Math", "Dynamic Programming", "Combinatorics"],
    isPremium: false,
    acceptance: 63.5,
  },
  {
    id: 70,
    title: "Climbing Stairs",
    titleSlug: "climbing-stairs",
    difficulty: "Easy",
    category: "Math",
    tags: ["Math", "Dynamic Programming", "Memoization"],
    isPremium: false,
    acceptance: 51.1,
  },
  {
    id: 73,
    title: "Set Matrix Zeroes",
    titleSlug: "set-matrix-zeroes",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Hash Table", "Matrix"],
    isPremium: false,
    acceptance: 52.0,
  },
  {
    id: 75,
    title: "Sort Colors",
    titleSlug: "sort-colors",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Sorting"],
    isPremium: false,
    acceptance: 59.7,
  },
  {
    id: 76,
    title: "Minimum Window Substring",
    titleSlug: "minimum-window-substring",
    difficulty: "Hard",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Sliding Window"],
    isPremium: false,
    acceptance: 40.6,
  },
  {
    id: 78,
    title: "Subsets",
    titleSlug: "subsets",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Backtracking", "Bit Manipulation"],
    isPremium: false,
    acceptance: 74.7,
  },
  {
    id: 79,
    title: "Word Search",
    titleSlug: "word-search",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Backtracking", "Matrix"],
    isPremium: false,
    acceptance: 40.1,
  },
  {
    id: 84,
    title: "Largest Rectangle in Histogram",
    titleSlug: "largest-rectangle-in-histogram",
    difficulty: "Hard",
    category: "Array",
    tags: ["Array", "Stack", "Monotonic Stack"],
    isPremium: false,
    acceptance: 43.2,
  },
  {
    id: 88,
    title: "Merge Sorted Array",
    titleSlug: "merge-sorted-array",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Two Pointers", "Sorting"],
    isPremium: false,
    acceptance: 46.4,
  },
  {
    id: 94,
    title: "Binary Tree Inorder Traversal",
    titleSlug: "binary-tree-inorder-traversal",
    difficulty: "Easy",
    category: "Stack",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 74.4,
  },
  {
    id: 98,
    title: "Validate Binary Search Tree",
    titleSlug: "validate-binary-search-tree",
    difficulty: "Medium",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
    isPremium: false,
    acceptance: 31.9,
  },
  {
    id: 100,
    title: "Same Tree",
    titleSlug: "same-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 57.6,
  },
  {
    id: 101,
    title: "Symmetric Tree",
    titleSlug: "symmetric-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 54.3,
  },
  {
    id: 102,
    title: "Binary Tree Level Order Traversal",
    titleSlug: "binary-tree-level-order-traversal",
    difficulty: "Medium",
    category: "Tree",
    tags: ["Tree", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 65.1,
  },
  {
    id: 104,
    title: "Maximum Depth of Binary Tree",
    titleSlug: "maximum-depth-of-binary-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 73.7,
  },
  {
    id: 105,
    title: "Construct Binary Tree from Preorder and Inorder Traversal",
    titleSlug: "construct-binary-tree-from-preorder-and-inorder-traversal",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Hash Table", "Divide and Conquer", "Tree", "Binary Tree"],
    isPremium: false,
    acceptance: 61.4,
  },
  {
    id: 110,
    title: "Balanced Binary Tree",
    titleSlug: "balanced-binary-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 49.7,
  },
  {
    id: 111,
    title: "Minimum Depth of Binary Tree",
    titleSlug: "minimum-depth-of-binary-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 45.0,
  },
  {
    id: 112,
    title: "Path Sum",
    titleSlug: "path-sum",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 48.4,
  },
  {
    id: 121,
    title: "Best Time to Buy and Sell Stock",
    titleSlug: "best-time-to-buy-and-sell-stock",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Dynamic Programming"],
    isPremium: false,
    acceptance: 54.5,
  },
  {
    id: 122,
    title: "Best Time to Buy and Sell Stock II",
    titleSlug: "best-time-to-buy-and-sell-stock-ii",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming", "Greedy"],
    isPremium: false,
    acceptance: 65.1,
  },
  {
    id: 125,
    title: "Valid Palindrome",
    titleSlug: "valid-palindrome",
    difficulty: "Easy",
    category: "Two Pointers",
    tags: ["Two Pointers", "String"],
    isPremium: false,
    acceptance: 44.1,
  },
  {
    id: 128,
    title: "Longest Consecutive Sequence",
    titleSlug: "longest-consecutive-sequence",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Hash Table", "Union Find"],
    isPremium: false,
    acceptance: 48.7,
  },
  {
    id: 136,
    title: "Single Number",
    titleSlug: "single-number",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Bit Manipulation"],
    isPremium: false,
    acceptance: 70.9,
  },
  {
    id: 139,
    title: "Word Break",
    titleSlug: "word-break",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Dynamic Programming", "Trie", "Memoization"],
    isPremium: false,
    acceptance: 45.0,
  },
  {
    id: 141,
    title: "Linked List Cycle",
    titleSlug: "linked-list-cycle",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "Linked List", "Two Pointers"],
    isPremium: false,
    acceptance: 48.2,
  },
  {
    id: 142,
    title: "Linked List Cycle II",
    titleSlug: "linked-list-cycle-ii",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "Linked List", "Two Pointers"],
    isPremium: false,
    acceptance: 47.4,
  },
  {
    id: 143,
    title: "Reorder List",
    titleSlug: "reorder-list",
    difficulty: "Medium",
    category: "Linked List",
    tags: ["Linked List", "Two Pointers", "Stack", "Recursion"],
    isPremium: false,
    acceptance: 53.8,
  },
  {
    id: 144,
    title: "Binary Tree Preorder Traversal",
    titleSlug: "binary-tree-preorder-traversal",
    difficulty: "Easy",
    category: "Stack",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 68.2,
  },
  {
    id: 145,
    title: "Binary Tree Postorder Traversal",
    titleSlug: "binary-tree-postorder-traversal",
    difficulty: "Easy",
    category: "Stack",
    tags: ["Stack", "Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 68.1,
  },
  {
    id: 146,
    title: "LRU Cache",
    titleSlug: "lru-cache",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"],
    isPremium: false,
    acceptance: 40.7,
  },
  {
    id: 148,
    title: "Sort List",
    titleSlug: "sort-list",
    difficulty: "Medium",
    category: "Linked List",
    tags: ["Linked List", "Two Pointers", "Divide and Conquer", "Sorting", "Merge Sort"],
    isPremium: false,
    acceptance: 56.8,
  },
  {
    id: 150,
    title: "Evaluate Reverse Polish Notation",
    titleSlug: "evaluate-reverse-polish-notation",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Math", "Stack"],
    isPremium: false,
    acceptance: 47.1,
  },
  {
    id: 152,
    title: "Maximum Product Subarray",
    titleSlug: "maximum-product-subarray",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming"],
    isPremium: false,
    acceptance: 34.9,
  },
  {
    id: 153,
    title: "Find Minimum in Rotated Sorted Array",
    titleSlug: "find-minimum-in-rotated-sorted-array",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 49.0,
  },
  {
    id: 155,
    title: "Min Stack",
    titleSlug: "min-stack",
    difficulty: "Medium",
    category: "Stack",
    tags: ["Stack", "Design"],
    isPremium: false,
    acceptance: 52.4,
  },
  {
    id: 160,
    title: "Intersection of Two Linked Lists",
    titleSlug: "intersection-of-two-linked-lists",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "Linked List", "Two Pointers"],
    isPremium: false,
    acceptance: 54.1,
  },
  {
    id: 167,
    title: "Two Sum II - Input Array Is Sorted",
    titleSlug: "two-sum-ii-input-array-is-sorted",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Binary Search"],
    isPremium: false,
    acceptance: 59.0,
  },
  {
    id: 169,
    title: "Majority Element",
    titleSlug: "majority-element",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Hash Table", "Divide and Conquer", "Sorting", "Counting"],
    isPremium: false,
    acceptance: 63.9,
  },
  {
    id: 190,
    title: "Reverse Bits",
    titleSlug: "reverse-bits",
    difficulty: "Easy",
    category: "Divide and Conquer",
    tags: ["Divide and Conquer", "Bit Manipulation"],
    isPremium: false,
    acceptance: 52.0,
  },
  {
    id: 191,
    title: "Number of 1 Bits",
    titleSlug: "number-of-1-bits",
    difficulty: "Easy",
    category: "Divide and Conquer",
    tags: ["Divide and Conquer", "Bit Manipulation"],
    isPremium: false,
    acceptance: 66.8,
  },
  {
    id: 198,
    title: "House Robber",
    titleSlug: "house-robber",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming"],
    isPremium: false,
    acceptance: 49.8,
  },
  {
    id: 200,
    title: "Number of Islands",
    titleSlug: "number-of-islands",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"],
    isPremium: false,
    acceptance: 57.6,
  },
  {
    id: 202,
    title: "Happy Number",
    titleSlug: "happy-number",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "Math", "Two Pointers"],
    isPremium: false,
    acceptance: 54.9,
  },
  {
    id: 206,
    title: "Reverse Linked List",
    titleSlug: "reverse-linked-list",
    difficulty: "Easy",
    category: "Linked List",
    tags: ["Linked List", "Recursion"],
    isPremium: false,
    acceptance: 73.5,
  },
  {
    id: 207,
    title: "Course Schedule",
    titleSlug: "course-schedule",
    difficulty: "Medium",
    category: "Depth-First Search",
    tags: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"],
    isPremium: false,
    acceptance: 45.7,
  },
  {
    id: 208,
    title: "Implement Trie (Prefix Tree)",
    titleSlug: "implement-trie-prefix-tree",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Design", "Trie"],
    isPremium: false,
    acceptance: 65.1,
  },
  {
    id: 217,
    title: "Contains Duplicate",
    titleSlug: "contains-duplicate",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Hash Table", "Sorting"],
    isPremium: false,
    acceptance: 61.0,
  },
  {
    id: 226,
    title: "Invert Binary Tree",
    titleSlug: "invert-binary-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Breadth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 74.9,
  },
  {
    id: 230,
    title: "Kth Smallest Element in a BST",
    titleSlug: "kth-smallest-element-in-a-bst",
    difficulty: "Medium",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
    isPremium: false,
    acceptance: 71.6,
  },
  {
    id: 235,
    title: "Lowest Common Ancestor of a Binary Search Tree",
    titleSlug: "lowest-common-ancestor-of-a-binary-search-tree",
    difficulty: "Medium",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Search Tree", "Binary Tree"],
    isPremium: false,
    acceptance: 61.8,
  },
  {
    id: 236,
    title: "Lowest Common Ancestor of a Binary Tree",
    titleSlug: "lowest-common-ancestor-of-a-binary-tree",
    difficulty: "Medium",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 58.7,
  },
  {
    id: 238,
    title: "Product of Array Except Self",
    titleSlug: "product-of-array-except-self",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Prefix Sum"],
    isPremium: false,
    acceptance: 64.9,
  },
  {
    id: 242,
    title: "Valid Anagram",
    titleSlug: "valid-anagram",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Sorting"],
    isPremium: false,
    acceptance: 63.2,
  },
  {
    id: 268,
    title: "Missing Number",
    titleSlug: "missing-number",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Hash Table", "Math", "Binary Search", "Bit Manipulation", "Sorting"],
    isPremium: false,
    acceptance: 63.2,
  },
  {
    id: 283,
    title: "Move Zeroes",
    titleSlug: "move-zeroes",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Two Pointers"],
    isPremium: false,
    acceptance: 61.1,
  },
  {
    id: 287,
    title: "Find the Duplicate Number",
    titleSlug: "find-the-duplicate-number",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Two Pointers", "Binary Search", "Bit Manipulation"],
    isPremium: false,
    acceptance: 59.7,
  },
  {
    id: 300,
    title: "Longest Increasing Subsequence",
    titleSlug: "longest-increasing-subsequence",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Binary Search", "Dynamic Programming"],
    isPremium: false,
    acceptance: 54.1,
  },
  {
    id: 322,
    title: "Coin Change",
    titleSlug: "coin-change",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming", "Breadth-First Search"],
    isPremium: false,
    acceptance: 41.4,
  },
  {
    id: 338,
    title: "Counting Bits",
    titleSlug: "counting-bits",
    difficulty: "Easy",
    category: "Dynamic Programming",
    tags: ["Dynamic Programming", "Bit Manipulation"],
    isPremium: false,
    acceptance: 77.6,
  },
  {
    id: 347,
    title: "Top K Frequent Elements",
    titleSlug: "top-k-frequent-elements",
    difficulty: "Medium",
    category: "Array",
    tags: [
      "Array",
      "Hash Table",
      "Divide and Conquer",
      "Sorting",
      "Heap (Priority Queue)",
      "Bucket Sort",
      "Counting",
      "Quickselect",
    ],
    isPremium: false,
    acceptance: 64.3,
  },
  {
    id: 371,
    title: "Sum of Two Integers",
    titleSlug: "sum-of-two-integers",
    difficulty: "Medium",
    category: "Math",
    tags: ["Math", "Bit Manipulation"],
    isPremium: false,
    acceptance: 50.8,
  },
  {
    id: 383,
    title: "Ransom Note",
    titleSlug: "ransom-note",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Counting"],
    isPremium: false,
    acceptance: 60.2,
  },
  {
    id: 387,
    title: "First Unique Character in a String",
    titleSlug: "first-unique-character-in-a-string",
    difficulty: "Easy",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Queue", "Counting"],
    isPremium: false,
    acceptance: 59.7,
  },
  {
    id: 416,
    title: "Partition Equal Subset Sum",
    titleSlug: "partition-equal-subset-sum",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming"],
    isPremium: false,
    acceptance: 46.7,
  },
  {
    id: 424,
    title: "Longest Repeating Character Replacement",
    titleSlug: "longest-repeating-character-replacement",
    difficulty: "Medium",
    category: "Hash Table",
    tags: ["Hash Table", "String", "Sliding Window"],
    isPremium: false,
    acceptance: 52.8,
  },
  {
    id: 435,
    title: "Non-overlapping Intervals",
    titleSlug: "non-overlapping-intervals",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Dynamic Programming", "Greedy", "Sorting"],
    isPremium: false,
    acceptance: 51.8,
  },
  {
    id: 448,
    title: "Find All Numbers Disappeared in an Array",
    titleSlug: "find-all-numbers-disappeared-in-an-array",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Hash Table"],
    isPremium: false,
    acceptance: 59.3,
  },
  {
    id: 543,
    title: "Diameter of Binary Tree",
    titleSlug: "diameter-of-binary-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "Binary Tree"],
    isPremium: false,
    acceptance: 58.2,
  },
  {
    id: 572,
    title: "Subtree of Another Tree",
    titleSlug: "subtree-of-another-tree",
    difficulty: "Easy",
    category: "Tree",
    tags: ["Tree", "Depth-First Search", "String Matching", "Binary Tree", "Hash Function"],
    isPremium: false,
    acceptance: 46.5,
  },
  {
    id: 647,
    title: "Palindromic Substrings",
    titleSlug: "palindromic-substrings",
    difficulty: "Medium",
    category: "String",
    tags: ["String", "Dynamic Programming"],
    isPremium: false,
    acceptance: 67.0,
  },
  {
    id: 704,
    title: "Binary Search",
    titleSlug: "binary-search",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 55.2,
  },
  {
    id: 733,
    title: "Flood Fill",
    titleSlug: "flood-fill",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Depth-First Search", "Breadth-First Search", "Matrix"],
    isPremium: false,
    acceptance: 62.1,
  },
  {
    id: 739,
    title: "Daily Temperatures",
    titleSlug: "daily-temperatures",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Stack", "Monotonic Stack"],
    isPremium: false,
    acceptance: 66.5,
  },
  {
    id: 746,
    title: "Min Cost Climbing Stairs",
    titleSlug: "min-cost-climbing-stairs",
    difficulty: "Easy",
    category: "Array",
    tags: ["Array", "Dynamic Programming"],
    isPremium: false,
    acceptance: 63.2,
  },
  {
    id: 853,
    title: "Car Fleet",
    titleSlug: "car-fleet",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Stack", "Sorting", "Monotonic Stack"],
    isPremium: false,
    acceptance: 48.8,
  },
  {
    id: 875,
    title: "Koko Eating Bananas",
    titleSlug: "koko-eating-bananas",
    difficulty: "Medium",
    category: "Array",
    tags: ["Array", "Binary Search"],
    isPremium: false,
    acceptance: 54.2,
  },
].sort((a, b) => a.id - b.id)

// Multiple API endpoints to try
const API_ENDPOINTS = [
  "https://leetcode-api-pied.vercel.app/problems",
  "https://alfa-leetcode-api.onrender.com/problems",
  "https://leetcode.com/api/problems/all/", // Official but might have CORS issues
]

// Fetch LeetCode problems with multiple fallbacks
const fetchLeetCodeProblems = async (): Promise<{ problems: LeetCodeProblem[]; source: string }> => {
  // Try each API endpoint
  for (let i = 0; i < API_ENDPOINTS.length; i++) {
    const endpoint = API_ENDPOINTS[i]
    try {
      console.log(`Trying API endpoint ${i + 1}/${API_ENDPOINTS.length}: ${endpoint}`)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(endpoint, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; InterviewHelper/1.0)",
        },
        mode: "cors",
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      console.log(`Successfully fetched data from ${endpoint}`)

      // Handle different API response formats
      let problemsArray: any[] = []

      if (Array.isArray(data)) {
        problemsArray = data
      } else if (data.problems && Array.isArray(data.problems)) {
        problemsArray = data.problems
      } else if (data.stat_status_pairs && Array.isArray(data.stat_status_pairs)) {
        // LeetCode official API format
        problemsArray = data.stat_status_pairs.map((item: any) => ({
          id: item.stat?.question_id || item.stat?.frontend_question_id,
          title: item.stat?.question__title,
          titleSlug: item.stat?.question__title_slug,
          difficulty: item.difficulty?.level === 1 ? "Easy" : item.difficulty?.level === 2 ? "Medium" : "Hard",
          isPaidOnly: item.paid_only || false,
          acRate:
            item.stat?.total_acs && item.stat?.total_submitted
              ? ((item.stat.total_acs / item.stat.total_submitted) * 100).toFixed(1)
              : 0,
        }))
      }

      // Transform the data to match our interface
      const problems: LeetCodeProblem[] = problemsArray
        .map((problem: any) => ({
          id: Number(problem.id || problem.questionId || problem.frontendQuestionId || 0),
          title: problem.title || problem.question__title || "Unknown",
          titleSlug: problem.titleSlug || problem.slug || problem.question__title_slug || "",
          difficulty: (problem.difficulty || "Medium") as "Easy" | "Medium" | "Hard",
          category: problem.topicTags?.[0]?.name || problem.category || "General",
          tags: problem.topicTags?.map((tag: any) => tag.name || tag) || problem.tags || [],
          isPremium: problem.isPaidOnly || problem.premium || problem.paid_only || false,
          acceptance: problem.acRate ? Number.parseFloat(problem.acRate.toString()) : problem.acceptance || 0,
          frequency: problem.frequency || 0,
        }))
        .filter((p) => p.id > 0 && p.title !== "Unknown")
        .sort((a, b) => a.id - b.id)

      if (problems.length > 0) {
        console.log(`Successfully processed ${problems.length} problems from ${endpoint}`)
        return { problems, source: endpoint }
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint}:`, error)
      continue
    }
  }

  // If all APIs fail, use fallback
  console.log("All API endpoints failed, using fallback dataset")
  return { problems: FALLBACK_PROBLEMS, source: "fallback" }
}

export default function InterviewHelper() {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("javascript")
  const [isConnected, setIsConnected] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([])
  const [feedback, setFeedback] = useState<AIFeedback[]>([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [apiServerConnected, setApiServerConnected] = useState(false)

  // Add these new state variables after the existing ones
  const [problems, setProblems] = useState<LeetCodeProblem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All")
  const [isLoadingProblems, setIsLoadingProblems] = useState(false)
  const [showPremium, setShowPremium] = useState(true)
  const [problemsSource, setProblemsSource] = useState<string>("")

  // Question management
  const [questionType, setQuestionType] = useState<"leetcode" | "custom">("leetcode")
  const [selectedProblem, setSelectedProblem] = useState<LeetCodeProblem | null>(null)
  const [customQuestion, setCustomQuestion] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sessionStarted, setSessionStarted] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const feedbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionRetryRef = useRef<NodeJS.Timeout | null>(null)

  // Secure API configuration
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8765"

  // Input sanitization function
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "")
      .trim()
  }

  // Rate limiting for API calls
  const lastApiCall = useRef<number>(0)
  const API_RATE_LIMIT = 2000 // 2 seconds between calls

  // Enhanced filtering logic
  const filteredProblems = problems.filter((problem) => {
    const matchesSearch =
      problem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.difficulty.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === "All" || problem.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === "All" || problem.difficulty === selectedDifficulty
    const matchesPremium = showPremium || !problem.isPremium

    return matchesSearch && matchesCategory && matchesDifficulty && matchesPremium
  })

  // Get unique categories from loaded problems
  const availableCategories = ["All", ...Array.from(new Set(problems.map((p) => p.category))).sort()]

  // Auto health check for API server
  const checkApiServerHealth = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
        mode: "cors",
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setApiServerConnected(true)
        return true
      }
    } catch (error) {
      // Silent fail for auto-connection
    }

    setApiServerConnected(false)
    return false
  }, [API_BASE_URL])

  // Auto health check interval
  useEffect(() => {
    checkApiServerHealth()

    healthCheckIntervalRef.current = setInterval(() => {
      checkApiServerHealth()
    }, 10000) // Check every 10 seconds

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }
    }
  }, [checkApiServerHealth])

  // Auto WebSocket connection with retry
  const connectWebSocket = useCallback(() => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      wsRef.current = new WebSocket(WS_URL)

      wsRef.current.onopen = () => {
        setIsConnected(true)

        // Clear any retry timeout
        if (connectionRetryRef.current) {
          clearTimeout(connectionRetryRef.current)
        }

        // Send session setup
        wsRef.current?.send(
          JSON.stringify({
            type: "session_start",
            timestamp: Date.now(),
            language: sanitizeInput(language),
          }),
        )
      }

      wsRef.current.onclose = () => {
        setIsConnected(false)
        setIsTranscribing(false)

        // Auto-retry connection after 5 seconds
        connectionRetryRef.current = setTimeout(() => {
          connectWebSocket()
        }, 5000)
      }

      wsRef.current.onerror = () => {
        setIsConnected(false)
        setIsTranscribing(false)
      }

      wsRef.current.onmessage = (event) => {
        try {
          let transcriptionText = ""
          const rawData = sanitizeInput(event.data.toString())

          try {
            const data = JSON.parse(rawData)
            transcriptionText = sanitizeInput(data.text || data.message || data.transcript || data.content || "")

            if (data.type === "transcription_status") {
              setIsTranscribing(data.active !== false)
              return
            }
          } catch (jsonError) {
            transcriptionText = rawData
          }

          if (transcriptionText && transcriptionText.length > 0 && transcriptionText.length < 1000) {
            const segment: TranscriptionSegment = {
              id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              text: transcriptionText,
              timestamp: Date.now(),
              confidence: 1.0,
            }

            setTranscription((prev) => [...prev.slice(-49), segment])
            setIsTranscribing(true)

            setTimeout(() => {
              setIsTranscribing(false)
            }, 1000)
          }
        } catch (error) {
          // Silent error handling
        }
      }
    } catch (error) {
      setIsConnected(false)

      // Retry connection after 5 seconds
      connectionRetryRef.current = setTimeout(() => {
        connectWebSocket()
      }, 5000)
    }
  }, [language, WS_URL])

  // Initialize auto-connections
  useEffect(() => {
    connectWebSocket()

    // Load LeetCode problems on component mount
    const loadProblems = async () => {
      setIsLoadingProblems(true)
      try {
        const { problems: fetchedProblems, source } = await fetchLeetCodeProblems()
        setProblems(fetchedProblems)
        setProblemsSource(source)
        console.log(`Loaded ${fetchedProblems.length} problems from ${source}`)
      } catch (error) {
        console.error("Error loading problems:", error)
        // Use fallback as last resort
        setProblems(FALLBACK_PROBLEMS)
        setProblemsSource("fallback")
      } finally {
        setIsLoadingProblems(false)
      }
    }

    loadProblems()

    return () => {
      if (feedbackIntervalRef.current) {
        clearInterval(feedbackIntervalRef.current)
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current)
      }
      if (connectionRetryRef.current) {
        clearTimeout(connectionRetryRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket])

  // Get current question context
  const getCurrentQuestion = () => {
    if (questionType === "leetcode" && selectedProblem) {
      return `LeetCode Problem: ${selectedProblem.title} (${selectedProblem.difficulty})`
    } else if (questionType === "custom" && customQuestion.trim()) {
      return `Custom Question: ${customQuestion.trim().substring(0, 100)}...`
    }
    return "No question selected"
  }

  // Secure API evaluation request with question context
  const requestFeedback = useCallback(async () => {
    const now = Date.now()
    if (now - lastApiCall.current < API_RATE_LIMIT) {
      return
    }
    lastApiCall.current = now

    if (!code.trim() || code.length > 10000) {
      return
    }

    setIsEvaluating(true)

    try {
      const allTranscription = transcription.map((t) => sanitizeInput(t.text)).join(" ")
      const sanitizedCode = sanitizeInput(code.trim())
      const questionContext = getCurrentQuestion()

      if (sanitizedCode.length === 0) {
        return
      }

      const evaluationData = {
        code: sanitizedCode.substring(0, 5000),
        transcript: allTranscription.substring(0, 2000),
        language: sanitizeInput(language),
        question: questionContext,
        problem_details:
          questionType === "leetcode" && selectedProblem
            ? {
                title: selectedProblem.title,
                difficulty: selectedProblem.difficulty,
                category: selectedProblem.category,
              }
            : null,
        timestamp: Date.now(),
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      const response = await fetch(`${API_BASE_URL}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(evaluationData),
        signal: controller.signal,
        mode: "cors",
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      const newFeedback: AIFeedback = {
        id: `feedback_${Date.now()}`,
        timestamp: Date.now(),
        score: Math.max(0, Math.min(10, Number(result.score) || 0)),
        strengths: Array.isArray(result.strengths)
          ? result.strengths.slice(0, 5).map((s: string) => sanitizeInput(s.substring(0, 200)))
          : [],
        improvements: Array.isArray(result.improvements)
          ? result.improvements.slice(0, 5).map((i: string) => sanitizeInput(i.substring(0, 200)))
          : [],
        optimizations: Array.isArray(result.optimizations)
          ? result.optimizations.slice(0, 5).map((o: string) => sanitizeInput(o.substring(0, 200)))
          : [],
        codeAnalysis: sanitizeInput((result.code_analysis || "Code analysis completed").substring(0, 500)),
        speechAnalysis: sanitizeInput((result.speech_analysis || "Speech analysis completed").substring(0, 500)),
      }

      setFeedback((prev) => [newFeedback, ...prev.slice(0, 4)])

      const snapshot: Snapshot = {
        id: `snapshot_${Date.now()}`,
        code: sanitizedCode,
        timestamp: Date.now(),
        language: sanitizeInput(language),
      }
      setSnapshots((prev) => [snapshot, ...prev.slice(0, 9)])

      setApiServerConnected(true)
    } catch (error) {
      setApiServerConnected(false)
    } finally {
      setIsEvaluating(false)
    }
  }, [code, language, transcription, questionType, selectedProblem, customQuestion, API_BASE_URL])

  // Auto-request feedback
  useEffect(() => {
    if (!isPaused && sessionStarted && transcription.length > 0) {
      feedbackIntervalRef.current = setInterval(() => {
        requestFeedback()
      }, 60000)
    }

    return () => {
      if (feedbackIntervalRef.current) {
        clearInterval(feedbackIntervalRef.current)
      }
    }
  }, [isPaused, sessionStarted, transcription.length, requestFeedback])

  const handleCodeChange = (value: string | undefined) => {
    const sanitizedValue = sanitizeInput(value || "")
    if (sanitizedValue.length <= 10000) {
      setCode(sanitizedValue)
    }
  }

  const handleLanguageChange = (newLanguage: string) => {
    const sanitizedLanguage = sanitizeInput(newLanguage)
    const allowedLanguages = ["javascript", "typescript", "python", "java", "cpp", "csharp", "go", "rust"]

    if (allowedLanguages.includes(sanitizedLanguage)) {
      setLanguage(sanitizedLanguage)
    }
  }

  const handleStartSession = () => {
    if ((questionType === "leetcode" && selectedProblem) || (questionType === "custom" && customQuestion.trim())) {
      setSessionStarted(true)

      // Set appropriate code template
      const templates: Record<string, string> = {
        javascript: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\nfunction solution() {\n  // Start explaining your approach here\n}\n`,
        python: `# ${getCurrentQuestion()}\n# Explain your thought process as you code\n\ndef solution():\n    # Start explaining your approach here\n    pass\n`,
        java: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\npublic class Solution {\n    public void solution() {\n        // Start explaining your approach here\n    }\n}\n`,
        cpp: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\n#include <iostream>\nusing namespace std;\n\nvoid solution() {\n    // Start explaining your approach here\n}\n`,
        csharp: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\nusing System;\n\npublic class Solution {\n    public void SolutionMethod() {\n        // Start explaining your approach here\n    }\n}\n`,
        go: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\npackage main\n\nimport "fmt"\n\nfunc solution() {\n    // Start explaining your approach here\n}\n`,
        rust: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\nfn solution() {\n    // Start explaining your approach here\n}\n`,
        typescript: `// ${getCurrentQuestion()}\n// Explain your thought process as you code\n\nfunction solution(): void {\n  // Start explaining your approach here\n}\n`,
      }

      setCode(templates[language] || templates.javascript)
    }
  }

  const handleReset = () => {
    setCode("")
    setSnapshots([])
    setTranscription([])
    setFeedback([])
    setSessionStarted(false)
    setSelectedProblem(null)
    setCustomQuestion("")
    setSearchTerm("")
  }

  const togglePause = () => {
    setIsPaused(!isPaused)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: isPaused ? "resume_session" : "pause_session",
          timestamp: Date.now(),
        }),
      )
    }
  }

  // Show question selection if session hasn't started
  if (!sessionStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3 mb-4">
              <Brain className="w-10 h-10 text-blue-400" />
              AI Interview Coach
            </h1>
            <p className="text-blue-200 text-lg">Select a question to start your mock interview</p>
          </div>

          <Card className="bg-slate-800 border-blue-800 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Question Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Type Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-blue-200">Question Type</label>
                <Select value={questionType} onValueChange={(value: "leetcode" | "custom") => setQuestionType(value)}>
                  <SelectTrigger className="bg-slate-700 border-blue-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-blue-600">
                    <SelectItem value="leetcode" className="text-white hover:bg-slate-600">
                      LeetCode Problem
                    </SelectItem>
                    <SelectItem value="custom" className="text-white hover:bg-slate-600">
                      Custom Question
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* LeetCode Problem Selection */}
              {questionType === "leetcode" && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-200">Search</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          placeholder="Search problems..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-slate-700 border-blue-600 text-white placeholder-gray-400"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-200">Category</label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="bg-slate-700 border-blue-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-blue-600 max-h-60">
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category} className="text-white hover:bg-slate-600">
                              {category}{" "}
                              {category !== "All" && `(${problems.filter((p) => p.category === category).length})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-200">Difficulty</label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="bg-slate-700 border-blue-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-blue-600">
                          <SelectItem value="All" className="text-white hover:bg-slate-600">
                            All ({problems.length})
                          </SelectItem>
                          <SelectItem value="Easy" className="text-white hover:bg-slate-600">
                            Easy ({problems.filter((p) => p.difficulty === "Easy").length})
                          </SelectItem>
                          <SelectItem value="Medium" className="text-white hover:bg-slate-600">
                            Medium ({problems.filter((p) => p.difficulty === "Medium").length})
                          </SelectItem>
                          <SelectItem value="Hard" className="text-white hover:bg-slate-600">
                            Hard ({problems.filter((p) => p.difficulty === "Hard").length})
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-blue-200">Premium</label>
                      <div className="flex items-center space-x-2 h-10">
                        <input
                          type="checkbox"
                          id="showPremium"
                          checked={showPremium}
                          onChange={(e) => setShowPremium(e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-slate-700 border-blue-600 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="showPremium" className="text-sm text-blue-200">
                          Show Premium
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Results Summary */}
                  <div className="flex items-center justify-between text-sm text-blue-300">
                    <span>
                      Showing {filteredProblems.length} of {problems.length} problems
                      {!showPremium && ` (${problems.filter((p) => p.isPremium).length} premium hidden)`}
                    </span>
                    {isLoadingProblems ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading problems...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {problemsSource === "fallback" ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-yellow-400" />
                            <span>Using offline dataset</span>
                          </div>
                        ) : (
                          <span>Loaded from API</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Problems List */}
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {isLoadingProblems ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="ml-3 text-blue-200">Loading LeetCode problems...</span>
                      </div>
                    ) : filteredProblems.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No problems found matching your criteria</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                      </div>
                    ) : (
                      filteredProblems.map((problem) => (
                        <div
                          key={problem.id}
                          onClick={() => setSelectedProblem(problem)}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedProblem?.id === problem.id
                              ? "border-blue-500 bg-blue-950"
                              : "border-slate-600 bg-slate-700 hover:bg-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-400">#{problem.id}</span>
                                {problem.isPremium && (
                                  <Badge
                                    variant="outline"
                                    className="border-yellow-500 text-yellow-400 text-xs px-1 py-0"
                                  >
                                    Premium
                                  </Badge>
                                )}
                              </div>
                              <h3 className="font-medium text-white truncate">{problem.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-400">{problem.category}</span>
                                {problem.acceptance > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {problem.acceptance.toFixed(1)}% accepted
                                  </span>
                                )}
                              </div>
                              {problem.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {problem.tags.slice(0, 3).map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="border-slate-500 text-slate-400 text-xs px-1 py-0"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                  {problem.tags.length > 3 && (
                                    <span className="text-xs text-gray-500">+{problem.tags.length - 3} more</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={`ml-3 ${
                                problem.difficulty === "Easy"
                                  ? "border-green-500 text-green-400"
                                  : problem.difficulty === "Medium"
                                    ? "border-yellow-500 text-yellow-400"
                                    : "border-red-500 text-red-400"
                              }`}
                            >
                              {problem.difficulty}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Custom Question Input */}
              {questionType === "custom" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-200">Custom Question</label>
                  <Textarea
                    placeholder="Paste your interview question here..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="min-h-32 bg-slate-700 border-blue-600 text-white placeholder-gray-400"
                  />
                </div>
              )}

              {/* Language Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-blue-200">Programming Language</label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="bg-slate-700 border-blue-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-blue-600">
                    {[
                      { value: "javascript", label: "JavaScript", icon: "🟨" },
                      { value: "typescript", label: "TypeScript", icon: "🔷" },
                      { value: "python", label: "Python", icon: "🐍" },
                      { value: "java", label: "Java", icon: "☕" },
                      { value: "cpp", label: "C++", icon: "⚡" },
                      { value: "csharp", label: "C#", icon: "🔵" },
                      { value: "go", label: "Go", icon: "🐹" },
                      { value: "rust", label: "Rust", icon: "🦀" },
                    ].map((lang) => (
                      <SelectItem key={lang.value} value={lang.value} className="text-white hover:bg-slate-600">
                        <div className="flex items-center gap-2">
                          <span>{lang.icon}</span>
                          <span>{lang.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Connection Status */}
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={apiServerConnected ? "default" : "outline"}
                      className={`gap-1 ${apiServerConnected ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
                    >
                      {apiServerConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      Evaluation API
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isConnected ? "default" : "outline"}
                      className={`gap-1 ${isConnected ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
                    >
                      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      Transcription
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartSession}
                disabled={
                  (questionType === "leetcode" && !selectedProblem) ||
                  (questionType === "custom" && !customQuestion.trim())
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
              >
                Start Mock Interview
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Brain className="w-8 h-8 text-blue-400" />
                AI Interview Coach
              </h1>
              <p className="text-blue-200 mt-1">{getCurrentQuestion()}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right text-sm">
                  <div className="font-medium text-white">Services</div>
                  <div className="text-xs text-blue-300">Auto-connecting</div>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant={apiServerConnected ? "default" : "outline"}
                    className={`gap-1.5 ${apiServerConnected ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
                  >
                    {apiServerConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    API
                  </Badge>
                  <Badge
                    variant={isConnected ? "default" : "outline"}
                    className={`gap-1.5 ${isConnected ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
                  >
                    {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    Voice
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={togglePause}
              variant={isPaused ? "default" : "outline"}
              size="sm"
              className={`gap-2 ${isPaused ? "bg-blue-600 hover:bg-blue-700" : "border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"}`}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? "Resume" : "Pause"} Session
            </Button>

            <Button
              onClick={requestFeedback}
              variant="outline"
              size="sm"
              disabled={!code.trim() || isEvaluating}
              className="gap-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black disabled:border-gray-600 disabled:text-gray-600"
            >
              <Brain className="w-4 h-4" />
              {isEvaluating ? "Evaluating..." : "Get AI Feedback"}
            </Button>

            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="gap-2 border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-black"
            >
              <RotateCcw className="w-4 h-4" />
              New Session
            </Button>

            <Separator orientation="vertical" className="h-6 bg-blue-800" />

            <Badge variant={isPaused ? "destructive" : "default"} className={isPaused ? "bg-red-600" : "bg-blue-600"}>
              {isPaused ? "Paused" : "Active"}
            </Badge>

            <Badge
              variant={isTranscribing ? "default" : "outline"}
              className={`gap-1 ${isTranscribing ? "bg-green-600" : "border-gray-600 text-gray-400"}`}
            >
              {isTranscribing ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
              {isTranscribing ? "Listening" : "Silent"}
            </Badge>

            <Badge variant="outline" className="border-blue-400 text-blue-400">
              {feedback.length} evaluations
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Code Editor */}
          <div className="lg:col-span-7">
            <Card className="p-0 overflow-hidden shadow-2xl bg-slate-800 border-blue-800">
              <div className="bg-slate-900 px-4 py-2 border-b border-blue-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-sm font-medium text-blue-200">solution</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger className="w-36 h-7 bg-slate-700 border-blue-600 text-blue-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-blue-600">
                        {[
                          { value: "javascript", label: "JavaScript", icon: "🟨" },
                          { value: "typescript", label: "TypeScript", icon: "🔷" },
                          { value: "python", label: "Python", icon: "🐍" },
                          { value: "java", label: "Java", icon: "☕" },
                          { value: "cpp", label: "C++", icon: "⚡" },
                          { value: "csharp", label: "C#", icon: "🔵" },
                          { value: "go", label: "Go", icon: "🐹" },
                          { value: "rust", label: "Rust", icon: "🦀" },
                        ].map((lang) => (
                          <SelectItem
                            key={lang.value}
                            value={lang.value}
                            className="text-blue-200 hover:bg-slate-600 focus:bg-slate-600"
                          >
                            <div className="flex items-center gap-2">
                              <span>{lang.icon}</span>
                              <span>{lang.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {isTranscribing && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span className="text-xs text-red-400">Recording</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-800">
                <CodeEditor
                  value={code}
                  onChange={handleCodeChange}
                  language={language}
                  onLanguageChange={handleLanguageChange}
                />
              </div>
            </Card>
          </div>

          {/* Right Panels */}
          <div className="lg:col-span-5 space-y-6">
            <TranscriptionPanel
              transcription={transcription}
              currentTranscript=""
              isTranscribing={isTranscribing}
              isConnected={isConnected}
            />

            <FeedbackPanel feedback={feedback} onRequestFeedback={requestFeedback} isEvaluating={isEvaluating} />
          </div>
        </div>
      </div>
    </div>
  )
}
