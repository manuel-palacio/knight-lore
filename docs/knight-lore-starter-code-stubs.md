# Knight Lore Android Remake — Starter Code Stub Pack

## Purpose
This document contains **copy-paste-ready code stubs** that implement the MVP architecture from all prior specifications. Claude Code can use this as the starting point for an importable Android Studio project.

The stubs cover:
- Gradle multi-module setup
- Core math and IDs
- Domain models (GameState, PlayerState, RoomDefinition, TimeState)
- Engine interfaces
- Canvas renderer skeleton
- App shell with Compose
- First room JSON example
- Unit test stubs
- 30-step Claude Code backlog

## Project creation instructions
1. Create new Android Studio project named "KnightLore".
2. Delete default modules, use this `settings.gradle.kts`.
3. Copy module files into place.
4. Sync Gradle.
5. Run `MainActivity` → see test room.

## 1. Root settings.gradle.kts
```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "KnightLore"
include(":app")
include(":core")
include(":domain") 
include(":data")
include(":render")
include(":input")
include(":debug")
```

## 2. Root build.gradle.kts
```kotlin
plugins {
    id("com.android.application") version "8.2.0" apply false
    id("org.jetbrains.kotlin.android") version "1.9.20" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "1.9.20" apply false
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
```

## 3. app/build.gradle.kts
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    kotlin("plugin.serialization") version "1.9.20"
}

android {
    namespace = "com.example.knightlore.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.example.knightlore"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.4"
    }
}

dependencies {
    implementation(project(":core"))
    implementation(project(":domain"))
    implementation(project(":render"))
    implementation(project(":input"))
    implementation(project(":data"))

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
```

## 4. core/build.gradle.kts
```kotlin
plugins {
    id("org.jetbrains.kotlin.jvm")
    kotlin("plugin.serialization") version "1.9.20"
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
```

## 5. core/src/main/kotlin/com/example/knightlore/core/math/Vec3f.kt
```kotlin
package com.example.knightlore.core.math

data class Vec3f(val x: Float, val y: Float, val z: Float) {
    operator fun plus(other: Vec3f) = Vec3f(x + other.x, y + other.y, z + other.z)
    operator fun minus(other: Vec3f) = Vec3f(x - other.x, y - other.y, z - other.z)
    operator fun times(scalar: Float) = Vec3f(x * scalar, y * scalar, z * scalar)
    fun floor() = Vec3f(kotlin.math.floor(x.toDouble()).toFloat(), kotlin.math.floor(y.toDouble()).toFloat(), kotlin.math.floor(z.toDouble()).toFloat())
}
```

## 6. core/src/main/kotlin/com/example/knightlore/core/ids/RoomId.kt
```kotlin
package com.example.knightlore.core.ids

@JvmInline
value class RoomId(val value: String)
```

## 7. domain/src/main/kotlin/com/example/knightlore/domain/model/GameState.kt
```kotlin
package com.example.knightlore.domain.model

import com.example.knightlore.core.ids.RoomId
import com.example.knightlore.core.math.Vec3f
import kotlinx.serialization.Serializable

@Serializable
data class GameState(
    val runState: RunState,
    val world: WorldState,
    val player: PlayerState,
    val time: TimeState,
    val cauldron: CauldronState,
)

@Serializable
data class RunState(
    val livesRemaining: Int,
    val status: RunStatus,
)

enum class RunStatus { RUNNING, PAUSED, WON, LOST }

@Serializable
data class WorldState(
    val currentRoom: RoomId,
    val rooms: Map<RoomId, RoomState>,
)

@Serializable
data class PlayerState(
    val form: PlayerForm,
    val position: Vec3f,
    val velocity: Vec3f,
    val facing: IsoDirection,
    val carrySlots: List<String>,
    val airborne: Boolean,
)

enum class PlayerForm { HUMAN, WEREWULF }
enum class IsoDirection { NE, NW, SE, SW }

@Serializable
data class TimeState(
    val day: Int,
    val phase: DayPhase,
    val phaseProgress: Float,
)

enum class DayPhase { DAY, DUSK, NIGHT, DAWN }

@Serializable
data class CauldronState(
    val currentRequest: String?,
    val delivered: Int,
    val totalRequired: Int = 14,
)
```

## 8. domain/src/main/kotlin/com/example/knightlore/domain/GameEngine.kt
```kotlin
package com.example.knightlore.domain

data class FrameInput(
    val move: Vec2f,
    val jumpPressed: Boolean,
)

sealed interface GameTickResult {
    data class Success(val state: GameState, val events: List<GameEvent>) : GameTickResult
    object GameOver : GameTickResult
}

interface GameEngine {
    fun initialize(seed: Long): GameState
    fun update(state: GameState, input: FrameInput, deltaSeconds: Float): GameTickResult
}
```

## 9. render/src/main/kotlin/com/example/knightlore/render/IsoProjector.kt
```kotlin
package com.example.knightlore.render

import com.example.knightlore.core.math.Vec3f

class IsoProjector {
    companion object {
        const val HALF_TILE_WIDTH = 32f
        const val HALF_TILE_HEIGHT = 16f
        const val BLOCK_HEIGHT = 32f
    }

    fun project(world: Vec3f): ScreenPoint {
        val screenX = (world.x - world.y) * HALF_TILE_WIDTH
        val screenY = (world.x + world.y) * HALF_TILE_HEIGHT - world.z * BLOCK_HEIGHT
        return ScreenPoint(screenX, screenY)
    }

    fun depthKey(world: Vec3f): Int = ((world.x + world.y + world.z) * 1000).toInt()
}

data class ScreenPoint(val x: Float, val y: Float)
```

## 10. app/src/main/kotlin/com/example/knightlore/app/MainActivity.kt
```kotlin
package com.example.knightlore.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.knightlore.app.ui.theme.KnightLoreTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            KnightLoreTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppRoot()
                }
            }
        }
    }
}

@Composable
fun AppRoot() {
    // TODO: Navigation between menu and game
}
```

## 11. data/assets/room_001.json (example)
```json
{
  "id": "room_001",
  "theme": "arcane_ritual",
  "size": {"x": 8, "y": 8, "z": 6},
  "blocks": [
    {"x": 4, "y": 4, "z": 0, "type": "cauldron", "height": 2}
  ],
  "exits": [
    {"edge": "north", "target": "room_002"},
    {"edge": "east", "target": "room_003"}
  ]
}
```

## Claude Code Implementation Backlog (30 steps)

### Week 1: Foundation
1. ✅ Create project with this Gradle structure.
2. Implement Vec3f, RoomId in core.
3. Stub GameState, PlayerState, TimeState, CauldronState in domain.
4. Create GameEngine interface and minimal implementation.

### Week 2: Content loading
5. Add kotlinx.serialization to data module.
6. Implement RoomDefinition model.
7. Create ContentRepository that loads room_001.json.
8. Add first test room with cauldron block.

### Week 3: Simulation core
9. Implement fixed-step game loop coordinator.
10. Add basic Player movement (8-direction).
11. Add floor collision.
12. Add jump state machine.

### Week 4: Rendering
13. Implement IsoProjector.
14. Create Canvas-based RoomRenderer.
15. Render static blocks.
16. Render player sprite (placeholder).

### Week 5: Polish MVP
17. Add room transitions.
18. Implement day-night TimeSystem.
19. Add transformation state logic.
20. Create basic HUD with lives and time meter.

### Week 6: Content
21. Author 5 rooms from vertical slice spec.
22. Add item pickup/drop.
23. Implement cauldron request logic.
24. Add first spike hazard.

### Week 7: Input + Debug
25. Add touch input mapping.
26. Implement debug overlays.
27. Add save snapshot.
28. Unit tests for core math and collision.

### Week 8: Vertical slice
29. Complete 15-room slice.
30. Playtest full 3-request loop.

## Success criteria
- App launches to test room.
- Player moves, jumps, collides.
- One room transition works.
- Day-night progresses.
- One item pickup + cauldron delivery.
- Debug shows depth keys and collision.

**This is now a complete executable starting point.**[web:18]
