plugins {
    id("kotlin-multiplatform-convention")
}

android {
    namespace = "com.palacesoft.knightlore.render"
}

kotlin {
    sourceSets {
        commonMain.dependencies {
            implementation(project(":domain"))
            implementation(project(":core"))
        }
        androidMain.dependencies {
            implementation(libs.kotlinx.coroutines.core)
        }
    }
}
