
# Plague Survivor - Technical Roadmap

## Current Status ✅
- [x] Isometric tile rendering
- [x] Player movement + collision
- [x] Room transitions (room_001 → room_002+)
- [x] Walls rendering (north/west edges)
- [x] Larger room scale (128×64 tiles)

## Phase 6.5 - Touch Input (Critical)
```
Priority: ★★★★★ (blocks mobile testing)
```
- Virtual joystick (left screen)
- Tap-to-move (right screen) 
- Pinch zoom + pan
- Android fullscreen + notch handling

## Phase 7 - Dynamic Content (Next)
```
Priority: ★★★★☆ (makes rooms interesting)
```
- Enemy patrol paths (room_005 goblin)
- Hazard damage (spikes, fire)
- Chests + items (keys, antidotes)
- Moving platforms

## Phase 8 - Polish
```
Priority: ★★★☆☆
```
- Pixel art sprites (character, enemies)
- Particle effects (damage, footsteps)
- Audio (chiptune music + SFX)
- HUD animations (day counter pulse)

## Phase 9 - Mobile Deploy
```
Priority: ★★★★★
```
- APK build + signing
- TikTok video capture
- Play Store submission

## JSON Data Structure
```
rooms/
├── room_001.json (central hub)
├── room_002.json (north exit)  
├── room_003.json (east exit)
├── room_005.json (spike hazard + goblin)
└── room_XXX.json (30 total rooms)
```
Each room: `tiles[]`, `dynamic_objects[]`, `exits`, `hazards[]`

## Success Metrics
- [ ] 30 seconds of smooth mobile gameplay
- [ ] Enemy kills player (collision works)
- [ ] Room 005 spikes deal damage
- [ ] TikTok-ready 15s video demo
