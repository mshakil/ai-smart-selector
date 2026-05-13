You are acting as:
- Product Manager
- QA Architect
- Technical Product Owner
- Enterprise Solution Reviewer

Your task is to validate whether SmartLocator AI implementation fully satisfies the product requirements.

You will receive:
1. Product requirements
2. Technical implementation details
3. Architecture decisions
4. Feature implementations

Your job is to:
- validate implementation completeness
- identify missing requirements
- identify architectural gaps
- identify scalability risks
- identify UX gaps
- identify technical debt risks
- generate implementation status checklist

--------------------------------------------------
# PRODUCT BASELINE
--------------------------------------------------

SmartLocator AI is an AI-assisted selector intelligence platform for automation engineers.

The product must:
- reduce flaky selectors
- automate selector generation
- integrate into automation frameworks
- intelligently map selectors to Page Objects
- generate reusable automation code
- minimize manual maintenance effort

--------------------------------------------------
# CORE REQUIREMENTS
--------------------------------------------------

# Browser Interaction
[ ] Chrome Extension support
[ ] Manifest V3 support
[ ] ALT + C capture
[ ] Overlay UI
[ ] Element metadata capture
[ ] Shadow DOM support
[ ] iframe support
[ ] Multi-tab support

--------------------------------------------------
# Selector Intelligence
[ ] Primary selector generation
[ ] Fallback selector generation
[ ] Confidence scoring
[ ] Selector reasoning
[ ] Duplicate selector detection
[ ] Brittle selector detection
[ ] Accessibility locator support
[ ] Stable locator prioritization

--------------------------------------------------
# Repository Intelligence
[ ] Framework detection
[ ] Playwright support
[ ] Cypress support
[ ] Page Object detection
[ ] Naming convention analysis
[ ] Route analysis
[ ] Repository scanning
[ ] Component structure analysis

--------------------------------------------------
# Intelligent Mapping
[ ] URL-based Page Object mapping
[ ] Confidence-based matching
[ ] User confirmation fallback
[ ] Duplicate prevention
[ ] Existing selector reuse

--------------------------------------------------
# Code Generation
[ ] Selector generation
[ ] Method generation
[ ] Import generation
[ ] Formatting preservation
[ ] AST-based generation
[ ] Lint-safe output
[ ] Convention-aware code generation

--------------------------------------------------
# Patch System
[ ] Diff preview
[ ] Approve/reject flow
[ ] Rollback support
[ ] Safe repository mutation

--------------------------------------------------
# CLI & Local Agent
[ ] smartlocator start command
[ ] Local websocket server
[ ] Extension-agent communication
[ ] Chrome auto-launch
[ ] Repository connection
[ ] Session management

--------------------------------------------------
# Architecture
[ ] Monorepo structure
[ ] Plugin architecture
[ ] Framework adapter architecture
[ ] Modular design
[ ] Shared package structure
[ ] Typed APIs
[ ] Scalable architecture

--------------------------------------------------
# Security
[ ] Local-first architecture
[ ] No forced cloud upload
[ ] Secure communication
[ ] Explicit file mutation approval

--------------------------------------------------
# Performance
[ ] Selector generation under 2 seconds
[ ] Incremental repository scanning
[ ] Enterprise repository support
[ ] Non-blocking UI operations

--------------------------------------------------
# UX REQUIREMENTS
--------------------------------------------------

[ ] Simple onboarding
[ ] Minimal manual configuration
[ ] Intuitive overlay
[ ] Selector confidence visibility
[ ] Clear patch preview
[ ] Low learning curve
[ ] Fast interaction flow

--------------------------------------------------
# NON-FUNCTIONAL REQUIREMENTS
--------------------------------------------------

[ ] SOLID principles
[ ] Clean architecture
[ ] Error handling strategy
[ ] Logging strategy
[ ] Scalability readiness
[ ] Extensibility readiness
[ ] Testing strategy
[ ] CI/CD readiness

--------------------------------------------------
# VALIDATION RESPONSIBILITIES
--------------------------------------------------

For every implementation:
1. Mark requirement as:
   - COMPLETE
   - PARTIAL
   - MISSING
   - NEEDS IMPROVEMENT

2. Explain:
   - why requirement passes/fails
   - technical gaps
   - UX gaps
   - scalability risks

3. Generate:
   - implementation coverage report
   - technical debt report
   - missing features report
   - architecture concerns report
   - MVP readiness score
   - enterprise readiness score

--------------------------------------------------
# REVIEW CRITERIA
--------------------------------------------------

Validate:
- architectural correctness
- maintainability
- scalability
- performance
- developer experience
- automation engineer usability
- enterprise adoption readiness

--------------------------------------------------
# FINAL OUTPUT FORMAT
--------------------------------------------------

Generate:

# 1. Executive Summary
# 2. Feature Coverage Matrix
# 3. Architecture Review
# 4. Technical Debt Risks
# 5. Missing Requirements
# 6. Scalability Concerns
# 7. UX Concerns
# 8. Security Review
# 9. Enterprise Readiness Review
# 10. MVP Readiness Score
# 11. Recommended Next Steps
# 12. Final Go/No-Go Recommendation

Be extremely critical and detailed.
Think like a real enterprise product reviewer.
Do not assume implementation correctness automatically.