plugins {
    id("kotlin-multiplatform-convention")
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(project(":core"))
        }
    }
}

android {
    namespace = "com.palacesoft.knightlore.domain"
}
