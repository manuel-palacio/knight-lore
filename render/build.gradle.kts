plugins {
    id("android-library-convention")
}

android {
    namespace = "com.palacesoft.knightlore.render"
}

dependencies {
    implementation(project(":domain"))
    implementation(project(":core"))
    implementation(libs.kotlinx.coroutines.core)
}
