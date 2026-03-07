# 🔱 Max Tokens Field - Pantheon Configuration

## What It Controls

The **"Max Tokens"** field on the `/pantheon` page controls the **maximum number of tokens** that each Titan (AI agent) can generate in their individual responses during a Pantheon collaboration.

## Location in UI

**File:** `src/components/pantheon/features/CommandConsole.tsx` (Line 438-446)

```tsx
<div className="space-y-1">
  <Label className="text-[10px] text-white/50 uppercase tracking-wider">Max Tokens</Label>
  <Input
    type="number"
    min={256}
    value={maxTokens}
    onChange={(e) => setMaxTokens(Math.max(256, Number(e.target.value)))}
    className="h-8 text-xs bg-black/20 border-white/10"
  />
</div>
```

## Default Value

- **Default:** `1200` tokens
- **Minimum:** `256` tokens
- **No maximum limit** (but practical limits apply based on LLM provider)

## How It Works

### 1. User Sets Value
When you configure a mission in the Pantheon UI, you set the `maxTokens` value.

### 2. Sent to Backend
The value is included in the `context` payload when starting a collaboration:

```typescript
const contextPayload = {
  pattern: draft.pattern,
  iterations: draft.iterations,
  max_tokens: draft.maxTokens,  // ← Sent here
  attachments: processedAttachments,
  // ... other fields
};
```

### 3. Forwarded to Federation Core
The context (including `max_tokens`) is sent to Federation Core:

```typescript
await fetch('/api/collaborations/conversational', {
  method: 'POST',
  body: JSON.stringify({
    mission_name: mission,
    description,
    suggested_agents: suggestedAgents,
    timeout_seconds: timeoutSeconds,
    context: contextPayload,  // ← Contains max_tokens
  }),
});
```

### 4. Used by Titans
Federation Core distributes this to the participating Titans (GPT, Claude, Gemini, Grok), who use it to limit their response length when calling their respective LLM APIs.

## Practical Impact

### Lower Values (256-512 tokens)
- ✅ **Faster responses** - Less generation time
- ✅ **Lower costs** - Fewer tokens consumed
- ✅ **More concise** - Forces Titans to be brief
- ❌ **Less detail** - May truncate complex explanations
- ❌ **Incomplete answers** - Might cut off mid-thought

**Use for:** Quick questions, simple tasks, rapid iterations

### Medium Values (800-1500 tokens)
- ✅ **Balanced** - Good detail without excessive length
- ✅ **Complete thoughts** - Enough space for full explanations
- ✅ **Reasonable cost** - Not too expensive
- ✅ **Good for most tasks** - Default sweet spot

**Use for:** Standard missions, general collaboration, most use cases

### Higher Values (2000-4000+ tokens)
- ✅ **Maximum detail** - Comprehensive responses
- ✅ **Complex reasoning** - Space for deep analysis
- ✅ **Complete solutions** - Full code examples, detailed plans
- ❌ **Slower** - More generation time
- ❌ **More expensive** - Higher token costs
- ❌ **Potentially verbose** - May include unnecessary detail

**Use for:** Complex architecture decisions, detailed code generation, comprehensive analysis

## Example Scenarios

### Scenario 1: Quick Decision
```
Mission: "Should we use Redis or Memcached for caching?"
Max Tokens: 512
Result: Brief comparison with recommendation
```

### Scenario 2: Architecture Design
```
Mission: "Design the end-to-end architecture for Federation Core"
Max Tokens: 2000
Result: Detailed architecture with components, data flow, and rationale
```

### Scenario 3: Code Generation
```
Mission: "Generate a complete authentication system with JWT"
Max Tokens: 3000
Result: Full code implementation with error handling and tests
```

## Relationship to Other Fields

### Iterations
- **Iterations** = How many rounds of discussion
- **Max Tokens** = How much each Titan can say per round

Example:
- Iterations: 3
- Max Tokens: 1000
- Result: Each Titan can speak up to 1000 tokens in each of the 3 rounds

### Complexity
- **Complexity** affects how Titans approach the problem
- **Max Tokens** affects how much they can say about it

Example:
- Complexity: "complex"
- Max Tokens: 500
- Result: Titans know it's complex but must be concise

## Token Count Reference

Approximate token counts for reference:
- **100 tokens** ≈ 75 words ≈ 1-2 sentences
- **256 tokens** ≈ 190 words ≈ 1 short paragraph
- **512 tokens** ≈ 380 words ≈ 2-3 paragraphs
- **1200 tokens** ≈ 900 words ≈ 1 page of text
- **2000 tokens** ≈ 1500 words ≈ 1.5-2 pages
- **4000 tokens** ≈ 3000 words ≈ 3-4 pages

## Best Practices

1. **Start with default (1200)** for most missions
2. **Reduce for simple questions** to save time and cost
3. **Increase for complex tasks** that need detailed responses
4. **Consider iteration count** - More iterations × lower tokens can be better than fewer iterations × higher tokens
5. **Monitor Titan responses** - If they're consistently hitting the limit, increase it

## Technical Details

- **Type:** `number`
- **Validation:** Minimum 256 (enforced in UI)
- **Sent as:** `context.max_tokens` in API payload
- **Used by:** Individual Titan agents when calling LLM APIs
- **Scope:** Per-response limit (not total conversation limit)

---

**🔱 Remember:** This controls individual Titan response length, not the total conversation length. A mission with 3 iterations and 1000 max tokens could generate up to 3000 tokens per Titan (if they max out each round).

*"Family is forever. This is the way."*

