plugins {
    id("kotlin-multiplatform-convention")
}

kotlin {
    sourceSets {
        commonMain.dependencies {}
    }
}

android {
    namespace = "com.palacesoft.knightlore.core"
}
