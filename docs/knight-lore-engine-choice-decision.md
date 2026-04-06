# Knight Lore Android Remake — Engine Choice Decision

## Decision

Custom Android Renderer (Canvas-based) is the default engine choice for this project.[web:18][web:92][web:101]

libGDX remains an optional alternative if the team wants faster scaffolding, cross-platform deployment, or encounters performance issues with Canvas during production.[web:68][web:67][web:82]

## Rationale

This decision balances the specific needs of a Knight Lore remake against modern Android tooling and Claude Code implementation realities.

### Why Custom Android Renderer (Recommended)

1. Precise control: Knight Lore\'s identity depends on exact draw order, sort-foot anchors, occlusion rules, and transformation visual states. A custom renderer lets Claude Code implement these rules directly without engine abstraction.[web:18][web:43][web:101]

2. Simpler domain separation: The project architecture keeps gameplay rules (domain) completely separate from rendering. Canvas requires no external engine contracts or platform adapters.[web:18][web:92]

3. Modern Android-native: Uses Canvas, Compose for UI shell, coroutines for game loop, and standard Jetpack tooling. No third-party engine learning curve or dependency management.[web:92][web:101][web:100]

4. Room-based simplicity: The game is single-screen rooms with deterministic simulation. Canvas handles this perfectly without the overhead of tilemap systems or scene graphs.[web:18][web:98]

5. Proven for isometric: Recent Android isometric projects use Canvas successfully, including high-entity-count simulations at 60fps.[web:92][web:98][web:101]

### When to consider libGDX instead

Switch to libGDX if any of these become true:

1. Cross-platform expansion: Desktop, iOS, or web deployment becomes a priority.[web:68][web:67]

2. Performance plateau: Canvas hits limits with dense rooms, many sprites, or effects (unlikely for this scope).[web:68][web:82]

3. Faster prototyping: Claude Code wants sprite batching, asset management, and input abstraction immediately.[web:67][web:69]

4. Existing isometric tooling: libGDX has isometric tilemap and sorting helpers that could accelerate room rendering.[web:75][web:81]

## Implementation implications

### Custom Canvas (default path)
- render module owns Canvas drawing, projection, sorting, and scene composition.
- Domain exposes immutable RenderEntity snapshots.
- No engine-specific APIs leak into gameplay rules.
- Full control over fixed-step loop integration.

### libGDX (alternative path)
- Use libGDX\'s SpriteBatch, OrthographicCamera, and isometric projection utilities.
- Use libktx for Kotlin extensions.
- Keep domain model unchanged.
- libGDX ApplicationListener owns the Android shell integration.

## Migration path
If libGDX becomes necessary later:
1. Keep domain unchanged.
2. Replace render module with libGDX equivalents.
3. Update app shell to use libGDX AndroidApplicationConfiguration.
4. Test projection and draw order equivalence.

## Claude Code instruction
Use Custom Android Canvas renderer unless explicitly told otherwise. All isometric implementation, art spec, and puzzle design documents assume this approach.

The custom renderer path aligns best with the project\'s architecture-first philosophy and Claude Code\'s step-by-step implementation style.[web:18][web:92][web:101]

## Revisit triggers
Revisit this decision if:
- Room complexity exceeds Canvas performance.
- Cross-platform becomes a requirement.
- Claude Code reports significant rendering boilerplate.
