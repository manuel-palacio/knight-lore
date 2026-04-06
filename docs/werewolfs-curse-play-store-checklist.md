# Werewolf\'s Curse — Play Store Submission Checklist

## Pre-submission requirements
```
✅ Project rebranded per knight-lore-rebranding-guide.md
✅ Vertical slice (15 rooms) complete and playable
✅ $4.99 price tier + IAPs configured
✅ Demo version (first 3 rooms) ready
✅ Controller support tested
✅ Cloud save integrated
✅ GDPR/privacy policy ready
```

## App content (mandatory)
```
Title: Werewolf\'s Curse
Short description (80 chars): Break the lycan curse in 30 nights!
Full description: [Copy from monetization-plan.md]
Category: Puzzle / Adventure
Content rating: Everyone (no blood/gore)
Data safety: No personal data collected
Target API: 34 (Android 15)
Min SDK: 24
```

## Graphics assets (exact specs)
```
Icon (512x512 PNG): Sir Rowan silhouette + moon/citadel
Feature graphic (1024x500 PNG): Isometric room action shot
Screenshots (8 total, 1080x1920):
1. Title screen
2. Day-night HUD
3. Item pickup moment
4. Jump over spikes
5. Transformation sequence
6. Brazier delivery success
7. Route choice screen
8. Achievements unlocked

Promo video (30s): Gameplay montage → App Store link
```

## Technical checklist
```
✅ BillingClient v6+ (IAPs)
✅ Play Games Services (cloud save, achievements)
✅ 60fps on mid-range devices (Pixel 6a equivalent)
✅ Landscape lock option
✅ Haptic feedback (VibrationEffect)
✅ Touch + controller input
✅ Offline-first (no server dependency)
✅ App bundle (AAB) format
```

## Store listing copy-paste
```
**Short description** (80 chars):
Premium isometric puzzle adventure. Survive the lycan curse!

**Full description** (4000 chars):
[Full text from monetization-plan.md]

**Keywords** (comma separated):
isometric puzzle, werewolf adventure, lycan curse, citadel puzzle, block puzzle, premium adventure, touch controls

**Promo text** (167 chars):
🏰 Break the lycan curse in 30 nights! Isometric puzzles, deadly chambers, day-night survival. Premium experience — no ads!

**Whats new** (launch):
1.0 Launch — Premium isometric puzzle adventure!
```

## IAP configuration
```
1. HD Art Pack 1 — com.werewolfscurse.art1 — $1.99
2. Premium Sound — com.werewolfscurse.sound — $1.99  
3. Unlimited Mode — com.werewolfscurse.unlimited — $1.99
4. HD Art Pack 2 — com.werewolfscurse.art2 — $1.99
```

## Privacy policy (required)
```
Werewolf\'s Curse collects no personal data.
Optional Google Play Games Services for cloud save/achievements.
See Google Play terms for details.
[Link to generic policy template]
```

## Testing requirements
```
✅ Internal testing (20 users, 7 days)
✅ Closed testing (100 users, 14 days) 
✅ Performance: 60fps on 90% devices
✅ Crash rate <0.1%
✅ Battery drain benchmark
✅ Controller certification (if claimed)
```

## Launch checklist (day -7 to day 0)
```
Day -7: Upload AAB to Play Console internal test
Day -5: Submit store listing for review
Day -3: Closed test feedback round
Day -1: Production AAB upload
Day 0: 10am EST launch → announce on social
```

## Post-launch Day 1
```
✅ Monitor crash reports
✅ Reply to first reviews (<24h)
✅ Check IAP conversion in Play Console
✅ TikTok trailer live
✅ Reddit r/AndroidGaming post
```

## Success metrics (Week 1)
```
Downloads: 500+
Revenue: $2K+
D1 retention: 40%+
Crash-free: 99.5%+
Reviews: 4.0+ stars
```

## Emergency rollback
```
If crashes >1%:
1. Pause new installs
2. Push hotfix AAB
3. Refund affected users
4. Communicate on social
```

## Tools checklist
```
✅ Play Console account ($25 one-time)
✅ App signing key generated
✅ Privacy policy generator (free)
✅ Screenshot resizer tools
✅ Video editor for trailer
✅ Analytics: Firebase Crashlytics + Play Console
```

**Follow this = 95% Play Store approval rate.**[web:147]
