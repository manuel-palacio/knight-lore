plugins {
    id("kotlin-multiplatform-convention")
    id("org.jetbrains.kotlin.plugin.serialization")
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(project(":core"))
            implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
        }
    }
}

android {
    namespace = "com.palacesoft.knightlore.domain"
}
