plugins {
    id("android-app-convention")
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "com.palacesoft.knightlore.app"
}

dependencies {
    implementation(project(":core"))
    implementation(project(":domain"))
    implementation(project(":data"))
    implementation(project(":render"))
    implementation(project(":input"))
    debugImplementation(project(":feature-debug"))

    implementation(libs.androidx.activity.compose)

    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.navigation.compose)
}
