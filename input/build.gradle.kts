plugins {
    id("kotlin-multiplatform-convention")
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(project(":domain"))
        }
    }
}

android {
    namespace = "com.palacesoft.knightlore.input"
}
