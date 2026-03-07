# 🔱 Pattern Modes - Pantheon Collaboration Patterns

## What Pattern Controls

The **"Pattern"** selector on the `/pantheon` page determines **how the Titans collaborate** to accomplish your mission. Each pattern uses a different collaboration strategy, workflow, and communication style.

## Location in UI

**File:** `src/components/pantheon/features/CommandConsole.tsx` (Line 340-383)

The Pattern selector has two modes:
- **Auto Mode** (default): Director automatically selects the best pattern based on your mission
- **Manual Mode**: You explicitly choose which pattern to use

## Available Patterns

### 1. 🤖 **Auto** (Intelligent Routing)
**Request Type:** `"auto"`

**What It Does:**
- The Director (orchestration layer) analyzes your mission and automatically selects the best pattern
- Uses AI to determine optimal collaboration strategy based on:
  - Mission complexity
  - Objective type (question, task, decision, etc.)
  - Session context and history
  - Available Titans

**Best For:**
- Most use cases (recommended default)
- When you're unsure which pattern to use
- Letting the system optimize collaboration strategy

**Example:**
```
Mission: "Design a caching strategy for our API"
Auto selects: Conversational (for discussion and analysis)
```

---

### 2. 💬 **Chat** (Conversational)
**Request Type:** `"conversational"`

**What It Does:**
- Free-flowing conversation between Titans
- Each Titan contributes thoughts, builds on others' ideas
- Natural dialogue format with back-and-forth discussion
- Synthesis at the end to consolidate insights

**Best For:**
- Brainstorming sessions
- Exploring ideas and alternatives
- Getting multiple perspectives
- Open-ended questions

**Example:**
```
Mission: "What are the pros and cons of microservices vs monolith?"
Result: Titans discuss trade-offs, share experiences, debate approaches
```

---

### 3. 📋 **Phased** (Four Titans Collaboration)
**Request Type:** `"collaboration"`

**What It Does:**
- Structured, sequential workflow with defined phases
- Each Titan has a specific role in the process
- Phases: Planning → Execution → Review → Synthesis
- More formal and organized than conversational

**Best For:**
- Complex projects requiring structure
- Multi-step tasks with clear phases
- When you need a comprehensive, organized solution
- Architecture design, system planning

**Example:**
```
Mission: "Design the end-to-end architecture for Federation Core"
Result: 
  Phase 1: GPT plans architecture
  Phase 2: Claude implements design
  Phase 3: Gemini reviews for security
  Phase 4: Grok stress-tests approach
```

**Special Behavior:**
- Uses different API endpoint: `/api/collaborations/four-titans`
- Triggers `four_titans_mission` workflow
- Requires all four Titans (GPT, Claude, Gemini, Grok)

---

### 4. 🎨 **Whiteboard** (Decision Making)
**Request Type:** `"whiteboard"`

**What It Does:**
- Collaborative decision-making mode
- Titans generate multiple options/ideas
- Evaluate and compare alternatives
- Converge on best solution with rationale

**Best For:**
- Making decisions between options
- Generating and evaluating alternatives
- When you need structured ideation
- Choosing between approaches

**Special Fields:**
- **Ideation Count** (3-12): How many ideas/options to generate
- **Decision Question**: The specific question to answer
- **Decision Options**: Predefined options to evaluate (optional)

**Example:**
```
Mission: "Choose between Redis, Memcached, or DragonflyDB for caching"
Ideation Count: 5
Decision Question: "Which caching solution best fits our needs?"
Result: Titans generate 5 approaches, evaluate each, recommend best option
```

---

### 5. ⚡ **Agent** (Single Titan Execution)
**Request Type:** `"execution"`

**What It Does:**
- Single Titan executes the task independently
- No collaboration or discussion
- Direct execution mode
- Fastest response time

**Best For:**
- Simple, straightforward tasks
- When you know exactly which Titan to use
- Quick answers without discussion
- Execution-focused tasks

**Special Behavior:**
- Automatically limits participants to 1 Titan
- If multiple Titans selected, only first one is used

**Example:**
```
Mission: "Generate a Python function to parse JSON"
Participant: Claude Titan
Result: Claude directly generates the code without discussion
```

---

## Pattern Selection Logic

### Auto Mode (Default)
```typescript
patternMode === "auto"
  ↓
Director analyzes mission
  ↓
Selects optimal pattern automatically
  ↓
Shows decision in "Latest Decision" panel
```

### Manual Mode
```typescript
patternMode === "manual"
  ↓
User selects pattern explicitly
  ↓
Pattern override sent in context
  ↓
System uses selected pattern
```

## How Patterns Map to Request Types

| Pattern | Request Type | API Endpoint |
|---------|-------------|--------------|
| Auto | `"auto"` | `/api/collaborations/conversational` |
| Chat | `"conversational"` | `/api/collaborations/conversational` |
| Phased | `"collaboration"` | `/api/collaborations/four-titans` |
| Whiteboard | `"whiteboard"` | `/api/collaborations/conversational` |
| Agent | `"execution"` | `/api/collaborations/conversational` |

## Context Payload

The pattern affects what's sent to Federation Core:

```typescript
{
  pattern: "whiteboard",
  pattern_override: "whiteboard",  // Only if manual mode
  iterations: 2,
  max_tokens: 1200,
  
  // Whiteboard-specific fields
  ideation_count: 5,
  decision_question: "Which approach is best?",
  decision_options: ["Option A", "Option B", "Option C"],
  focus_item_id: "item-123"  // If focusing on specific whiteboard item
}
```

## Comparison Table

| Pattern | Titans | Structure | Speed | Use Case |
|---------|--------|-----------|-------|----------|
| **Auto** | Variable | Adaptive | Medium | General purpose |
| **Chat** | Multiple | Freeform | Medium | Discussion, brainstorming |
| **Phased** | 4 (fixed) | Structured | Slow | Complex projects |
| **Whiteboard** | Multiple | Decision-focused | Medium | Choosing between options |
| **Agent** | 1 | Direct | Fast | Simple execution |

---


